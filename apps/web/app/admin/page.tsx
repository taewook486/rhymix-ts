/**
 * 관리자 대시보드 — SPEC-ADMIN-001 Slice C + SPEC-ADMIN-002 Slice 1A + Slice 3E.
 *
 * 대시보드 위젯들을 표시:
 * - 방문자 통계 (REQ-ADMIN2-001)
 * - 최근 문서 (REQ-ADMIN2-002)
 * - 최근 댓글 (REQ-ADMIN2-003)
 * - 모듈 인스턴스 수
 * - 위젯 표시 여부 (REQ-ADMIN2-008)
 *
 * REQ-ADMIN2-007: 각 위젯의 데이터 fetch를 개별적으로 시도하여 graceful degradation 구현
 *
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA + SPEC-ADMIN-002 REQ-ADMIN2-001~003, REQ-ADMIN2-007, REQ-ADMIN2-008
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { VisitStatsWidget, RecentDocumentsWidget, RecentCommentsWidget, UpdateNotificationWidget, SummaryCounterStrip } from './_components/DashboardWidgets'
import { WidgetSettingsButton } from './_components/WidgetSettings'
import { VisitorChart, NewContentChart } from './_components/DashboardCharts'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()

  // REQ-ADMIN2-008: 위젯 표시 여부 조회
  const widgetPrefs = await caller.admin.dashboard.getWidgetPrefs()

  // REQ-ADMIN2-007: 각 위젯의 데이터를 병렬로 fetch하면서도 위젯별 장애를 격리한다.
  // Promise.all이 아닌 Promise.allSettled를 사용해 한 위젯의 실패가 다른 위젯의
  // 결과를 막지 않도록 한다.
  const [visitStatsResult, recentDocumentsResult, recentCommentsResult, summaryCountsResult, newContentResult, dayOverDayResult] = await Promise.allSettled([
    caller.admin.dashboard.getVisitStats({ siteId }),
    caller.admin.dashboard.getRecentDocuments({ siteId }),
    caller.admin.dashboard.getRecentComments({ siteId }),
    caller.admin.stats.getSummaryCounts({ siteId }),
    caller.admin.stats.getNewContent({ siteId, days: 7 }),
    caller.admin.stats.getDayOverDay({ siteId }),
  ])

  let visitStatsData
  let visitStatsError = false
  if (visitStatsResult.status === 'fulfilled') {
    visitStatsData = visitStatsResult.value
  } else {
    console.error('Failed to fetch visit stats:', visitStatsResult.reason)
    visitStatsError = true
  }

  let recentDocumentsData
  let recentDocumentsError = false
  if (recentDocumentsResult.status === 'fulfilled') {
    recentDocumentsData = recentDocumentsResult.value
  } else {
    console.error('Failed to fetch recent documents:', recentDocumentsResult.reason)
    recentDocumentsError = true
  }

  let recentCommentsData
  let recentCommentsError = false
  if (recentCommentsResult.status === 'fulfilled') {
    recentCommentsData = recentCommentsResult.value
  } else {
    console.error('Failed to fetch recent comments:', recentCommentsResult.reason)
    recentCommentsError = true
  }

  let summaryCountsData
  let summaryCountsError = false
  if (summaryCountsResult.status === 'fulfilled') {
    summaryCountsData = summaryCountsResult.value
  } else {
    console.error('Failed to fetch summary counts:', summaryCountsResult.reason)
    summaryCountsError = true
  }

  let newContentData
  let newContentError = false
  if (newContentResult.status === 'fulfilled') {
    newContentData = newContentResult.value
  } else {
    console.error('Failed to fetch new content:', newContentResult.reason)
    newContentError = true
  }

  let dayOverDayData
  let dayOverDayError = false
  if (dayOverDayResult.status === 'fulfilled') {
    dayOverDayData = dayOverDayResult.value
  } else {
    console.error('Failed to fetch day-over-day:', dayOverDayResult.reason)
    dayOverDayError = true
  }

  // 모듈 인스턴스 데이터 (기존 기능)
  const instances = await caller.admin.module.list({ siteId })

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="space-y-4">
        {/* REQ-ADMIN2-006: Summary counter strip - full width */}
        {widgetPrefs.summaryCounterStrip && (
          <SummaryCounterStrip
            counts={summaryCountsData}
            dayOverDay={dayOverDayData}
            error={summaryCountsError}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* REQ-ADMIN2-004/005: Update notification widget */}
          {widgetPrefs.updateNotification && (
            <UpdateNotificationWidget currentVersion="0.1.0" />
          )}

          {/* REQ-STATS-003: Visitor chart (last 30 days) */}
          {widgetPrefs.visitStats && (
            <div className="md:col-span-2 lg:col-span-2">
              <VisitorChart
                data={visitStatsData?.daily || []}
                error={visitStatsError}
              />
            </div>
          )}

          {/* REQ-STATS-003: New content chart (last 7 days) */}
          {widgetPrefs.visitStats && (
            <NewContentChart
              data={newContentData || []}
              error={newContentError}
            />
          )}

          {/* 방문자 통계 위젯 */}
          {widgetPrefs.visitStats && (
            <VisitStatsWidget stats={visitStatsData} error={visitStatsError} />
          )}

        {/* 모듈 인스턴스 카드 (기존 유지) */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-1">모듈 인스턴스</p>
          <p className="text-3xl font-bold">{instances.length}</p>
          <p className="text-xs text-zinc-400 mt-2">등록된 모듈 수</p>
        </div>

        {/* 최근 문서 위젯 */}
        {widgetPrefs.recentDocuments && (
          <RecentDocumentsWidget documents={recentDocumentsData} error={recentDocumentsError} />
        )}

        {/* 최근 댓글 위젯 - 2열 차지 */}
        {widgetPrefs.recentComments && (
          <div className="md:col-span-2 lg:col-span-2">
            <RecentCommentsWidget comments={recentCommentsData} error={recentCommentsError} />
          </div>
        )}
      </div>
    </div>

    {/* REQ-ADMIN2-008: 위젯 설정 버튼 */}
    <WidgetSettingsButton />
    </section>
  )
}
