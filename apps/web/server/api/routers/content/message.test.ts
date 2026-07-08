/**
 * content.message tRPC 라우터 테스트 — SPEC-MESSAGE-001
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { contentMessageRouter } from './message';

// Mock the message service.
// createMessageService must return the SAME object on every call: message.ts
// memoizes its service singleton lazily (`messageService ??= createMessageService()`),
// so a factory returning a fresh object per call would desync from the `mockService`
// reference re-fetched in beforeEach below.
const { mockMessageService } = vi.hoisted(() => ({
  mockMessageService: {
    sendMessage: vi.fn(),
    listMessages: vi.fn(),
    readMessage: vi.fn(),
    deleteMessage: vi.fn(),
    countUnread: vi.fn(),
  },
}));

vi.mock('@rhymix-ts/message', () => ({
  createMessageService: vi.fn(() => mockMessageService),
  MessageSendInputSchema: z.object({
    receiverId: z.number(),
    subject: z.string(),
    content: z.string(),
  }),
  MessageListInputSchema: z.object({
    folder: z.enum(['inbox', 'sent']),
    limit: z.number(),
    cursor: z.number().optional(),
  }),
  MessageReadInputSchema: z.object({
    id: z.number(),
  }),
  MessageDeleteInputSchema: z.object({
    id: z.number(),
  }),
}));

// Mock the notification service (REQ-MSG-003 알림 훅 연동)
vi.mock('@rhymix-ts/notification', () => ({
  createNotificationService: vi.fn(() => ({
    create: vi.fn(),
  })),
}));

describe('contentMessageRouter', () => {
  let mockService: any;

  beforeEach(async () => {
    const { createMessageService } = await import('@rhymix-ts/message');
    mockService = createMessageService();
    vi.clearAllMocks();
  });

  const createMockContext = (userId = 1) => ({
    session: {
      user: { id: userId },
    },
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ nickName: 'tester' }),
      },
      notification: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    },
  });

  describe('send procedure', () => {
    it('should send message successfully (AC-MSG-001)', async () => {
      mockService.sendMessage.mockResolvedValueOnce({ id: 100 });

      const { createCallerFactory } = await import('../../trpc');
      const caller = createCallerFactory(contentMessageRouter)(createMockContext(1) as any);
      const result = await caller.send({
        receiverId: 2,
        subject: 'Test',
        content: 'Content',
      });

      expect(result).toEqual({ id: 100 });
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        1,
        { receiverId: 2, subject: 'Test', content: 'Content' },
        expect.any(Object)
      );
    });
  });

  describe('list procedure', () => {
    it('should list inbox messages (REQ-MSG-002)', async () => {
      mockService.listMessages.mockResolvedValueOnce({
        messages: [{ id: 1, subject: 'Test' }],
        nextCursor: null,
      });

      const { createCallerFactory } = await import('../../trpc');
      const caller = createCallerFactory(contentMessageRouter)(createMockContext(1) as any);
      const result = await caller.list({
        folder: 'inbox',
        limit: 20,
      });

      expect(result.messages).toHaveLength(1);
      expect(mockService.listMessages).toHaveBeenCalledWith(1, {
        folder: 'inbox',
        limit: 20,
      });
    });
  });

  describe('read procedure', () => {
    it('should mark message as read (AC-MSG-003)', async () => {
      mockService.readMessage.mockResolvedValueOnce(undefined);

      const { createCallerFactory } = await import('../../trpc');
      const caller = createCallerFactory(contentMessageRouter)(createMockContext(1) as any);
      const result = await caller.read({ id: 100 });

      expect(result).toEqual({ success: true });
      expect(mockService.readMessage).toHaveBeenCalledWith(1, { id: 100 });
    });
  });

  describe('delete procedure', () => {
    it('should delete message (AC-MSG-004)', async () => {
      mockService.deleteMessage.mockResolvedValueOnce(undefined);

      const { createCallerFactory } = await import('../../trpc');
      const caller = createCallerFactory(contentMessageRouter)(createMockContext(1) as any);
      const result = await caller.delete({ id: 100 });

      expect(result).toEqual({ success: true });
      expect(mockService.deleteMessage).toHaveBeenCalledWith(1, { id: 100 });
    });
  });

  describe('countUnread procedure', () => {
    it('should count unread messages (REQ-MSG-003)', async () => {
      mockService.countUnread.mockResolvedValueOnce(5);

      const { createCallerFactory } = await import('../../trpc');
      const caller = createCallerFactory(contentMessageRouter)(createMockContext(1) as any);
      const result = await caller.countUnread();

      expect(result).toEqual({ count: 5 });
      expect(mockService.countUnread).toHaveBeenCalledWith(1);
    });
  });
});
