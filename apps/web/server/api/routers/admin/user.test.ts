/**
 * Specification tests for admin.user tRPC router — SPEC-ADMIN-001 Slice E-5.
 *
 * E-5-1: admin.user.list → { users, total } 반환.
 * E-5-2: admin.user.list q 검색 → 매칭 행만.
 * E-5-3: admin.user.list status 필터.
 * E-5-4: admin.user.update SUSPENDED → changeUserStatus 호출 증거.
 * E-5-5: admin.user.bulk suspend → 각 id changeUserStatus 호출.
 * E-5-6: admin.user.deniedList.add → DeniedIdentifier 생성.
 * E-5-7: admin.user.deniedList.remove → DeniedIdentifier 삭제.
 * E-5-8: 비관리자 → FORBIDDEN (protectedAdminProcedure).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// @rhymix-ts/auth mock — changeUserStatus / softDeleteUser
// ---------------------------------------------------------------------------

const mockChangeUserStatus = vi.fn();
const mockSoftDeleteUser = vi.fn();

vi.mock('@rhymix-ts/auth', () => ({
  changeUserStatus: (...args: unknown[]) => mockChangeUserStatus(...args),
  softDeleteUser: (...args: unknown[]) => mockSoftDeleteUser(...args),
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindMany = vi.fn();
const mockUserCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockDeniedIdentifierCreate = vi.fn();
const mockDeniedIdentifierDelete = vi.fn();
const mockDeniedIdentifierFindMany = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockMemberGroupMemberFindMany = vi.fn();
const mockUserTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));

const mockPrisma = {
  user: {
    findMany: (...args: unknown[]) => mockUserFindMany(...args),
    count: (...args: unknown[]) => mockUserCount(...args),
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
  },
  deniedIdentifier: {
    create: (...args: unknown[]) => mockDeniedIdentifierCreate(...args),
    delete: (...args: unknown[]) => mockDeniedIdentifierDelete(...args),
    findMany: (...args: unknown[]) => mockDeniedIdentifierFindMany(...args),
  },
  memberGroupMember: {
    findMany: (...args: unknown[]) => mockMemberGroupMemberFindMany(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (...args: unknown[]) => mockUserTransaction(...args),
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.user tRPC router (Slice E-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    // actor 조회 기본값
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true, status: 'APPROVED' });
    mockMemberGroupMemberFindMany.mockResolvedValue([]);
  });

  it('E-5-1: admin.user.list → { users, total } 반환 (US-7)', async () => {
    const users = [
      { id: 2, userId: 'user1', nickName: '닉네임1', emailAddress: 'u1@test.com',
        status: 'APPROVED', isAdmin: false, lastLoginAt: null, createdAt: new Date() },
    ];
    mockUserFindMany.mockResolvedValue(users);
    mockUserCount.mockResolvedValue(1);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list({ page: 1, pageSize: 50 });

    expect(result).toMatchObject({ total: 1 });
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({ userId: 'user1' });
  });

  it('E-5-2: admin.user.list q 검색 → userId/email/nickName 포함 행만 (US-7)', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.list({ q: 'searchterm', page: 1, pageSize: 50 });

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ userId: expect.objectContaining({ contains: 'searchterm' }) }),
          ]),
        }),
      }),
    );
  });

  it('E-5-3: admin.user.list status 필터 (US-7)', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.list({ status: 'SUSPENDED', page: 1, pageSize: 50 });

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SUSPENDED' }),
      }),
    );
  });

  it('E-5-4: admin.user.update SUSPENDED → changeUserStatus 위임 증거 (US-7)', async () => {
    mockChangeUserStatus.mockResolvedValue({
      ok: true, targetUserId: 2, previousStatus: 'APPROVED', newStatus: 'SUSPENDED',
    });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ userId: 2, status: 'SUSPENDED' });

    expect(mockChangeUserStatus).toHaveBeenCalledOnce();
    expect(mockChangeUserStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: 2,
        newStatus: 'SUSPENDED',
        actorId: 1,
      }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
    expect(result).toMatchObject({ ok: true, targetUserId: 2 });
  });

  it('E-5-5: admin.user.bulk suspend → 각 id changeUserStatus 호출 (US-7)', async () => {
    mockChangeUserStatus.mockResolvedValue({ ok: true });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.bulk({ ids: [2, 3, 4], action: 'suspend' });

    expect(mockChangeUserStatus).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ processed: 3 });
  });

  it('E-5-6: admin.user.deniedList.add → DeniedIdentifier 생성 (US-7)', async () => {
    const created = { id: 10, kind: 'USER_ID', pattern: 'baduser' };
    mockDeniedIdentifierCreate.mockResolvedValue(created);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedList.add({ type: 'USER_ID', pattern: 'baduser' });

    expect(mockDeniedIdentifierCreate).toHaveBeenCalledOnce();
    expect(mockDeniedIdentifierCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'USER_ID', pattern: 'baduser' }),
      }),
    );
    expect(result).toMatchObject({ kind: 'USER_ID' });
  });

  it('E-5-7: admin.user.deniedList.remove → DeniedIdentifier 삭제 (US-7)', async () => {
    const deleted = { id: 10, kind: 'USER_ID', pattern: 'baduser' };
    mockDeniedIdentifierDelete.mockResolvedValue(deleted);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.deniedList.remove({ id: 10 });

    expect(mockDeniedIdentifierDelete).toHaveBeenCalledOnce();
    expect(mockDeniedIdentifierDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } }),
    );
  });
});
