/**
 * Specification tests for content.comment tRPC router — SPEC-CONTENT-001 Slice B (T-011).
 *
 * B-801: content.comment.list (public) → listComments 호출.
 * B-802: content.comment.create (protected) → 인증 실패 시 UNAUTHORIZED.
 * B-803: content.comment.create (protected) → createComment 호출 (actor 주입).
 * B-804: content.comment.delete (protected) → deleteComment 호출 (actor 주입).
 * B-805: BoardPermissionDeniedError → FORBIDDEN.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockListComments = vi.fn();
const mockCreateComment = vi.fn();
const mockDeleteComment = vi.fn();

class BoardPermissionDeniedError extends Error {
  readonly code = 'BOARD_PERMISSION_DENIED';
}
class DocumentOwnershipError extends Error {
  readonly code = 'DOCUMENT_OWNERSHIP';
}

vi.mock('@rhymix-ts/board', () => ({
  listComments: (...args: unknown[]) => mockListComments(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  BoardPermissionDeniedError,
  DocumentOwnershipError,
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
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

describe('content.comment tRPC router (Slice B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B-801: content.comment.list (public) → listComments 호출', async () => {
    const comments = [{ id: 1 }];
    mockListComments.mockResolvedValueOnce(comments);

    const { contentCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentCommentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestCtx as any,
    );

    const result = await caller.list({ documentId: 10 });
    expect(mockListComments).toHaveBeenCalledOnce();
    expect(result).toEqual(comments);
  });

  it('B-802: content.comment.create (protected) → 인증 실패 시 UNAUTHORIZED', async () => {
    const { contentCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentCommentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestCtx as any,
    );

    await expect(
      caller.create({ documentId: 10, content: 'hi' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('B-803: content.comment.create (protected) → createComment 호출 + actor 주입', async () => {
    mockCreateComment.mockResolvedValueOnce({ id: 1 });

    const { contentCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentCommentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await caller.create({ documentId: 10, content: 'hi' });
    expect(mockCreateComment).toHaveBeenCalledOnce();
    const arg = mockCreateComment.mock.calls[0]?.[0] as {
      documentId: number;
      authorId: number;
      actor: { isAdmin: boolean; userGroupSrl: number };
    };
    expect(arg.documentId).toBe(10);
    expect(arg.authorId).toBe(42);
    expect(arg.actor.isAdmin).toBe(false);
  });

  it('B-804: content.comment.delete (protected) → deleteComment 호출 + actor 주입', async () => {
    mockDeleteComment.mockResolvedValueOnce({ id: 1, deletedAt: new Date() });

    const { contentCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentCommentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await caller.delete({ id: 1 });
    expect(mockDeleteComment).toHaveBeenCalledOnce();
    const arg = mockDeleteComment.mock.calls[0]?.[0] as {
      id: number;
      actor: { userId: number };
    };
    expect(arg.actor.userId).toBe(42);
  });

  it('B-805: BoardPermissionDeniedError → TRPCError FORBIDDEN', async () => {
    mockCreateComment.mockRejectedValueOnce(new BoardPermissionDeniedError('write_comment'));

    const { contentCommentRouter } = await import('./comment');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentCommentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await expect(
      caller.create({ documentId: 10, content: 'x' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
