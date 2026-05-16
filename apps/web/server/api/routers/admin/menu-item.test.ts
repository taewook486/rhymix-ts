/**
 * Specification tests for admin.menuItem tRPC router — SPEC-ADMIN-001 Slice D.
 *
 * D-8:  menuItem.create({ menuId, parentId, title, url, groupIds }) → prisma.menuItem.create 호출됨.
 * D-9:  menuItem.update({ id, parentId, listOrder }) → prisma.$transaction 안에서 menuItem.update 호출됨.
 * D-10: menuItem.delete({ id }) → prisma.menuItem.delete 호출됨.
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

const mockMenuItemCreate = vi.fn();
const mockMenuItemUpdate = vi.fn();
const mockMenuItemDelete = vi.fn();
const mockAdminLogCreate = vi.fn();

// $transaction mock: 콜백을 받아 tx 로 실행
const mockTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
  const tx = {
    menuItem: {
      update: (...args: unknown[]) => mockMenuItemUpdate(...args),
    },
  };
  return fn(tx);
});

const mockPrisma = {
  menuItem: {
    create: (...args: unknown[]) => mockMenuItemCreate(...args),
    update: (...args: unknown[]) => mockMenuItemUpdate(...args),
    delete: (...args: unknown[]) => mockMenuItemDelete(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.menuItem tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('D-8: admin menuItem.create → prisma.menuItem.create 가 menuId/title/groupIds 로 호출됨 (REQ-ADMIN-030, REQ-ADMIN-032)', async () => {
    const createdItem = {
      id: 10, menuId: 1, parentId: null, title: 'Home', url: '/',
      groupIds: [1, 2], listOrder: 0,
      icon: null, cssClass: null, description: null,
      openInNewWindow: false, expand: false,
      normalBtn: null, hoverBtn: null, activeBtn: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    mockMenuItemCreate.mockResolvedValueOnce(createdItem);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({
      menuId: 1,
      parentId: null,
      title: 'Home',
      url: '/',
      groupIds: [1, 2],
    });

    expect(mockMenuItemCreate).toHaveBeenCalledOnce();
    expect(mockMenuItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          menuId: 1,
          title: 'Home',
          groupIds: [1, 2],
        }),
      }),
    );
    expect(result).toMatchObject({ id: 10, title: 'Home', groupIds: [1, 2] });
  });

  it('D-9: admin menuItem.update({ id, parentId, listOrder }) → $transaction 안에서 menuItem.update 호출됨 (REQ-ADMIN-031 transactional)', async () => {
    const updatedItem = { id: 5, menuId: 1, parentId: 3, listOrder: 2, title: 'Home', url: '/' };
    mockMenuItemUpdate.mockResolvedValueOnce(updatedItem);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ id: 5, parentId: 3, listOrder: 2 });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockMenuItemUpdate).toHaveBeenCalledOnce();
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ parentId: 3, listOrder: 2 }),
      }),
    );
    expect(result).toMatchObject({ id: 5, parentId: 3, listOrder: 2 });
  });

  it('D-10: admin menuItem.delete({ id }) → prisma.menuItem.delete 호출됨 (REQ-ADMIN-030)', async () => {
    const deleted = { id: 5, menuId: 1, parentId: null, title: 'Home' };
    mockMenuItemDelete.mockResolvedValueOnce(deleted);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.delete({ id: 5 });

    expect(mockMenuItemDelete).toHaveBeenCalledOnce();
    expect(mockMenuItemDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
  });
});
