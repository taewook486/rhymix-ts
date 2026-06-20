/**
 * Admin 메뉴 목록 페이지 — SPEC-ADMIN-001 Slice D + SPEC-ADMIN-002 Slice 3D.
 *
 * Server Component. getServerCaller().admin.menu.list({ siteId }) 후 MenuTable 렌더.
 * REQ-ADMIN2-031: 사이트 디자인 바로가기 추가.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030 + SPEC-ADMIN-002 REQ-ADMIN2-031
 */
import Link from 'next/link'
import { Button } from '@rhymix-ts/ui/components'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { MenuTable } from '@/components/admin/MenuTable'

export const dynamic = 'force-dynamic'

export default async function AdminMenuPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()
  const menus = await caller.admin.menu.list({ siteId })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">메뉴 관리</h1>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/site/design">사이트 디자인</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/menu/new">새 메뉴</Link>
          </Button>
        </div>
      </div>
      <MenuTable menus={menus} />
    </div>
  )
}
