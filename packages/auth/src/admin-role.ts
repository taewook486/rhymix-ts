/**
 * Admin role toggle — SPEC-AUTH-001 Slice E (E-4).
 *
 * REQ-AUTH-054, AC-AUTH-054: admin 승격/강등 + 마지막 admin 보호.
 *
 * 책임:
 *   1. Actor 가 effective admin 인지 검증 (resolveAdminPrivilege)
 *   2. 강등 시 assertCanDemote 호출 (pg_advisory_xact_lock race-safe)
 *   3. User.isAdmin 업데이트 + AuditLog 기록
 *
 * @MX:ANCHOR: [AUTO] admin 역할 토글 단일 진입점.
 * @MX:REASON: 권한 검증과 마지막 admin 보호가 한 곳에 모여야 우회로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-054, AC-AUTH-054
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { resolveAdminPrivilege, assertCanDemote, LastAdminProtectedError } from './rbac';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToggleAdminRoleInput {
  targetUserId: number;
  setAdmin: boolean;
  actorId: number;
}

export interface ToggleAdminRoleCtx {
  prisma: PrismaClient;
}

export type ToggleAdminRoleResult =
  | { ok: true }
  | { ok: false; code: 'INSUFFICIENT_PRIVILEGES' | 'LAST_ADMIN_PROTECTED' };

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function toggleAdminRole(
  input: ToggleAdminRoleInput,
  ctx: ToggleAdminRoleCtx,
): Promise<ToggleAdminRoleResult> {
  const { prisma } = ctx;
  const { targetUserId, setAdmin, actorId } = input;

  // 1) Actor 권한 검증.
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    include: { groups: { include: { group: true } } },
  } as never) as { id: number; isAdmin: boolean; status: string; groups: Array<{ group: { isAdmin: boolean } | null }> } | null;

  if (!actor || actor.status !== 'APPROVED') {
    return { ok: false, code: 'INSUFFICIENT_PRIVILEGES' };
  }

  const groups = actor.groups
    .map((m) => m.group)
    .filter((g): g is { isAdmin: boolean } => g !== null);

  if (!resolveAdminPrivilege({ isAdmin: actor.isAdmin }, groups)) {
    return { ok: false, code: 'INSUFFICIENT_PRIVILEGES' };
  }

  // 2) 트랜잭션: (강등 시 assertCanDemote) + User.isAdmin 업데이트 + AuditLog.
  try {
    await prisma.$transaction(async (tx) => {
      if (!setAdmin) {
        // 강등: race-safe 마지막 admin 보호.
        await assertCanDemote(targetUserId, tx as PrismaClient);
      }

      await (tx as PrismaClient).user.update({
        where: { id: targetUserId },
        data: { isAdmin: setAdmin } as never,
      });

      await (tx as PrismaClient).auditLog.create({
        data: {
          actorId,
          targetId: targetUserId,
          action: setAdmin ? 'ADMIN_PROMOTED' : 'ADMIN_DEMOTED',
          metadata: { setAdmin },
        } as never,
      });
    });
  } catch (err) {
    if (err instanceof LastAdminProtectedError) {
      return { ok: false, code: 'LAST_ADMIN_PROTECTED' };
    }
    throw err;
  }

  return { ok: true };
}
