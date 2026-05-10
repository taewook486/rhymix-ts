/**
 * Specification tests for RBAC primitives — SPEC-AUTH-001 Slice D2.
 *
 * RED-first: 본 파일은 `rbac.ts` 구현 이전에 작성된다.
 *
 * Coverage:
 *   - REQ-AUTH-034: group.is_admin OR user.is_admin → admin 권한
 *   - REQ-AUTH-054: 마지막 admin 강등 차단
 *   - AC-AUTH-034, AC-AUTH-054
 */

import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  ADMIN_DEMOTION_LOCK_ID,
  assertCanDemote,
  isLastAdmin,
  LastAdminProtectedError,
  resolveAdminPrivilege,
} from './rbac';

// ---------------------------------------------------------------------------
// In-memory Prisma fake — minimal subset for RBAC queries.
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  isAdmin: boolean;
  status: 'APPROVED' | 'UNAUTHED' | 'SUSPENDED' | 'DENIED' | 'DELETED';
}
interface FakeGroup {
  id: number;
  isAdmin: boolean;
}
interface FakeMembership {
  groupId: number;
  userId: number;
}

interface FakeOpts {
  users?: FakeUser[];
  groups?: FakeGroup[];
  memberships?: FakeMembership[];
}

interface RawCall {
  sql: string;
  values: unknown[];
}

function buildFakePrisma(opts: FakeOpts = {}) {
  const users: FakeUser[] = [...(opts.users ?? [])];
  const groups: FakeGroup[] = [...(opts.groups ?? [])];
  const memberships: FakeMembership[] = [...(opts.memberships ?? [])];
  const rawCalls: RawCall[] = [];

  function effectiveAdminIds(): Set<number> {
    const ids = new Set<number>();
    for (const u of users) {
      if (u.status !== 'APPROVED') continue; // suspended/deleted은 admin으로 카운트하지 않음
      if (u.isAdmin) ids.add(u.id);
    }
    for (const m of memberships) {
      const g = groups.find((x) => x.id === m.groupId);
      const u = users.find((x) => x.id === m.userId);
      if (g?.isAdmin && u?.status === 'APPROVED') ids.add(m.userId);
    }
    return ids;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findUnique: async (args: {
        where: { id: number };
        include?: { groups?: { include?: { group?: boolean } } };
      }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) return null;
        if (args.include?.groups) {
          const memberRows = memberships
            .filter((m) => m.userId === u.id)
            .map((m) => ({
              group: groups.find((g) => g.id === m.groupId) ?? null,
            }));
          return { ...u, groups: memberRows };
        }
        return u;
      },
    },
    $queryRaw: async (
      stringsOrSql: TemplateStringsArray | { strings?: string[]; values?: unknown[]; sql?: string },
      ...values: unknown[]
    ) => {
      // `prisma.$queryRaw(Prisma.sql\`...\`)` 호출 — 단일 Sql 객체.
      // `prisma.$queryRaw\`...\`` 호출 — TemplateStringsArray + values.
      let sql: string;
      let allValues: unknown[];
      if (Array.isArray(stringsOrSql)) {
        sql = (stringsOrSql as TemplateStringsArray).join('?');
        allValues = values;
      } else {
        const sqlObj = stringsOrSql as {
          strings?: string[];
          values?: unknown[];
          sql?: string;
          text?: string;
        };
        sql = sqlObj.sql ?? sqlObj.text ?? (sqlObj.strings ?? []).join('?');
        allValues = sqlObj.values ?? [];
      }
      rawCalls.push({ sql, values: allValues });
      // pg_advisory_xact_lock 시뮬레이션 — 항상 성공 (반환값은 사용되지 않음).
      if (sql.includes('pg_advisory_xact_lock')) {
        return [{ pg_advisory_xact_lock: '' }];
      }
      // effective-admin id 목록 쿼리.
      if (sql.toLowerCase().includes('select')) {
        const ids = [...effectiveAdminIds()];
        return ids.map((id) => ({ id }));
      }
      return [];
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => {
      return await fn(fake);
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, groups, memberships, rawCalls },
    effectiveAdminIds,
  };
}

// ---------------------------------------------------------------------------
// resolveAdminPrivilege — 순수 함수
// ---------------------------------------------------------------------------

describe('resolveAdminPrivilege', () => {
  it('1) 직접 admin user → true', () => {
    expect(resolveAdminPrivilege({ isAdmin: true }, [])).toBe(true);
  });

  it('2) admin 그룹 멤버 → true (REQ-AUTH-034 OR 절)', () => {
    expect(
      resolveAdminPrivilege({ isAdmin: false }, [{ isAdmin: true }]),
    ).toBe(true);
  });

  it('3) 일반 사용자 + 일반 그룹만 → false', () => {
    expect(
      resolveAdminPrivilege({ isAdmin: false }, [{ isAdmin: false }]),
    ).toBe(false);
  });

  it('4) 일반 사용자 + 그룹 미소속 → false', () => {
    expect(resolveAdminPrivilege({ isAdmin: false }, [])).toBe(false);
  });

  it('5) 직접 admin이고 일반 그룹에도 속한 경우 → true (단락 평가)', () => {
    expect(
      resolveAdminPrivilege({ isAdmin: true }, [
        { isAdmin: false },
        { isAdmin: false },
      ]),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isLastAdmin
// ---------------------------------------------------------------------------

describe('isLastAdmin', () => {
  it('6) 정확히 1명의 직접 admin이 존재할 때 그 user에 대해 true', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: false, status: 'APPROVED' },
      ],
    });
    expect(await isLastAdmin(1, prisma)).toBe(true);
  });

  it('7) admin이 그룹 경유로만 1명일 때 그 user에 대해 true', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: false, status: 'APPROVED' },
        { id: 2, isAdmin: false, status: 'APPROVED' },
      ],
      groups: [{ id: 10, isAdmin: true }],
      memberships: [{ groupId: 10, userId: 1 }],
    });
    expect(await isLastAdmin(1, prisma)).toBe(true);
  });

  it('8) 다중 admin 존재 시 어느 admin에 대해서도 false', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: true, status: 'APPROVED' },
      ],
    });
    expect(await isLastAdmin(1, prisma)).toBe(false);
    expect(await isLastAdmin(2, prisma)).toBe(false);
  });

  it('9) admin이 아닌 user에 대해서는 false (강등 의미가 없음)', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: false, status: 'APPROVED' },
      ],
    });
    expect(await isLastAdmin(2, prisma)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertCanDemote — uses pg_advisory_xact_lock
// ---------------------------------------------------------------------------

describe('assertCanDemote', () => {
  beforeEach(() => {
    /* no-op */
  });

  it('10) 다중 admin 환경 → throw 없이 resolve', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: true, status: 'APPROVED' },
      ],
    });
    await expect(assertCanDemote(1, prisma)).resolves.toBeUndefined();
  });

  it('11) 마지막 admin 강등 시 LastAdminProtectedError throw (REQ-AUTH-054)', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: false, status: 'APPROVED' },
      ],
    });
    await expect(assertCanDemote(1, prisma)).rejects.toBeInstanceOf(
      LastAdminProtectedError,
    );
  });

  it('12) admin이 아닌 user 강등은 항상 허용 (no-op)', async () => {
    const { prisma } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: false, status: 'APPROVED' },
      ],
    });
    await expect(assertCanDemote(2, prisma)).resolves.toBeUndefined();
  });

  it('13) advisory lock SQL이 트랜잭션 내에서 한 번 호출되었다 (race-prevention 증거)', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [
        { id: 1, isAdmin: true, status: 'APPROVED' },
        { id: 2, isAdmin: true, status: 'APPROVED' },
      ],
    });
    await assertCanDemote(1, prisma);
    const lockCalls = state.rawCalls.filter((c) =>
      c.sql.includes('pg_advisory_xact_lock'),
    );
    expect(lockCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('14) ADMIN_DEMOTION_LOCK_ID는 안정된 bigint 상수이다', () => {
    expect(typeof ADMIN_DEMOTION_LOCK_ID).toBe('bigint');
    // 0이 아니어야 advisory lock 키로 의미가 있음.
    expect(ADMIN_DEMOTION_LOCK_ID).not.toBe(0n);
  });
});
