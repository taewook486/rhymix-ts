/**
 * packages/comment/src/service.test.ts — SPEC-COMMENT-001 Slice A (T-007)
 *
 * Comment 도메인 함수 — createComment / listComments / deleteComment.
 *
 * B-501 ~ B-505: 권한, 트랜잭션, commentCount 원자성 검증.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------

describe('createComment', () => {
  it('B-501: 트랜잭션 안에서 comment.create + document.update(commentCount++) 호출', async () => {
    const { createComment } = await import('./service.js');

    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: {} },
    };
    const fakeComment = { id: 1, documentId: 10, content: '<p>hi</p>' };

    const txCommentCreate = vi.fn().mockResolvedValue(fakeComment);
    const txDocumentUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, commentCount: 1 });

    const mockTx = {
      comment: { create: txCommentCreate },
      document: { update: txDocumentUpdate },
    };
    // $transaction(fn) 형태로 호출됨
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await createComment(
      {
        documentId: 10,
        content: '<p>hi</p>',
        authorId: 5,
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txCommentCreate).toHaveBeenCalledOnce();
    expect(txDocumentUpdate).toHaveBeenCalledOnce();
    const updateArg = txDocumentUpdate.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { commentCount: { increment: number } };
    };
    expect(updateArg.where.id).toBe(10);
    expect(updateArg.data.commentCount).toEqual({ increment: 1 });
    expect(result.id).toBe(1);
  });

  it('B-502: 권한 거부 — guest (groupSrl=0) 가 write_comment=[1] 게시판에서 댓글 작성 시 throw', async () => {
    const { createComment } = await import('./service.js');

    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: { write_comment: [1] } },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      $transaction: vi.fn(),
    };

    await expect(
      createComment(
        {
          documentId: 10,
          content: 'x',
          authorId: null,
          nickName: 'guest',
          actor: { userGroupSrl: 0, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// listComments
// ---------------------------------------------------------------------------

describe('listComments', () => {
  it('B-503: comment.findMany 가 documentId 필터 + listOrder asc 로 호출됨', async () => {
    const { listComments } = await import('./service.js');

    const fakeComments = [{ id: 1 }, { id: 2 }];
    const mockFindMany = vi.fn().mockResolvedValue(fakeComments);
    const mockPrisma = { comment: { findMany: mockFindMany } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments({ documentId: 10 }, { prisma: mockPrisma as any });

    expect(mockFindMany).toHaveBeenCalledOnce();
    const arg = mockFindMany.mock.calls[0]?.[0] as {
      where: { documentId: number; deletedAt: null };
      orderBy: { listOrder: string };
    };
    expect(arg.where.documentId).toBe(10);
    expect(arg.where.deletedAt).toBeNull();
    expect(arg.orderBy).toEqual({ listOrder: 'asc' });
    expect(result).toEqual(fakeComments);
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------

describe('deleteComment', () => {
  it('B-504: 본인 작성 댓글 → 트랜잭션 안에서 comment.update(deletedAt) + document.update(commentCount--)', async () => {
    const { deleteComment } = await import('./service.js');

    const fakeComment = {
      id: 100,
      documentId: 10,
      authorId: 5,
    };

    const txCommentUpdate = vi.fn().mockResolvedValue({ ...fakeComment, deletedAt: new Date() });
    const txDocumentUpdate = vi.fn().mockResolvedValue({ id: 10, commentCount: 0 });

    const mockTx = {
      comment: { update: txCommentUpdate },
      document: { update: txDocumentUpdate },
    };
    const mockPrisma = {
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    await deleteComment(
      { id: 100, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txCommentUpdate).toHaveBeenCalledOnce();
    const commentArg = txCommentUpdate.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { deletedAt: unknown };
    };
    expect(commentArg.where.id).toBe(100);
    expect(commentArg.data.deletedAt).toBeInstanceOf(Date);

    const docArg = txDocumentUpdate.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { commentCount: { decrement: number } };
    };
    expect(docArg.where.id).toBe(10);
    expect(docArg.data.commentCount).toEqual({ decrement: 1 });
  });

  it('B-505: 타인 작성 + non-admin → throw, 트랜잭션 미실행', async () => {
    const { deleteComment } = await import('./service.js');
    const fakeComment = { id: 100, documentId: 10, authorId: 5 };
    const mockPrisma = {
      comment: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment) },
      $transaction: vi.fn(),
    };

    await expect(
      deleteComment(
        { id: 100, actor: { userId: 99, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
