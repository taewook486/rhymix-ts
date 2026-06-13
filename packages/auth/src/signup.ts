/**
 * Signup pipeline — SPEC-AUTH-001 Slice B.
 *
 * 순수 비즈니스 로직: Server Action / tRPC 래퍼는 Slice C 이후에 추가.
 *
 * 책임:
 *   1. Zod 검증 (REQ-AUTH-006)
 *   2. 비밀번호 정책 (REQ-AUTH-041 normal-tier만 — 강력/매우-강력은 후속)
 *   3. DeniedIdentifier 차단 (REQ-AUTH-052)
 *   4. user_id / email / phone 사전 중복 체크 (REQ-AUTH-010)
 *   5. Argon2id 해싱 (REQ-AUTH-001 — Slice A의 hashPassword 재사용)
 *   6. 트랜잭션: User 생성 → (조건부) EmailAuthToken 발급 → AuditLog 기록
 *   7. 트랜잭션 커밋 후 메일 디스패치 (실패해도 회원가입 자체는 ok)
 *
 * 보안 불변식 (REQ-AUTH-005, REQ-AUTH-051, REQ-AUTH-055):
 *   - 평문 비밀번호와 토큰은 절대 로깅하지 않는다 (이 모듈은 logger 미사용).
 *   - 실패 응답에는 어느 필드가 충돌했는지 노출하지 않는다 (failure tuple은 ok+code뿐).
 *   - Prisma P2002 race-condition은 IDENTIFIER_TAKEN으로 일관 변환.
 *
 * @MX:ANCHOR: 회원가입 단일 진입점 — Server Action / tRPC 모두 본 함수를 통과한다.
 * @MX:REASON: 검증/해싱/감사 로그가 한 곳에 모여야 한 번의 우회로 보안이 무너지지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-051, REQ-AUTH-052
 */

import type { PrismaClient } from '@rhymix-ts/db';
import { z } from 'zod';

import { hashPassword } from './password';
import type { MailDispatcher } from './mail';
import { generateToken } from './tokens';
// SPEC-POINT-001 REQ-POINT-070: 회원가입 보너스 포인트 지급
import { pointHooks } from '@rhymix-ts/point';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const SignupInput = z.object({
  userId: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9_.-]+$/),
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  nickName: z.string().min(1).max(80),
  userName: z.string().max(120).optional(),
  phoneNumber: z.string().max(32).optional(),
  phoneCountry: z.string().length(2).optional(),
  agreements: z
    .array(z.object({ key: z.string(), version: z.string() }))
    .default([]),
  extraVars: z.record(z.unknown()).default({}),
  ip: z.string().max(64),
  userAgent: z.string().max(512).default(''),
});
export type SignupInput = z.infer<typeof SignupInput>;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SignupConfig {
  /** REQ-AUTH-011: when true, new accounts start UNAUTHED + verification mail. */
  enableConfirm: boolean;
  /** EmailAuthToken expiry window when enableConfirm. */
  signupTokenTtlHours: number;
  /** REQ-AUTH-041: only 'normal' is enforced in Slice B. */
  passwordPolicy: 'normal' | 'strong' | 'very_strong';
  /** SPEC-POINT-001 REQ-POINT-070: 회원가입 보너스 포인트 (0 = 비활성화) */
  signupBonus?: number;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SignupErrorCode =
  | 'VALIDATION_FAILED'
  | 'IDENTIFIER_TAKEN'
  | 'IDENTIFIER_DENIED'
  | 'WEAK_PASSWORD';

export interface SignupResult {
  ok: true;
  userId: number;
  status: 'APPROVED' | 'UNAUTHED';
  requiresEmailVerification: boolean;
}

export interface SignupFailure {
  ok: false;
  code: SignupErrorCode;
  // 의도적으로 추가 필드 없음 — REQ-AUTH-051: 실패 응답에 어느 필드가 문제인지 누설 금지.
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Common-password micro-blocklist used by the NORMAL policy tier.
 *
 * Slice B는 Zod min(10) + 본 목록만 검사한다. STRONG / VERY_STRONG의 본격적인
 * 정책 (문자 클래스, RockYou 데이터베이스 등)은 후속 슬라이스에서 도입한다.
 *
 * @MX:TODO: STRONG / VERY_STRONG 정책은 후속 슬라이스에서 본격적으로 구현.
 * @MX:REASON: 본 슬라이스의 SPEC 범위는 NORMAL 티어만 다룸 (REQ-AUTH-041).
 */
const COMMON_PASSWORDS = new Set<string>([
  'password',
  '1234567890',
  'qwertyuiop',
]);

interface SignupCtx {
  prisma: PrismaClient;
  mail: MailDispatcher;
  config: SignupConfig;
}

export async function signup(
  rawInput: unknown,
  ctx: SignupCtx,
): Promise<SignupResult | SignupFailure> {
  // 1) Zod validation (REQ-AUTH-006).
  const parsed = SignupInput.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_FAILED' };
  }
  const input = parsed.data;

  // 2) Password policy (REQ-AUTH-041 NORMAL).
  if (COMMON_PASSWORDS.has(input.password.toLowerCase())) {
    return { ok: false, code: 'WEAK_PASSWORD' };
  }

  // citext가 DB 레벨에서 케이스 무시 비교를 처리하므로 여기서는 raw 값을 그대로 전달.

  // 3) DeniedIdentifier (REQ-AUTH-052).
  const denied = await ctx.prisma.deniedIdentifier.findFirst({
    where: {
      OR: [
        { kind: 'USER_ID', pattern: input.userId },
        { kind: 'NICK_NAME', pattern: input.nickName },
      ],
    },
  });
  if (denied) {
    return { ok: false, code: 'IDENTIFIER_DENIED' };
  }

  // 4) Best-effort uniqueness pre-check (REQ-AUTH-010). DB unique 제약이 source of truth.
  const dupOr: Array<{ userId?: string; emailAddress?: string; phoneNumber?: string }> = [
    { userId: input.userId },
    { emailAddress: input.email },
  ];
  if (input.phoneNumber) dupOr.push({ phoneNumber: input.phoneNumber });
  const duplicate = await ctx.prisma.user.findFirst({ where: { OR: dupOr } });
  if (duplicate) {
    return { ok: false, code: 'IDENTIFIER_TAKEN' };
  }

  // 5) Argon2id hash (REQ-AUTH-001).
  const passwordHash = await hashPassword(input.password);

  // 6) Transaction: user + (optional) token + audit-log.
  const status = ctx.config.enableConfirm ? 'UNAUTHED' : 'APPROVED';
  let createdUserId: number;
  let issuedTokenKey: string | null = null;

  try {
    const txResult = await ctx.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: input.userId,
          emailAddress: input.email,
          passwordHash,
          nickName: input.nickName,
          userName: input.userName,
          phoneNumber: input.phoneNumber ?? null,
          phoneCountry: input.phoneCountry ?? null,
          status,
          extraVars: input.extraVars as object,
        } as never,
      });

      let tokenKey: string | null = null;
      if (ctx.config.enableConfirm) {
        tokenKey = generateToken();
        const expiresAt = new Date(
          Date.now() + ctx.config.signupTokenTtlHours * 3600 * 1000,
        );
        await tx.emailAuthToken.create({
          data: {
            userId: user.id,
            authKey: tokenKey,
            authType: 'SIGNUP',
            expiresAt,
          } as never,
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: null,
          targetId: user.id,
          action: 'SIGNUP',
          ip: input.ip,
          userAgent: input.userAgent,
        } as never,
      });

      return { id: user.id, tokenKey };
    });
    createdUserId = txResult.id;
    issuedTokenKey = txResult.tokenKey;
  } catch (err) {
    // Prisma unique-constraint race → uniform IDENTIFIER_TAKEN response.
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, code: 'IDENTIFIER_TAKEN' };
    }
    throw err;
  }

  // 7) Post-commit mail dispatch — fire-and-forget. 실패해도 가입 자체는 성공.
  if (issuedTokenKey) {
    try {
      await ctx.mail.dispatch({
        to: input.email,
        subject: 'Verify your email',
        template: 'signup-verify',
        vars: {
          // verifyUrl 조립은 Server Action 레이어가 origin을 알기에 거기서 처리.
          // Slice B 단계에서는 placeholder 만 전달.
          verifyUrl: `PLACEHOLDER:${issuedTokenKey}`,
          userName: input.nickName,
        },
      });
    } catch {
      // REQ-AUTH-055: 실패 사유 로깅 금지 (logger 미사용).
    }
  }

  // 7.5) Signup bonus (REQ-POINT-070) — post-commit, fire-and-forget
  if (ctx.config.signupBonus && ctx.config.signupBonus > 0) {
    try {
      await pointHooks.onMemberSignedUp(ctx.prisma, {
        memberId: createdUserId,
        signupBonus: ctx.config.signupBonus,
      });
    } catch {
      // 실패해도 가입 성공 유지 (idempotent on retry via unique constraint)
    }
  }

  return {
    ok: true,
    userId: createdUserId,
    status,
    requiresEmailVerification: ctx.config.enableConfirm,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPrismaUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === 'P2002';
}
