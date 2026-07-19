'use client'
/**
 * 회원 그룹 DnD 재배치 목록 (Client Component) — SPEC-MEMBER-ADMIN-001 Slice C.
 *
 * `MenuItemDnDTree`(apps/web/components/admin/MenuItemDnDTree.tsx) 패턴을 재사용한다.
 * `MemberGroup` 은 트리 구조가 아니므로 sibling-only 재배치만 지원한다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-011, REQ-MADM-012, REQ-MADM-013, REQ-MADM-014
 */
import { useState, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { trpc } from '@/providers/TRPCProvider'
import { computeReorder, type ReorderableGroup } from './reorder-logic'

export interface GroupReorderRow extends ReorderableGroup {
  imageMark: string | null
  memberCount: number
  isDefault: boolean
}

interface GroupReorderListProps {
  initialGroups: GroupReorderRow[]
}

function SortableGroupRow({ group, isActive }: { group: GroupReorderRow; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: group.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded border p-3 bg-white transition-shadow ${
        isActive ? 'border-blue-500 bg-blue-50 opacity-50 shadow-lg' : 'border-zinc-200'
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600"
        aria-label={`${group.title} 순서 변경 핸들`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      {group.imageMark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={group.imageMark} alt="" className="h-6 w-6 rounded object-cover" />
      ) : (
        <span className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
          —
        </span>
      )}

      <span className="flex-1 text-sm font-medium truncate">{group.title}</span>
      {group.isDefault && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">기본</span>
      )}
      <span className="text-xs text-zinc-400">회원 {group.memberCount}명</span>
    </li>
  )
}

export function GroupReorderList({ initialGroups }: GroupReorderListProps) {
  const [items, setItems] = useState<GroupReorderRow[]>(initialGroups)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const router = useRouter()
  const reorderMutation = trpc.admin.group.reorder.useMutation()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const { items: nextItems, ops } = computeReorder(items, active.id as number, over.id as number)
    if (ops.length === 0) return

    const previous = items
    setIsReordering(true)
    try {
      await reorderMutation.mutateAsync({ items: ops })
      // REQ-MADM-012: 재검증(revalidate) 이후 서버가 확정한 순서를 반영한다.
      router.refresh()
      setItems(nextItems)
      toast.success('순서가 변경되었습니다')
    } catch (err) {
      // REQ-MADM-013: 실패 시 직전 영속 순서로 롤백(허위 성공 표시 금지).
      console.error('그룹 재배치 실패:', err)
      toast.error('순서 변경 실패: 서버 오류')
      setItems(previous)
    } finally {
      setIsReordering(false)
    }
  }

  // REQ-MADM-014: Escape 키로 드래그 취소(MenuItemDnDTree 와 동일 패턴).
  // window 레벨 리스너를 사용해야 포인터로 시작한 드래그 중에도(포커스가 그립
  // 핸들 밖에 있어도) Escape 를 감지할 수 있다 — div-scoped onKeyDownCapture 는
  // 포커스가 컨테이너 내부에 있을 때만 동작해 MenuItemDnDTree 와 동작이 갈렸다.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeId !== null) {
        setActiveId(null)
        toast.info('드래그가 취소되었습니다')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeId])

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-6 text-center text-sm text-zinc-500">
        그룹이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500 mb-4">
        드래그(또는 포커스 후 키보드 방향키)로 그룹 순서를 변경하세요. Escape 키로 취소할 수 있습니다.
        {isReordering && ' 저장 중...'}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={items.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((group) => (
              <SortableGroupRow key={group.id} group={group} isActive={activeId === group.id} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
