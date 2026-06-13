/**
 * packages/comment/src/__tests__/service-slice-c.test.ts — SPEC-COMMENT-001 Slice C (T-007)
 *
 * Comment service Slice C — depth limit, secret visibility, delete with votes.
 *
 * REQ-COMMENT-050~063: 비밀 댓글 가시성, depth 제한, 삭제 시 vote 카운터 정리.
 */
import { describe, it, expect, vi } from 'vitest';
import { createComment, listComments, deleteComment } from '../service';
import { CommentDepthExceededError } from '../errors';
import type { Comment } from '@prisma/client';

// ---------------------------------------------------------------------------
// createComment — Depth Limit (REQ-COMMENT-060~063)
// ---------------------------------------------------------------------------

describe('createComment — depth limit', () => {
  it('REQ-COMMENT-061: depth=4인 parent에 댓글 작성 시도 시 CommentDepthExceededError throw', async () => {
    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: {} },
    };

    // depth 4 체인: 1->2->3->4->5 (parent=5, depth=4)
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
      { id: 2, documentId: 10, parentId: 1, content: 'child1', status: 1 } as Comment,
      { id: 3, documentId: 10, parentId: 2, content: 'child2', status: 1 } as Comment,
      { id: 4, documentId: 10, parentId: 3, content: 'child3', status: 1 } as Comment,
      { id: 5, documentId: 10, parentId: 4, content: 'child4', status: 1 } as Comment,
    ];

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
        findUnique: vi.fn().mockResolvedValue({ id: 5, documentId: 10, parentId: 4 }),
      },
      $transaction: vi.fn(),
    };

    await expect(
      createComment(
        {
          documentId: 10,
          parentId: 5,
          content: 'this would be depth 5',
          authorId: 5,
          nickName: null,
          actor: { userGroupSrl: 1, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError(CommentDepthExceededError);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('REQ-COMMENT-061: depth<5인 parent에는 댓글 작성 성공', async () => {
    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: {} },
    };
    const fakeComment = { id: 1, documentId: 10, content: '<p>hi</p>' };

    // depth 3 체인
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
      { id: 2, documentId: 10, parentId: 1, content: 'child1', status: 1 } as Comment,
      { id: 3, documentId: 10, parentId: 2, content: 'child2', status: 1 } as Comment,
    ];

    const txCommentCreate = vi.fn().mockResolvedValue(fakeComment);
    const txDocumentUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, commentCount: 1 });

    const mockTx = {
      comment: { create: txCommentCreate },
      document: { update: txDocumentUpdate },
    };

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
        findUnique: vi.fn().mockResolvedValue({ id: 3, documentId: 10, parentId: 2 }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await createComment(
      {
        documentId: 10,
        parentId: 3,
        content: '<p>depth 4 reply</p>',
        authorId: 5,
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txCommentCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe(1);
  });

  it('REQ-COMMENT-062: parentId=null인 루트 댓글은 항상 허용 (depth=0)', async () => {
    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: {} },
    };
    const fakeComment = { id: 1, documentId: 10, content: '<p>root</p>' };

    const txCommentCreate = vi.fn().mockResolvedValue(fakeComment);
    const txDocumentUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, commentCount: 1 });

    const mockTx = {
      comment: { create: txCommentCreate },
      document: { update: txDocumentUpdate },
    };

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      comment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await createComment(
      {
        documentId: 10,
        parentId: null,
        content: '<p>new root</p>',
        authorId: 5,
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(result.id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// createComment — Secret Comment (REQ-COMMENT-050~053)
// ---------------------------------------------------------------------------

describe('createComment — secret comment', () => {
  it('REQ-COMMENT-050: isSecret=true인 경우 status=SECRET(=2)로 설정', async () => {
    const fakeDoc = {
      id: 10,
      boardId: 7,
      commentCount: 0,
      board: { id: 7, permissions: {} },
    };
    const fakeComment = {
      id: 1,
      documentId: 10,
      content: '<p>secret</p>',
      isSecret: true,
      status: 2,
    };

    const txCommentCreate = vi.fn().mockResolvedValue(fakeComment);
    const txDocumentUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, commentCount: 1 });

    const mockTx = {
      comment: { create: txCommentCreate },
      document: { update: txDocumentUpdate },
    };

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
      comment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await createComment(
      {
        documentId: 10,
        content: '<p>secret</p>',
        isSecret: true,
        authorId: 5,
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txCommentCreate).toHaveBeenCalledOnce();

    const createArg = txCommentCreate.mock.calls[0]?.[0] as {
      data: { isSecret: boolean; status: number };
    };
    expect(createArg.data.isSecret).toBe(true);
    expect(createArg.data.status).toBe(2);
    expect(result.isSecret).toBe(true);
    expect(result.status).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// listComments — Secret Visibility (REQ-COMMENT-052)
// ---------------------------------------------------------------------------

describe('listComments — secret visibility', () => {
  it('REQ-COMMENT-052: SECRET 댓글은 무관 사용자에게 placeholder로 치환됨', async () => {
    const comments: Comment[] = [
      {
        id: 1,
        documentId: 10,
        parentId: null,
        content: 'public',
        status: 1,
        isSecret: false,
        authorId: 100,
      } as Comment,
      {
        id: 2,
        documentId: 10,
        parentId: null,
        content: 'secret content',
        status: 2,
        isSecret: true,
        authorId: 200,
      } as Comment,
    ];

    const mockPrisma = {
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
      },
    };

    // 무관 사용자 (userId: 999, isAdmin: false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments(
      { documentId: 10, actor: { userId: 999, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('public');
    expect(result[1].content).toBe('비밀 댓글입니다.');
  });

  it('REQ-COMMENT-052: SECRET 댓글은 작성자에게 원문 유지됨', async () => {
    const comments: Comment[] = [
      {
        id: 1,
        documentId: 10,
        parentId: null,
        content: 'secret content',
        status: 2,
        isSecret: true,
        authorId: 200,
      } as Comment,
    ];

    const mockPrisma = {
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
      },
    };

    // 작성자 (userId: 200)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments(
      { documentId: 10, actor: { userId: 200, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('secret content');
  });

  it('REQ-COMMENT-052: SECRET 댓글은 admin에게 원문 유지됨', async () => {
    const comments: Comment[] = [
      {
        id: 1,
        documentId: 10,
        parentId: null,
        content: 'secret content',
        status: 2,
        isSecret: true,
        authorId: 200,
      } as Comment,
    ];

    const mockPrisma = {
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
      },
    };

    // admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments(
      { documentId: 10, actor: { userId: 999, isAdmin: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('secret content');
  });

  it('REQ-COMMENT-052: SECRET 댓글은 document 작성자에게 원문 유지됨', async () => {
    const comments: Comment[] = [
      {
        id: 1,
        documentId: 10,
        parentId: null,
        content: 'secret content',
        status: 2,
        isSecret: true,
        authorId: 200,
      } as Comment,
    ];

    const fakeDoc = { id: 10, authorId: 999 };

    const mockPrisma = {
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
      },
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
      },
    };

    // document 작성자 (userId: 999)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments(
      { documentId: 10, actor: { userId: 999, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('secret content');
  });

  it('REQ-COMMENT-052: SECRET 댓글은 ancestor 작성자에게 원문 유지됨 (2단계)', async () => {
    const comments: Comment[] = [
      {
        id: 1,
        documentId: 10,
        parentId: null,
        content: 'root by 100',
        status: 1,
        isSecret: false,
        authorId: 100,
      } as Comment,
      {
        id: 2,
        documentId: 10,
        parentId: 1,
        content: 'child by 200',
        status: 1,
        isSecret: false,
        authorId: 200,
      } as Comment,
      {
        id: 3,
        documentId: 10,
        parentId: 2,
        content: 'secret by 300',
        status: 2,
        isSecret: true,
        authorId: 300,
      } as Comment,
    ];

    const mockPrisma = {
      comment: {
        findMany: vi.fn().mockResolvedValue(comments),
      },
    };

    // ancestor 작성자 (userId: 100 - root 작성자)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listComments(
      { documentId: 10, actor: { userId: 100, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result).toHaveLength(3);
    expect(result[2].content).toBe('secret by 300');
  });
});

// ---------------------------------------------------------------------------
// deleteComment — with vote integration
// ---------------------------------------------------------------------------

describe('deleteComment — vote integration', () => {
  it('댓글 삭제 시 votedCount/blamedCount와 함께 카운터 감소', async () => {
    const fakeComment = {
      id: 100,
      documentId: 10,
      authorId: 5,
      votedCount: 3,
      blamedCount: 1,
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
    expect(txDocumentUpdate).toHaveBeenCalledOnce();
  });
});
