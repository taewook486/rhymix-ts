// SPEC-NOTIFICATION-001 단위 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './service';
import type { PrismaClient } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    // Mock Prisma Client
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

    service = new NotificationService(mockPrisma as PrismaClient);
  });

  describe('create', () => {
    it('should create notification when recipient exists and preference enabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null); // No preference = enabled
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null); // No duplicate
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      const result = await service.create({
        recipientId: 1,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 2,
        actorNickname: 'testuser',
      });

      expect(result).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientId: 1,
          category: 'COMMENT',
          sourceType: 'COMMENT',
          sourceId: 100,
          actorId: 2,
          actorNickname: 'testuser',
        },
      });
    });

    it('should skip creation when preference is disabled (REQ-NOTIF-008)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        enabled: false,
      });

      const result = await service.create({
        recipientId: 1,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 2,
        actorNickname: 'testuser',
      });

      expect(result).toBeUndefined();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should skip self-notification (REQ-NOTIF-004)', async () => {
      const result = await service.create({
        recipientId: 1,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 1, // Same as recipient
        actorNickname: 'testuser',
      });

      expect(result).toBeUndefined();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should skip when recipient does not exist (EC-3)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.create({
        recipientId: 999,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 2,
        actorNickname: 'testuser',
      });

      expect(result).toBeUndefined();
    });

    it('should return existing notification id on duplicate', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue({ id: 5 });

      const result = await service.create({
        recipientId: 1,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 2,
        actorNickname: 'testuser',
      });

      expect(result).toBe(5);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return notifications sorted newest first', async () => {
      const mockItems = [
        { id: 3, createdAt: new Date('2024-01-03') },
        { id: 2, createdAt: new Date('2024-01-02') },
        { id: 1, createdAt: new Date('2024-01-01') },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockItems);

      const result = await service.list({
        recipientId: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(3);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { recipientId: 1 },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
      });
    });

    it('should handle cursor-based pagination', async () => {
      const mockItems = [{ id: 2, createdAt: new Date('2024-01-02') }];
      mockPrisma.notification.findMany.mockResolvedValue(mockItems);

      const cursor = Buffer.from(
        JSON.stringify({ createdAt: '2024-01-01T00:00:00.000Z', id: 1 }),
      ).toString('base64url');

      const result = await service.list({
        recipientId: 1,
        cursor,
        limit: 20,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          recipientId: 1,
          OR: [
            { createdAt: { lt: new Date('2024-01-01T00:00:00.000Z') } },
            { createdAt: new Date('2024-01-01T00:00:00.000Z'), id: { lt: 1 } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
      });
    });
  });

  describe('markRead', () => {
    it('should mark notification as read for owner (REQ-NOTIF-023)', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        recipientId: 1,
      });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.markRead({
        notificationId: 10,
        actorMemberId: 1,
      });

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { read: true, readAt: expect.any(Date) },
      });
    });

    it('should reject marking another member\'s notification (REQ-NOTIF-021)', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        recipientId: 2, // Different from actor
      });

      await expect(
        service.markRead({
          notificationId: 10,
          actorMemberId: 1, // Not the owner
        }),
      ).rejects.toThrow('Cannot mark another member\'s notification as read');
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read (REQ-NOTIF-024)', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const count = await service.markAllRead({ recipientId: 1 });

      expect(count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 1, read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('countUnread', () => {
    it('should count unread notifications (REQ-NOTIF-025)', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const count = await service.countUnread({ recipientId: 1 });

      expect(count).toBe(3);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: 1, read: false },
      });
    });
  });

  describe('upsertPreference', () => {
    it('should create/update preferences (REQ-NOTIF-033)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});

      await service.upsertPreference({
        memberId: 1,
        preferences: [
          { category: 'COMMENT', enabled: true },
          { category: 'MENTION', enabled: false },
        ],
      });

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw when member does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertPreference({
          memberId: 999,
          preferences: [{ category: 'COMMENT', enabled: true }],
        }),
      ).rejects.toThrow('Recipient not found');
    });

    it('should use unique constraint where clause for upsert idempotency', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});

      await service.upsertPreference({
        memberId: 1,
        preferences: [{ category: 'COMMENT', enabled: true }],
      });

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          memberId_category: {
            memberId: 1,
            category: 'COMMENT',
          },
        },
        create: {
          memberId: 1,
          category: 'COMMENT',
          enabled: true,
        },
        update: {
          enabled: true,
        },
      });
    });

    it('should be idempotent when called twice with same inputs', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});

      // First call
      await service.upsertPreference({
        memberId: 1,
        preferences: [{ category: 'COMMENT', enabled: true }],
      });

      // Second call with same inputs
      await service.upsertPreference({
        memberId: 1,
        preferences: [{ category: 'COMMENT', enabled: true }],
      });

      // Both calls should use upsert (not separate create/update)
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('create - opt-out model (REQ-NOTIF-032)', () => {
    it('should create notification when no preference row exists (EC-4)', async () => {
      // No preference row = enabled by default (opt-out model)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      const result = await service.create({
        recipientId: 1,
        category: 'COMMENT',
        sourceType: 'COMMENT',
        sourceId: 100,
        actorId: 2,
        actorNickname: 'testuser',
      });

      expect(result).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('markAllRead - scoping verification', () => {
    it('should only update calling recipient\'s own unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllRead({ recipientId: 1 });

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          recipientId: 1,
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should not affect other recipients\' notifications', async () => {
      const updateManyCalls: Array<{ where: any }> = [];

      mockPrisma.notification.updateMany.mockImplementation((args: { where: any }) => {
        updateManyCalls.push(args);
        return Promise.resolve({ count: 5 });
      });

      await service.markAllRead({ recipientId: 1 });

      expect(updateManyCalls).toHaveLength(1);
      expect(updateManyCalls[0].where.recipientId).toBe(1);
      expect(updateManyCalls[0].where.read).toBe(false);
    });
  });
});
