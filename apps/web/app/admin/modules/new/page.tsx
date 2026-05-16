/**
 * 모듈 인스턴스 생성 페이지 — SPEC-ADMIN-001 Slice C.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020
 */
import Link from 'next/link'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { CreateModuleForm } from '@/components/admin/CreateModuleForm'

export const dynamic = 'force-dynamic'

export default async function NewModulePage() {
  const siteId = await getCurrentSiteId()

  return (
    <section>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
          <Link href="/admin/modules" className="hover:text-zinc-900">
            모듈 인스턴스
          </Link>
          <span>/</span>
          <span>새 모듈</span>
        </div>
        <h1 className="text-2xl font-bold">새 모듈 인스턴스 추가</h1>
      </header>
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <CreateModuleForm siteId={siteId} />
      </div>
    </section>
  )
}
