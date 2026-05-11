/**
 * Login pipeline — SPEC-AUTH-001 Slice C.
 *
 * 순수 비즈니스 로직: Auth.js Credentials Provider의 `authorize()`가 본 함수를
 * 호출하고, Server Action 또한 동일한 진입점을 통과한다.
 *
 * 책임:
 *   1. 입력 정규화 (REQ-AUTH-006: identifier/password 비-공백 + Zod 보다 가벼운 가드)
 *   2. citext-스타일 식별자 조회 (userId or email, 케이스 무시)
 *   3. DeniedIdentifier 차단 (REQ-AUTH-052를 로그인 시점까지 확장)
 *   4. status 게이트 (UNAUTHED/SUSPENDED/DENIED/DELETED 모두 INVALID_CREDENTIALS — REQ-AUTH-051)
 *   5. Argon2id verify (Slice A `verifyPassword`); 사용자 미존재 시에도 dummy verify로 타이밍 평준화
 *   6. needsRehash:true 일 경우 같은 트랜잭션 내에서 재해싱 (REQ-AUTH-014)
 *   7. lastLoginIp / lastLoginAt 갱신 + LoginAttempt SUCCESS 행 + AuditLog LOGIN
 *   8. 실패 시 LoginAttempt INVALID_CREDENTIALS + AuditLog LOGIN_FAILED
 *
 * 보안 불변식 (REQ-AUTH-005, REQ-AUTH-051, REQ-AUTH-055):
 *   - 평문 비밀번호와 토큰은 절대 로깅하지 않는다 (이 모듈은 logger 미사용).
 *   - 모든 실패는 단일 코드 INVALID_CREDENTIALS — 어느 단계에서 실패했는지 노출하지 않는다.
 *   - 실패 응답 객체의 키는 정확히 ["ok","code"] (signup.ts의 SignupFailure와 동일 형식).
 *
 * @MX:ANCHOR: 로그인 단일 진입점 — Auth.js authorize()/Server Action 모두 본 함수를 통과한다.
 * @MX:REASON: 비밀번호 검증/재해싱/감사 로그가 한 곳에 모여야 한 우회로 보안이 무너지지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-013, REQ-AUTH-014, REQ-AUTH-015, REQ-AUTH-051, REQ-AUTH-052, REQ-AUTH-055
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { hashPassword, verifyPassword } from './password';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginInput {
  /** user_id or email — case-insensitive lookup. */
  identifier: string;
  password: string;
  ip: string;
  userAgent?: string;
}

export interface LoginConfig {
  /** REQ-AUTH-041: only 'normal' is enforced in Slice C. */
  passwordPolicy: 'normal' | 'strong' | 'very_strong';
  /** REQ-AUTH-033: IP 기반 rate-limit window 내 최대 실패 횟수 (기본 5). */
  maxErrorCount?: number;
  /** REQ-AUTH-033: rate-limit window 길이 (분, 기본 10). */
  windowMinutes?: number;
}

/** Public-facing user payload — never includes passwordHash. */
export interface LoginUser {
  id: number;
  userId: string;
  emailAddress: string;
  nickName: string;
  isAdmin: boolean;
}

export interface LoginResult {
  ok: true;
  user: LoginUser;
  /** True iff REQ-AUTH-014 transparent rehash kicked in during this login. */
  rehashed: boolean;
}

export interface LoginFailure {
  ok: false;
  code: 'INVALID_CREDENTIALS' | 'RATE_LIMITED';
  // 의도적으로 추가 필드 없음 — REQ-AUTH-051.
}

interface LoginCtx {
  prisma: PrismaClient;
  config: LoginConfig;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Constant-ish dummy hash used to equalize wall time when the lookup misses.
 *
 * We compute a fresh dummy hash once per process to avoid leaking whether the
 * user exists via timing alone. The first call is slower (one hashPassword)
 * but subsequent calls just run `verifyPassword(plain, DUMMY_ENCODED)` which
 * dominates the cost.
 */
let dummyEncodedPromise: Promise<string> | null = null;
function getDummyEncoded(): Promise<string> {
  if (dummyEncodedPromise === null) {
    dummyEncodedPromise = hashPassword('timing-equalizer-not-a-real-password');
  }
  return dummyEncodedPromise;
}

const FAIL: LoginFailure = { ok: false, code: 'INVALID_CREDENTIALS' };

export async function login(
  rawInput: LoginInput,
  ctx: LoginCtx,
): Promise<LoginResult | LoginFailure> {
  // 0) 가벼운 입력 가드 — 빈 문자열/공백만 있는 식별자는 zod에 도달하기 전에 거른다.
  //    REQ-AUTH-051: 어떤 단계에서 실패했는지 알리지 않으므로 LoginAttempt도 안 남김.
  if (
    typeof rawInput?.identifier !== 'string' ||
    typeof rawInput?.password !== 'string' ||
    rawInput.identifier.trim().length === 0 ||
    rawInput.password.length === 0
  ) {
    return FAIL;
  }

  const identifier = rawInput.identifier.trim();
  const ip = rawInput.ip;
  const userAgent = rawInput.userAgent ?? '';

  // 0.5) Rate-limit gate — REQ-AUTH-033, AC-AUTH-033.
  //   window 내 INVALID_CREDENTIALS 실패 횟수가 maxErrorCount 이상이면 즉시 차단.
  const maxErrorCount = ctx.config.maxErrorCount ?? 5;
  const windowMinutes = ctx.config.windowMinutes ?? 10;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  const failCount = await ctx.prisma.loginAttempt.count({
    where: {
      ip,
      result: 'INVALID_CREDENTIALS',
      createdAt: { gt: windowStart },
    } as never,
  });
  if (failCount >= maxErrorCount) {
    await ctx.prisma.loginAttempt.create({
      data: {
        ip,
        identifier,
        result: 'RATE_LIMITED',
      } as never,
    });
    return { ok: false, code: 'RATE_LIMITED' };
  }

  // 1) DeniedIdentifier check — REQ-AUTH-052는 가입 단계가 1차이지만,
  //    이미 가입한 식별자가 사후 차단 목록에 추가될 수 있으므로 로그인에서도 검사.
  const deniedHit = await ctx.prisma.deniedIdentifier.findFirst({
    where: {
      OR: [
        { kind: 'USER_ID', pattern: identifier },
        { kind: 'NICK_NAME', pattern: identifier },
      ],
    },
  });
  if (deniedHit) {
    return await failClosed(ctx, ip, identifier, userAgent);
  }

  // 2) 식별자 조회 (userId or email, 케이스 무시 — citext가 DB에서 처리).
  const user = await ctx.prisma.user.findFirst({
    where: {
      OR: [{ userId: identifier }, { emailAddress: identifier }],
    },
  });

  // 3) 사용자 없음 → dummy verify 후 INVALID_CREDENTIALS (타이밍 평준화).
  if (!user) {
    await verifyPassword(rawInput.password, await getDummyEncoded());
    return await failClosed(ctx, ip, identifier, userAgent);
  }

  // 4) status 게이트 — UNAUTHED/SUSPENDED/DENIED/DELETED 모두 동일한 코드로 반환.
  //    REQ-AUTH-051: "verify your email" 등 정보 누설 없이 일관된 응답.
  if (user.status !== 'APPROVED') {
    // 비밀번호 검증조차 하지 않는다 (계정이 잠긴 상태에서 valid/invalid 구분이
    // 의미 없고, 잠긴 계정에 대한 무차별 시도를 LoginAttempt에 누적할 필요도 없다).
    // status별 LoginAttempt 카운터 정책은 Slice E의 rate-limiter가 도입할 때 분화.
    return await failClosed(ctx, ip, identifier, userAgent);
  }

  // 5) Argon2id verify.
  const verifyResult = await verifyPassword(
    rawInput.password,
    user.passwordHash,
  );
  if (!verifyResult.valid) {
    return await failClosed(ctx, ip, identifier, userAgent);
  }

  // 6) 성공 경로 — rehash 필요 시 같은 트랜잭션에서 비밀번호 + 메타데이터 갱신.
  //    REQ-AUTH-013: lastLoginIp/lastLoginAt + LoginAttempt SUCCESS도 한 트랜잭션.
  let rehashed = false;
  let newHash: string | null = null;
  if (verifyResult.needsRehash) {
    newHash = await hashPassword(rawInput.password);
    rehashed = true;
  }

  await ctx.prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      lastLoginIp: ip,
      lastLoginAt: new Date(),
    };
    if (newHash) {
      updateData.passwordHash = newHash;
      updateData.passwordAlgo = 'argon2id';
      updateData.passwordChangedAt = new Date();
    }
    await tx.user.update({
      where: { id: user.id },
      data: updateData as never,
    });

    await tx.loginAttempt.create({
      data: {
        ip,
        identifier,
        result: 'SUCCESS',
      } as never,
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        targetId: user.id,
        action: 'LOGIN',
        ip,
        userAgent,
      } as never,
    });
  });

  return {
    ok: true,
    user: {
      id: user.id,
      userId: user.userId,
      emailAddress: user.emailAddress,
      nickName: user.nickName,
      isAdmin: user.isAdmin,
    },
    rehashed,
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Record a uniform "invalid credentials" failure: writes a LoginAttempt FAIL
 * row and an AuditLog LOGIN_FAILED entry, then returns the canonical
 * {@link FAIL} tuple.
 *
 * REQ-AUTH-015: increments the IP-based failure ledger.
 * REQ-AUTH-051: same code regardless of root cause (no leak).
 */
async function failClosed(
  ctx: LoginCtx,
  ip: string,
  identifier: string,
  userAgent: string,
): Promise<LoginFailure> {
  await ctx.prisma.$transaction(async (tx) => {
    await tx.loginAttempt.create({
      data: {
        ip,
        identifier,
        result: 'INVALID_CREDENTIALS',
      } as never,
    });
    await tx.auditLog.create({
      data: {
        actorId: null,
        targetId: null,
        action: 'LOGIN_FAILED',
        ip,
        userAgent,
      } as never,
    });
  });
  return FAIL;
}
