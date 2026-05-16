/**
 * Admin 메뉴 목록 페이지 — SPEC-ADMIN-001 Slice D.
 *
 * Server Component. getServerCaller().admin.menu.list({ siteId }) 후 MenuTable 렌더.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
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
        <Button asChild>
          <Link href="/admin/menu/new">새 메뉴</Link>
        </Button>
      </div>
      <MenuTable menus={menus} />
    </div>
  )
}
