/**
 * Visit Counter - SPEC-ADMIN-002 REQ-ADMIN2-009, REQ-ADMIN2-141.
 *
 * Non-blocking visit counter increment using aggregated DailyVisit table.
 * - REQ-ADMIN2-009: Dashboard visitor statistics widget backed by daily aggregated counters
 * - REQ-ADMIN2-141: Low-overhead, non-blocking aggregation path
 *
 * @MX:WARN: 페이지 렌더 비차단 필수 - visit counter는 fire-and-forget 패턴으로 실행 (REQ-ADMIN2-141)
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-009, REQ-ADMIN2-141
 */

import type { PrismaClient } from '@prisma/client'

export interface VisitCounterInput {
  siteId: number
  ip: string
  path: string
  referer?: string | null
  userAgent?: string | null
}

export interface VisitStatsResult {
  daily: Array<{ date: string; uniqueVisitors: number; pageViews: number }>
  monthly: Record<string, { uniqueVisitors: number; pageViews: number }>
}

/**
 * Increment visit counters (non-blocking, fire-and-forget).
 *
 * This function should be called WITHOUT await on the page render path
 * to ensure it does not block page rendering (REQ-ADMIN2-141).
 *
 * Uses upsert to handle race conditions:
 * - If daily row exists: increment uniqueVisitors and pageViews
 * - If not exists: create with initial counts
 *
 * @param input - Visit counter input
 * @param prisma - Prisma client
 *
 * @example
 * // In page/middleware - DO NOT AWAIT
 * incrementVisitCounters({ siteId, ip, path, referer, userAgent }, prisma)
 * // Page continues rendering immediately
 */
export async function incrementVisitCounters(
  input: VisitCounterInput,
  prisma: PrismaClient
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day

  // Fire-and-forget: do not await this in render path
  await prisma.dailyVisit.upsert({
    where: {
      siteId_date: {
        siteId: input.siteId,
        date: today,
      },
    },
    create: {
      siteId: input.siteId,
      date: today,
      uniqueVisitors: 1,
      pageViews: 1,
    },
    update: {
      // Increment pageViews always
      pageViews: {
        increment: 1,
      },
      // Increment uniqueVisitors only once per day per IP (handled by caller dedup)
      uniqueVisitors: {
        increment: 1,
      },
    },
  }).catch((err: unknown) => {
    // Log but don't throw - counter failures should never block page render
    console.error('Visit counter increment failed:', err)
  })
}

/**
 * Get aggregated visit statistics for dashboard widget.
 *
 * Returns daily visits for last 30 days and monthly aggregates.
 * Uses indexed queries on date column for performance (REQ-ADMIN2-010).
 *
 * @param siteId - Site ID
 * @param days - Number of days to fetch (default: 30)
 * @param prisma - Prisma client
 * @returns Visit stats with daily and monthly breakdown
 *
 * @example
 * const stats = await getVisitStats(1, 30, prisma)
 */
export async function getVisitStats(
  siteId: number,
  days: number = 30,
  prisma: PrismaClient
): Promise<VisitStatsResult> {
  // REQ-ADMIN2-010: Index-backed query on date column
  const stats = await prisma.dailyVisit.findMany({
    where: { siteId },
    orderBy: { date: 'desc' },
    take: days,
  })

  // Format daily stats
  const daily = stats.map((stat: { date: Date; uniqueVisitors: number; pageViews: number }) => ({
    date: stat.date.toISOString().split('T')[0]!, // YYYY-MM-DD
    uniqueVisitors: stat.uniqueVisitors,
    pageViews: stat.pageViews,
  }))

  // Aggregate monthly (simple sum for Phase 1)
  const monthly = daily.reduce(
    (
      acc: Record<string, { uniqueVisitors: number; pageViews: number }>,
      curr: { date: string; uniqueVisitors: number; pageViews: number },
    ) => {
      const month = curr.date.substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { uniqueVisitors: 0, pageViews: 0 }
      }
      acc[month].uniqueVisitors += curr.uniqueVisitors
      acc[month].pageViews += curr.pageViews
      return acc
    },
    {} as Record<string, { uniqueVisitors: number; pageViews: number }>
  )

  return { daily, monthly }
}

/**
 * Get summary counts for dashboard counter strip (REQ-ADMIN2-006).
 *
 * Returns total member/document/comment/file counts for the current site.
 *
 * @param siteId - Site ID
 * @param prisma - Prisma client
 * @returns Summary counts
 *
 * @example
 * const counts = await getSummaryCounts(1, prisma)
 * // => { members: 100, documents: 500, comments: 1000, files: 200 }
 */
export async function getSummaryCounts(
  siteId: number,
  prisma: PrismaClient
): Promise<{
  members: number
  documents: number
  comments: number
  files: number
}> {
  // Parallel count queries for performance
  const [members, documents, comments, files] = await Promise.all([
    prisma.user.count({ where: { groups: { some: { group: { siteId } } } } }),
    prisma.document.count({
      where: {
        board: {
          moduleInstance: { siteId },
        },
      },
    }),
    prisma.comment.count({
      where: {
        document: {
          board: {
            moduleInstance: { siteId },
          },
        },
        deletedAt: null,
      },
    }),
    prisma.fileAttachment.count(),
  ])

  return { members, documents, comments, files }
}
