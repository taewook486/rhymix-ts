/**
 * Admin 메뉴 상세 + MenuItem 트리 편집 페이지 — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * Server Component. MenuItem 목록 + DnD 기반 reorder (Slice E).
 *
 * @MX:NOTE: [AUTO] Slice E 에서 MenuItemDnDTree 를 도입하여 DnD reorder 활성화.
 *           @dnd-kit 패키지 설치 시 완전한 DnD 기능이 동작한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@rhymix-ts/ui/components'
import { getServerCaller } from '@/lib/trpc/server'
import { MenuItemEditor } from '@/components/admin/MenuItemEditor'
import { MenuItemDnDTree } from '@/components/admin/MenuItemDnDTree'

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

      {/* DnD 순서 편집 (Slice E) */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">메뉴 순서 편집 (드래그앤드롭)</h2>
        <MenuItemDnDTree menuId={menu.id} initialItems={menu.items} />
      </div>

      {/* 텍스트 기반 상세 편집 */}
      <MenuItemEditor menuId={menu.id} items={menu.items} />
    </div>
  )
}
