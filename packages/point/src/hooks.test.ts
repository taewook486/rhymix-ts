import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pointHooks } from './hooks.js';
import { PointService } from './service.js';

// Mock helpers
function makePrisma(overrides = {}) {
  const base = {
    point: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findFirst: vi.fn().mockResolvedValue(null), // idempotency: 중복 없음
    },
    user: {
      // PointService.add/subtract가 member 존재 여부 확인 시 필요
      findUnique: vi.fn().mockResolvedValue({ id: 1, pointBalance: 0 }),
      update: vi.fn().mockResolvedValue({ id: 1, pointBalance: 10, select: { pointBalance: true } }),
    },
    sitePointConfig: {
      findUnique: vi.fn().mockResolvedValue({
        id: 1,
        signupBonus: 100,
        clampToZero: true,
        allowNegativeBalance: false,
        defaultLevel: 1,
      }),
    },
    ...overrides,
  };
  base.$transaction = vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(base));
  return base;
}

describe('pointHooks', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  describe('onDocumentCreated', () => {
    it('should call add when pointPerDocument > 0', async () => {
      // Given: pointPerDocument = 10
      const input = {
        documentId: 123,  // number (hooks.ts DocumentCreatedEvent.documentId: number)
        authorId: 1,
        boardId: 5,
        pointPerDocument: 10,
      };

      // When: onDocumentCreated
      await pointHooks.onDocumentCreated(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: point.create called (via PointService.add)
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 1,
            amount: 10,
            sourceType: 'DOCUMENT',
            sourceId: 123,
            reason: 'document.create',
          }),
        })
      );
    });

    it('should skip when pointPerDocument = 0', async () => {
      // Given: pointPerDocument = 0
      const input = {
        documentId: 123,
        authorId: 1,
        boardId: 5,
        pointPerDocument: 0,
      };

      // When: onDocumentCreated
      await pointHooks.onDocumentCreated(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: no DB calls made
      expect(prisma.point.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('onCommentCreated', () => {
    it('should call add when pointPerComment > 0', async () => {
      // Given: pointPerComment = 5
      const input = {
        commentId: 456,  // number (hooks.ts CommentCreatedEvent.commentId: number)
        authorId: 2,
        boardId: 5,
        pointPerComment: 5,
      };

      // When: onCommentCreated
      await pointHooks.onCommentCreated(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: point.create called
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 2,
            amount: 5,
            sourceType: 'COMMENT',
            sourceId: 456,
            reason: 'comment.create',
          }),
        })
      );
    });
  });

  describe('onMemberSignedUp', () => {
    it('should add signup bonus points', async () => {
      // Given: signupBonus = 100
      const input = {
        memberId: 10,
        signupBonus: 100,
      };

      // When: onMemberSignedUp
      await pointHooks.onMemberSignedUp(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: point.create called with sourceType=SIGNUP, sourceId=memberId
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 10,
            amount: 100,
            sourceType: 'SIGNUP',
            sourceId: 10,  // hooks.ts: sourceId: event.memberId (number)
            reason: 'signup.bonus',
          }),
        })
      );
    });

    it('should skip when signupBonus = 0', async () => {
      // Given: signupBonus = 0
      const input = {
        memberId: 10,
        signupBonus: 0,
      };

      // When: onMemberSignedUp
      await pointHooks.onMemberSignedUp(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: no DB calls
      expect(prisma.point.create).not.toHaveBeenCalled();
    });
  });

  describe('onVoteCast', () => {
    it('should add points to target author when upvote', async () => {
      // Given: upvote with pointPerVoteUp = 3
      const input = {
        targetAuthorId: 5,
        voterId: 7,
        boardId: 2,
        isUp: true,
        pointPerVoteUp: 3,
        pointPerVoteDown: -1,
      };

      // When: onVoteCast
      await pointHooks.onVoteCast(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: point.create called with positive amount
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 5,
            amount: 3,
            sourceType: 'VOTE',
            reason: 'vote.up',  // hooks.ts: reason = event.isUp ? 'vote.up' : 'vote.down'
          }),
        })
      );
    });

    it('should subtract points from target author when downvote', async () => {
      // Given: downvote with pointPerVoteDown = -1, author balance 충분
      prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 5, pointBalance: 100 });
      const input = {
        targetAuthorId: 5,
        voterId: 7,
        boardId: 2,
        isUp: false,
        pointPerVoteUp: 3,
        pointPerVoteDown: -1,
      };

      // When: onVoteCast
      await pointHooks.onVoteCast(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        input
      );

      // Then: point.create called with negative amount
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 5,
            amount: -1,
            sourceType: 'VOTE',
            reason: 'vote.down',  // hooks.ts: reason = 'vote.down' (subtract → Point.amount=-1)
          }),
        })
      );
    });
  });
});
