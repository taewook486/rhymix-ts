/**
 * Import 페이지 Server Component — SPEC-ADMIN-EXTRAS-001 REQ-015, REQ-019.
 *
 * siteId를 가져와서 Client Component(ImportForm)에 전달한다.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-015, REQ-019
 */
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { ImportForm } from './ImportForm'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const siteId = await getCurrentSiteId()

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">가져오기 (Import)</h1>
      <p className="text-sm text-zinc-500">
        내보내기(Export)로 생성된 JSON 파일을 업로드하여 데이터를 가져옵니다.
      </p>
      <ImportForm siteId={siteId} />
    </div>
  )
}
