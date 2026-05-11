/**
 * Password reset — SPEC-AUTH-001 Slice E (E-2).
 *
 * 책임:
 *   1. `requestPasswordReset` — REQ-AUTH-016: 비밀번호 재설정 요청 + 토큰 발급 + 메일 발송
 *   2. `confirmPasswordReset` — REQ-AUTH-017: 토큰 소비 + 비밀번호 변경 + 세션/autologin 무효화
 *
 * 보안 불변식 (REQ-AUTH-051, REQ-AUTH-055):
 *   - requestPasswordReset 은 식별자 존재 여부를 노출하지 않는다 (항상 ok:true).
 *   - 평문 비밀번호와 토큰은 절대 로깅하지 않는다 (이 모듈은 logger 미사용).
 *
 * @MX:ANCHOR: [AUTO] 비밀번호 재설정 단일 진입점 — Server Action 이 본 함수를 통과한다.
 * @MX:REASON: 토큰 발급/소비/비밀번호 변경/세션 무효화가 한 곳에 모여야 우회 경로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-016, REQ-AUTH-017, AC-AUTH-017
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { hashPassword } from './password';
import { generateToken } from './tokens';
import type { MailDispatcher } from './mail';
import { revokeAllSessions } from './session-revocation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestPasswordResetInput {
  /** userId 또는 emailAddress — case-insensitive lookup. */
  identifier: string;
}

export interface RequestPasswordResetCtx {
  prisma: PrismaClient;
  mail: MailDispatcher;
}

export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
}

export interface ConfirmPasswordResetCtx {
  prisma: PrismaClient;
}

export type PasswordResetResult = { ok: true };

export type ConfirmResetResult =
  | { ok: true }
  | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'WEAK_PASSWORD' };

// ---------------------------------------------------------------------------
// requestPasswordReset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  ctx: RequestPasswordResetCtx,
): Promise<PasswordResetResult> {
  if (!input?.identifier || input.identifier.trim().length === 0) {
    // REQ-AUTH-051: 식별자 미노출 — 빈 입력도 ok:true.
    return { ok: true };
  }

  const identifier = input.identifier.trim();

  // 사용자 조회 (userId or emailAddress, case-insensitive via citext).
  const user = await ctx.prisma.user.findFirst({
    where: {
      OR: [{ userId: identifier }, { emailAddress: identifier }],
    } as never,
  });

  // REQ-AUTH-051: 사용자가 없거나 DELETED 상태면 아무것도 하지 않고 ok:true.
  if (!user || (user as { status: string }).status === 'DELETED') {
    return { ok: true };
  }

  // 토큰 발급.
  const authKey = generateToken();
  const expiresAt = new Date(Date.now() + 3600_000); // 1시간

  await ctx.prisma.emailAuthToken.create({
    data: {
      userId: (user as { id: number }).id,
      authKey,
      authType: 'PASSWORD_RESET',
      expiresAt,
    } as never,
  });

  // 메일 발송 (트랜잭션 밖 — 실패해도 토큰은 유효).
  await ctx.mail.dispatch({
    to: (user as { emailAddress: string }).emailAddress,
    subject: '비밀번호 재설정',
    template: 'password-reset',
    vars: {
      resetToken: authKey,
      userName: (user as { nickName: string }).nickName,
    },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// confirmPasswordReset
// ---------------------------------------------------------------------------

/** NORMAL 정책 최소 길이 (password-config.ts 패턴과 동일). */
const MIN_PASSWORD_LENGTH = 10;

export async function confirmPasswordReset(
  input: ConfirmPasswordResetInput,
  ctx: ConfirmPasswordResetCtx,
): Promise<ConfirmResetResult> {
  // 1) 토큰 조회.
  if (!input?.token || input.token.length === 0) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  const token = await ctx.prisma.emailAuthToken.findUnique({
    where: { authKey: input.token },
  });

  if (!token) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  // 2) 타입 가드.
  if (token.authType !== 'PASSWORD_RESET') {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  // 3) 이미 소비된 토큰.
  if (token.consumedAt !== null) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }

  // 4) 만료 검사.
  if (token.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: 'TOKEN_EXPIRED' };
  }

  // 5) 비밀번호 정책 검증 (NORMAL).
  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, code: 'WEAK_PASSWORD' };
  }

  // 6) 비밀번호 해싱.
  const newHash = await hashPassword(input.newPassword);
  const userId = token.userId;

  // 7) 트랜잭션: 비밀번호 변경 + 토큰 소비 + AuditLog.
  await ctx.prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordAlgo: 'argon2id',
        passwordChangedAt: new Date(),
      } as never,
    });

    await tx.emailAuthToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() } as never,
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        targetId: userId,
        action: 'PASSWORD_RESET',
      } as never,
    });
  });

  // 8) 트랜잭션 후: 세션 무효화 + autologin 삭제 (AC-AUTH-017).
  await revokeAllSessions(userId, 'PASSWORD_CHANGED', {
    prisma: ctx.prisma,
    actorId: userId,
  });

  await ctx.prisma.autoLogin.deleteMany({
    where: { userId },
  });

  return { ok: true };
}
