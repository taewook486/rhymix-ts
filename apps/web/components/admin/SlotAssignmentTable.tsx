'use client'
/**
 * 메뉴 슬롯 배정 테이블 — SPEC-MENU-001 Slice C.
 *
 * 도메인별 슬롯(HEADER_PRIMARY, FOOTER, UTILITY)에 메뉴를 배정하는 UI.
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-024~025
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@rhymix-ts/ui/components'
import { trpc } from '@/lib/trpc/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rhymix-ts/ui/components'

type MenuSlot = 'HEADER_PRIMARY' | 'FOOTER' | 'UTILITY'

interface SlotAssignment {
  id: number
  domainId: number
  slot: MenuSlot
  menuId: number
  createdAt: Date
  updatedAt: Date
  menu: {
    id: number
    title: string
  }
}

interface Menu {
  id: number
  title: string
  isAdminMenu: boolean
  listOrder: number
  createdAt: Date
}

interface SlotAssignmentTableProps {
  domainId: number
  siteId: number
  initialAssignments: SlotAssignment[]
  menus: Menu[]
}

const SLOT_LABELS: Record<MenuSlot, string> = {
  HEADER_PRIMARY: '헤더 메뉴',
  FOOTER: '푸터 메뉴',
  UTILITY: '유틸리티 메뉴',
}

export function SlotAssignmentTable({
  domainId,
  siteId,
  initialAssignments,
  menus,
}: SlotAssignmentTableProps) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<SlotAssignment[]>(initialAssignments)

  // Filter to site menus only (isAdminMenu=false)
  const siteMenus = menus.filter((m) => !m.isAdminMenu)

  const assignMutation = trpc.admin.menu['slot.assign'].useMutation({
    onSuccess: (data) => {
      toast.success('메뉴가 슬롯에 배정되었습니다.')
      setAssignments((prev) => {
        const existing = prev.findIndex((a) => a.slot === data.slot)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = data
          return updated
        }
        return [...prev, data]
      })
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message || '메뉴 배정에 실패했습니다.')
    },
  })

  const createMenuMutation = trpc.admin.menu['siteMenu.create'].useMutation({
    onSuccess: (data) => {
      toast.success('새 메뉴가 생성되었습니다.')
      router.push(`/admin/menu/${data.id}`)
    },
    onError: (error) => {
      toast.error(error.message || '메뉴 생성에 실패했습니다.')
    },
  })

  const handleSlotChange = (slot: MenuSlot, menuId: string) => {
    const menuIdNum = Number.parseInt(menuId, 10)
    assignMutation.mutate({
      domainId,
      slot,
      menuId: menuIdNum,
    })
  }

  const handleCreateNewMenu = () => {
    const title = prompt('새 메뉴 이름을 입력하세요:')
    if (title && title.trim()) {
      createMenuMutation.mutate({
        siteId,
        title: title.trim(),
      })
    }
  }

  const slots: MenuSlot[] = ['HEADER_PRIMARY', 'FOOTER', 'UTILITY']

  return (
    <div className="rounded-md border border-zinc-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">슬롯</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">배정된 메뉴</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">작업</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const assignment = assignments.find((a) => a.slot === slot)
            return (
              <tr key={slot} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                  {SLOT_LABELS[slot]}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Select
                    value={assignment?.menuId.toString() || ''}
                    onValueChange={(value) => handleSlotChange(slot, value)}
                    disabled={assignMutation.isPending}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="메뉴를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {siteMenus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id.toString()}>
                          {menu.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {assignment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Link href={`/admin/menu/${assignment.menuId}`}>편집</Link>
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateNewMenu}
          disabled={createMenuMutation.isPending}
        >
          + 메뉴 존 추가
        </Button>
      </div>
    </div>
  )
}
