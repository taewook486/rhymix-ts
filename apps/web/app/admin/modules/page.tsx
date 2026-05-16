/**
 * 모듈 인스턴스 목록 페이지 — SPEC-ADMIN-001 Slice C.
 *
 * Server Component: getServerCaller 로 tRPC admin.module.list 직접 호출.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020
 */
import Link from 'next/link'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { ModuleTable } from '@/components/admin/ModuleTable'
import { Button } from '@rhymix-ts/ui/components'

export const dynamic = 'force-dynamic'

export default async function ModulesPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()
  const instances = await caller.admin.module.list({ siteId })

  return (
    <section>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">모듈 인스턴스</h1>
          <p className="text-sm text-zinc-500 mt-1">
            사이트에 등록된 모듈 인스턴스를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/modules/new">새 모듈</Link>
        </Button>
      </header>
      <ModuleTable instances={instances} siteId={siteId} />
    </section>
  )
}
