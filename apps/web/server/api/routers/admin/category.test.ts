/**
 * admin/category.test.ts — SPEC-CONTENT-001 Slice C
 *
 * AC-1 ~ AC-6: admin.category.list/create/update/delete tRPC 라우터 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

const mockListCategoryTree = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();

class CategoryHasChildrenError extends Error {
  constructor(public categoryId: number) {
    super('Category has children');
    this.name = 'CategoryHasChildrenError';
  }
}

// NextAuth + DB mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// Board domain mock
vi.mock('@rhymix-ts/board', () => ({
  listCategoryTree: (...args: unknown[]) => mockListCategoryTree(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
  CategoryHasChildrenError,
}));

// @MX:NOTE: Shared Prisma mock factory from @rhymix-ts/test-utils (SPEC-TEST-PRISMA-MOCK-001)
const mockPrisma = createMockPrismaClient();

// Set up defaults for audit logger (REQ-PMOCK-004, REQ-PMOCK-021)
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);
mockPrisma.adminLog.create.mockResolvedValue({ id: BigInt(1) });

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.category tRPC router (Slice C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC-1: admin.category.list — boardId 로 tree 반환', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    const fakeTree = [{ id: 1, title: '자유', children: [] }];
    mockListCategoryTree.mockResolvedValueOnce(fakeTree);

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list({ boardId: 5 });

    expect(mockListCategoryTree).toHaveBeenCalledWith(5, expect.anything());
    expect(result).toEqual(fakeTree);
  });

  it('AC-2: admin.category.create — 정상 생성', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    const fakeCategory = { id: 1, boardId: 5, title: '공지', parentId: null };
    mockCreateCategory.mockResolvedValueOnce(fakeCategory);

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({ boardId: 5, title: '공지' });

    expect(mockCreateCategory).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 1, title: '공지' });
  });

  it('AC-3: admin.category.create — 비관리자 → FORBIDDEN', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.create({ boardId: 5, title: '공지' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('AC-4: admin.category.update — title 변경', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    const updated = { id: 1, boardId: 5, title: '변경됨' };
    mockUpdateCategory.mockResolvedValueOnce(updated);

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ id: 1, title: '변경됨' });

    expect(mockUpdateCategory).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 1, title: '변경됨' });
  });

  it('AC-5: admin.category.delete — 자식 없음 → 성공', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    mockDeleteCategory.mockResolvedValueOnce(undefined);

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(caller.delete({ id: 1 })).resolves.not.toThrow();
    expect(mockDeleteCategory).toHaveBeenCalledWith(1, expect.anything());
  });

  it('AC-6: admin.category.delete — 자식 있음 → CONFLICT (CategoryHasChildrenError → HTTP 409)', async () => {
    const { adminCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    mockDeleteCategory.mockRejectedValueOnce(new CategoryHasChildrenError(1));

    const createCaller = createCallerFactory(adminCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(caller.delete({ id: 1 })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
