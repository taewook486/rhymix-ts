/**
 * content.message tRPC 라우터 — SPEC-MESSAGE-001.
 *
 * content.message.send:      쪽지 발송 (인증 필요)
 * content.message.list:      쪽지함 목록 (인증 필요)
 * content.message.read:      읽음 상태 변경 (인증 필요)
 * content.message.delete:    쪽지 삭제 (인증 필요)
 * content.message.countUnread: 안읽은 카운트 (인증 필요)
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import { MessageService, createMessageService, type MessageHooks } from '@rhymix-ts/message';
import { createNotificationService } from '@rhymix-ts/notification';
import {
  MessageSendInputSchema,
  MessageListInputSchema,
  MessageReadInputSchema,
  MessageDeleteInputSchema,
} from '@rhymix-ts/message';

// @MX:NOTE: [AUTO] 지연 생성 — 모듈 최상단에서 즉시 호출하면 테스트의 vi.mock('@rhymix-ts/message')
// 적용 이전에 실제 모듈을 평가하게 되어 mock 이 우회된다. 다른 content 라우터들처럼 요청 처리 시점에 호출한다.
let messageService: MessageService | undefined;
function getMessageService(): MessageService {
  messageService ??= createMessageService();
  return messageService;
}

export const contentMessageRouter = router({
  /**
   * 쪽지 발송 — REQ-MSG-001
   *
   * @MX:NOTE: [AUTO] 알림 훅은 ctx.prisma 가 필요해 packages/message 의 정적 no-op
   * messageHooks 대신 요청 스코프에서 직접 구성한다 (REQ-MSG-003).
   */
  send: protectedProcedure
    .input(MessageSendInputSchema)
    .mutation(async ({ ctx, input }) => {
      const senderId = Number(ctx.session.user.id);
      const notificationService = createNotificationService(ctx.prisma);

      const hooks: MessageHooks = {
        onNewMessage: async ({ messageId, senderId: actorId, receiverId }) => {
          const sender = await ctx.prisma.user.findUnique({
            where: { id: actorId },
            select: { nickName: true },
          });

          await notificationService.create({
            recipientId: receiverId,
            category: 'MESSAGE',
            sourceType: 'MESSAGE',
            sourceId: messageId,
            actorId,
            actorNickname: sender?.nickName ?? '',
          });
        },
      };

      return getMessageService().sendMessage(senderId, input, hooks);
    }),

  /**
   * 쪽지함 목록 — REQ-MSG-002
   */
  list: protectedProcedure
    .input(MessageListInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      return getMessageService().listMessages(userId, input);
    }),

  /**
   * 읽음 상태 변경 — REQ-MSG-003
   */
  read: protectedProcedure
    .input(MessageReadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      await getMessageService().readMessage(userId, input);

      // REQ-MSG-003: 쪽지를 읽으면 연결된 알림도 읽음 처리해 헤더 카운트를 감소시킨다.
      await ctx.prisma.notification.updateMany({
        where: {
          recipientId: userId,
          sourceType: 'MESSAGE',
          sourceId: input.id,
          read: false,
        },
        data: { read: true, readAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * 쪽지 삭제 — REQ-MSG-004
   */
  delete: protectedProcedure
    .input(MessageDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      await getMessageService().deleteMessage(userId, input);
      return { success: true };
    }),

  /**
   * 안읽은 쪽지 카운트 — REQ-MSG-003
   */
  countUnread: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const count = await getMessageService().countUnread(userId);
    return { count };
  }),
});
