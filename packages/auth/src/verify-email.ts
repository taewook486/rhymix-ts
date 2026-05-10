/**
 * Email verification — SPEC-AUTH-001 Slice C.
 *
 * Slice B가 발급한 SIGNUP 토큰을 소비하여 회원 status를 UNAUTHED → APPROVED로
 * 전이시킨다. 이 함수는 Server Action `verifyEmailAction`이 호출하며,
 * tRPC verifyEmail 프로시저(spec.md L439)는 후속 슬라이스에서 도입.
 *
 * 책임:
 *   1. 토큰 조회 (authKey unique)
 *   2. 타입 검증 (SIGNUP만 통과)
 *   3. 만료 검사 (TOKEN_EXPIRED — 일관된 실패 코드)
 *   4. 이미 소비된 토큰 (TOKEN_INVALID)
 *   5. 트랜잭션:
 *      - 토큰 consumedAt 마킹
 *      - User.status 가 UNAUTHED 면 APPROVED 로 전이 (이미 APPROVED 면 idempotent skip)
 *      - AuditLog EMAIL_VERIFIED 기록
 *
 * 보안 불변식 (REQ-AUTH-051, REQ-AUTH-055):
 *   - 토큰 자체를 로깅하지 않는다 (이 모듈은 logger 미사용).
 *   - 실패 응답에는 어느 단계에서 실패했는지 노출하지 않으나, 만료된 경우만은
 *     사용자에게 "재발송"을 안내해야 하므로 TOKEN_EXPIRED와 TOKEN_INVALID를 분리.
 *     이는 REQ-AUTH-051의 "uniform login error" 정신을 따르되, 만료 안내가 UX 상
 *     필수라는 트레이드오프 — 토큰 존재 여부를 직접 노출하지는 않는다.
 *   - 토큰 비교는 DB unique 인덱스에 위임 (DB 컬럼은 plaintext 저장이지만,
 *     발급된 토큰 자체가 256-bit 엔트로피이므로 추가 hashing은 deferred).
 *
 * @MX:ANCHOR: 이메일 인증 단일 진입점 — Server Action / 향후 tRPC 모두 본 함수를 통과한다.
 * @MX:REASON: 토큰 소비/상태 전이/감사 로그가 한 트랜잭션에 묶여야 부분 적용으로 인한 불일치를 막는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-012, AC-AUTH-012
 */

import type { PrismaClient } from '@rhymix-ts/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailCtx {
  prisma: PrismaClient;
}

export type VerifyEmailErrorCode = 'TOKEN_INVALID' | 'TOKEN_EXPIRED';

export interface VerifyEmailSuccess {
  ok: true;
  userId: number;
  /** True if the user was already APPROVED before this call. */
  alreadyVerified: boolean;
}

export interface VerifyEmailFailure {
  ok: false;
  code: VerifyEmailErrorCode;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const INVALID: VerifyEmailFailure = { ok: false, code: 'TOKEN_INVALID' };
const EXPIRED: VerifyEmailFailure = { ok: false, code: 'TOKEN_EXPIRED' };

export async function verifyEmail(
  input: VerifyEmailInput,
  ctx: VerifyEmailCtx,
): Promise<VerifyEmailSuccess | VerifyEmailFailure> {
  // 1) 입력 가드.
  if (typeof input?.token !== 'string' || input.token.length === 0) {
    return INVALID;
  }

  // 2) 토큰 조회.
  const token = await ctx.prisma.emailAuthToken.findUnique({
    where: { authKey: input.token },
  });
  if (!token) return INVALID;

  // 3) 타입 가드.
  if (token.authType !== 'SIGNUP') return INVALID;

  // 4) 이미 소비된 토큰.
  if (token.consumedAt !== null) return INVALID;

  // 5) 만료 검사.
  if (token.expiresAt.getTime() <= Date.now()) return EXPIRED;

  // 6) 사용자 조회.
  const user = await ctx.prisma.user.findUnique({
    where: { id: token.userId },
  });
  if (!user) return INVALID;

  // 7) 트랜잭션: 토큰 소비 + status 전이 + audit log.
  const wasAlreadyApproved = user.status === 'APPROVED';

  await ctx.prisma.$transaction(async (tx) => {
    await tx.emailAuthToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() } as never,
    });

    if (!wasAlreadyApproved) {
      await tx.user.update({
        where: { id: user.id },
        data: { status: 'APPROVED' } as never,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        targetId: user.id,
        action: 'EMAIL_VERIFIED',
      } as never,
    });
  });

  return {
    ok: true,
    userId: user.id,
    alreadyVerified: wasAlreadyApproved,
  };
}
