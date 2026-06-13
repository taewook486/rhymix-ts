/**
 * Export 페이지 Server Component — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * siteId를 가져와서 Client Component에 전달.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-EXPORT-001~010
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { ExportForm } from './ExportForm'

export const dynamic = 'force-dynamic'

export default async function ExportPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()
  const site = await caller.admin.site.get()

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">내보내기 (Export)</h1>
      <p className="text-sm text-zinc-500">
        {site ? '사이트' : '사이트 (로드 실패)'}의 데이터를 내보내기합니다.
      </p>
      <ExportForm siteId={siteId} />
    </div>
  )
}
