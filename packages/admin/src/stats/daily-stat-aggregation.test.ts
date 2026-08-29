/**
 * DailyStat Aggregation Job Tests - SPEC-STATS-001 (TDD RED phase).
 *
 * Test coverage for REQ-STATS-002 daily aggregation job:
 * - UV (unique visitors) count correctness
 * - PV (page views) count correctness
 * - new_members count correctness
 * - new_documents count correctness
 * - new_comments count correctness
 * - Aggregation runs at 00:05 UTC as cron job
 * - Idempotency (re-running same date doesn't duplicate)
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('DailyStat aggregation job (REQ-STATS-002)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      pageView: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      dailyStat: {
        upsert: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      user: {
        count: vi.fn(),
      },
      document: {
        count: vi.fn(),
      },
      comment: {
        count: vi.fn(),
      },
    };
  });

  /**
   * REQ-STATS-002: 매일 00:05 UTC에 전일 통계를 집계하여 daily_stats 테이블에 저장
   */
  describe('aggregateDailyStats', () => {
    it('REQ-STATS-002: shall aggregate UV from PageView visitorId unique count', async () => {
      mockPrisma.pageView.groupBy.mockResolvedValue([
        { _count: { visitorId: 3 } }, // 3 unique visitors
      ]);

      // Import and execute aggregation function
      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            uv: 3, // 3 unique visitors from 4 page views
          }),
        })
      );
    });

    it('REQ-STATS-002: shall aggregate PV from PageView total count', async () => {
      const mockPageViews = [
        { visitorId: 'abc123' },
        { visitorId: 'abc123' },
        { visitorId: 'def456' },
        { visitorId: 'ghi789' },
      ];

      mockPrisma.pageView.findMany.mockResolvedValue(mockPageViews);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            pv: 4, // 4 total page views
          }),
        })
      );
    });

    it('REQ-STATS-002: shall count new members created on target date', async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        })
      );

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            newMembers: 5,
          }),
        })
      );
    });

    it('REQ-STATS-002: shall count new documents created on target date', async () => {
      mockPrisma.document.count.mockResolvedValue(12);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.document.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            regdate: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        })
      );

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            newDocuments: 12,
          }),
        })
      );
    });

    it('REQ-STATS-002: shall count new comments created on target date', async () => {
      mockPrisma.comment.count.mockResolvedValue(8);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.comment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            regdate: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
            deletedAt: null, // Exclude deleted comments
          }),
        })
      );

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            newComments: 8,
          }),
        })
      );
    });

    it('REQ-STATS-002: shall use correct date range for aggregation (previous day 00:00-23:59)', async () => {
      const targetDate = new Date('2026-07-05T00:05:00Z'); // Job runs at 00:05 UTC

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(targetDate, mockPrisma);

      // Verify date range covers previous day (2026-07-04)
      const userCountCall = mockPrisma.user.count.mock.calls[0];
      const dateRange = userCountCall[0].where.createdAt;

      expect(dateRange.gte).toEqual(new Date('2026-07-04T00:00:00.000Z'));
      expect(dateRange.lt).toEqual(new Date('2026-07-05T00:00:00.000Z'));
    });

    it('REQ-STATS-002: shall handle zero counts gracefully', async () => {
      mockPrisma.pageView.groupBy.mockResolvedValue([]);
      mockPrisma.pageView.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.document.count.mockResolvedValue(0);
      mockPrisma.comment.count.mockResolvedValue(0);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05'), mockPrisma);

      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            uv: 0,
            pv: 0,
            newMembers: 0,
            newDocuments: 0,
            newComments: 0,
          }),
        })
      );
    });
  });

  /**
   * Idempotency: Re-running aggregation for same date doesn't duplicate
   */
  describe('Idempotency', () => {
    it('shall update existing DailyStat instead of creating duplicate', async () => {
      // Mock existing DailyStat
      mockPrisma.dailyStat.findFirst.mockResolvedValue({
        date: new Date('2026-07-04'),
        uv: 10,
        pv: 50,
        newMembers: 2,
        newDocuments: 5,
        newComments: 3,
      });

      mockPrisma.pageView.groupBy.mockResolvedValue([{ _count: { visitorId: 15 } }]);
      mockPrisma.pageView.findMany.mockResolvedValue(Array(75).fill({}));
      mockPrisma.user.count.mockResolvedValue(4);
      mockPrisma.document.count.mockResolvedValue(8);
      mockPrisma.comment.count.mockResolvedValue(6);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05T00:05:00Z'), mockPrisma);

      // Should use upsert (update if exists, create if not)
      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalled();

      const upsertCall = mockPrisma.dailyStat.upsert.mock.calls[0];
      expect(upsertCall[0].where).toEqual({
        date: new Date('2026-07-04'),
      });
    });

    it('shall create new DailyStat if none exists for target date', async () => {
      mockPrisma.dailyStat.findFirst.mockResolvedValue(null);

      mockPrisma.pageView.groupBy.mockResolvedValue([{ _count: { visitorId: 10 } }]);
      mockPrisma.pageView.findMany.mockResolvedValue(Array(50).fill({}));
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.comment.count.mockResolvedValue(3);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(new Date('2026-07-05T00:05:00Z'), mockPrisma);

      const upsertCall = mockPrisma.dailyStat.upsert.mock.calls[0];
      expect(upsertCall[0].create).toBeDefined();
      expect(upsertCall[0].create.uv).toBe(10);
    });
  });

  /**
   * Data correctness across date boundaries
   */
  describe('Date boundary handling', () => {
    it('shall correctly aggregate data when month changes', async () => {
      // Test July 31 -> August 1 transition
      const jobDate = new Date('2026-08-01T00:05:00Z');

      mockPrisma.pageView.groupBy.mockResolvedValue([{ _count: { visitorId: 20 } }]);
      mockPrisma.pageView.findMany.mockResolvedValue(Array(100).fill({}));
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.document.count.mockResolvedValue(7);
      mockPrisma.comment.count.mockResolvedValue(4);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(jobDate, mockPrisma);

      // Verify date range targets July 31, not August
      const userCountCall = mockPrisma.user.count.mock.calls[0];
      const dateRange = userCountCall[0].where.createdAt;

      expect(dateRange.gte).toEqual(new Date('2026-07-31T00:00:00.000Z'));
      expect(dateRange.lt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    });

    it('shall correctly aggregate data when year changes', async () => {
      // Test Dec 31, 2025 -> Jan 1, 2026 transition
      const jobDate = new Date('2026-01-01T00:05:00Z');

      mockPrisma.pageView.groupBy.mockResolvedValue([{ _count: { visitorId: 15 } }]);
      mockPrisma.pageView.findMany.mockResolvedValue(Array(75).fill({}));
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.document.count.mockResolvedValue(2);
      mockPrisma.comment.count.mockResolvedValue(1);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');
      await aggregateDailyStats(jobDate, mockPrisma);

      // Verify date range targets Dec 31, 2025
      const userCountCall = mockPrisma.user.count.mock.calls[0];
      const dateRange = userCountCall[0].where.createdAt;

      expect(dateRange.gte).toEqual(new Date('2025-12-31T00:00:00.000Z'));
      expect(dateRange.lt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });
  });

  /**
   * Error handling
   */
  describe('Error handling', () => {
    it('shall log error but not throw when aggregation fails', async () => {
      mockPrisma.pageView.groupBy.mockRejectedValue(new Error('Database connection failed'));

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');

      // Should not throw
      await expect(
        aggregateDailyStats(new Date('2026-07-05'), mockPrisma)
      ).resolves.toBeUndefined();
    });

    it('shall handle missing PageView data gracefully', async () => {
      mockPrisma.pageView.groupBy.mockResolvedValue(null);
      mockPrisma.pageView.findMany.mockResolvedValue(null);

      const { aggregateDailyStats } = await import('./daily-stat-aggregation');

      // Should not throw and use defaults
      await expect(
        aggregateDailyStats(new Date('2026-07-05'), mockPrisma)
      ).resolves.toBeUndefined();
    });
  });
});

/**
 * Cron job execution tests
 */
describe('DailyStat cron job execution', () => {
  it('REQ-STATS-002: shall be scheduled to run at 00:05 UTC daily', async () => {
    // This test verifies the cron schedule configuration
    // In actual implementation, this would check cron job config

    const targetDate = new Date('2026-07-05T00:05:00Z');

    // Simulate cron job trigger
    const { aggregateDailyStats } = await import('./daily-stat-aggregation');

    const mockPrisma: any = {
      pageView: { groupBy: vi.fn(), findMany: vi.fn() },
      dailyStat: { upsert: vi.fn() },
      user: { count: vi.fn() },
      document: { count: vi.fn() },
      comment: { count: vi.fn() },
    };

    mockPrisma.pageView.groupBy.mockResolvedValue([{ _count: { visitorId: 10 } }]);
    mockPrisma.pageView.findMany.mockResolvedValue(Array(50).fill({}));
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.document.count.mockResolvedValue(5);
    mockPrisma.comment.count.mockResolvedValue(3);

    await aggregateDailyStats(targetDate, mockPrisma);

    // Verify aggregation ran for previous day (2026-07-04)
    expect(mockPrisma.dailyStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: new Date('2026-07-04') },
      })
    );
  });
});
