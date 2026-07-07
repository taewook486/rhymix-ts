import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService, createMessageService } from './service';
import { prisma } from '@rhymix-ts/db';
import type { MessageSendInput, MessageListInput } from './schemas';
import {
  MessageReceiverNotFoundError,
  MessageBlockedError,
  MessageSelfSendError,
  MessageNotFoundError,
  MessageNoPermissionError,
  MessageSystemDisabledError,
} from './errors';

// Mock Prisma client
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('MessageService', () => {
  let service: MessageService;
  let mockHooks: any;

  beforeEach(() => {
    service = createMessageService({
      enabled: true,
      maxContentLength: 2000,
      maxSubjectLength: 200,
      messagePerPage: 20,
    });
    mockHooks = {
      onNewMessage: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    const senderId = 1;
    const input: MessageSendInput = {
      receiverId: 2,
      subject: 'Test Subject',
      content: 'Test content',
    };

    it('should send message successfully (AC-MSG-001)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 2,
        denied: false,
      } as any);
      vi.mocked(prisma.message.create).mockResolvedValueOnce({ id: 100 } as any);

      const result = await service.sendMessage(senderId, input, mockHooks);

      expect(result).toEqual({ id: 100 });
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          senderId,
          receiverId: input.receiverId,
          subject: input.subject,
          content: input.content,
        },
        select: { id: true },
      });
      expect(mockHooks.onNewMessage).toHaveBeenCalledWith({
        messageId: 100,
        senderId,
        receiverId: input.receiverId,
      });
    });

    it('should throw MessageSelfSendError when sending to self', async () => {
      const selfInput: MessageSendInput = { ...input, receiverId: senderId };

      await expect(service.sendMessage(senderId, selfInput)).rejects.toThrow(
        MessageSelfSendError
      );
    });

    it('should throw MessageReceiverNotFoundError when receiver not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(service.sendMessage(senderId, input)).rejects.toThrow(
        MessageReceiverNotFoundError
      );
    });

    it('should throw MessageBlockedError when receiver denied (REQ-MSG-004)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 2,
        denied: true,
      } as any);

      await expect(service.sendMessage(senderId, input)).rejects.toThrow(
        MessageBlockedError
      );
    });

    it('should throw MessageSystemDisabledError when system disabled (REQ-MSG-005)', async () => {
      const disabledService = createMessageService({
        enabled: false,
        maxContentLength: 2000,
        maxSubjectLength: 200,
        messagePerPage: 20,
      });

      await expect(disabledService.sendMessage(senderId, input)).rejects.toThrow(
        MessageSystemDisabledError
      );
    });
  });

  describe('listMessages', () => {
    const userId = 1;
    const inboxInput: MessageListInput = { folder: 'inbox', limit: 20 };

    it('should list inbox messages (REQ-MSG-002)', async () => {
      const mockMessages = [
        {
          id: 1,
          subject: 'Test',
          content: 'Content',
          readAt: null,
          createdAt: new Date(),
          sender: { id: 2, nickName: 'sender' },
          receiver: { id: 1, nickName: 'me' },
        },
      ];
      vi.mocked(prisma.message.findMany).mockResolvedValueOnce(mockMessages as any);

      const result = await service.listMessages(userId, inboxInput);

      expect(result.messages).toHaveLength(1);
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { receiverId: userId, receiverDel: false },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should list sent messages', async () => {
      const sentInput: MessageListInput = { folder: 'sent', limit: 20 };
      vi.mocked(prisma.message.findMany).mockResolvedValueOnce([]);

      await service.listMessages(userId, sentInput);

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { senderId: userId, senderDel: false },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should support cursor-based pagination', async () => {
      const cursorInput: MessageListInput = { folder: 'inbox', limit: 20, cursor: 50 };
      vi.mocked(prisma.message.findMany).mockResolvedValueOnce([]);

      await service.listMessages(userId, cursorInput);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 1,
          cursor: { id: 50 },
        })
      );
    });
  });

  describe('readMessage', () => {
    const userId = 1;
    const messageId = 100;

    it('should mark message as read (AC-MSG-003)', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        receiverId: userId,
        readAt: null,
      } as any);
      vi.mocked(prisma.message.update).mockResolvedValueOnce({} as any);

      await service.readMessage(userId, { id: messageId });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should be idempotent when already read', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        receiverId: userId,
        readAt: new Date(),
      } as any);

      await service.readMessage(userId, { id: messageId });

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('should throw MessageNotFoundError when message not found', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce(null);

      await expect(service.readMessage(userId, { id: messageId })).rejects.toThrow(
        MessageNotFoundError
      );
    });

    it('should throw MessageNoPermissionError for non-receiver', async () => {
      const otherUserId = 999;
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        receiverId: userId,
        readAt: null,
      } as any);

      await expect(service.readMessage(otherUserId, { id: messageId })).rejects.toThrow(
        MessageNoPermissionError
      );
    });
  });

  describe('deleteMessage', () => {
    const userId = 1;
    const messageId = 100;

    it('should delete message for sender (AC-MSG-004)', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        senderId: userId,
        receiverId: 2,
        senderDel: false,
        receiverDel: false,
      } as any);
      vi.mocked(prisma.message.update).mockResolvedValueOnce({} as any);

      await service.deleteMessage(userId, { id: messageId });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { senderDel: true },
      });
    });

    it('should delete message for receiver (AC-MSG-004)', async () => {
      const receiverId = 2;
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        senderId: 1,
        receiverId: receiverId,
        senderDel: false,
        receiverDel: false,
      } as any);
      vi.mocked(prisma.message.update).mockResolvedValueOnce({} as any);

      await service.deleteMessage(receiverId, { id: messageId });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { receiverDel: true },
      });
    });

    it('should throw MessageNoPermissionError for unrelated user', async () => {
      const otherUserId = 999;
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
        id: messageId,
        senderId: 1,
        receiverId: 2,
        senderDel: false,
        receiverDel: false,
      } as any);

      await expect(service.deleteMessage(otherUserId, { id: messageId })).rejects.toThrow(
        MessageNoPermissionError
      );
    });
  });

  describe('countUnread', () => {
    const userId = 1;

    it('should count unread messages (REQ-MSG-003)', async () => {
      vi.mocked(prisma.message.count).mockResolvedValueOnce(5);

      const count = await service.countUnread(userId);

      expect(count).toBe(5);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          receiverId: userId,
          receiverDel: false,
          readAt: null,
        },
      });
    });
  });
});
