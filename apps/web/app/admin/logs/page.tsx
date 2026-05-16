/**
 * Admin 감사 로그 페이지 — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * Server Component. 쿼리 파라미터로 admin.log.list 호출 후 테이블 렌더.
 * BigInt log.id 는 AdminLogTable 내부에서 String() 변환.
 * Slice E: CSV 내보내기 링크 추가 (REQ-ADMIN-072 완결).
 *
 * @MX:NOTE: [AUTO] CSV 내보내기는 /api/admin/logs/export Route Handler 로 구현.
 *           현재 필터 파라미터를 query string 으로 전달한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 */
import { getServerCaller } from '@/lib/trpc/server'
import { AdminLogFilters } from '@/components/admin/AdminLogFilters'
import { AdminLogTable } from '@/components/admin/AdminLogTable'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    actor?: string
    action?: string
    target?: string
    from?: string
    to?: string
    page?: string
  }>
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const caller = await getServerCaller()

  const data = await caller.admin.log.list({
    actorId: sp.actor ? Number(sp.actor) : undefined,
    action:  sp.action ?? undefined,
    target:  sp.target ?? undefined,
    from:    sp.from ? new Date(sp.from) : undefined,
    to:      sp.to ? new Date(sp.to) : undefined,
    page:    sp.page ? Number(sp.page) : 1,
  })

  // CSV 내보내기 URL 구성 (현재 필터 파라미터 포함)
  const csvParams = new URLSearchParams()
  if (sp.actor) csvParams.set('actorId', sp.actor)
  if (sp.action) csvParams.set('action', sp.action)
  if (sp.target) csvParams.set('target', sp.target)
  if (sp.from) csvParams.set('from', sp.from)
  if (sp.to) csvParams.set('to', sp.to)
  const csvUrl = `/api/admin/logs/export${csvParams.size > 0 ? `?${csvParams.toString()}` : ''}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">관리자 로그</h1>
        <a
          href={csvUrl}
          download
          className="px-3 py-1 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded border border-zinc-300 transition-colors"
        >
          CSV 내보내기
        </a>
      </div>
      <AdminLogFilters initial={sp} />
      <AdminLogTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
      />
    </div>
  )
}
