// SPEC-NOTIFICATION-001 REQ-NOTIF-050: notificationHooks 헬퍼
// @MX:ANCHOR (fan_in: 2) — comment.create, message.create(미래) 모두 호출

import type { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { NotificationService } from './service';
import { extractMentionCandidates } from './mention';

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

interface MentionDetectedEvent {
  commentId: number;
  commentAuthorId: number | null;
  commentAuthorNickname: string;
  content: string;
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

  /**
   * REQ-NOTIF-007: 댓글 본문 멘션 감지 시 알림 생성 (Slice B)
   *
   * 트리거 시점:
   * - 댓글 본문에서 `@nickname` 패턴으로 추출된 후보 각각에 대해
   *   닉네임이 실제 회원과 일치하면 MENTION 알림 생성
   *
   * Spec:
   * - 멘션 후보가 없으면 db 접근 없이 즉시 반환
   * - 닉네임 해석은 `nickName`이 citext 컬럼이므로 대소문자 무시 일치 (EC-5: 해석 실패 시 예외 없이 skip)
   * - 자기-멘션 제외는 별도로 구현하지 않음 — NotificationService.create의
   *   기존 self-notification guard(actorId === recipientId)가 그대로 적용됨 (AC-NOTIF-B2)
   * - 동일 댓글 내 동일 닉네임 중복 멘션은 extractMentionCandidates에서 이미 dedupe 됨
   */
  async onMentionDetected(
    prisma: PrismaClient,
    event: MentionDetectedEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const candidates = extractMentionCandidates(event.content);

    if (candidates.length === 0) {
      return;
    }

    const svc = new NotificationService(prisma);
    const db = tx ?? prisma;

    for (const candidate of candidates) {
      // citext 컬럼이므로 findFirst의 where 비교가 대소문자 무시로 동작한다.
      const member = await db.user.findFirst({
        where: { nickName: candidate },
        select: { id: true },
      });

      if (!member) {
        // EC-5: 해석 실패는 무시 — 에러를 던지지 않는다.
        continue;
      }

      await svc.create(
        {
          recipientId: member.id,
          category: 'MENTION',
          sourceType: 'MENTION',
          sourceId: event.commentId,
          actorId: event.commentAuthorId,
          actorNickname: event.commentAuthorNickname,
        },
        tx,
      );
    }
  },
};
