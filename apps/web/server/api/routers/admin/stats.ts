/**
 * admin.stats tRPC 라우터 — SPEC-ADMIN-002 Slice 2F.
 *
 * Visitor statistics and counter procedures:
 * - REQ-ADMIN2-140: Visitor statistics page at /admin/stats
 * - REQ-ADMIN2-009: Dashboard visitor statistics widget (aggregated daily counters)
 * - REQ-ADMIN2-141: Non-blocking visit counter increment
 * - REQ-ADMIN2-142: IP hashing/truncation for privacy
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-009, REQ-ADMIN2-140, REQ-ADMIN2-141, REQ-ADMIN2-142
 */

import { z } from 'zod'
import { router, protectedAdminProcedure } from '../../trpc'
import {
  incrementVisitCounters,
  getVisitStats,
  getSummaryCounts,
  getNewContent,
  getDayOverDay,
} from '@rhymix-ts/admin/stats'

export const adminStatsRouter = router({
  /**
   * Get visitor statistics for dashboard widget (REQ-ADMIN2-009).
   *
   * Returns daily/monthly visit counts backed by aggregated DailyVisit table.
   * Uses indexed query on date column for performance (REQ-ADMIN2-010).
   */
  getVisitStats: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        days: z.number().int().positive().optional().default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getVisitStats(input.siteId, input.days, ctx.prisma)
    }),

  /**
   * Get summary counts for dashboard counter strip (REQ-ADMIN2-006).
   *
   * Returns total member/document/comment/file counts for current site.
   */
  getSummaryCounts: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getSummaryCounts(input.siteId, ctx.prisma)
    }),

  /**
   * 최근 N일 신규 콘텐츠 조회 (SPEC-STATS-001 REQ-STATS-003).
   *
   * 대시보드 "최근 7일 신규 콘텐츠 바 차트" 데이터.
   * DailyStat 집계 테이블에서 일별 게시물/댓글/회원 신규 수를 반환한다.
   */
  getNewContent: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        days: z.number().int().positive().optional().default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getNewContent(input.siteId, input.days, ctx.prisma)
    }),

  /**
   * 전일 대비 증감율 조회 (SPEC-STATS-001 REQ-STATS-005).
   *
   * 회원/문서/댓글/파일 각각에 대해 금일 vs 전일 신규 누적의 변화율(%)을 반환.
   * 대시보드 요약 카드에 ▲N% / ▼N% 로 표시된다.
   */
  getDayOverDay: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getDayOverDay(input.siteId, ctx.prisma)
    }),

  /**
   * Increment visit counters (REQ-ADMIN2-141).
   *
   * Non-blocking visit counter increment for page render path.
   * Uses fire-and-forget pattern to avoid blocking page rendering.
   *
   * @MX:WARN: 페이지 렌더 비차단 필수 - fire-and-forget 패턴 (REQ-ADMIN2-141)
   */
  incrementVisitCounters: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        ip: z.string(),
        path: z.string(),
        referer: z.string().nullable().optional(),
        userAgent: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fire-and-forget: do not await in render path
      // Use void to explicitly ignore promise
      void incrementVisitCounters(
        {
          ...input,
          referer: input.referer ?? null,
          userAgent: input.userAgent ?? null,
        },
        ctx.prisma,
      )
      return { success: true }
    }),

  /**
   * Get detailed statistics for /admin/stats page (REQ-ADMIN2-140).
   *
   * Returns daily/monthly visit charts, unique vs total visitors,
   * referrer breakdown (Phase 1: simple daily/monthly aggregates).
   */
  getDetailedStats: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Phase 1: Return daily visit data for date range
      // Future: Add referrer breakdown, unique vs total breakdown
      const hasDateFilter = input.startDate || input.endDate
      const stats = await ctx.prisma.dailyVisit.findMany({
        where: {
          siteId: input.siteId,
          ...(hasDateFilter
            ? {
                date: {
                  ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                  ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
                },
              }
            : {}),
        },
        orderBy: { date: 'desc' },
        take: 365, // Last year max
      })

      return {
        daily: stats.map((s) => ({
          date: s.date.toISOString().split('T')[0]!,
          uniqueVisitors: s.uniqueVisitors,
          pageViews: s.pageViews,
        })),
        summary: {
          totalUniqueVisitors: stats.reduce((sum, s) => sum + s.uniqueVisitors, 0),
          totalPagesViews: stats.reduce((sum, s) => sum + s.pageViews, 0),
          averageDailyVisitors:
            stats.length > 0
              ? Math.round(
                  stats.reduce((sum, s) => sum + s.uniqueVisitors, 0) / stats.length,
                )
              : 0,
        },
      }
    }),
})
