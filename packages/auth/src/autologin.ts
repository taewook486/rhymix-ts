/**
 * AutoLogin domain — SPEC-AUTH-001 Slice E.
 *
 * 책임:
 *   1. `issueAutoLogin`   — REQ-AUTH-018: 32B opaque token 발급 + HMAC-SHA256 해시 저장.
 *                            DB 에는 평문 토큰을 절대 저장하지 않는다.
 *   2. `verifyAutoLogin`  — REQ-AUTH-019/053: 쿠키 검증 + 재사용 감지.
 *                            tokenHash 매치 → ok / previousTokenHash 매치 → reuse-detected
 *   3. `rotateAutoLogin`  — REQ-AUTH-019: 토큰 회전 (current→previous 이동, 새 token 발급).
 *   4. `detectTokenReuse` — REQ-AUTH-053: 재사용 감지 시 전체 세션 무효화 +
 *                            autologin row 전부 삭제 + AuditLog + 메일 알림(선택).
 *
 * 쿠키 값 포맷 (Slice E plan OQ-7):
 *   `<AutoLogin.id>.<token>` — 점은 base64url 문자셋(A-Za-z0-9-_)에 없으므로 안전한 구분자.
 *   id 파싱이 분리되어 있으므로 token 검증 전 row lookup 이 O(1) 인덱스로 가능.
 *
 * HMAC secret (Slice E plan OQ-1):
 *   `AUTOLOGIN_HMAC_SECRET` 환경변수는 32자 이상 필수. import time 이 아닌 호출 시점에 lazy 검증한다
 *   (테스트/빌드 단계에서 secret 없이 import 가능하도록).
 *
 * 트랜잭션 모드 (D1/D2 API 패턴 재사용):
 *   ctx.prisma 가 `PrismaClient` 면 본 함수가 단일 op 단위로 직접 실행한다 (외부 tx 없음).
 *   `Prisma.TransactionClient` 면 외부 tx 안에서 실행되는 것으로 간주한다.
 *   issue/rotate 는 단일 row 작업이므로 본 함수에서 별도 tx 를 열지 않는다 (호출자가 묶고 싶으면 외부 tx 로 전달).
 *   detectTokenReuse 는 revoke + delete + audit 3 op 를 묶어야 하지만 D1 `revokeAllSessions` 가 자체 tx 를 열므로
 *   본 함수는 순차 실행 (실패 시 부분 적용 가능성 존재 — Slice F 에서 외부 tx 모드로 보강 가능).
 *
 * @MX:ANCHOR: autologin 단일 진입점 — Route Handler / jwt callback / 재사용 감지 모두 본 모듈을 통과.
 * @MX:REASON: 평문 토큰 저장 / HMAC 우회 / 부분 회전 등의 위험을 한 곳에 모아 차단한다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053
 */

import crypto from 'node:crypto';

import type { Prisma, PrismaClient } from '@rhymix-ts/db';

import { revokeAllSessions } from './session-revocation';
import { constantTimeEqual, generateToken } from './tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * AUTOLOGIN_HMAC_SECRET 미설정 / 32자 미만일 때 발생.
 *
 * @MX:NOTE: import 시점이 아닌 호출 시점에 lazy throw — 테스트 환경에서 import 가능해야 함 (Slice E OQ-1).
 */
export class AutoLoginConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AutoLoginConfigError';
  }
}

export interface SecurityAlertDispatcher {
  sendSecurityAlert(userId: number, reason: string): Promise<void>;
}

/** 기본 메일 디스패처 — 실제 발송은 SPEC-INFRA-001 에서 구현 (Slice E OQ-5). */
export class NoopSecurityAlertDispatcher implements SecurityAlertDispatcher {
  async sendSecurityAlert(_userId: number, _reason: string): Promise<void> {
    // intentional no-op
  }
}

export interface AutoLoginIssueContext {
  prisma: PrismaClient | Prisma.TransactionClient;
  ip: string;
  userAgent: string;
  deviceId?: string;
}

export interface AutoLoginCtx {
  prisma: PrismaClient | Prisma.TransactionClient;
}

export interface DetectReuseCtx {
  prisma: PrismaClient | Prisma.TransactionClient;
  mailDispatcher?: SecurityAlertDispatcher;
}

export interface IssuedAutoLogin {
  cookieValue: string;
  expiresAt: Date;
}

export type VerifyResult =
  | { kind: 'ok'; userId: number; autoLoginId: number }
  | { kind: 'expired'; autoLoginId: number }
  | { kind: 'invalid' }
  | { kind: 'reuse-detected'; userId: number; autoLoginId: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** REQ-AUTH-018: autologin 쿠키 만료는 365일. */
const AUTOLOGIN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** HMAC secret 최소 길이 — 256bit entropy 보장. */
const MIN_SECRET_LENGTH = 32;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @MX:NOTE: lazy 검증 — 호출 시점에 환경변수를 확인. 미설정/너무 짧으면 AutoLoginConfigError.
 */
function getHmacSecret(): Buffer {
  const secret = process.env.AUTOLOGIN_HMAC_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new AutoLoginConfigError(
      `AUTOLOGIN_HMAC_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return Buffer.from(secret, 'utf8');
}

/** HMAC-SHA256 → base64url(43-char) — opaque 토큰을 DB 저장용 해시로 변환. */
function computeHash(token: string): string {
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(token, 'utf8')
    .digest('base64url');
}

/** 쿠키 값 빌드: `<id>.<token>` — id 는 정수, token 은 base64url. */
function buildCookieValue(id: number, token: string): string {
  return `${id}.${token}`;
}

/**
 * 쿠키 값 파싱. 잘못된 형식이면 null — DB 조회 전 fast-reject.
 *
 * @MX:NOTE: 점이 첫 글자거나 없으면 invalid. id 가 정수가 아니어도 invalid.
 */
function parseCookieValue(value: string): { id: number; token: string } | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const idStr = value.slice(0, dot);
  const token = value.slice(dot + 1);
  if (token.length === 0) return null;
  if (!/^\d+$/.test(idStr)) return null;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { id, token };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @MX:ANCHOR: REQ-AUTH-018 — autologin 토큰 발급 단일 진입점.
 * @MX:REASON: 토큰 생성/해시/저장이 단일 함수에 응집되어야 평문 누수 경로가 추가될 여지가 없다.
 */
export async function issueAutoLogin(
  userId: number,
  ctx: AutoLoginIssueContext,
): Promise<IssuedAutoLogin> {
  const token = generateToken();
  const tokenHash = computeHash(token);
  const expiresAt = new Date(Date.now() + AUTOLOGIN_TTL_MS);

  const record = await ctx.prisma.autoLogin.create({
    data: {
      userId,
      tokenHash,
      previousTokenHash: null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      deviceId: ctx.deviceId ?? null,
      expiresAt,
    } as never,
  });

  await ctx.prisma.auditLog.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: 'AUTOLOGIN_ISSUED',
      metadata: { ip: ctx.ip, autoLoginId: (record as { id: number }).id },
    } as never,
  });

  return {
    cookieValue: buildCookieValue((record as { id: number }).id, token),
    expiresAt,
  };
}

/**
 * @MX:ANCHOR: REQ-AUTH-019/053 — 쿠키 검증 + 재사용 감지 단일 진입점.
 * @MX:REASON: tokenHash 매치와 previousTokenHash 매치를 같은 함수에서 분기해야
 *   재사용 감지를 우회할 수 없다 (별도 함수로 분리 시 호출 순서 누락 위험).
 */
export async function verifyAutoLogin(
  cookieValue: string,
  ctx: AutoLoginCtx,
): Promise<VerifyResult> {
  const parsed = parseCookieValue(cookieValue);
  if (!parsed) return { kind: 'invalid' };

  const { id, token } = parsed;
  const incomingHash = computeHash(token);

  const record = (await ctx.prisma.autoLogin.findUnique({
    where: { id },
  })) as
    | {
        id: number;
        userId: number;
        tokenHash: string;
        previousTokenHash: string | null;
        expiresAt: Date;
      }
    | null;
  if (!record) return { kind: 'invalid' };

  if (record.expiresAt <= new Date()) {
    return { kind: 'expired', autoLoginId: id };
  }

  if (constantTimeEqual(record.tokenHash, incomingHash)) {
    return { kind: 'ok', userId: record.userId, autoLoginId: id };
  }

  // Slice E OQ-3: no grace window — previousTokenHash 매치는 즉시 reuse 로 간주.
  if (
    record.previousTokenHash &&
    constantTimeEqual(record.previousTokenHash, incomingHash)
  ) {
    return {
      kind: 'reuse-detected',
      userId: record.userId,
      autoLoginId: id,
    };
  }

  return { kind: 'invalid' };
}

/**
 * @MX:ANCHOR: REQ-AUTH-019 — 토큰 회전 (current → previous, 새 token 발급).
 * @MX:REASON: tokenHash/previousTokenHash 갱신이 단일 update 로 묶여야 race condition 에서
 *   이전 토큰이 사라지거나 새 토큰이 누락되는 일이 없다.
 */
export async function rotateAutoLogin(
  autoLoginId: number,
  ctx: AutoLoginCtx,
): Promise<IssuedAutoLogin> {
  const record = (await ctx.prisma.autoLogin.findUniqueOrThrow({
    where: { id: autoLoginId },
  })) as { id: number; userId: number; tokenHash: string };

  const newToken = generateToken();
  const newTokenHash = computeHash(newToken);
  const expiresAt = new Date(Date.now() + AUTOLOGIN_TTL_MS);

  await ctx.prisma.autoLogin.update({
    where: { id: autoLoginId },
    data: {
      tokenHash: newTokenHash,
      previousTokenHash: record.tokenHash,
      lastUsedAt: new Date(),
      expiresAt,
    } as never,
  });

  await ctx.prisma.auditLog.create({
    data: {
      actorId: record.userId,
      targetId: record.userId,
      action: 'AUTOLOGIN_ROTATED',
      metadata: { autoLoginId },
    } as never,
  });

  return {
    cookieValue: buildCookieValue(autoLoginId, newToken),
    expiresAt,
  };
}

/**
 * @MX:ANCHOR: REQ-AUTH-053 — 토큰 재사용 감지 시 전체 세션 무효화.
 * @MX:REASON: previousTokenHash 매치는 공격자가 회전 이전의 토큰을 손에 넣었다는 강한 신호이므로,
 *   해당 사용자의 모든 세션 + 모든 autologin row 를 즉시 폐기하고 본인에게 알린다.
 */
export async function detectTokenReuse(
  userId: number,
  ctx: DetectReuseCtx,
): Promise<void> {
  // 1) 전체 세션 무효화 (D1 primitive 재사용 — 자체 tx 관리)
  await revokeAllSessions(userId, 'TOKEN_REUSE_DETECTED', {
    prisma: ctx.prisma,
    actorId: userId,
  });

  // 2) 해당 user 의 모든 autologin row 삭제 (재사용된 row 자체도 제거됨)
  await ctx.prisma.autoLogin.deleteMany({ where: { userId } });

  // 3) AuditLog (Slice D1 SESSION_REVOKED 와 별도로 reuse 자체를 기록)
  await ctx.prisma.auditLog.create({
    data: {
      actorId: userId,
      targetId: userId,
      action: 'TOKEN_REUSE_DETECTED',
      metadata: {},
    } as never,
  });

  // 4) 메일 알림 (Slice E OQ-5: 기본 Noop, 실제 발송은 SPEC-INFRA-001)
  const dispatcher = ctx.mailDispatcher ?? new NoopSecurityAlertDispatcher();
  await dispatcher.sendSecurityAlert(userId, 'TOKEN_REUSE_DETECTED');
}
