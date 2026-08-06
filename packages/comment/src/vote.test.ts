/**
 * packages/comment/src/vote.test.ts — SPEC-COMMENT-001 Slice C (T-007)
 *
 * Comment voting — voteComment.
 *
 * REQ-COMMENT-030~034: 투표 카운터 원자성, 중복 투표, self-vote 거부 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voteComment } from './service';
import { CommentAlreadyVotedError, SelfVoteNotAllowedError } from './errors';

// ---------------------------------------------------------------------------
// voteComment
// ---------------------------------------------------------------------------

describe('voteComment', () => {
  it('REQ-COMMENT-030: voteType=1 인 경우 CommentVoteLog 생성 + votedCount++ 트랜잭션', async () => {
    const fakeComment = { id: 1, votedCount: 0, blamedCount: 0 };
    const fakeLog = { id: 1, commentId: 1, memberId: 5, voteType: 1 };

    const mockTx = {
      commentVoteLog: {
        create: vi.fn().mockResolvedValue(fakeLog),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn().mockResolvedValue({ ...fakeComment, votedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentVoteLog: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await voteComment(
      { commentId: 1, memberId: 5, voteType: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.commentVoteLog.create).toHaveBeenCalledOnce();
    expect(mockTx.comment.update).toHaveBeenCalledOnce();

    const updateArg = mockTx.comment.update.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { votedCount: { increment: number } };
    };
    expect(updateArg.data.votedCount).toEqual({ increment: 1 });
    expect(result).toEqual(fakeLog);
  });

  it('REQ-COMMENT-030: voteType=-1 인 경우 CommentVoteLog 생성 + blamedCount++ 트랜잭션', async () => {
    const fakeComment = { id: 1, votedCount: 0, blamedCount: 0 };
    const fakeLog = { id: 1, commentId: 1, memberId: 5, voteType: -1 };

    const mockTx = {
      commentVoteLog: {
        create: vi.fn().mockResolvedValue(fakeLog),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn().mockResolvedValue({ ...fakeComment, blamedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentVoteLog: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await voteComment(
      { commentId: 1, memberId: 5, voteType: -1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.commentVoteLog.create).toHaveBeenCalledOnce();
    expect(mockTx.comment.update).toHaveBeenCalledOnce();

    const updateArg = mockTx.comment.update.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { blamedCount: { increment: number } };
    };
    expect(updateArg.data.blamedCount).toEqual({ increment: 1 });
    expect(result).toEqual(fakeLog);
  });

  it('REQ-COMMENT-032: 동일 voteType으로 재투표 시 no-op (이미 로그 존재)', async () => {
    const fakeLog = { id: 1, commentId: 1, memberId: 5, voteType: 1 };

    const mockPrisma = {
      commentVoteLog: {
        findUnique: vi.fn().mockResolvedValue(fakeLog),
      },
      $transaction: vi.fn(),
    };

    const result = await voteComment(
      { commentId: 1, memberId: 5, voteType: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual(fakeLog);
  });

  it('REQ-COMMENT-033: 반대 voteType으로 변경 시 votedCount-- + blamedCount++ + voteType 갱신 트랜잭션', async () => {
    const fakeComment = { id: 1, votedCount: 1, blamedCount: 0 };
    const existingLog = { id: 1, commentId: 1, memberId: 5, voteType: 1 };

    const mockTx = {
      commentVoteLog: {
        update: vi.fn().mockResolvedValue({ ...existingLog, voteType: -1 }),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn()
          .mockResolvedValueOnce({ ...fakeComment, votedCount: 0 })
          .mockResolvedValueOnce({ ...fakeComment, votedCount: 0, blamedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentVoteLog: {
        findUnique: vi.fn().mockResolvedValue(existingLog),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await voteComment(
      { commentId: 1, memberId: 5, voteType: -1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.comment.update).toHaveBeenCalledTimes(2);

    // First call: decrement votedCount
    const firstUpdate = mockTx.comment.update.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { votedCount: { decrement: number } };
    };
    expect(firstUpdate.data.votedCount).toEqual({ decrement: 1 });

    // Second call: increment blamedCount
    const secondUpdate = mockTx.comment.update.mock.calls[1]?.[0] as {
      where: { id: number };
      data: { blamedCount: { increment: number } };
    };
    expect(secondUpdate.data.blamedCount).toEqual({ increment: 1 });

    expect(mockTx.commentVoteLog.update).toHaveBeenCalledOnce();
  });

  it('REQ-COMMENT-031: 본인 댓글에 투표 시 SelfVoteNotAllowedError throw', async () => {
    // self-vote 체크는 $transaction 내부에서 수행 (일관성 보장)
    const fakeComment = { id: 1, authorId: 5, votedCount: 0 };

    const mockTx = {
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment), // authorId=5, memberId=5
      },
      commentVoteLog: { create: vi.fn() },
    };

    const mockPrisma = {
      commentVoteLog: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    await expect(
      voteComment(
        { commentId: 1, memberId: 5, voteType: 1 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError(SelfVoteNotAllowedError);
  });

  it('REQ-COMMENT-034: guest (memberId=null) 투표 시 인증 에러 throw', async () => {
    const mockPrisma = {
      $transaction: vi.fn(),
    };

    await expect(
      voteComment(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { commentId: 1, memberId: null as any, voteType: 1 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
