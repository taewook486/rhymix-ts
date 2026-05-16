/**
 * Admin 메뉴 생성 페이지 — SPEC-ADMIN-001 Slice D.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
 */
import Link from 'next/link'
import { Button } from '@rhymix-ts/ui/components'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { CreateMenuForm } from '@/components/admin/CreateMenuForm'

export default async function AdminMenuNewPage() {
  const siteId = await getCurrentSiteId()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/menu">← 목록</Link>
        </Button>
        <h1 className="text-xl font-semibold">새 메뉴</h1>
      </div>
      <CreateMenuForm siteId={siteId} />
    </div>
  )
}
