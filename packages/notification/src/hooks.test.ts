// SPEC-NOTIFICATION-001 notificationHooks 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationHooks } from './hooks';
import type { PrismaClient } from '@prisma/client';

describe('notificationHooks', () => {
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      notificationPreference: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    mockTx = mockPrisma; // Same as prisma for simplicity

    // SPEC-NOTIFICATION-001 Slice B: 닉네임 해석용 findFirst (citext 대소문자 무시)
    mockPrisma.user.findFirst = vi.fn();
  });

  describe('onCommentCreated', () => {
    it('should create COMMENT notification for document author (REQ-NOTIF-002)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 10 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: null,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientId: 1,
          category: 'COMMENT',
          sourceType: 'COMMENT',
          sourceId: 100,
          actorId: 2,
          actorNickname: 'bob',
        },
      });
    });

    it('should create COMMENT_REPLY notification for parent comment author (REQ-NOTIF-003)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 3 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 11 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: 3, // Parent comment author exists
        },
        mockTx,
      );

      // Should create both COMMENT (for doc author) and COMMENT_REPLY (for parent author)
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('should not create self-notification (REQ-NOTIF-004)', async () => {
      // Comment author is same as document author
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1, // Same as comment author
          commentAuthorId: 1,
          commentAuthorNickname: 'alice',
          parentCommentAuthorId: null,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should skip when preference is disabled (REQ-NOTIF-008)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({ enabled: false });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: null,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should map to both COMMENT and COMMENT_REPLY when authors differ (REQ-NOTIF-002/003)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 10 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: 3,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

      // First call: COMMENT for document author
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 1,
            category: 'COMMENT',
            sourceType: 'COMMENT',
            sourceId: 100,
          }),
        }),
      );

      // Second call: COMMENT_REPLY for parent comment author
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 3,
            category: 'COMMENT_REPLY',
            sourceType: 'COMMENT',
            sourceId: 100,
          }),
        }),
      );
    });

    it('should not create COMMENT_REPLY when parentCommentAuthorId is null', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 10 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: null,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'COMMENT',
          }),
        }),
      );
    });

    it('should not create COMMENT_REPLY when parent author equals comment author (REQ-NOTIF-004)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 10 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: 2, // Same as comment author
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      // Only COMMENT notification created, not COMMENT_REPLY
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 1,
            category: 'COMMENT',
          }),
        }),
      );
    });

    it('should handle when both document and parent authors are the same person (EC-2)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 1 }) // Document author check
        .mockResolvedValueOnce({ id: 1 }); // Parent author check (same person)

      // First create() call succeeds, second finds duplicate
      mockPrisma.notification.findUnique
        .mockResolvedValueOnce(null) // First call: no duplicate
        .mockResolvedValueOnce({ id: 10 }); // Second call: duplicate found
      mockPrisma.notification.create.mockResolvedValue({ id: 10 });

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 1,
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: 1, // Same as document author
        },
        mockTx,
      );

      // Hook calls create() twice (once for COMMENT, once for COMMENT_REPLY)
      // But duplicate suppression in service.ts prevents second insertion
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 1,
            category: 'COMMENT',
            sourceType: 'COMMENT',
            sourceId: 100,
          }),
        }),
      );
    });

    it('should skip when recipient does not exist (EC-3)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null); // Recipient not found

      await notificationHooks.onCommentCreated(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          documentId: 200,
          documentAuthorId: 999, // Non-existent user
          commentAuthorId: 2,
          commentAuthorNickname: 'bob',
          parentCommentAuthorId: null,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('onMessageSent', () => {
    it('should create MESSAGE notification (future-hook)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 20 });

      await notificationHooks.onMessageSent(
        mockPrisma as PrismaClient,
        {
          messageId: 500,
          senderId: 1,
          senderNickname: 'alice',
          recipientId: 2,
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientId: 2,
          category: 'MESSAGE',
          sourceType: 'MESSAGE',
          sourceId: 500,
          actorId: 1,
          actorNickname: 'alice',
        },
      });
    });

    it('should not create self-notification for messages (REQ-NOTIF-004)', async () => {
      await notificationHooks.onMessageSent(
        mockPrisma as PrismaClient,
        {
          messageId: 500,
          senderId: 1,
          senderNickname: 'alice',
          recipientId: 1, // Same as sender
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('onMentionDetected', () => {
    it('should create MENTION notification for a resolved member (AC-NOTIF-B1)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 30 });

      await notificationHooks.onMentionDetected(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          commentAuthorId: 2,
          commentAuthorNickname: 'carol',
          content: '@bob 확인해주세요',
        },
        mockTx,
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { nickName: 'bob' },
        select: { id: true },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientId: 5,
          category: 'MENTION',
          sourceType: 'MENTION',
          sourceId: 100,
          actorId: 2,
          actorNickname: 'carol',
        },
      });
    });

    it('should create only 1 notification for a duplicate mention of the same nickname in one comment (AC-NOTIF-B1)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 30 });

      await notificationHooks.onMentionDetected(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          commentAuthorId: 2,
          commentAuthorNickname: 'carol',
          content: '@bob 확인해주세요 @bob',
        },
        mockTx,
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should not create a notification for a self-mention (AC-NOTIF-B2)', async () => {
      // 멘션 대상(alice, id=2)이 댓글 작성자(id=2)와 동일 — NotificationService.create의
      // 기존 self-notification guard(actorId === recipientId)가 그대로 적용된다.
      mockPrisma.user.findFirst.mockResolvedValue({ id: 2 });

      await notificationHooks.onMentionDetected(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          commentAuthorId: 2,
          commentAuthorNickname: 'alice',
          content: '@alice 참고용 메모',
        },
        mockTx,
      );

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should not create a notification and not throw when the mentioned nickname does not resolve to a member (EC-5)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        notificationHooks.onMentionDetected(
          mockPrisma as PrismaClient,
          {
            commentId: 100,
            commentAuthorId: 2,
            commentAuthorNickname: 'carol',
            content: '@nonexistent 안녕하세요',
          },
          mockTx,
        ),
      ).resolves.not.toThrow();

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should return immediately without any db call when content has no mention candidates', async () => {
      await notificationHooks.onMentionDetected(
        mockPrisma as PrismaClient,
        {
          commentId: 100,
          commentAuthorId: 2,
          commentAuthorNickname: 'carol',
          content: '멘션이 없는 일반 댓글',
        },
        mockTx,
      );

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
