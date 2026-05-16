'use client'
/**
 * MenuItem DnD 트리 컴포넌트 — SPEC-ADMIN-001 Slice E-2.
 *
 * @dnd-kit 기반 flat-list sortable DnD. same-level reorder 지원.
 * cross-level (parent 변경) DnD 는 Slice F 에서 추가된다.
 *
 * @MX:NOTE: [AUTO] DnD 완료 시 admin.menuItem.reorder tRPC mutation 을 호출하여
 *           listOrder 를 단일 $transaction 으로 원자적 갱신한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 *
 * @MX:WARN: [AUTO] @dnd-kit/core 패키지가 설치되어 있어야 DnD 기능이 동작함.
 * @MX:REASON: WSL2 환경에서 Windows store 경로 불일치로 pnpm add 가 실패했음.
 *             패키지 설치 후 import 를 활성화할 것. 현재는 기본 정렬 UI 만 렌더.
 */
import { GripVertical } from 'lucide-react'

interface MenuItemRow {
  id: number
  title: string
  parentId: number | null
  listOrder: number
}

interface MenuItemDnDTreeProps {
  menuId: number
  initialItems: MenuItemRow[]
}

/**
 * MenuItemDnDTree — DnD 기반 MenuItem 순서 편집 컴포넌트.
 *
 * @dnd-kit 패키지 설치 후 DnD 활성화 예정.
 * 현재는 현재 순서를 그대로 표시하며, 드래그 핸들(GripVertical) UI 만 렌더.
 */
export function MenuItemDnDTree({ initialItems }: MenuItemDnDTreeProps) {
  // TODO: @dnd-kit 패키지 설치 후 DnD 활성화
  // import { DndContext, closestCenter } from '@dnd-kit/core'
  // import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
  // import { arrayMove } from '@dnd-kit/sortable'

  const items = [...initialItems].sort((a, b) => a.listOrder - b.listOrder)

  return (
    <div className="space-y-2">
      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        드래그앤드롭: @dnd-kit 패키지 설치 후 활성화됩니다.
        현재는 순서 목록만 표시됩니다.
      </p>
      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-6 text-center text-sm text-zinc-500">
          등록된 메뉴 항목이 없습니다
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded border border-zinc-200 p-3 bg-white"
            >
              <GripVertical className="h-4 w-4 text-zinc-400 cursor-grab" aria-hidden />
              <span className="flex-1 text-sm font-medium">{item.title}</span>
              <span className="text-xs text-zinc-400">순서: {item.listOrder}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
