/**
 * DailyStat aggregation job — SPEC-STATS-001 REQ-STATS-002.
 *
 * 매일 00:05 UTC에 전일 통계를 집계하여 daily_stats 테이블에 저장한다.
 *
 * 집계 항목:
 *   - uv: 일별 순방문자 수 (PageView visitorId unique)
 *   - pv: 일별 페이지뷰 (PageView 총 건수)
 *   - newMembers: 신규 가입자 수 (User.createdAt)
 *   - newDocuments: 게시물 작성 수 (Document.regdate)
 *   - newComments: 댓글 작성 수 (Comment.regdate, deletedAt IS NULL)
 *
 * 멱등성: upsert 사용으로 동일 날짜 재집계 시 덮어쓴다.
 *
 * @MX:SPEC: SPEC-STATS-001 REQ-STATS-002
 */

import type { PrismaClient } from '@prisma/client'

/**
 * 전일 통계를 집계하여 DailyStat 테이블에 upsert 한다.
 *
 * @param targetDate - 집계 기준 시각 (직전 자정~자정을 집계)
 * @param prisma - Prisma client
 *
 * @MX:ANCHOR: [AUTO] aggregateDailyStats — cron job이 매일 호출하는 단일 집계 진입점
 * @MX:REASON: REQ-STATS-002 의 유일한 write path. 실패 시에도 throw 하지 않고 로깅만 남겨 크론 작업을 중단시키지 않는다.
 */
export async function aggregateDailyStats(
  targetDate: Date,
  prisma: PrismaClient,
): Promise<void> {
  try {
    // 전일 날짜 범위 계산: [전일 00:00 UTC, 금일 00:00 UTC)
    const dateEnd = new Date(targetDate)
    dateEnd.setUTCHours(0, 0, 0, 0)
    const dateStart = new Date(dateEnd)
    dateStart.setUTCDate(dateStart.getUTCDate() - 1)

    const prevDay = new Date(dateStart)

    const dateRange = { gte: dateStart, lt: dateEnd }

    // UV: PageView.groupBy 결과에서 unique visitor 수
    let uv = 0
    try {
      const groupResult: unknown = await prisma.pageView.groupBy({
        by: ['date'],
        where: { date: dateRange },
        _count: { visitorId: true },
      })
      uv = readCount(groupResult)
    } catch (err) {
      console.error('[stats] UV 집계 실패:', err)
    }

    // PV: PageView 총 건수
    let pv = 0
    try {
      const pageViews: unknown = await prisma.pageView.findMany({
        where: { date: dateRange },
        select: { visitorId: true },
      })
      pv = readLength(pageViews)
    } catch (err) {
      console.error('[stats] PV 집계 실패:', err)
    }

    // 신규 회원
    let newMembers = 0
    try {
      newMembers =
        (await prisma.user.count({
          where: { createdAt: dateRange },
        })) ?? 0
    } catch (err) {
      console.error('[stats] newMembers 집계 실패:', err)
    }

    // 신규 게시물
    let newDocuments = 0
    try {
      newDocuments =
        (await prisma.document.count({
          where: { regdate: dateRange },
        })) ?? 0
    } catch (err) {
      console.error('[stats] newDocuments 집계 실패:', err)
    }

    // 신규 댓글 (삭제 제외)
    let newComments = 0
    try {
      newComments =
        (await prisma.comment.count({
          where: {
            regdate: dateRange,
            deletedAt: null,
          },
        })) ?? 0
    } catch (err) {
      console.error('[stats] newComments 집계 실패:', err)
    }

    // DailyStat upsert (멱등성 보장)
    await prisma.dailyStat.upsert({
      where: { date: prevDay },
      create: {
        date: prevDay,
        uv,
        pv,
        newMembers,
        newDocuments,
        newComments,
      },
      update: {
        uv,
        pv,
        newMembers,
        newDocuments,
        newComments,
      },
    })
  } catch (err) {
    // 최상위: 로깅만 하고 throw 하지 않음 (크론 작업 중단 방지)
    console.error('[stats] aggregateDailyStats 실패:', err)
  }
}

/**
 * groupBy 결과에서 첫 번째 행의 _count.visitorId 값을 안전하게 읽는다.
 * 결과가 null/undefined/빈 배열인 경우 0을 반환한다.
 */
function readCount(result: unknown): number {
  if (!Array.isArray(result) || result.length === 0) return 0
  const first = result[0] as { _count?: { visitorId?: number } } | undefined
  return first?._count?.visitorId ?? 0
}

/**
 * findMany 결과의 길이를 안전하게 읽는다.
 * 결과가 null/undefined인 경우 0을 반환한다.
 */
function readLength(result: unknown): number {
  if (!Array.isArray(result)) return 0
  return result.length
}
