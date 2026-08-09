/**
 * Specification tests for admin.comment tRPC router — SPEC-CONTENT-PARITY-001 M3.
 *
 * COMMENT-LIST-001: listAcrossAllBoards → passes through to listCommentsAcrossAllBoards
 * COMMENT-LIST-002: listAcrossAllBoards → isSecret 파라미터 전달 (REQ-CPAR-017)
 * COMMENT-BULK-001: bulkDelete → passes through to bulkDeleteComments
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

vi.mock('@rhymix-ts/comment', () => ({
  listCommentsAcrossAllBoards: vi.fn(),
  bulkDeleteComments: vi.fn(),
}));

const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.comment tRPC router (SPEC-CONTENT-PARITY-001 M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA disabled
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('COMMENT-LIST-001: listAcrossAllBoards → listCommentsAcrossAllBoards로 위임한다', async () => {
    const { adminCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const { listCommentsAcrossAllBoards } = await import('@rhymix-ts/comment');
    (listCommentsAcrossAllBoards as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const createCaller = createCallerFactory(adminCommentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.listAcrossAllBoards({ limit: 10 });

    expect(result).toEqual({ items: [], nextCursor: null, total: 0 });
    expect(listCommentsAcrossAllBoards).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
  });

  it('COMMENT-LIST-002: listAcrossAllBoards → isSecret 파라미터를 전달한다 (REQ-CPAR-017)', async () => {
    const { adminCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const { listCommentsAcrossAllBoards } = await import('@rhymix-ts/comment');
    (listCommentsAcrossAllBoards as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const createCaller = createCallerFactory(adminCommentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.listAcrossAllBoards({ isSecret: true, limit: 10 });

    expect(listCommentsAcrossAllBoards).toHaveBeenCalledWith(
      expect.objectContaining({ isSecret: true }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
  });

  it('COMMENT-BULK-001: bulkDelete → bulkDeleteComments로 위임한다', async () => {
    const { adminCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const { bulkDeleteComments } = await import('@rhymix-ts/comment');
    (bulkDeleteComments as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: 2,
      failed: 0,
      failedIds: [],
      adminLogIds: [BigInt(1), BigInt(2)],
    });

    const createCaller = createCallerFactory(adminCommentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.bulkDelete({ commentIds: [1, 2] });

    expect(result.success).toBe(2);
    expect(bulkDeleteComments).toHaveBeenCalledWith(
      expect.objectContaining({ commentIds: [1, 2] }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
  });
});
