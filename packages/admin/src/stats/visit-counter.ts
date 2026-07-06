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

/**
 * 최근 N일간의 신규 콘텐츠(게시물/댓글/회원) 일별 집계 — SPEC-STATS-001 REQ-STATS-003.
 *
 * 대시보드의 "최근 7일 신규 콘텐츠 바 차트" 데이터 소스.
 * DailyStat 테이블에서 최근 `days`일의 집계치를 조회한다.
 *
 * @param _siteId - 사이트 ID (현재 DailyStat은 사이트 무관 전역 집계; 향후 스키마 확장 시 사용 예정)
 * @param days - 조회 일수 (기본 7)
 * @param prisma - Prisma client
 * @returns 최근 일별 신규 콘텐츠 배열 (내림차순 → 페이지에서 오름차순으로 reverse 처리)
 */
export async function getNewContent(
  _siteId: number,
  days: number = 7,
  prisma: PrismaClient,
): Promise<
  Array<{
    date: string
    newDocuments: number
    newComments: number
    newMembers: number
  }>
> {
  const stats = await prisma.dailyStat.findMany({
    orderBy: { date: 'desc' },
    take: days,
  })

  return stats.map((stat) => ({
    date: stat.date.toISOString().split('T')[0]!,
    newDocuments: stat.newDocuments,
    newComments: stat.newComments,
    newMembers: stat.newMembers,
  }))
}

/**
 * 전일 대비 증감율(%) — SPEC-STATS-001 REQ-STATS-005.
 *
 * 금일 신규 누적 대 전일 신규 누적의 변화율을 백분율로 반환한다.
 * 대시보드 요약 카드에 ▲N% / ▼N% 로 표시된다.
 *
 * @param siteId - 사이트 ID
 * @param prisma - Prisma client
 * @returns 각 지표별 전일 대비 증감율 (소수점 포함 %)
 */
export async function getDayOverDay(
  siteId: number,
  prisma: PrismaClient,
): Promise<{
  members: number
  documents: number
  comments: number
  files: number
}> {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)

  const range = { gte: yesterdayStart, lt: todayStart }
  const todayRange = { gte: todayStart, lt: now }

  const siteFilter = {
    board: { moduleInstance: { siteId } },
  }

  const [
    membersYesterday,
    membersToday,
    documentsYesterday,
    documentsToday,
    commentsYesterday,
    commentsToday,
    filesYesterday,
    filesToday,
  ] = await Promise.all([
    prisma.user.count({
      where: { createdAt: range, groups: { some: { group: { siteId } } } },
    }),
    prisma.user.count({
      where: { createdAt: todayRange, groups: { some: { group: { siteId } } } },
    }),
    prisma.document.count({ where: { regdate: range, ...siteFilter } }),
    prisma.document.count({ where: { regdate: todayRange, ...siteFilter } }),
    prisma.comment.count({
      where: { regdate: range, deletedAt: null, ...siteFilter },
    }),
    prisma.comment.count({
      where: { regdate: todayRange, deletedAt: null, ...siteFilter },
    }),
    prisma.fileAttachment.count(),
    prisma.fileAttachment.count(),
  ])

  return {
    members: pctChange(membersToday, membersYesterday),
    documents: pctChange(documentsToday, documentsYesterday),
    comments: pctChange(commentsToday, commentsYesterday),
    files: pctChange(filesToday, filesYesterday),
  }
}

/**
 * 전일 대비 증감율(%) 계산.
 * 어제가 0이면 오늘 1건 이상 증가 시 +100%, 아니면 0%.
 */
function pctChange(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0
  return ((today - yesterday) / yesterday) * 100
}
