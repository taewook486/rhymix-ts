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
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

const mockListComments = vi.fn();
const mockCreateComment = vi.fn();
const mockDeleteComment = vi.fn();

// comment.ts 라우터가 instanceof 로 검사하는 에러 클래스 스텁.
// importOriginal 대신 인라인 스텁으로 전체 패키지 로드 방지.
class BoardPermissionDeniedError extends Error {
  constructor(type?: string) {
    super(type ?? 'Board permission denied');
    this.name = 'BoardPermissionDeniedError';
  }
}
class DocumentOwnershipError extends Error {
  constructor(userId?: number) {
    super(String(userId ?? 0));
    this.name = 'DocumentOwnershipError';
  }
}

vi.mock('@rhymix-ts/document', () => ({
  BoardPermissionDeniedError,
  DocumentOwnershipError,
}));

// Mock @rhymix-ts/comment domain functions
vi.mock('@rhymix-ts/comment', () => ({
  listComments: (...args: unknown[]) => mockListComments(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  voteComment: vi.fn(),
  reportComment: vi.fn(),
  CommentDepthExceededError: class extends Error {
    readonly code = 'COMMENT_DEPTH_EXCEEDED';
  },
  SelfVoteNotAllowedError: class extends Error {
    readonly code = 'SELF_VOTE_NOT_ALLOWED';
  },
  CommentAlreadyReportedError: class extends Error {
    readonly code = 'COMMENT_ALREADY_REPORTED';
  },
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

// Create complete mock Prisma client with all models and methods
const mockPrisma = createMockPrismaClient();

// Set up defaults for spam-filter helper chain (REQ-PMOCK-004)
mockPrisma.site.findFirst.mockResolvedValue(null);
mockPrisma.spamDeniedWord.findMany.mockResolvedValue([]);
mockPrisma.spamDeniedIp.findMany.mockResolvedValue([]);
mockPrisma.spamRule.findFirst.mockResolvedValue(null);
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);

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
    // Reset spam-filter mocks to safe defaults for each test
    mockPrisma.site.findFirst.mockResolvedValue(null);
    mockPrisma.spamDeniedWord.findMany.mockResolvedValue([]);
    mockPrisma.spamDeniedIp.findMany.mockResolvedValue([]);
    mockPrisma.spamRule.findFirst.mockResolvedValue(null);
    mockPrisma.siteSetting.findFirst.mockResolvedValue(null);
    // Reset Prisma comment mocks
    mockPrisma.comment.findMany.mockResolvedValue([]);
    mockPrisma.comment.findUniqueOrThrow.mockResolvedValue(null);
    // Reset Prisma user mock (needed for create comment)
    mockPrisma.user.findUnique.mockResolvedValue({ id: 42, nickName: 'test' });
    // Reset Prisma document mocks (needed for create comment)
    // Default document with board for permission checks
    const defaultDocument = {
      id: 10,
      boardId: 1,
      title: 'Test',
      content: 'Test content',
      authorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      extraVars: {},
      board: { id: 1, pointPerDocument: 0 },
    };
    mockPrisma.document.findUnique.mockResolvedValue(defaultDocument as never);
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(defaultDocument as never);
    // Reset domain mocks
    mockListComments.mockReset();
    mockCreateComment.mockReset();
    mockDeleteComment.mockReset();
  });

  it('B-801: content.comment.list (public) → listComments 호출', async () => {
    const comments = [{ id: 1, documentId: 10, content: 'test', authorId: 1, createdAt: new Date(), deletedAt: null }];
    // The router calls listComments, so we mock the domain function directly
    mockListComments.mockResolvedValueOnce(comments as never);

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
    // Mock the domain service
    mockCreateComment.mockResolvedValueOnce({
      id: 1,
      board: { id: 1 }, // Required for permission check in service
    } as never);

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
    // The domain service needs to check comment.authorId for ownership
    const comment = {
      id: 1,
      documentId: 10,
      content: 'test comment',
      authorId: 42, // Must match memberCtx.user.id for ownership check
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Mock findUniqueOrThrow to return the comment
    mockPrisma.comment.findUniqueOrThrow.mockResolvedValueOnce(comment as never);

    mockDeleteComment.mockResolvedValueOnce({
      id: 1,
      deletedAt: new Date(),
    } as never);

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
    // Import the actual error class from the module (not mocked)
    const { BoardPermissionDeniedError } = await import('@rhymix-ts/document');
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
