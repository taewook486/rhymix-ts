/**
 * Admin features — SPEC-AUTH-001 Slice D2.
 *
 * 책임:
 *   1. `changeUserStatus` — REQ-AUTH-020: status 변경 시 세션 + autologin 즉시 무효화
 *   2. `softDeleteUser`   — REQ-AUTH-021: PII anonymize + status=DELETED + retention
 *
 * 자기 행위 정책 (Slice D2 OQ resolution):
 *   - self DELETE  : 차단 (SELF_ACTION_DENIED) — irreversible, 4-eye 원칙
 *   - self SUSPEND : 허용 — 보안 인시던트 대응
 *   - self DENIED  : 허용 — 동일
 *   - self APPROVED: 차단 (SELF_ACTION_DENIED) — 의미 없음, 4-eye
 *
 * PII anonymize 정책 (5 fields, deterministic prefix):
 *   - userId      → "deleted_<id>"
 *   - emailAddress → "deleted_<id>@anon.local"
 *   - nickName    → "deleted_<id>"
 *   - phoneNumber → null
 *   - userName    → null
 *   passwordHash / id / createdAt 은 변경하지 않는다 (out of GDPR delete scope).
 *
 * 트랜잭션:
 *   변경/anonymize/세션무효화/AuditLog 작성을 단일 트랜잭션으로 묶어 부분 적용을 방지한다.
 *   `revokeAllSessions` 는 외부 트랜잭션 클라이언트를 받을 수 있도록 D1 API 가 확장되었으므로,
 *   본 모듈은 메인 `$transaction` 콜백 안에서 `tx` 를 직접 넘긴다. 이로써 status 변경/PII anonymize/
 *   세션 무효화/감사로그가 한 트랜잭션 안에서 commit 되어 REQ-AUTH-020 atomicity 가 강화된다
 *   (이전: 메인 tx commit 후 별도 tx — stale window 존재. 현재: 단일 tx — atomic).
 *
 * @MX:ANCHOR: admin status/delete 단일 진입점 — Server Action 은 본 함수를 통과한다.
 * @MX:REASON: 권한 검증/PII 처리/세션 무효화/감사로그가 한 곳에 모여야 우회 경로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020, REQ-AUTH-021, REQ-AUTH-034
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { resolveAdminPrivilege } from './rbac';
import { revokeAllSessions } from './session-revocation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminStatusTransition =
  | 'APPROVED'
  | 'SUSPENDED'
  | 'DENIED'
  | 'UNAUTHED';

export interface AdminCtx {
  prisma: PrismaClient;
}

export interface ChangeStatusInput {
  targetUserId: number;
  newStatus: AdminStatusTransition;
  actorId: number;
  reason?: string;
}

export type ChangeStatusResult =
  | {
      ok: true;
      targetUserId: number;
      previousStatus: string;
      newStatus: AdminStatusTransition;
    }
  | {
      ok: false;
      code:
        | 'INSUFFICIENT_PRIVILEGES'
        | 'SELF_ACTION_DENIED'
        | 'TARGET_NOT_FOUND'
        | 'INVALID_STATUS_TRANSITION';
    };

export interface SoftDeleteInput {
  targetUserId: number;
  actorId: number;
}

export type SoftDeleteResult =
  | {
      ok: true;
      targetUserId: number;
      deletedAt: Date;
    }
  | {
      ok: false;
      code:
        | 'INSUFFICIENT_PRIVILEGES'
        | 'SELF_ACTION_DENIED'
        | 'TARGET_NOT_FOUND'
        | 'TARGET_ALREADY_DELETED';
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ActorWithGroups {
  id: number;
  isAdmin: boolean;
  status: string;
  groups: Array<{ group: { isAdmin: boolean } | null }>;
}

async function fetchActorWithGroups(
  prisma: PrismaClient,
  actorId: number,
): Promise<ActorWithGroups | null> {
  const actor = (await prisma.user.findUnique({
    where: { id: actorId },
    include: { groups: { include: { group: true } } },
  } as never)) as ActorWithGroups | null;
  return actor;
}

function actorIsAdmin(actor: ActorWithGroups | null): boolean {
  if (!actor) return false;
  if (actor.status !== 'APPROVED') return false;
  const groups = actor.groups
    .map((m) => m.group)
    .filter((g): g is { isAdmin: boolean } => g !== null);
  return resolveAdminPrivilege({ isAdmin: actor.isAdmin }, groups);
}

// ---------------------------------------------------------------------------
// changeUserStatus
// ---------------------------------------------------------------------------

const FORCE_LOGOUT_STATUSES: ReadonlySet<AdminStatusTransition> = new Set([
  'SUSPENDED',
  'DENIED',
]);

export async function changeUserStatus(
  input: ChangeStatusInput,
  ctx: AdminCtx,
): Promise<ChangeStatusResult> {
  const { prisma } = ctx;
  const { targetUserId, newStatus, actorId, reason } = input;

  // 1) Actor 권한 검증.
  const actor = await fetchActorWithGroups(prisma, actorId);
  if (!actorIsAdmin(actor)) {
    return { ok: false, code: 'INSUFFICIENT_PRIVILEGES' };
  }

  // 2) Self-action 정책.
  if (targetUserId === actorId) {
    // self SUSPEND / DENIED 만 허용 (보안 인시던트 self lockout).
    if (newStatus !== 'SUSPENDED' && newStatus !== 'DENIED') {
      return { ok: false, code: 'SELF_ACTION_DENIED' };
    }
  }

  // 3) Target 조회.
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) {
    return { ok: false, code: 'TARGET_NOT_FOUND' };
  }
  const previousStatus = target.status;

  // 4) 트랜잭션: status 갱신 + (조건부) autologin 삭제 + 세션 무효화 + AuditLog.
  //    REQ-AUTH-020 atomicity: 모든 부수효과가 한 트랜잭션에서 commit 되어야 한다.
  const forceLogout = FORCE_LOGOUT_STATUSES.has(newStatus);

  await prisma.$transaction(async (tx) => {
    await (tx as PrismaClient).user.update({
      where: { id: targetUserId },
      data: { status: newStatus } as never,
    });

    if (forceLogout) {
      await (tx as PrismaClient).autoLogin.deleteMany({
        where: { userId: targetUserId },
      });

      // D1 API 확장(외부 tx 수용)을 활용해 메인 tx 안에서 세션 무효화 수행.
      // tx 를 그대로 넘겨야 SessionRevocation row + sessionsRevokedAt 갱신 + SESSION_REVOKED auditLog 가
      // 같은 트랜잭션에서 commit 된다. 이전 구현은 메인 tx commit 후 별도 tx 였고, 이는 stale window 를 만들었다.
      await revokeAllSessions(targetUserId, 'STATUS_CHANGED', {
        prisma: tx,
        actorId,
      });
    }

    await (tx as PrismaClient).auditLog.create({
      data: {
        actorId,
        targetId: targetUserId,
        action: 'STATUS_CHANGED',
        metadata: {
          previousStatus,
          newStatus,
          ...(reason !== undefined ? { reason } : {}),
        },
      } as never,
    });
  });

  return {
    ok: true,
    targetUserId,
    previousStatus,
    newStatus,
  };
}

// ---------------------------------------------------------------------------
// softDeleteUser
// ---------------------------------------------------------------------------

interface AnonymizationFields {
  userId: string;
  emailAddress: string;
  nickName: string;
  phoneNumber: null;
  userName: null;
}

function buildAnonymization(targetUserId: number): AnonymizationFields {
  return {
    userId: `deleted_${targetUserId}`,
    emailAddress: `deleted_${targetUserId}@anon.local`,
    nickName: `deleted_${targetUserId}`,
    phoneNumber: null,
    userName: null,
  };
}

export async function softDeleteUser(
  input: SoftDeleteInput,
  ctx: AdminCtx,
): Promise<SoftDeleteResult> {
  const { prisma } = ctx;
  const { targetUserId, actorId } = input;

  // 1) Actor 권한 검증.
  const actor = await fetchActorWithGroups(prisma, actorId);
  if (!actorIsAdmin(actor)) {
    return { ok: false, code: 'INSUFFICIENT_PRIVILEGES' };
  }

  // 2) Self-delete 차단.
  if (targetUserId === actorId) {
    return { ok: false, code: 'SELF_ACTION_DENIED' };
  }

  // 3) Target 조회 + 이미 DELETED 가드.
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) {
    return { ok: false, code: 'TARGET_NOT_FOUND' };
  }
  if (target.status === 'DELETED') {
    return { ok: false, code: 'TARGET_ALREADY_DELETED' };
  }

  const deletedAt = new Date();
  const anon = buildAnonymization(targetUserId);

  // 4) 트랜잭션: anonymize + status=DELETED + autologin 삭제 + 세션 무효화 + AuditLog.
  //    REQ-AUTH-020 atomicity: 모든 부수효과가 한 트랜잭션에서 commit 되어야 한다.
  await prisma.$transaction(async (tx) => {
    await (tx as PrismaClient).user.update({
      where: { id: targetUserId },
      data: {
        ...anon,
        status: 'DELETED',
        deletedAt,
      } as never,
    });

    await (tx as PrismaClient).autoLogin.deleteMany({
      where: { userId: targetUserId },
    });

    // D1 API 확장(외부 tx 수용)을 활용해 메인 tx 안에서 세션 무효화 수행.
    await revokeAllSessions(targetUserId, 'ADMIN_FORCE_LOGOUT', {
      prisma: tx,
      actorId,
    });

    await (tx as PrismaClient).auditLog.create({
      data: {
        actorId,
        targetId: targetUserId,
        action: 'MEMBER_DELETED',
        metadata: { deletedAt: deletedAt.toISOString() },
      } as never,
    });
  });

  return {
    ok: true,
    targetUserId,
    deletedAt,
  };
}
