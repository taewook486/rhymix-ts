/**
 * Specification tests for admin.favorite tRPC router — SPEC-ADMIN-001 Slice H-3.
 *
 * H-3-1: favorite.list → findMany called with { where: { memberId: 1 } }.
 * H-3-2: favorite.add → create called with label/href/memberId.
 * H-3-3: favorite.remove → delete called with { where: { id: N } }.
 * H-3-4: favorite.reorder → $transaction called with array of updates.
 * H-3-5: 빈 items reorder → { updated: 0 } (no $transaction).
 * H-3-6: 비관리자 → FORBIDDEN (protectedAdminProcedure).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// NextAuth + authConfig mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockAdminFavoriteFindMany = vi.fn().mockResolvedValue([]);
const mockAdminFavoriteCreate = vi.fn();
const mockAdminFavoriteDelete = vi.fn();
const mockAdminFavoriteCount = vi.fn().mockResolvedValue(0);
const mockTransaction = vi.fn().mockImplementation(async (ops: unknown[]) => Promise.all(ops));
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminFavorite: {
    findMany: (...args: unknown[]) => mockAdminFavoriteFindMany(...args),
    create: (...args: unknown[]) => mockAdminFavoriteCreate(...args),
    delete: (...args: unknown[]) => mockAdminFavoriteDelete(...args),
    update: vi.fn().mockResolvedValue({}),
    count: (...args: unknown[]) => mockAdminFavoriteCount(...args),
  },
  adminLog: { create: vi.fn().mockResolvedValue({ id: BigInt(1) }) },
  $transaction: (...args: unknown[]) => mockTransaction(...args),
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

const nonAdminCtx = {
  session: { user: { id: 2, isAdmin: false, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.favorite tRPC router (Slice H-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('H-3-1: favorite.list → findMany called with { where: { memberId: 1 } }', async () => {
    mockAdminFavoriteFindMany.mockResolvedValue([
      { id: 1, memberId: 1, label: '대시보드', href: '/admin', listOrder: 0 },
    ]);

    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list();

    expect(mockAdminFavoriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ memberId: 1 }),
      }),
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('H-3-2: favorite.add → create called with label/href/memberId', async () => {
    const created = {
      id: 1,
      memberId: 1,
      label: '대시보드',
      href: '/admin',
      icon: undefined,
      listOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAdminFavoriteCreate.mockResolvedValue(created);

    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.add({ label: '대시보드', href: '/admin' });

    expect(mockAdminFavoriteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberId: 1,
          label: '대시보드',
          href: '/admin',
        }),
      }),
    );
  });

  it('H-3-3: favorite.remove → delete called with { where: { id: N } }', async () => {
    mockAdminFavoriteDelete.mockResolvedValue({ id: 1 });

    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.remove({ id: 1 });

    expect(mockAdminFavoriteDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('H-3-4: favorite.reorder → $transaction called with array of updates', async () => {
    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.reorder({
      items: [
        { id: 1, listOrder: 0 },
        { id: 2, listOrder: 1 },
      ],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    // 배열 형태의 $transaction 이어야 함
    const arg = mockTransaction.mock.calls[0]![0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(2);
    expect(result).toMatchObject({ updated: 2 });
  });

  it('H-3-5: 빈 items reorder → { updated: 0 } (no $transaction)', async () => {
    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.reorder({ items: [] });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updated: 0 });
  });

  it('H-3-6: 비관리자 → FORBIDDEN (protectedAdminProcedure)', async () => {
    const { adminFavoriteRouter } = await import('./favorite');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminFavoriteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(nonAdminCtx as any);

    await expect(caller.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
