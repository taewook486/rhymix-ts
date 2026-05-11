/**
 * AutoLogin (Remember Me) — SPEC-AUTH-001 Slice E (E-3).
 *
 * 책임:
 *   1. `createAutoLogin`  — REQ-AUTH-018: securityKey 발급 + AutoLogin row 생성
 *   2. `verifyAutoLogin`  — REQ-AUTH-019, AC-AUTH-019: 키 rotation + 도난 감지
 *   3. `revokeAutoLogin`  — AutoLogin 레코드 삭제
 *
 * 키 rotation 정책 (REQ-AUTH-019):
 *   - 유효한 securityKey 제시 → 새 securityKey 발급, 이전 key 는 previousKey 로 보존
 *   - previousKey 로 접근 → TOKEN_THEFT: 레코드 삭제 + 전체 세션 무효화 + 보안 알림
 *
 * @MX:ANCHOR: [AUTO] AutoLogin 단일 진입점 — 쿠키 기반 자동 로그인 흐름이 본 함수를 통과한다.
 * @MX:REASON: 키 rotation/도난 감지/세션 무효화가 한 곳에 모여야 우회 경로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053, AC-AUTH-019, AC-AUTH-053
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { generateToken } from './tokens';
import type { MailDispatcher } from './mail';
import { NoopMailDispatcher } from './mail';
import { revokeAllSessions } from './session-revocation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateAutoLoginInput {
  userId: number;
  ip: string;
  userAgent: string;
  deviceId?: string;
}

export interface CreateAutoLoginCtx {
  prisma: PrismaClient;
}

export interface VerifyAutoLoginInput {
  securityKey: string;
  ip: string;
  userAgent: string;
}

export interface VerifyAutoLoginCtx {
  prisma: PrismaClient;
  mail?: MailDispatcher;
}

export type AutoLoginResult =
  | { ok: true; userId: number; autoLoginId: number }
  | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_THEFT' };

export interface RevokeAutoLoginInput {
  autoLoginId: number;
}

export interface RevokeAutoLoginCtx {
  prisma: PrismaClient;
}

// ---------------------------------------------------------------------------
// createAutoLogin
// ---------------------------------------------------------------------------

export async function createAutoLogin(
  input: CreateAutoLoginInput,
  ctx: CreateAutoLoginCtx,
): Promise<{ securityKey: string }> {
  const securityKey = generateToken();

  await ctx.prisma.autoLogin.create({
    data: {
      userId: input.userId,
      securityKey,
      previousKey: null,
      ip: input.ip,
      userAgent: input.userAgent,
      deviceId: input.deviceId ?? null,
      expiresAt: new Date(Date.now() + 30 * 86400_000), // 30일
    } as never,
  });

  return { securityKey };
}

// ---------------------------------------------------------------------------
// verifyAutoLogin
// ---------------------------------------------------------------------------

export async function verifyAutoLogin(
  input: VerifyAutoLoginInput,
  ctx: VerifyAutoLoginCtx,
): Promise<AutoLoginResult> {
  const { prisma } = ctx;
  const mail = ctx.mail ?? new NoopMailDispatcher();

  // 1) securityKey 로 정확한 매치 시도.
  const record = await prisma.autoLogin.findFirst({
    where: { securityKey: input.securityKey } as never,
  });

  if (record) {
    // 유효한 key — rotation 수행 (AC-AUTH-019).
    const newKey = generateToken();
    const autoLoginRecord = record as unknown as { id: number; userId: number; securityKey: string };

    await prisma.autoLogin.update({
      where: { id: autoLoginRecord.id },
      data: {
        securityKey: newKey,
        previousKey: autoLoginRecord.securityKey,
        ip: input.ip,
        userAgent: input.userAgent,
        lastUsedAt: new Date(),
      } as never,
    });

    return { ok: true, userId: autoLoginRecord.userId, autoLoginId: autoLoginRecord.id };
  }

  // 2) securityKey 매치 실패 → previousKey 에서 도난 감지 확인.
  const theftRecord = await prisma.autoLogin.findFirst({
    where: { previousKey: input.securityKey } as never,
  });

  if (theftRecord) {
    // TOKEN_THEFT: previousKey 와 매치 → 도난된 키 사용 (AC-AUTH-053).
    const theftAutoLogin = theftRecord as unknown as { id: number; userId: number };

    // 레코드 삭제.
    await prisma.autoLogin.delete({
      where: { id: theftAutoLogin.id },
    });

    // 전체 세션 무효화.
    await revokeAllSessions(theftAutoLogin.userId, 'USER_LOGOUT_ALL', {
      prisma,
      actorId: theftAutoLogin.userId,
    });

    // 보안 알림 메일 발송.
    const user = await prisma.user.findUnique({
      where: { id: theftAutoLogin.userId },
    });
    if (user) {
      const userRecord = user as unknown as { emailAddress: string; nickName: string };
      await mail.dispatch({
        to: userRecord.emailAddress,
        subject: '보안 알림: 자동 로그인 토큰 도난 감지',
        template: 'security-alert',
        vars: {
          userName: userRecord.nickName,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
    }

    return { ok: false, code: 'TOKEN_THEFT' };
  }

  // 3) 아무 매치 없음.
  return { ok: false, code: 'TOKEN_INVALID' };
}

// ---------------------------------------------------------------------------
// revokeAutoLogin
// ---------------------------------------------------------------------------

export async function revokeAutoLogin(
  input: RevokeAutoLoginInput,
  ctx: RevokeAutoLoginCtx,
): Promise<void> {
  await ctx.prisma.autoLogin.delete({
    where: { id: input.autoLoginId },
  });
}
