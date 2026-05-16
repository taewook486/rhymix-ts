/**
 * Admin 메뉴 상세 + MenuItem 트리 편집 페이지 — SPEC-ADMIN-001 Slice D.
 *
 * Server Component. 1-depth MenuItem 표시 + 텍스트 입력 기반 reorder.
 *
 * @MX:TODO: [AUTO] Slice E 에서 드래그앤드롭(dnd-kit) 도입 예정.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 * @MX:PRIORITY: P1
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@rhymix-ts/ui/components'
import { getServerCaller } from '@/lib/trpc/server'
import { MenuItemEditor } from '@/components/admin/MenuItemEditor'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminMenuDetailPage({ params }: PageProps) {
  const { id } = await params
  const menuId = Number(id)

  if (!Number.isFinite(menuId) || menuId <= 0) {
    notFound()
  }

  const caller = await getServerCaller()
  let menu: Awaited<ReturnType<typeof caller.admin.menu.get>>

  try {
    menu = await caller.admin.menu.get({ id: menuId })
  } catch {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/menu">← 목록</Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {menu.title}
          {menu.isAdminMenu && (
            <span className="ml-2 text-xs text-zinc-500">(관리자 메뉴)</span>
          )}
        </h1>
      </div>

      <MenuItemEditor menuId={menu.id} items={menu.items} />
    </div>
  )
}
