/**
 * RBAC primitives — SPEC-AUTH-001 Slice D2.
 *
 * Pure-ish 함수 집합:
 *   - `resolveAdminPrivilege` — REQ-AUTH-034: user.is_admin OR group.is_admin
 *   - `isLastAdmin`           — REQ-AUTH-054: 효과적 admin이 1명이고 그게 target인지
 *   - `assertCanDemote`       — REQ-AUTH-054: 마지막 admin 강등 차단 + 동시 트랜잭션 race 방지
 *
 * 동시성 보호:
 *   `assertCanDemote`는 `pg_advisory_xact_lock(ADMIN_DEMOTION_LOCK_ID)`을 호출해
 *   demotion-window를 트랜잭션 단위로 직렬화한다. 동시에 두 admin이 서로를 강등시키려
 *   해도 lock 획득 후 count가 한 번에 한 트랜잭션만 통과하므로 0-admin 상태가 발생하지
 *   않는다. lock은 트랜잭션 종료 시 자동 해제된다.
 *
 * @MX:ANCHOR: 효과적 admin 권한 판정 단일 진입점 — Server Action / 도메인 함수 모두 본 함수를 통과한다.
 * @MX:REASON: REQ-AUTH-034의 OR 절(직접 admin || group admin)을 한 곳에 모아야 우회 경로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-034, REQ-AUTH-054
 */

import { Prisma, type PrismaClient } from '@rhymix-ts/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Postgres advisory lock 키 — admin demotion window.
 *
 * 본 상수는 안정된 bigint 값으로, `pg_advisory_xact_lock`의 단일 키로 사용된다.
 * 임의 hash 대신 고정 상수를 쓰는 이유: 향후 다른 공정(autologin rotation 등)이
 * 우연히 같은 키를 쓰지 않도록 명시적으로 분리. 0x6164_6D69_6E5F_4445 (=
 * "admin_DE"의 ASCII 8-byte) 를 채택해 가독성과 충돌 회피를 동시에 만족시켰다.
 */
export const ADMIN_DEMOTION_LOCK_ID = 0x6164_6d69_6e5f_4445n;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class LastAdminProtectedError extends Error {
  readonly code = 'LAST_ADMIN_PROTECTED' as const;
  constructor(message = 'Cannot demote the last remaining admin') {
    super(message);
    this.name = 'LastAdminProtectedError';
  }
}

// ---------------------------------------------------------------------------
// Pure resolution
// ---------------------------------------------------------------------------

/**
 * @MX:ANCHOR: REQ-AUTH-034 admin OR-게이트의 단일 정의 — auth callback과 admin Server Action 모두 본 함수를 거친다.
 * @MX:REASON: 한 곳에 정의하지 않으면 user.isAdmin만 검사하거나 group만 검사하는 우회 경로가 생긴다.
 */
export function resolveAdminPrivilege(
  user: { isAdmin: boolean },
  groups: Array<{ isAdmin: boolean }>,
): boolean {
  if (user.isAdmin) return true;
  return groups.some((g) => g.isAdmin);
}

// ---------------------------------------------------------------------------
// DB-backed last-admin check
// ---------------------------------------------------------------------------

/**
 * Check whether `targetUserId` is currently the only effective admin.
 *
 * 효과적 admin이란 `users.is_admin = true` (status=APPROVED) 인 사용자 OR
 * `is_admin=true` 그룹의 멤버인 status=APPROVED 사용자의 합집합.
 *
 * 본 함수는 advisory lock을 잡지 않는다 — read-only 진단용. 트랜잭션 내에서
 * race-safe 검증이 필요하면 `assertCanDemote`를 사용한다.
 */
export async function isLastAdmin(
  targetUserId: number,
  prisma: PrismaClient,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: number | bigint }>>(
    Prisma.sql`
      SELECT u.id::int AS id
      FROM users u
      LEFT JOIN member_group_members mgm ON mgm."userId" = u.id
      LEFT JOIN member_groups mg ON mg.id = mgm."groupId"
      WHERE u.status = 'APPROVED'
        AND (u."isAdmin" = TRUE OR mg."isAdmin" = TRUE)
      GROUP BY u.id
    `,
  );
  const adminIds = new Set(rows.map((r) => Number(r.id)));
  return adminIds.size === 1 && adminIds.has(targetUserId);
}

/**
 * Acquire `pg_advisory_xact_lock(ADMIN_DEMOTION_LOCK_ID)` and verify that
 * demoting `targetUserId` does NOT leave the system without admins.
 *
 * Lock은 트랜잭션 종료 시 자동 해제된다. 본 함수는 트랜잭션 컨텍스트 안에서
 * 호출되어야 race-safe 하다 — 그러나 PrismaClient.$transaction 안에서 직접
 * 호출하든 트랜잭션 클라이언트(`tx`)를 prisma 자리에 넘기든 동일하게 동작한다.
 *
 * Throws `LastAdminProtectedError` when the demotion would leave 0 admins.
 *
 * @MX:ANCHOR: REQ-AUTH-054 race-safe 게이트 — admin 강등 흐름은 모두 본 함수를 통과한다.
 * @MX:REASON: advisory lock 없이 count 만으로는 동시 두 트랜잭션이 둘 다 통과해 0-admin 상태가 가능하다.
 */
export async function assertCanDemote(
  targetUserId: number,
  prisma: PrismaClient,
): Promise<void> {
  // 1) 트랜잭션 advisory lock 획득 — 직렬화 게이트.
  await prisma.$queryRaw<Array<{ pg_advisory_xact_lock: string }>>(
    Prisma.sql`SELECT pg_advisory_xact_lock(${ADMIN_DEMOTION_LOCK_ID})`,
  );

  // 2) 현재 효과적 admin id 집합 조회.
  const rows = await prisma.$queryRaw<Array<{ id: number | bigint }>>(
    Prisma.sql`
      SELECT u.id::int AS id
      FROM users u
      LEFT JOIN member_group_members mgm ON mgm."userId" = u.id
      LEFT JOIN member_groups mg ON mg.id = mgm."groupId"
      WHERE u.status = 'APPROVED'
        AND (u."isAdmin" = TRUE OR mg."isAdmin" = TRUE)
      GROUP BY u.id
    `,
  );
  const adminIds = new Set(rows.map((r) => Number(r.id)));

  // 3) target이 admin이 아니면 강등은 no-op이므로 통과.
  if (!adminIds.has(targetUserId)) return;

  // 4) admin이 1명뿐이고 그게 target이면 차단.
  if (adminIds.size <= 1) {
    throw new LastAdminProtectedError();
  }
}
