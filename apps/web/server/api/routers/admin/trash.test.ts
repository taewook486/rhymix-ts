/**
 * Specification tests for admin.trash tRPC router — SPEC-CONTENT-001 Slice D
 *                                                    + SPEC-CONTENT-PARITY-001 M2.
 *
 * AT-1: admin.trash.list → trash 목록 반환.
 * AT-2: admin.trash.list 비admin → UNAUTHORIZED/FORBIDDEN.
 * AT-3: admin.trash.restore 정상 → 복원.
 * AT-4: admin.trash.restore trash 없음 → NOT_FOUND.
 * AT-5: admin.trash.restore 만료 → PRECONDITION_FAILED.
 * AT-6: admin.trash.purge → cascade 삭제 확인.
 *
 * M2 추가 (REQ-CPAR-008, design.md D-3):
 * AT-7: admin.trash.listComments → 소프트 삭제 댓글 목록.
 * AT-8: admin.trash.restoreComment → 복원.
 * AT-9: admin.trash.restoreComment 존재하지 않음 → NOT_FOUND.
 * AT-10: admin.trash.purgeComment → 영구 삭제.
 * AT-11: admin.trash.empty(scope='document') → 문서 휴지통 전체 purge.
 * AT-12: admin.trash.empty(scope='comment') → 댓글 휴지통 전체 purge.
 * AT-13: admin.trash.empty(scope='all') → 둘 다 purge.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListTrash = vi.fn();
const mockRestoreDocument = vi.fn();
const mockPurgeDocument = vi.fn();

class TrashNotFoundError extends Error {
  readonly code = 'TRASH_NOT_FOUND';
  constructor(documentId: number) {
    super(`No trash entry for document ${documentId}`);
    this.name = 'TrashNotFoundError';
  }
}

class TrashExpiredError extends Error {
  readonly code = 'TRASH_EXPIRED';
  constructor(documentId: number) {
    super(`Trash entry for document ${documentId} has expired`);
    this.name = 'TrashExpiredError';
  }
}

vi.mock('@rhymix-ts/board', () => ({
  listTrash: (...args: unknown[]) => mockListTrash(...args),
  restoreDocument: (...args: unknown[]) => mockRestoreDocument(...args),
  purgeDocument: (...args: unknown[]) => mockPurgeDocument(...args),
  TrashNotFoundError,
  TrashExpiredError,
}));

// M2 — 댓글 휴지통 domain mocks
const mockListDeletedComments = vi.fn();
const mockRestoreComment = vi.fn();
const mockPurgeComment = vi.fn();

class CommentNotFoundError extends Error {
  constructor(id: number) {
    super(`댓글 ${id}를 찾을 수 없습니다`);
    this.name = 'CommentNotFoundError';
  }
}

vi.mock('@rhymix-ts/comment', () => ({
  listDeletedComments: (...args: unknown[]) => mockListDeletedComments(...args),
  restoreComment: (...args: unknown[]) => mockRestoreComment(...args),
  purgeComment: (...args: unknown[]) => mockPurgeComment(...args),
  CommentNotFoundError,
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: (session: unknown) =>
    (session as { user?: { isAdmin?: boolean } } | null)?.user?.isAdmin === true,
}));
vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
  // M2 — empty(scope) 조회용
  trash: { findMany: vi.fn().mockResolvedValue([]) },
  comment: { findMany: vi.fn().mockResolvedValue([]) },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [{ id: 1, isAdmin: true }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};
const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.trash tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminLog.create.mockResolvedValue({});
  });

  it('AT-1: trash.list admin → listTrash 호출, 목록 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const fakeTrash = {
      items: [
        { id: 1, documentId: 10, expiresAt: new Date(), document: { id: 10, title: '제목' } },
      ],
      nextCursor: null,
    };
    mockListTrash.mockResolvedValue(fakeTrash);

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.list({});

    expect(mockListTrash).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
  });

  it('AT-2: trash.list 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const caller = createCallerFactory(adminTrashRouter)(memberCtx as never);

    await expect(caller.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockListTrash).not.toHaveBeenCalled();
  });

  it('AT-3: trash.restore admin → restoreDocument 호출, 복원 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockResolvedValue({ id: 10, deletedAt: null, title: '제목' });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.restore({ documentId: 10 });

    expect(mockRestoreDocument).toHaveBeenCalledOnce();
    expect(result.deletedAt).toBeNull();
  });

  it('AT-4: trash.restore trash 없음 → NOT_FOUND', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockRejectedValue(new TrashNotFoundError(10));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.restore({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('AT-5: trash.restore 만료 → PRECONDITION_FAILED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockRejectedValue(new TrashExpiredError(10));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.restore({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('AT-6: trash.purge admin → purgeDocument 호출, documentId 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPurgeDocument.mockResolvedValue({ documentId: 10 });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.purge({ documentId: 10 });

    expect(mockPurgeDocument).toHaveBeenCalledOnce();
    expect(result.documentId).toBe(10);
  });

  // -------------------------------------------------------------------------
  // M2 (REQ-CPAR-008, design.md D-3) — 댓글 휴지통 통합 뷰
  // -------------------------------------------------------------------------

  it('AT-7: trash.listComments admin → listDeletedComments 호출, 목록 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const fakeComments = {
      items: [{ id: 1, documentId: 10, deletedAt: new Date(), document: { id: 10, title: '제목' } }],
      nextCursor: null,
    };
    mockListDeletedComments.mockResolvedValue(fakeComments);

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.listComments({});

    expect(mockListDeletedComments).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
  });

  it('AT-7b: trash.listComments 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const caller = createCallerFactory(adminTrashRouter)(memberCtx as never);

    await expect(caller.listComments({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockListDeletedComments).not.toHaveBeenCalled();
  });

  it('AT-8: trash.restoreComment admin → restoreComment 호출, 복원 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreComment.mockResolvedValue({ id: 1, deletedAt: null });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.restoreComment({ commentId: 1 });

    expect(mockRestoreComment).toHaveBeenCalledOnce();
    expect(result.deletedAt).toBeNull();
  });

  it('AT-9: trash.restoreComment 존재하지 않음 → NOT_FOUND', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreComment.mockRejectedValue(new CommentNotFoundError(999));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.restoreComment({ commentId: 999 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('AT-10: trash.purgeComment admin → purgeComment 호출, commentId 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPurgeComment.mockResolvedValue({ commentId: 1, purgedIds: [1] });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.purgeComment({ commentId: 1 });

    expect(mockPurgeComment).toHaveBeenCalledOnce();
    expect(result.commentId).toBe(1);
  });

  it('AT-10b: trash.purgeComment 존재하지 않음 → NOT_FOUND', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPurgeComment.mockRejectedValue(new CommentNotFoundError(999));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.purgeComment({ commentId: 999 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('AT-11: trash.empty(scope=document) → 문서 휴지통 항목 전부 purgeDocument 호출', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPrisma.trash.findMany.mockResolvedValue([{ documentId: 10 }, { documentId: 11 }]);
    mockPrisma.comment.findMany.mockResolvedValue([]);
    mockPurgeDocument.mockResolvedValue({ documentId: 10 });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.empty({ scope: 'document' });

    expect(mockPurgeDocument).toHaveBeenCalledTimes(2);
    expect(mockPurgeComment).not.toHaveBeenCalled();
    expect(result.documentsPurged).toBe(2);
    expect(result.commentsPurged).toBe(0);
  });

  it('AT-12: trash.empty(scope=comment) → 삭제된 댓글 전부 purgeComment 호출', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPrisma.trash.findMany.mockResolvedValue([]);
    mockPrisma.comment.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockPurgeComment.mockResolvedValue({ commentId: 1, purgedIds: [1] });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.empty({ scope: 'comment' });

    expect(mockPurgeDocument).not.toHaveBeenCalled();
    expect(mockPurgeComment).toHaveBeenCalledTimes(2);
    expect(result.commentsPurged).toBe(2);
  });

  it('AT-13: trash.empty(scope=all) → 문서+댓글 모두 purge, 이미 cascade로 삭제된 항목은 건너뜀', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPrisma.trash.findMany.mockResolvedValue([{ documentId: 10 }]);
    mockPrisma.comment.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockPurgeDocument.mockResolvedValue({ documentId: 10 });
    mockPurgeComment
      .mockResolvedValueOnce({ commentId: 1, purgedIds: [1, 2] }) // 2가 자식으로 함께 cascade 삭제됨
      .mockRejectedValueOnce(new CommentNotFoundError(2)); // 이미 삭제됨 — 건너뜀

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.empty({ scope: 'all' });

    expect(mockPurgeDocument).toHaveBeenCalledTimes(1);
    expect(mockPurgeComment).toHaveBeenCalledTimes(2);
    expect(result.documentsPurged).toBe(1);
    expect(result.commentsPurged).toBe(1); // NotFound 건은 카운트에서 제외
  });

  it('AT-13b: trash.empty 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const caller = createCallerFactory(adminTrashRouter)(memberCtx as never);

    await expect(caller.empty({ scope: 'all' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
