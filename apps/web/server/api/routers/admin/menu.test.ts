/**
 * Specification tests for admin.menu tRPC router — SPEC-ADMIN-001 Slice D.
 *
 * D-4: menu.create({ siteId, title }) → prisma.menu.create 호출됨.
 * D-5: menu.list({ siteId }) → prisma.menu.findMany 결과 반환.
 * D-6: menu.get({ id }) → prisma.menu.findUnique (include 1-depth items) 결과 반환; 없으면 NOT_FOUND.
 * D-7: menu.delete({ id }) → prisma.menu.delete 호출.
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

const mockMenuCreate = vi.fn();
const mockMenuFindMany = vi.fn();
const mockMenuFindUnique = vi.fn();
const mockMenuDelete = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  menu: {
    create: (...args: unknown[]) => mockMenuCreate(...args),
    findMany: (...args: unknown[]) => mockMenuFindMany(...args),
    findUnique: (...args: unknown[]) => mockMenuFindUnique(...args),
    delete: (...args: unknown[]) => mockMenuDelete(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
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

describe('admin.menu tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('D-4: admin menu.create → prisma.menu.create 가 siteId/title/isAdminMenu 로 호출됨 (REQ-ADMIN-030)', async () => {
    const createdMenu = { id: 1, siteId: 1, title: 'Main', isAdminMenu: false, listOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    mockMenuCreate.mockResolvedValueOnce(createdMenu);

    const { adminMenuRouter } = await import('./menu');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({ siteId: 1, title: 'Main', isAdminMenu: false });

    expect(mockMenuCreate).toHaveBeenCalledOnce();
    expect(mockMenuCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: 1, title: 'Main', isAdminMenu: false }),
      }),
    );
    expect(result).toMatchObject({ id: 1, title: 'Main' });
  });

  it('D-5: admin menu.list({ siteId }) → prisma.menu.findMany 결과 반환 (REQ-ADMIN-030)', async () => {
    const rows = [
      { id: 1, siteId: 1, title: 'Main', isAdminMenu: false, listOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockMenuFindMany.mockResolvedValueOnce(rows);

    const { adminMenuRouter } = await import('./menu');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list({ siteId: 1 });

    expect(mockMenuFindMany).toHaveBeenCalledOnce();
    expect(mockMenuFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: 1 },
        orderBy: expect.arrayContaining([{ listOrder: 'asc' }]),
      }),
    );
    expect(result).toEqual(rows);
  });

  it('D-6: admin menu.get({ id }) → findUnique 결과 반환 (include 1-depth items); 없으면 NOT_FOUND (REQ-ADMIN-030)', async () => {
    const menuWithItems = {
      id: 1,
      siteId: 1,
      title: 'Main',
      isAdminMenu: false,
      listOrder: 0,
      items: [{ id: 10, menuId: 1, parentId: null, title: 'Home', listOrder: 0 }],
    };
    mockMenuFindUnique.mockResolvedValueOnce(menuWithItems);

    const { adminMenuRouter } = await import('./menu');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.get({ id: 1 });

    expect(mockMenuFindUnique).toHaveBeenCalledOnce();
    expect(mockMenuFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: { parentId: null },
          }),
        }),
      }),
    );
    expect(result).toMatchObject({ id: 1, items: expect.arrayContaining([expect.objectContaining({ id: 10 })]) });

    // NOT_FOUND 케이스
    mockMenuFindUnique.mockResolvedValueOnce(null);
    await expect(caller.get({ id: 9999 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('D-7: admin menu.delete({ id }) → prisma.menu.delete 호출 (REQ-ADMIN-030)', async () => {
    const deleted = { id: 1, siteId: 1, title: 'Main', isAdminMenu: false, listOrder: 0, createdAt: new Date(), updatedAt: new Date() };
    mockMenuDelete.mockResolvedValueOnce(deleted);

    const { adminMenuRouter } = await import('./menu');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.delete({ id: 1 });

    expect(mockMenuDelete).toHaveBeenCalledOnce();
    expect(mockMenuDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });
});
