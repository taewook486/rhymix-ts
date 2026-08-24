/**
 * Visit Counter Tests - TDD RED phase.
 *
 * Test coverage for visit counter increment and statistics queries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  incrementVisitCounters,
  getVisitStats,
  getSummaryCounts,
  getDayOverDay,
} from './visit-counter'

describe('incrementVisitCounters', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      dailyVisit: {
        upsert: vi.fn().mockResolvedValue(undefined),
      },
    }
  })

  it('should upsert daily visit counter', async () => {
    await incrementVisitCounters(
      {
        siteId: 1,
        ip: '192.168.1.1',
        path: '/test',
        referer: 'https://example.com',
        userAgent: 'Mozilla/5.0',
      },
      mockPrisma
    )

    expect(mockPrisma.dailyVisit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          siteId: 1,
          uniqueVisitors: 1,
          pageViews: 1,
        }),
        update: expect.objectContaining({
          pageViews: { increment: 1 },
          uniqueVisitors: { increment: 1 },
        }),
      })
    )
  })

  it('should handle upsert errors gracefully', async () => {
    mockPrisma.dailyVisit.upsert.mockRejectedValue(new Error('DB Error'))

    // Should not throw
    await expect(
      incrementVisitCounters(
        { siteId: 1, ip: '192.168.1.1', path: '/test' },
        mockPrisma
      )
    ).resolves.toBeUndefined()
  })
})

describe('getVisitStats', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      dailyVisit: {
        findMany: vi.fn(),
      },
    }
  })

  it('should fetch daily visits for specified days', async () => {
    const mockStats = [
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
    mockPrisma.dailyVisit.findMany.mockResolvedValue(mockStats)

    const result = await getVisitStats(1, 30, mockPrisma)

    expect(result.daily).toHaveLength(2)
    expect(result.daily[0]).toEqual({
      date: '2026-06-20',
      uniqueVisitors: 100,
      pageViews: 500,
    })
  })

  it('should aggregate monthly stats', async () => {
    const mockStats = [
      { date: new Date('2026-06-20'), uniqueVisitors: 100, pageViews: 500 },
      { date: new Date('2026-06-19'), uniqueVisitors: 80, pageViews: 400 },
      { date: new Date('2026-05-15'), uniqueVisitors: 50, pageViews: 250 },
    ]
    mockPrisma.dailyVisit.findMany.mockResolvedValue(mockStats)

    const result = await getVisitStats(1, 30, mockPrisma)

    expect(result.monthly['2026-06']).toEqual({
      uniqueVisitors: 180,
      pageViews: 900,
    })
    expect(result.monthly['2026-05']).toEqual({
      uniqueVisitors: 50,
      pageViews: 250,
    })
  })

  it('should use indexed query on date column', async () => {
    mockPrisma.dailyVisit.findMany.mockResolvedValue([])

    await getVisitStats(1, 30, mockPrisma)

    expect(mockPrisma.dailyVisit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: 1 },
        orderBy: { date: 'desc' },
        take: 30,
      })
    )
  })
})

describe('getSummaryCounts', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      user: { count: vi.fn() },
      document: { count: vi.fn() },
      comment: { count: vi.fn() },
      fileAttachment: { count: vi.fn() },
    }
  })

  it('should fetch all counts in parallel', async () => {
    mockPrisma.user.count.mockResolvedValue(100)
    mockPrisma.document.count.mockResolvedValue(500)
    mockPrisma.comment.count.mockResolvedValue(1000)
    mockPrisma.fileAttachment.count.mockResolvedValue(200)

    const result = await getSummaryCounts(1, mockPrisma)

    expect(result).toEqual({
      members: 100,
      documents: 500,
      comments: 1000,
      files: 200,
    })
  })

  it('should query with site filtering', async () => {
    mockPrisma.user.count.mockResolvedValue(0)
    mockPrisma.document.count.mockResolvedValue(0)
    mockPrisma.comment.count.mockResolvedValue(0)
    mockPrisma.fileAttachment.count.mockResolvedValue(0)

    await getSummaryCounts(1, mockPrisma)

    expect(mockPrisma.document.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          board: expect.objectContaining({
            moduleInstance: expect.objectContaining({ siteId: 1 }),
          }),
        }),
      })
    )
  })

  it('should exclude deleted comments', async () => {
    mockPrisma.user.count.mockResolvedValue(0)
    mockPrisma.document.count.mockResolvedValue(0)
    mockPrisma.comment.count.mockResolvedValue(0)
    mockPrisma.fileAttachment.count.mockResolvedValue(0)

    await getSummaryCounts(1, mockPrisma)

    expect(mockPrisma.comment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    )
  })
})

describe('getDayOverDay', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      user: { count: vi.fn().mockResolvedValue(0) },
      document: { count: vi.fn().mockResolvedValue(0) },
      comment: { count: vi.fn().mockResolvedValue(0) },
      fileAttachment: { count: vi.fn().mockResolvedValue(0) },
    }
  })

  it('should filter documents by site through board.moduleInstance', async () => {
    await getDayOverDay(1, mockPrisma)

    for (const call of mockPrisma.document.count.mock.calls) {
      expect(call[0].where.board.moduleInstance.siteId).toBe(1)
    }
    expect(mockPrisma.document.count).toHaveBeenCalledTimes(2)
  })

  it('should filter comments through document.board, not a top-level board relation', async () => {
    // Comment 모델에는 board 관계가 없다 (boardId 스칼라와 document 관계만 존재).
    // Document 용 필터를 그대로 펼치면 Prisma 가
    // "Unknown argument `board`. Did you mean `boardId`?" 로 런타임 거부한다.
    await getDayOverDay(1, mockPrisma)

    expect(mockPrisma.comment.count).toHaveBeenCalledTimes(2)
    for (const call of mockPrisma.comment.count.mock.calls) {
      const where = call[0].where
      expect(where).not.toHaveProperty('board')
      expect(where.document.board.moduleInstance.siteId).toBe(1)
      expect(where.deletedAt).toBeNull()
    }
  })
})
