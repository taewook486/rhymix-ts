/**
 * admin.stats router tests - TDD RED phase.
 *
 * Test coverage for visitor statistics procedures.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { adminStatsRouter } from './stats'

// Mock Prisma - named export, not default
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dailyVisit: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: { count: vi.fn() },
    document: { count: vi.fn() },
    comment: { count: vi.fn() },
    fileAttachment: { count: vi.fn() },
  },
}))

// Mock stats package
vi.mock('@rhymix-ts/admin/stats', () => ({
  incrementVisitCounters: vi.fn(),
  getVisitStats: vi.fn(),
  getSummaryCounts: vi.fn(),
}))

import { incrementVisitCounters, getVisitStats, getSummaryCounts } from '@rhymix-ts/admin/stats'
import { prisma as prismaMock } from '@/lib/db/prisma'

describe('adminStatsRouter', () => {
  let mockCtx: any

  beforeEach(() => {
    mockCtx = {
      prisma: prismaMock,
      session: { user: { id: 1 } },
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    }

    vi.clearAllMocks()
  })

  describe('getVisitStats', () => {
    it('should call getVisitStats with siteId and days', async () => {
      const mockStats = {
        daily: [
          { date: '2026-06-20', uniqueVisitors: 100, pageViews: 500 },
        ],
        monthly: {},
      }
      vi.mocked(getVisitStats).mockResolvedValue(mockStats)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.getVisitStats({ siteId: 1, days: 30 })

      expect(getVisitStats).toHaveBeenCalledWith(1, 30, prismaMock)
      expect(result).toEqual(mockStats)
    })

    it('should use default days=30 if not provided', async () => {
      vi.mocked(getVisitStats).mockResolvedValue({ daily: [], monthly: {} })

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      await caller.getVisitStats({ siteId: 1 })

      expect(getVisitStats).toHaveBeenCalledWith(1, 30, prismaMock)
    })
  })

  describe('getSummaryCounts', () => {
    it('should call getSummaryCounts with siteId', async () => {
      const mockCounts = {
        members: 100,
        documents: 500,
        comments: 1000,
        files: 200,
      }
      vi.mocked(getSummaryCounts).mockResolvedValue(mockCounts)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.getSummaryCounts({ siteId: 1 })

      expect(getSummaryCounts).toHaveBeenCalledWith(1, prismaMock)
      expect(result).toEqual(mockCounts)
    })
  })

  describe('incrementVisitCounters', () => {
    it('should call incrementVisitCounters without blocking', async () => {
      vi.mocked(incrementVisitCounters).mockResolvedValue(undefined)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.incrementVisitCounters({
        siteId: 1,
        ip: '192.168.1.1',
        path: '/test',
        referer: 'https://example.com',
        userAgent: 'Mozilla/5.0',
      })

      expect(incrementVisitCounters).toHaveBeenCalledWith(
        {
          siteId: 1,
          ip: '192.168.1.1',
          path: '/test',
          referer: 'https://example.com',
          userAgent: 'Mozilla/5.0',
        },
        prismaMock
      )
      expect(result).toEqual({ success: true })
    })

    it('should handle null referer and userAgent', async () => {
      vi.mocked(incrementVisitCounters).mockResolvedValue(undefined)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      await caller.incrementVisitCounters({
        siteId: 1,
        ip: '192.168.1.1',
        path: '/test',
      })

      expect(incrementVisitCounters).toHaveBeenCalledWith(
        expect.objectContaining({
          referer: null,
          userAgent: null,
        }),
        prismaMock
      )
    })
  })

  describe('getDetailedStats', () => {
    it('should fetch daily visits for date range', async () => {
      const mockDailyVisits = [
        {
          date: new Date('2026-06-20'),
          uniqueVisitors: 100,
          pageViews: 500,
        },
        {
          date: new Date('2026-06-19'),
          uniqueVisitors: 80,
          pageViews: 400,
        },
      ]
      prismaMock.dailyVisit.findMany.mockResolvedValue(mockDailyVisits)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.getDetailedStats({
        siteId: 1,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      })

      expect(prismaMock.dailyVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            siteId: 1,
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
      expect(result.daily).toHaveLength(2)
    })

    it('should calculate summary statistics', async () => {
      const mockDailyVisits = [
        { date: new Date('2026-06-20'), uniqueVisitors: 100, pageViews: 500 },
        { date: new Date('2026-06-19'), uniqueVisitors: 80, pageViews: 400 },
      ]
      prismaMock.dailyVisit.findMany.mockResolvedValue(mockDailyVisits)

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.getDetailedStats({ siteId: 1 })

      expect(result.summary).toEqual({
        totalUniqueVisitors: 180,
        totalPagesViews: 900,
        averageDailyVisitors: 90,
      })
    })

    it('should return zero summary for empty data', async () => {
      prismaMock.dailyVisit.findMany.mockResolvedValue([])

      const { createCallerFactory } = await import('../../trpc')
      const caller = createCallerFactory(adminStatsRouter)(mockCtx)
      const result = await caller.getDetailedStats({ siteId: 1 })

      expect(result.summary).toEqual({
        totalUniqueVisitors: 0,
        totalPagesViews: 0,
        averageDailyVisitors: 0,
      })
    })
  })
})
