/**
 * packages/comment/src/__tests__/report.test.ts — SPEC-COMMENT-001 Slice C (T-007)
 *
 * Comment reporting — reportComment.
 *
 * REQ-COMMENT-040~043: 신고 카운터 원자성, 중복 신고 차단 검증.
 */
import { describe, it, expect, vi } from 'vitest';
import { reportComment } from '../service';
import { CommentAlreadyReportedError } from '../errors';

// ---------------------------------------------------------------------------
// reportComment
// ---------------------------------------------------------------------------

describe('reportComment', () => {
  it('REQ-COMMENT-040: CommentReport 생성 + blamedCount++ 트랜잭션', async () => {
    const fakeComment = { id: 1, blamedCount: 0 };
    const fakeReport = {
      id: 1,
      commentId: 1,
      reporterId: 5,
      reporterIp: '127.0.0.1',
      reason: 'spam',
    };

    const mockTx = {
      commentReport: {
        create: vi.fn().mockResolvedValue(fakeReport),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn().mockResolvedValue({ ...fakeComment, blamedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentReport: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await reportComment(
      {
        commentId: 1,
        reporterId: 5,
        reporterIp: '127.0.0.1',
        reason: 'spam',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.commentReport.create).toHaveBeenCalledOnce();
    expect(mockTx.comment.update).toHaveBeenCalledOnce();

    const updateArg = mockTx.comment.update.mock.calls[0]?.[0] as {
      where: { id: number };
      data: { blamedCount: { increment: number } };
    };
    expect(updateArg.data.blamedCount).toEqual({ increment: 1 });
    expect(result).toEqual(fakeReport);
  });

  it('REQ-COMMENT-041: 동일 (commentId, reporterId) 중복 신고 시 CommentAlreadyReportedError throw', async () => {
    const existingReport = {
      id: 1,
      commentId: 1,
      reporterId: 5,
    };

    const mockPrisma = {
      commentReport: {
        findFirst: vi.fn().mockResolvedValue(existingReport),
      },
      $transaction: vi.fn(),
    };

    await expect(
      reportComment(
        {
          commentId: 1,
          reporterId: 5,
          reporterIp: '127.0.0.1',
          reason: 'spam',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError(CommentAlreadyReportedError);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('REQ-COMMENT-042: reason은 최대 500자까지 허용', async () => {
    const fakeComment = { id: 1, blamedCount: 0 };
    const fakeReport = {
      id: 1,
      commentId: 1,
      reporterId: 5,
      reporterIp: '127.0.0.1',
      reason: 'a'.repeat(500),
    };

    const mockTx = {
      commentReport: {
        create: vi.fn().mockResolvedValue(fakeReport),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn().mockResolvedValue({ ...fakeComment, blamedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentReport: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await reportComment(
      {
        commentId: 1,
        reporterId: 5,
        reporterIp: '127.0.0.1',
        reason: 'a'.repeat(500),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result.reason).toHaveLength(500);
  });

  it('REQ-COMMENT-042: reason은 500자 초과 시 Zod 에러 (서비스 레이어 진입 전)', async () => {
    const mockPrisma = {
      $transaction: vi.fn(),
    };

    await expect(
      reportComment(
        {
          commentId: 1,
          reporterId: 5,
          reporterIp: '127.0.0.1',
          reason: 'a'.repeat(501),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('reporterIp는 nullable (선택적)', async () => {
    const fakeComment = { id: 1, blamedCount: 0 };
    const fakeReport = {
      id: 1,
      commentId: 1,
      reporterId: 5,
      reporterIp: null,
      reason: 'spam',
    };

    const mockTx = {
      commentReport: {
        create: vi.fn().mockResolvedValue(fakeReport),
      },
      comment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeComment),
        update: vi.fn().mockResolvedValue({ ...fakeComment, blamedCount: 1 }),
      },
    };

    const mockPrisma = {
      commentReport: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTx)),
    };

    const result = await reportComment(
      {
        commentId: 1,
        reporterId: 5,
        reporterIp: null,
        reason: 'spam',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result.reporterIp).toBeNull();
  });
});
