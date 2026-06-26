/**
 * content/category.test.ts — SPEC-CONTENT-001 Slice C
 *
 * CC-1 ~ CC-2: content.category.tree tRPC 라우터 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

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

// Board domain mock — importOriginal 없이 필요한 함수만 제공 (전체 패키지 로드 방지)
vi.mock('@rhymix-ts/board', () => ({
  listCategoryTree: vi.fn(),
}));

// Create complete mock Prisma client
const mockPrisma = createMockPrismaClient();
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);

const publicCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('content.category tRPC router (Slice C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CC-1: content.category.tree — 트리 반환', async () => {
    const { listCategoryTree } = await import('@rhymix-ts/board');
    const { contentCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    const fakeTree = [
      { id: 1, title: '자유', children: [{ id: 2, title: '서브', children: [] }] },
    ];
    vi.mocked(listCategoryTree).mockResolvedValueOnce(fakeTree as never);

    const createCaller = createCallerFactory(contentCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.tree({ boardId: 5 });

    expect(listCategoryTree).toHaveBeenCalledWith(5, expect.anything());
    expect(result).toEqual(fakeTree);
  });

  it('CC-2: content.category.tree — 빈 게시판 → []', async () => {
    const { listCategoryTree } = await import('@rhymix-ts/board');
    const { contentCategoryRouter } = await import('./category');
    const { createCallerFactory } = await import('../../trpc');

    vi.mocked(listCategoryTree).mockResolvedValueOnce([]);

    const createCaller = createCallerFactory(contentCategoryRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.tree({ boardId: 999 });

    expect(result).toEqual([]);
  });
});
