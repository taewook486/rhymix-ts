// SPEC-NOTIFICATION-001 REQ-NOTIF-050: notificationHooks 헬퍼
// @MX:ANCHOR (fan_in: 2) — comment.create, message.create(미래) 모두 호출

import type { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { NotificationService } from './service';

interface CommentCreatedEvent {
  commentId: number;
  documentId: number;
  documentAuthorId: number;
  commentAuthorId: number | null;
  commentAuthorNickname: string;
  parentCommentAuthorId: number | null;
}

interface MessageSentEvent {
  messageId: number;
  senderId: number;
  senderNickname: string;
  recipientId: number;
}

export const notificationHooks = {
  /**
   * REQ-NOTIF-002/003/004/005/008: 댓글 작성 시 알림 생성
   *
   * 트리거 시점:
   * - 문서 작성자에게 COMMENT 알림 (작성자 ≠ 댓글 작성자)
   * - 부모 댓글 작성자에게 COMMENT_REPLY 알림 (부모 댓글 작성자 ≠ 댓글 작성자)
   *
   * Spec:
   * - self-notification 제외 (REQ-NOTIF-004)
   * - preference 게이트 (REQ-NOTIF-008)
   * - 트랜잭션 내 직접 호출 (REQ-NOTIF-005)
   * - 탈퇴/비활성 회원 skip (EC-3)
   */
  async onCommentCreated(
    prisma: PrismaClient,
    event: CommentCreatedEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const svc = new NotificationService(prisma);

    const actorId = event.commentAuthorId;
    const actorNickname = event.commentAuthorNickname;

    // REQ-NOTIF-002: 문서 작성자에게 COMMENT 알림
    if (event.documentAuthorId !== actorId) {
      await svc.create(
        {
          recipientId: event.documentAuthorId,
          category: 'COMMENT',
          sourceType: 'COMMENT',
          sourceId: event.commentId,
          actorId,
          actorNickname,
        },
        tx,
      );
    }

    // REQ-NOTIF-003: 부모 댓글 작성자에게 COMMENT_REPLY 알림
    if (event.parentCommentAuthorId && event.parentCommentAuthorId !== actorId) {
      await svc.create(
        {
          recipientId: event.parentCommentAuthorId,
          category: 'COMMENT_REPLY',
          sourceType: 'COMMENT',
          sourceId: event.commentId,
          actorId,
          actorNickname,
        },
        tx,
      );
    }
  },

  /**
   * REQ-NOTIF-009/052: 쪽지 도착 알림 (future-hook)
   *
   * SPEC-NOTIFICATION-001 Slice A는 쪽지 도메인이 없으므로 named-export만 제공.
   * 향후 SPEC-MESSAGE-001 구현 시 이 훅을 호출하도록 의존 방향 설계.
   *
   * Spec:
   * - packages/notification은 packages/message를 import하지 않음 (REQ-NOTIF-009/051)
   * - 의존 방향: message → notification (단방향)
   */
  async onMessageSent(
    prisma: PrismaClient,
    event: MessageSentEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const svc = new NotificationService(prisma);

    // REQ-NOTIF-004: self-notification 제외 (발신자 = 수신자면 알림 없음)
    if (event.senderId === event.recipientId) {
      return;
    }

    await svc.create(
      {
        recipientId: event.recipientId,
        category: 'MESSAGE',
        sourceType: 'MESSAGE',
        sourceId: event.messageId,
        actorId: event.senderId,
        actorNickname: event.senderNickname,
      },
      tx,
    );
  },
};
