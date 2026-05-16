/**
 * 관리자 대시보드 — SPEC-ADMIN-001 Slice C.
 *
 * 모듈 인스턴스 수를 표시하는 간략 카드.
 * 후속 슬라이스 (Slice D) 에서 위젯으로 교체 예정.
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()
  const instances = await caller.admin.module.list({ siteId })

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-1">모듈 인스턴스</p>
          <p className="text-3xl font-bold">{instances.length}</p>
          <p className="text-xs text-zinc-400 mt-2">등록된 모듈 수</p>
        </div>
      </div>
    </section>
  )
}
