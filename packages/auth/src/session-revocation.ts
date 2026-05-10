/**
 * Session revocation — SPEC-AUTH-001 Slice D1.
 *
 * REQ-AUTH-020 enforcement *primitive*. JWT 전략을 유지한 채로 즉시 무효화 효과를
 * 얻기 위해, 모든 세션을 무효화하려는 호출자는 본 모듈의 `revokeAllSessions(userId, reason, ctx)`
 * 를 호출한다. jwt callback 은 매 요청마다 `isSessionRevoked(userId, tokenIat, ctx)` 를 호출해
 * 토큰 발급 시각이 최신 revocation 시각보다 이전이면 토큰을 거부한다.
 *
 * 책임:
 *   1. SessionRevocation 테이블에 row 1개 추가 (audit history)
 *   2. User.sessionsRevokedAt 비정규화 컬럼을 같은 timestamp 로 갱신 (fast-path)
 *   3. AuditLog 에 SESSION_REVOKED 이벤트 기록 (actorId, targetId=userId, metadata.reason)
 *   1~3번을 단일 트랜잭션으로 묶어 부분 적용을 방지한다.
 *
 * 보안 불변식 (REQ-AUTH-051, REQ-AUTH-055):
 *   - 본 모듈은 logger 를 사용하지 않는다.
 *   - reason 은 자유 문자열이지만 컨벤션 4종 (STATUS_CHANGED, ADMIN_FORCE_LOGOUT,
 *     PASSWORD_CHANGED, USER_LOGOUT_ALL) 만 사용한다 — 사용 패턴이 안정되면 enum 화 검토.
 *   - 호출자가 actorId 를 생략하면 null 로 기록된다 (사용자 본인의 USER_LOGOUT_ALL 등).
 *
 * @MX:ANCHOR: 세션 무효화 단일 진입점 — admin status 변경(D2)/비밀번호 변경(F)/사용자 self-logout 모두 본 함수를 통과한다.
 * @MX:REASON: SessionRevocation 테이블 + User.sessionsRevokedAt 비정규화 + AuditLog 가 한 트랜잭션에 묶여야 부분 적용으로 인한 enforcement 우회를 막을 수 있다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020
 */

import type { PrismaClient } from '@rhymix-ts/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Reason 컨벤션 4종.
 *
 * 컬럼은 String 으로 저장하므로 임의 값도 허용되지만, 본 union 에 명시된 값만
 * 호출 사이트에서 사용해야 한다. enum 승격은 Slice D2/E 에서 사용 패턴이
 * 안정된 후 결정한다.
 */
export type RevocationReason =
  | 'STATUS_CHANGED'
  | 'ADMIN_FORCE_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'USER_LOGOUT_ALL';

export interface RevokeSessionsContext {
  /** PrismaClient 또는 트랜잭션 클라이언트. */
  prisma: PrismaClient;
  /** AuditLog actorId — 생략 시 null (USER_LOGOUT_ALL 등 self-action). */
  actorId?: number;
}

export interface IsSessionRevokedContext {
  prisma: PrismaClient;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * @MX:ANCHOR: 세션 무효화 단일 진입점.
 * @MX:REASON: 트랜잭션 단위로 history + denormalized + audit log 가 atomic 하게 적용되어야 enforcement 가 의미를 가진다.
 */
export async function revokeAllSessions(
  userId: number,
  reason: RevocationReason,
  ctx: RevokeSessionsContext,
): Promise<{ revokedAt: Date }> {
  const revokedAt = new Date();
  const actorId = ctx.actorId ?? null;

  await ctx.prisma.$transaction(async (tx) => {
    // 1) SessionRevocation row (audit history)
    await tx.sessionRevocation.create({
      data: {
        userId,
        revokedAt,
        reason,
      } as never,
    });

    // 2) User.sessionsRevokedAt fast-path 갱신
    await tx.user.update({
      where: { id: userId },
      data: { sessionsRevokedAt: revokedAt } as never,
    });

    // 3) AuditLog SESSION_REVOKED
    await tx.auditLog.create({
      data: {
        actorId,
        targetId: userId,
        action: 'SESSION_REVOKED',
        metadata: { reason },
      } as never,
    });
  });

  return { revokedAt };
}

/**
 * @MX:ANCHOR: 토큰 유효성 fast-path 검사 — jwt callback 의 매 요청 hot path.
 * @MX:REASON: User.sessionsRevokedAt 단일 컬럼 비교로 SessionRevocation 테이블 JOIN 없이 O(1) 인덱스 lookup 만 발생시킨다.
 */
export async function isSessionRevoked(
  userId: number,
  tokenIssuedAt: Date,
  ctx: IsSessionRevokedContext,
): Promise<boolean> {
  // Fast-path: 비정규화 컬럼만 읽는다 (SessionRevocation 테이블에 접근하지 않음).
  // 이 컬럼은 revokeAllSessions 가 항상 SessionRevocation 의 최신 revokedAt 와
  // 동일한 값으로 갱신하므로 단일 source of truth 로 사용 가능.
  const user = await ctx.prisma.user.findUnique({
    where: { id: userId },
    select: { sessionsRevokedAt: true } as never,
  });

  if (!user) {
    // 사용자 미존재: 방어적으로 false 반환 (호출 경로가 별도로 사용자 존재를 검증한다).
    return false;
  }

  const revokedAt = (user as { sessionsRevokedAt: Date | null })
    .sessionsRevokedAt;
  if (revokedAt === null || revokedAt === undefined) {
    return false;
  }

  // 엄격한 ">" 비교: tokenIat == revokedAt 이면 not revoked (revoke 와 동시에 발급된 토큰은 살아있음).
  return revokedAt.getTime() > tokenIssuedAt.getTime();
}
