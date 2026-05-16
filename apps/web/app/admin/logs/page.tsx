/**
 * Admin 감사 로그 페이지 — SPEC-ADMIN-001 Slice D.
 *
 * Server Component. 쿼리 파라미터로 admin.log.list 호출 후 테이블 렌더.
 * BigInt log.id 는 AdminLogTable 내부에서 String() 변환.
 *
 * @MX:TODO: [AUTO] CSV 내보내기 — Slice E.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 * @MX:PRIORITY: P2
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

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">관리자 로그</h1>
      <AdminLogFilters initial={sp} />
      <AdminLogTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
      />
      {/* CSV 내보내기 — Slice E (Q3) */}
      <button
        disabled
        title="Slice E 에서 추가됩니다"
        className="mt-4 px-3 py-1 text-sm text-zinc-400 cursor-not-allowed"
      >
        CSV 내보내기 (준비중)
      </button>
    </div>
  )
}
