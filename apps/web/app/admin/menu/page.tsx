/**
 * Admin 메뉴 목록 페이지 — SPEC-ADMIN-001 Slice D + SPEC-ADMIN-002 Slice 3D + SPEC-MENU-001 Slice C.
 *
 * Server Component. getServerCaller().admin.menu.list({ siteId }) 후 MenuTable 렌더.
 * REQ-ADMIN2-031: 사이트 디자인 바로가기 추가.
 * REQ-MENU-024~025: 메뉴 슬롯 배정 UI 추가.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030 + SPEC-ADMIN-002 REQ-ADMIN2-031 + SPEC-MENU-001 REQ-MENU-024~025
 */
import Link from 'next/link'
import { Button } from '@rhymix-ts/ui/components'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { getCurrentDomainId } from '@/lib/admin/site-context'
import { MenuTable } from '@/components/admin/MenuTable'
import { SlotAssignmentTable } from '@/components/admin/SlotAssignmentTable'

export const dynamic = 'force-dynamic'

export default async function AdminMenuPage() {
  const siteId = await getCurrentSiteId()
  const domainId = await getCurrentDomainId()
  const caller = await getServerCaller()
  const menus = await caller.admin.menu.list({ siteId })
  const slotAssignments = await caller.admin.menu['slot.list']({ domainId })

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

      {/* SPEC-MENU-001 Slice C: 메뉴 슬롯 배정 UI */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">메뉴 존 배정</h2>
        <SlotAssignmentTable
          domainId={domainId}
          siteId={siteId}
          initialAssignments={slotAssignments}
          menus={menus}
        />
      </div>

      {/* 기존 메뉴 목록 */}
      <div>
        <h2 className="text-lg font-medium mb-4">메뉴 목록</h2>
        <MenuTable menus={menus} />
      </div>
    </div>
  )
}
