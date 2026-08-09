/**
 * packages/comment/src/trash.test.ts — SPEC-CONTENT-PARITY-001 M2 (REQ-CPAR-008, design.md D-3).
 *
 * listDeletedComments / restoreComment / purgeComment — 댓글 휴지통(가상 뷰) 통합 뷰의 도메인 함수.
 *
 * CT-1: listDeletedComments → deletedAt IS NOT NULL 조회.
 * CT-2: restoreComment → deletedAt = null + document.commentCount++.
 * CT-3: restoreComment 존재하지 않음 → CommentNotFoundError.
 * CT-4: purgeComment → 리프 댓글 hard delete.
 * CT-5: purgeComment → 자식(답글) 있으면 자식부터 깊이 역순으로 함께 삭제(design.md D-3).
 * CT-6: purgeComment 비admin → BoardPermissionDeniedError.
 */
import { describe, it, expect, vi } from 'vitest';

describe('listDeletedComments (M2)', () => {
  it('CT-1: deletedAt IS NOT NULL 댓글만 조회한다', async () => {
    const { listDeletedComments } = await import('./trash.js');

    const fakeItems = [
      { id: 1, documentId: 10, deletedAt: new Date(), document: { id: 10, title: '제목' } },
    ];
    const findMany = vi.fn().mockResolvedValue(fakeItems);
    const mockPrisma = { comment: { findMany } };

    const result = await listDeletedComments(
      { actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(findMany).toHaveBeenCalledOnce();
    const callArg = findMany.mock.calls[0]?.[0] as { where: { deletedAt: unknown } };
    expect(callArg.where.deletedAt).not.toBeNull();
    expect(result.items).toHaveLength(1);
  });

  it('CT-1b: 비admin → BoardPermissionDeniedError', async () => {
    const { listDeletedComments } = await import('./trash.js');
    const mockPrisma = { comment: { findMany: vi.fn() } };

    await expect(
      listDeletedComments(
        { actor: { userId: 1, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });
});

describe('restoreComment (M2)', () => {
  it('CT-2: deletedAt = null 로 복원하고 document.commentCount 를 증가시킨다', async () => {
    const { restoreComment } = await import('./trash.js');

    const fakeComment = { id: 1, documentId: 10, deletedAt: new Date() };
    const txCommentFindUnique = vi.fn().mockResolvedValue(fakeComment);
    const txCommentUpdate = vi.fn().mockResolvedValue({ ...fakeComment, deletedAt: null });
    const txDocumentUpdate = vi.fn().mockResolvedValue({ id: 10, commentCount: 1 });

    const mockTx = {
      comment: { findUnique: txCommentFindUnique, update: txCommentUpdate },
      document: { update: txDocumentUpdate },
    };
    const mockPrisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await restoreComment(
      { commentId: 1, actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(txCommentUpdate).toHaveBeenCalledOnce();
    const updateArg = txCommentUpdate.mock.calls[0]?.[0] as { data: { deletedAt: unknown } };
    expect(updateArg.data.deletedAt).toBeNull();
    expect(txDocumentUpdate).toHaveBeenCalledOnce();
    const docUpdateArg = txDocumentUpdate.mock.calls[0]?.[0] as {
      data: { commentCount: { increment: number } };
    };
    expect(docUpdateArg.data.commentCount).toEqual({ increment: 1 });
    expect(result.deletedAt).toBeNull();
  });

  it('CT-3: 존재하지 않는 댓글 → CommentNotFoundError', async () => {
    const { restoreComment, CommentNotFoundError } = await import('./trash.js');

    const mockTx = {
      comment: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
      document: { update: vi.fn() },
    };
    const mockPrisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    await expect(
      restoreComment(
        { commentId: 999, actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toBeInstanceOf(CommentNotFoundError);
  });

  it('CT-3b: 비admin → BoardPermissionDeniedError', async () => {
    const { restoreComment } = await import('./trash.js');
    const mockPrisma = { $transaction: vi.fn() };

    await expect(
      restoreComment(
        { commentId: 1, actor: { userId: 1, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });
});

describe('purgeComment (M2)', () => {
  it('CT-4: 답글이 없는 리프 댓글 → hard delete', async () => {
    const { purgeComment } = await import('./trash.js');

    const fakeComment = { id: 1, documentId: 10, deletedAt: new Date() };
    const txCommentFindUnique = vi.fn().mockResolvedValue(fakeComment);
    const txCommentFindMany = vi.fn().mockResolvedValue([]); // no replies
    const txCommentDeleteMany = vi.fn().mockResolvedValue({ count: 1 });

    const mockTx = {
      comment: {
        findUnique: txCommentFindUnique,
        findMany: txCommentFindMany,
        deleteMany: txCommentDeleteMany,
      },
    };
    const mockPrisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await purgeComment(
      { commentId: 1, actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(txCommentDeleteMany).toHaveBeenCalledOnce();
    expect(result.commentId).toBe(1);
  });

  it('CT-5: 답글이 있으면 자식부터 깊이 역순으로 함께 삭제한다 (design.md D-3)', async () => {
    const { purgeComment } = await import('./trash.js');

    // 트리: 1(root, deleted) -> 2(child) -> 3(grandchild)
    const root = { id: 1, documentId: 10, parentId: null, deletedAt: new Date() };
    const child = { id: 2, documentId: 10, parentId: 1, deletedAt: null };
    const grandchild = { id: 3, documentId: 10, parentId: 2, deletedAt: null };

    const txCommentFindUnique = vi.fn().mockResolvedValue(root);
    // findMany 호출: 1차(자식 [2]) 2차(자식 [3]) 3차(자식 없음 [])
    const txCommentFindMany = vi
      .fn()
      .mockResolvedValueOnce([child])
      .mockResolvedValueOnce([grandchild])
      .mockResolvedValueOnce([]);
    const deleteCallOrder: number[][] = [];
    const txCommentDeleteMany = vi.fn().mockImplementation(async (args: { where: { id: { in: number[] } } }) => {
      deleteCallOrder.push(args.where.id.in);
      return { count: args.where.id.in.length };
    });

    const mockTx = {
      comment: {
        findUnique: txCommentFindUnique,
        findMany: txCommentFindMany,
        deleteMany: txCommentDeleteMany,
      },
    };
    const mockPrisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    await purgeComment(
      { commentId: 1, actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // 가장 깊은 노드(grandchild=3)부터 삭제되고, 마지막에 root(1)가 삭제되어야 함
    expect(deleteCallOrder.length).toBeGreaterThanOrEqual(2);
    const flattened = deleteCallOrder.flat();
    expect(flattened.indexOf(3)).toBeLessThan(flattened.indexOf(1));
    expect(flattened.indexOf(2)).toBeLessThan(flattened.indexOf(1));
  });

  it('CT-6: 비admin → BoardPermissionDeniedError', async () => {
    const { purgeComment } = await import('./trash.js');
    const mockPrisma = { $transaction: vi.fn() };

    await expect(
      purgeComment(
        { commentId: 1, actor: { userId: 1, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });
});
