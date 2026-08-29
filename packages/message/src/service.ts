import { prisma } from '@rhymix-ts/db';
import type { MessageConfig } from './config';
import { defaultMessageConfig } from './config';
import type {
  MessageSendInput,
  MessageListInput,
  MessageReadInput,
  MessageDeleteInput,
} from './schemas';
import {
  MessageReceiverNotFoundError,
  MessageBlockedError,
  MessageSelfSendError,
  MessageNotFoundError,
  MessageNoPermissionError,
  MessageSystemDisabledError,
  MessageReceiverOptedOutError,
} from './errors';

/**
 * Message service - core business logic for 1:1 messaging
 *
 * SPEC-MESSAGE-001 service methods:
 * - sendMessage: REQ-MSG-001 (발송 + 알림 생성 + 차단 체크)
 * - listMessages: REQ-MSG-002 (받은쪽지/보낸쪽지 목록)
 * - readMessage: REQ-MSG-003 (읽음 상태 변경)
 * - deleteMessage: REQ-MSG-004 (독립 삭제)
 * - countUnread: REQ-MSG-003 (안읽은 카운트)
 */

export class MessageService {
  constructor(private config: MessageConfig = defaultMessageConfig) {}

  /**
   * Send a 1:1 message
   *
   * REQ-MSG-001: 쪽지 발송
   * - 수신자 존재 검증
   * - 자기 자신에게 발송 금지
   * - 차단된 사용자 체크 (REQ-MSG-004)
   * - 쪽지 수신 알림 생성 (REQ-MSG-003)
   */
  async sendMessage(
    senderId: number,
    input: MessageSendInput,
    hooks?: MessageHooks
  ): Promise<{ id: number }> {
    // REQ-MSG-005: 시스템 비활성화 체크
    if (!this.config.enabled) {
      throw new MessageSystemDisabledError();
    }

    // 자기 자신에게 발송 금지
    if (senderId === input.receiverId) {
      throw new MessageSelfSendError();
    }

    // 수신자 존재 검증
    const receiver = await prisma.user.findUnique({
      where: { id: input.receiverId },
      select: { id: true, denied: true, allowMessages: true },
    });

    if (!receiver) {
      throw new MessageReceiverNotFoundError(input.receiverId);
    }

    // 차단된 사용자 체크
    if (receiver.denied) {
      throw new MessageBlockedError();
    }

    // 쪽지 수신 거부 설정 체크 (REQ-MSG-004)
    if (receiver.allowMessages === false) {
      throw new MessageReceiverOptedOutError();
    }

    // 쪽지 생성
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: input.receiverId,
        subject: input.subject,
        content: input.content,
      },
      select: { id: true },
    });

    // 알림 생성 (REQ-MSG-003)
    if (hooks?.onNewMessage) {
      await hooks.onNewMessage({
        messageId: message.id,
        senderId,
        receiverId: input.receiverId,
      });
    }

    return { id: message.id };
  }

  /**
   * List messages (inbox or sent)
   *
   * REQ-MSG-002: 쪽지함 목록
   * - folder: 'inbox' | 'sent'
   * - cursor-based pagination
   */
  async listMessages(
    userId: number,
    input: MessageListInput
  ): Promise<{ messages: Array<any>; nextCursor: number | null }> {
    const isInbox = input.folder === 'inbox';

    const where = {
      // inbox: received messages not deleted by receiver
      // sent: sent messages not deleted by sender
      ...(isInbox
        ? { receiverId: userId, receiverDel: false }
        : { senderId: userId, senderDel: false }),
    };

    const messages = await prisma.message.findMany({
      where,
      select: {
        id: true,
        subject: true,
        content: true,
        readAt: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            nickName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      ...(input.cursor && {
        skip: 1,
        cursor: { id: input.cursor },
      }),
    });

    const nextCursor = messages.length === input.limit && messages.length > 0 ? messages[messages.length - 1]?.id ?? null : null;

    return { messages, nextCursor };
  }

  /**
   * Mark message as read
   *
   * REQ-MSG-003: 쪽지 읽음 상태 변경
   */
  async readMessage(userId: number, input: MessageReadInput): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: input.id },
      select: { id: true, receiverId: true, readAt: true },
    });

    if (!message) {
      throw new MessageNotFoundError(input.id);
    }

    // 수신자만 읽음 표시 가능
    if (message.receiverId !== userId) {
      throw new MessageNoPermissionError();
    }

    // 이미 읽은 경우 재처리하지 않음 (idempotent)
    if (message.readAt) {
      return;
    }

    await prisma.message.update({
      where: { id: input.id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Delete message (independent per side)
   *
   * REQ-MSG-004: 양측 독립 삭제
   */
  async deleteMessage(userId: number, input: MessageDeleteInput): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: input.id },
      select: { id: true, senderId: true, receiverId: true, senderDel: true, receiverDel: true },
    });

    if (!message) {
      throw new MessageNotFoundError(input.id);
    }

    // 발신자 또는 수신자만 삭제 가능
    const isSender = message.senderId === userId;
    const isReceiver = message.receiverId === userId;

    if (!isSender && !isReceiver) {
      throw new MessageNoPermissionError();
    }

    // 발신자 삭제: senderDel = true
    // 수신자 삭제: receiverDel = true
    await prisma.message.update({
      where: { id: input.id },
      data: isSender ? { senderDel: true } : { receiverDel: true },
    });
  }

  /**
   * Count unread messages
   *
   * REQ-MSG-003: 안읽은 쪽지 수
   */
  async countUnread(userId: number): Promise<number> {
    return prisma.message.count({
      where: {
        receiverId: userId,
        receiverDel: false,
        readAt: null,
      },
    });
  }
}

/**
 * Message hooks for external integration
 *
 * REQ-MSG-003: 알림 시스템 연동 (SPEC-NOTIFICATION-001)
 */
export interface MessageHooks {
  onNewMessage: (params: {
    messageId: number;
    senderId: number;
    receiverId: number;
  }) => Promise<void>;
}

export function createMessageService(config?: MessageConfig) {
  return new MessageService(config);
}

export { defaultMessageConfig };
export type { MessageConfig };
