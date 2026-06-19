/**
 * 방문자 통계 페이지 — SPEC-ADMIN-002 REQ-ADMIN2-140.
 *
 * 일별/월별 방문 차트, unique vs total visitors, referrer breakdown.
 * - REQ-ADMIN2-140: /admin/stats page with daily/monthly visit charts
 * - REQ-ADMIN2-009: Backed by aggregated daily counters (not per-request scans)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-009, REQ-ADMIN2-140
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { StatsChart } from './_components/StatsChart'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function AdminStatsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const days = sp.days ? Number(sp.days) : 30
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const stats = await caller.admin.stats.getDetailedStats({
    siteId,
    startDate,
  })

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">방문자 통계</h1>
        <p className="text-sm text-zinc-500 mt-1">
          일별 및 월별 방문자 통계를 확인합니다.
        </p>
      </header>

      <StatsChart stats={stats} days={days} />
    </section>
  )
}
