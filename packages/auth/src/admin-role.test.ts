/**
 * Admin role toggle specification tests — SPEC-AUTH-001 Slice E (E-4).
 *
 * REQ-AUTH-054, AC-AUTH-054:
 *   - toggleAdminRole: promote/demote with last-admin protection
 */
import type { PrismaClient, Prisma } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// rbac.ts 가 `@rhymix-ts/db` 에서 Prisma 를 import 하므로 모킹 필요.
vi.mock('@rhymix-ts/db', () => ({
  Prisma: { sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }) },
  PrismaClient: class {},
}));

// ---------------------------------------------------------------------------
// Fake
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  nickName: string;
  status: string;
  isAdmin: boolean;
  groups: Array<{ group: { isAdmin: boolean } | null }>;
}

interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  metadata?: unknown;
}

function buildFakePrisma(opts: {
  users?: FakeUser[];
  /** raw query 결과: 효과적 admin id 목록 */
  effectiveAdminIds?: number[];
} = {}) {
  const users: FakeUser[] = [...(opts.users ?? [])];
  const auditLogs: FakeAuditLog[] = [];
  const effectiveAdminIds = opts.effectiveAdminIds ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findUnique: async (args: { where: { id: number }; include?: unknown }) => {
        return users.find((u) => u.id === args.where.id) ?? null;
      },
      update: async (args: { where: { id: number }; data: Partial<FakeUser> }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    auditLog: {
      create: async (args: { data: FakeAuditLog }) => {
        auditLogs.push(args.data);
        return args.data;
      },
    },
    $queryRaw: async () => {
      // pg_advisory_xact_lock: return empty, then admin ids query
      return effectiveAdminIds.map((id) => ({ id }));
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => {
      return await fn(fake);
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, auditLogs },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAdmin(id: number, overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id,
    userId: `admin${id}`,
    emailAddress: `admin${id}@example.com`,
    nickName: `Admin${id}`,
    status: 'APPROVED',
    isAdmin: true,
    groups: [],
    ...overrides,
  };
}

function makeNonAdmin(id: number): FakeUser {
  return {
    id,
    userId: `user${id}`,
    emailAddress: `user${id}@example.com`,
    nickName: `User${id}`,
    status: 'APPROVED',
    isAdmin: false,
    groups: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let toggleAdminRole: typeof import('./admin-role').toggleAdminRole;

beforeEach(async () => {
  const mod = await import('./admin-role');
  toggleAdminRole = mod.toggleAdminRole;
});

describe('toggleAdminRole', () => {
  it('1) 강등 → assertCanDemote 통과, isAdmin=false + AuditLog ADMIN_DEMOTED', async () => {
    const actor = makeAdmin(1);
    const target = makeAdmin(2);
    const { prisma, state } = buildFakePrisma({
      users: [actor, target],
      effectiveAdminIds: [1, 2], // 2명의 admin
    });

    const result = await toggleAdminRole(
      { targetUserId: 2, setAdmin: false, actorId: 1 },
      { prisma },
    );

    expect(result).toMatchObject({ ok: true });
    expect(state.users[1]!.isAdmin).toBe(false);
    expect(state.auditLogs.some((a) => a.action === 'ADMIN_DEMOTED')).toBe(true);
  });

  it('2) 마지막 admin 강등 → LAST_ADMIN_PROTECTED', async () => {
    const actor = makeAdmin(1);
    const { prisma } = buildFakePrisma({
      users: [actor],
      effectiveAdminIds: [1], // 1명뿐
    });

    const result = await toggleAdminRole(
      { targetUserId: 1, setAdmin: false, actorId: 1 },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'LAST_ADMIN_PROTECTED' });
  });

  it('3) 승격 → assertCanDemote 스킵, isAdmin=true + AuditLog ADMIN_PROMOTED', async () => {
    const actor = makeAdmin(1);
    const target = makeNonAdmin(2);
    const { prisma, state } = buildFakePrisma({
      users: [actor, target],
    });

    const result = await toggleAdminRole(
      { targetUserId: 2, setAdmin: true, actorId: 1 },
      { prisma },
    );

    expect(result).toMatchObject({ ok: true });
    expect(state.users[1]!.isAdmin).toBe(true);
    expect(state.auditLogs.some((a) => a.action === 'ADMIN_PROMOTED')).toBe(true);
  });

  it('4) 비-admin actor → INSUFFICIENT_PRIVILEGES', async () => {
    const actor = makeNonAdmin(1);
    const target = makeNonAdmin(2);
    const { prisma } = buildFakePrisma({
      users: [actor, target],
    });

    const result = await toggleAdminRole(
      { targetUserId: 2, setAdmin: true, actorId: 1 },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'INSUFFICIENT_PRIVILEGES' });
  });
});
