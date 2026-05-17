/**
 * Specification tests for admin.menuItem tRPC router — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * D-8:  menuItem.create({ menuId, parentId, title, url, groupIds }) → prisma.menuItem.create 호출됨.
 * D-9:  menuItem.update({ id, parentId, listOrder }) → prisma.$transaction 안에서 menuItem.update 호출됨.
 * D-10: menuItem.delete({ id }) → prisma.menuItem.delete 호출됨.
 * E-2-1: menuItem.reorder → items 순서대로 listOrder 갱신.
 * E-2-2: menuItem.reorder 빈 items → updated: 0, DB 호출 없음.
 * E-2-3: menuItem.reorder 존재하지 않는 menuId → NOT_FOUND.
 * E-2-4: menuItem.reorder → $transaction 호출 증거.
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
const mockMenuFindUnique = vi.fn();

// $transaction mock: 배열을 받아 실행하거나 콜백을 받아 tx 로 실행
const mockTransaction = vi.fn().mockImplementation(async (fnOrArray: unknown) => {
  if (Array.isArray(fnOrArray)) {
    // 배열 형태 (reorder에서 사용)
    return Promise.all(fnOrArray);
  }
  // 콜백 형태 (update에서 사용)
  const tx = {
    menuItem: {
      update: (...args: unknown[]) => mockMenuItemUpdate(...args),
    },
  };
  return (fnOrArray as (tx: unknown) => unknown)(tx);
});

const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  menu: {
    findUnique: (...args: unknown[]) => mockMenuFindUnique(...args),
  },
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
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
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

// ---------------------------------------------------------------------------
// Slice E-2: admin.menuItem.reorder 테스트
// ---------------------------------------------------------------------------

describe('admin.menuItem.reorder (Slice E-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    // 기본적으로 menu 존재하는 상황
    mockMenuFindUnique.mockResolvedValue({ id: 1, title: '메인메뉴' });
    // menuItem.update 기본 반환값
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0 });
  });

  it('E-2-1: items 순서대로 listOrder 갱신 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const items = [
      { id: 3, parentId: null, listOrder: 0 },
      { id: 1, parentId: null, listOrder: 1 },
      { id: 2, parentId: null, listOrder: 2 },
    ];

    const result = await caller.reorder({ menuId: 1, items });

    expect(result).toMatchObject({ updated: 3 });
    expect(mockMenuItemUpdate).toHaveBeenCalledTimes(3);
  });

  it('E-2-2: 빈 items → updated: 0, DB 호출 없음 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.reorder({ menuId: 1, items: [] });

    expect(result).toMatchObject({ updated: 0 });
    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('E-2-3: 존재하지 않는 menuId → NOT_FOUND (REQ-ADMIN-031)', async () => {
    mockMenuFindUnique.mockResolvedValue(null);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.reorder({ menuId: 999, items: [{ id: 1, parentId: null, listOrder: 0 }] }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('E-2-4: $transaction 호출 증거 (REQ-ADMIN-031 transactional)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.reorder({
      menuId: 1,
      items: [
        { id: 1, parentId: null, listOrder: 0 },
        { id: 2, parentId: null, listOrder: 1 },
      ],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    // 배열 형태의 $transaction 이어야 함
    const arg = mockTransaction.mock.calls[0]![0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Slice I-2: cross-level DnD (REQ-ADMIN-031)
// ---------------------------------------------------------------------------

describe('admin.menuItem.reorder cross-level DnD (Slice I-2 — REQ-ADMIN-031)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    mockMenuFindUnique.mockResolvedValue({ id: 1, title: '메인메뉴' });
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0, parentId: null });
  });

  it('I-2-1: parentId 변경 + listOrder 갱신 → 단일 $transaction 으로 처리 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 아이템 1이 parentId: null → parentId: 5 로 이동
    const items = [
      { id: 1, parentId: 5, listOrder: 0 },
    ];

    const result = await caller.reorder({ menuId: 1, items });
    expect(result).toMatchObject({ updated: 1 });

    // menuItem.update 에 parentId: 5 + listOrder: 0 가 전달됨
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ parentId: 5, listOrder: 0 }),
      }),
    );
    // $transaction 호출됨
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('I-2-2: 여러 항목의 parentId 가 각각 다른 값으로 → 모두 갱신 (REQ-ADMIN-031)', async () => {
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0, parentId: 5 });

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const items = [
      { id: 1, parentId: 5, listOrder: 0 },   // item1 → 부모 5 아래 0번째
      { id: 2, parentId: 10, listOrder: 0 },  // item2 → 부모 10 아래 0번째
      { id: 3, parentId: 10, listOrder: 1 },  // item3 → 부모 10 아래 1번째
    ];

    const result = await caller.reorder({ menuId: 1, items });
    expect(result).toMatchObject({ updated: 3 });
    expect(mockMenuItemUpdate).toHaveBeenCalledTimes(3);

    // 각 항목이 올바른 parentId + listOrder 로 갱신됨
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ parentId: 5, listOrder: 0 }),
      }),
    );
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({ parentId: 10, listOrder: 0 }),
      }),
    );
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({ parentId: 10, listOrder: 1 }),
      }),
    );
  });
});
