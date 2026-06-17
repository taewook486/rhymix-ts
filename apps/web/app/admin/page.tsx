/**
 * 관리자 대시보드 — SPEC-ADMIN-001 Slice C + SPEC-ADMIN-002 Slice 1A.
 *
 * 대시보드 위젯들을 표시:
 * - 방문자 통계 (REQ-ADMIN2-001)
 * - 최근 문서 (REQ-ADMIN2-002)
 * - 최근 댓글 (REQ-ADMIN2-003)
 * - 모듈 인스턴스 수
 *
 * REQ-ADMIN2-007: 각 위젯의 데이터 fetch를 개별적으로 시도하여 graceful degradation 구현
 *
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA + SPEC-ADMIN-002 REQ-ADMIN2-001~003, REQ-ADMIN2-007
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { VisitStatsWidget, RecentDocumentsWidget, RecentCommentsWidget } from './_components/DashboardWidgets'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()

  // REQ-ADMIN2-007: 각 위젯의 데이터를 개별적으로 fetch하여 장애 격리
  // 방문자 통계 데이터 fetch
  let visitStatsData
  let visitStatsError = false
  try {
    visitStatsData = await caller.admin.dashboard.getVisitStats({ siteId })
  } catch (error) {
    console.error('Failed to fetch visit stats:', error)
    visitStatsError = true
  }

  // 최근 문서 데이터 fetch
  let recentDocumentsData
  let recentDocumentsError = false
  try {
    recentDocumentsData = await caller.admin.dashboard.getRecentDocuments({ siteId })
  } catch (error) {
    console.error('Failed to fetch recent documents:', error)
    recentDocumentsError = true
  }

  // 최근 댓글 데이터 fetch
  let recentCommentsData
  let recentCommentsError = false
  try {
    recentCommentsData = await caller.admin.dashboard.getRecentComments({ siteId })
  } catch (error) {
    console.error('Failed to fetch recent comments:', error)
    recentCommentsError = true
  }

  // 모듈 인스턴스 데이터 (기존 기능)
  const instances = await caller.admin.module.list({ siteId })

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 방문자 통계 위젯 */}
        <VisitStatsWidget stats={visitStatsData} error={visitStatsError} />

        {/* 모듈 인스턴스 카드 (기존 유지) */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-1">모듈 인스턴스</p>
          <p className="text-3xl font-bold">{instances.length}</p>
          <p className="text-xs text-zinc-400 mt-2">등록된 모듈 수</p>
        </div>

        {/* 최근 문서 위젯 */}
        <RecentDocumentsWidget documents={recentDocumentsData} error={recentDocumentsError} />

        {/* 최근 댓글 위젯 - 2열 차지 */}
        <div className="md:col-span-2 lg:col-span-2">
          <RecentCommentsWidget comments={recentCommentsData} error={recentCommentsError} />
        </div>
      </div>
    </section>
  )
}
