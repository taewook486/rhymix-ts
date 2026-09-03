'use client'
/**
 * MenuItem DnD 트리 컴포넌트 — SPEC-ADMIN-001 Slice E-2 + SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * @dnd-kit 기반 cross-level DnD 트리.
 * @dnd-kit 패키지 설치 완료 후 DnD 활성화.
 *
 * @MX:NOTE: [AUTO] DnD 완료 시 admin.menuItem.reorder tRPC mutation 을 호출하여
 *           listOrder 를 단일 $transaction 으로 원자적 갱신한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031, SPEC-ADMIN-EXTRAS-001 REQ-MENU-DND-001~005
 *
 * Cross-level DnD 기능:
 * - Sibling slot: 같은 부모 내 순서 변경
 * - Child slot: 다른 항목의 자식으로 이동
 * - Escape key: 드래그 취소
 * - Cycle detection: 자기 자신을 조상으로 만들지 않음
 * - Depth check: 최대 깊이 6 제한
 */
import { useState, useEffect } from 'react'
import { GripVertical, ChevronRight, ChevronDown, Copy } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { toast } from 'sonner'
import { trpc } from '@/providers/TRPCProvider'
import { useRouter } from 'next/navigation'

interface MenuItemRow {
  id: number
  title: string
  parentId: number | null
  listOrder: number
  children?: MenuItemRow[]
  depth?: number
}

interface MenuItemDnDTreeProps {
  menuId: number
  initialItems: MenuItemRow[]
}

// 최대 깊이 제한
const MAX_DEPTH = 6

/**
 * 트리를 flat list로 변환 (depth 계산 포함)
 */
function flattenTree(items: MenuItemRow[], depth = 0, parentId: number | null = null): MenuItemRow[] {
  const result: MenuItemRow[] = []

  for (const item of items) {
    result.push({
      ...item,
      depth,
      parentId,
    })

    if (item.children && item.children.length > 0) {
      result.push(...flattenTree(item.children, depth + 1, item.id))
    }
  }

  return result
}

/**
 * Depth 계산 (항목의 트리 깊이)
 */
function calculateDepth(item: MenuItemRow, allItems: MenuItemRow[]): number {
  if (item.parentId === null) return 0

  const parent = allItems.find((i) => i.id === item.parentId)
  if (!parent) return 0

  return 1 + calculateDepth(parent, allItems)
}

/**
 * Cycle detection: 항목이 자신의 조상이 되는지 확인
 */
function wouldCreateCycle(itemId: number, newParentId: number | null, allItems: MenuItemRow[]): boolean {
  if (newParentId === null) return false

  let currentId: number | null = newParentId
  while (currentId !== null) {
    if (currentId === itemId) return true

    const item = allItems.find((i) => i.id === currentId)
    currentId = item?.parentId ?? null
  }

  return false
}

/**
 * 트리 펼침(expand) 시 부모 바로 뒤에 자식들을 삽입 — depth-first 연속 순서 유지 (AC-B2).
 */
function insertChildrenAfterParent(
  items: (MenuItemRow & { depth: number })[],
  parentId: number,
  children: (MenuItemRow & { depth: number })[]
): (MenuItemRow & { depth: number })[] {
  const idx = items.findIndex((item) => item.id === parentId)
  if (idx === -1) return items
  return [...items.slice(0, idx + 1), ...children, ...items.slice(idx + 1)]
}

/**
 * 트리 접기(collapse) 시 해당 항목의 모든 자손을 제거 — depth-first 연속 순서를 이용해
 * 부모보다 depth 가 깊은 연속 구간을 잘라낸다 (AC-B2).
 */
function removeSubtree(
  items: (MenuItemRow & { depth: number })[],
  parentId: number
): (MenuItemRow & { depth: number })[] {
  const idx = items.findIndex((item) => item.id === parentId)
  if (idx === -1) return items
  const parentDepth = items[idx]!.depth
  let end = idx + 1
  while (end < items.length && items[end]!.depth > parentDepth) end++
  return [...items.slice(0, idx + 1), ...items.slice(end)]
}

/**
 * cn 유틸리티 함수
 */
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * SortableMenuItem — DnD 지원 메뉴 항목
 */
function SortableMenuItem({
  item,
  isActive,
  isDragging,
  isExpanded,
  isExpanding,
  isDuplicating,
  onToggleExpand,
  onDuplicate,
}: {
  item: MenuItemRow & { depth: number }
  isActive: boolean
  isDragging: boolean
  isExpanded: boolean
  isExpanding: boolean
  isDuplicating: boolean
  onToggleExpand: (item: MenuItemRow & { depth: number }) => void
  onDuplicate: (item: MenuItemRow & { depth: number }) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  const indent = item.depth * 24

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded border p-3 bg-white transition-shadow',
        isActive ? 'border-blue-500 bg-blue-50' : 'border-zinc-200',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      {/* Depth 인덴트 */}
      <div style={{ width: `${indent}px` }} className="flex-shrink-0" />

      {/* 자식 펼침/접기 토글 (AC-B2 — lazy load) */}
      <button
        type="button"
        disabled={isExpanding}
        onClick={() => onToggleExpand(item)}
        className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
        aria-label={isExpanded ? '자식 접기' : '자식 펼치기'}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
      </button>

      <span className="flex-1 text-sm font-medium truncate">{item.title}</span>

      {/* M4 항목 복제 (AC-SITE-001 UI 배선) — 서브트리 복사는 라우터가 담당 */}
      <button
        type="button"
        disabled={isDuplicating}
        onClick={() => onDuplicate(item)}
        className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
        aria-label="복제"
      >
        <Copy className="h-4 w-4" aria-hidden />
      </button>

      <span className="text-xs text-zinc-400">
        ID: {item.id}
        {item.parentId !== null && ` (부모: ${item.parentId})`}
      </span>
    </div>
  )
}

/**
 * MenuItemDnDTree — DnD 기반 MenuItem 순서/계층 편집 컴포넌트.
 */
export function MenuItemDnDTree({ menuId, initialItems }: MenuItemDnDTreeProps) {
  const [items, setItems] = useState<MenuItemRow[]>(() => flattenTree(initialItems))
  const [activeId, setActiveId] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [expandingId, setExpandingId] = useState<number | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  const router = useRouter()
  const reorderMutation = trpc.admin.menuItem.reorder.useMutation()
  const duplicateMutation = trpc.admin.menuItem.duplicate.useMutation()
  const utils = trpc.useUtils()

  // 자식 펼침/접기 (AC-B2 — admin.menuItem.list 로 lazy load, 트리 계약 문서 § Implementation Notes)
  const handleToggleExpand = async (item: MenuItemRow & { depth: number }) => {
    if (expandedIds.has(item.id)) {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      setItems((prev) => removeSubtree(prev as (MenuItemRow & { depth: number })[], item.id))
      return
    }

    setExpandingId(item.id)
    try {
      const children = await utils.admin.menuItem.list.fetch({ menuId, parentId: item.id })
      const childRows: (MenuItemRow & { depth: number })[] = children.map((c) => ({
        id: c.id,
        title: c.title,
        parentId: item.id,
        listOrder: c.listOrder,
        depth: item.depth + 1,
      }))
      setItems((prev) =>
        insertChildrenAfterParent(prev as (MenuItemRow & { depth: number })[], item.id, childRows)
      )
      setExpandedIds((prev) => new Set(prev).add(item.id))
    } catch (err) {
      console.error('자식 로드 실패:', err)
      toast.error('자식 항목을 불러오지 못했습니다')
    } finally {
      setExpandingId(null)
    }
  }

  // M4 항목 복제 (AC-SITE-001) — tRPC duplicate 위임 후 낙관적 로컬 삽입.
  // useState 는 props 변화로 재초기화되지 않으므로 router.refresh() 로 서버
  // 상태를 확정 반영한다. 서브트리 재귀 복사·listOrder 시프트는 라우터가
  // $transaction 으로 보장하고, 여기는 원본의 보이는 서브트리 뒤에 새 루트
  // 행만 끼워 넣는다.
  const handleDuplicate = async (item: MenuItemRow & { depth: number }) => {
    if (duplicatingId !== null) return

    setDuplicatingId(item.id)
    try {
      const res = await duplicateMutation.mutateAsync({ id: item.id })
      setItems((prev) => {
        const rows = prev as (MenuItemRow & { depth: number })[]
        const idx = rows.findIndex((r) => r.id === item.id)
        if (idx === -1) return prev

        // 원본의 보이는 서브트리 끝까지 건너뛴 자리가 새 루트의 위치다
        let end = idx + 1
        while (end < rows.length && rows[end]!.depth > item.depth) end++

        const newRow: MenuItemRow & { depth: number } = {
          id: res.id,
          title: item.title,
          parentId: item.parentId,
          listOrder: item.listOrder + 1,
          depth: item.depth,
        }
        const inserted = [...rows.slice(0, end), newRow, ...rows.slice(end)]

        // 삽입 지점 뒤의 형제 listOrder +1 — 화면 순서와 정렬 키 충돌 방지
        return inserted.map((r) =>
          r.id !== res.id &&
          r.parentId === item.parentId &&
          r.listOrder > item.listOrder
            ? { ...r, listOrder: r.listOrder + 1 }
            : r,
        )
      })
      router.refresh()
      toast.success('항목이 복제되었습니다')
    } catch (err) {
      console.error('Duplicate failed:', err)
      toast.error('복제 실패: 서버 오류')
    } finally {
      setDuplicatingId(null)
    }
  }

  // DnD 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // DnD 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  // DnD 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeIdNum = active.id as number
    const overId = over.id as number

    const activeItem = items.find((item) => item.id === activeIdNum)
    const overItem = items.find((item) => item.id === overId)

    if (!activeItem || !overItem) return

    const activeDepth = activeItem.depth ?? 0

    // Sibling 드롭 (같은 부모 내 순서 변경)
    if (activeItem.parentId === overItem.parentId) {
      const oldIndex = items.findIndex((item) => item.id === activeIdNum)
      const newIndex = items.findIndex((item) => item.id === overId)

      const newItems = [...items]
      const [removed] = newItems.splice(oldIndex, 1)
      newItems.splice(newIndex, 0, removed!)

      // 백엔드 호출: reorder ops 생성
      const ops = newItems
        .filter((item) => item.parentId === activeItem.parentId)
        .map((item, index) => ({
          id: item.id,
          parentId: item.parentId,
          listOrder: index,
        }))

      setIsReordering(true)
      try {
        await reorderMutation.mutateAsync({ menuId, items: ops })
        // 성공: revalidate로 서버 확정 상태 반영
        router.refresh()
        setItems(newItems)
        toast.success('순서가 변경되었습니다')
      } catch (err) {
        // 실패: 롤백 (AC-B4)
        console.error('Reorder failed:', err)
        toast.error('순서 변경 실패: 서버 오류')
        setItems([...items]) // 이전 상태로 롤백
      } finally {
        setIsReordering(false)
      }
      return
    }

    // Cross-level 드롭 (다른 항목의 자식으로 이동)
    const newParentId = overItem.id
    const newDepth = (overItem.depth ?? 0) + 1

    // Depth 체크
    if (newDepth >= MAX_DEPTH) {
      toast.error(`최대 깊이(${MAX_DEPTH})를 초과할 수 없습니다`)
      return
    }

    // Cycle detection
    if (wouldCreateCycle(activeIdNum, newParentId, items)) {
      toast.error('순환 참조를 생성할 수 없습니다')
      return
    }

    // 백엔드 호출: cross-level 이동
    setIsReordering(true)
    try {
      // 새 부모 아래의 항목들 listOrder 재계산을 위해 임시 로컬 상태 생성
      const newItems = [...items]
      const activeIndex = newItems.findIndex((item) => item.id === activeIdNum)
      const movedItem = { ...newItems[activeIndex]!, parentId: newParentId, depth: newDepth }
      newItems.splice(activeIndex, 1)

      // 새 부모의 마지막 자식으로 추가
      const siblings = newItems.filter((item) => item.parentId === newParentId)
      const maxListOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.listOrder)) : -1
      movedItem.listOrder = maxListOrder + 1
      newItems.push(movedItem)

      await reorderMutation.mutateAsync({
        menuId,
        items: [{ id: activeIdNum, parentId: newParentId, listOrder: movedItem.listOrder }],
      })
      router.refresh()
      setItems(newItems)
      toast.success(`항목 ${activeItem.title}을(를) ${overItem.title}의 자식으로 이동했습니다`)
    } catch (err) {
      console.error('Cross-level move failed:', err)
      toast.error('이동 실패: 서버 오류')
      setItems([...items]) // 롤백
    } finally {
      setIsReordering(false)
    }
  }

  // Escape 키로 드래그 취소
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
        등록된 메뉴 항목이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500 mb-4">
        드래그하여 메뉴 항목의 순서를 변경하거나 다른 메뉴의 자식으로 이동하세요. Escape 키로 취소할 수 있습니다.
      </p>

      {/* dnd-kit 은 React useId 가 아니라 모듈 전역 카운터로 aria 기술자 id 를 만든다.
          서버 렌더의 카운터 시작값이 클라이언트와 달라 하이드레이션 속성 불일치가 나므로 id 를 고정한다. */}
      <DndContext
        id="menu-item-dnd-tree"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <SortableMenuItem
                  item={{ ...item, depth: item.depth ?? 0 }}
                  isActive={activeId === item.id}
                  isDragging={activeId === item.id}
                  isExpanded={expandedIds.has(item.id)}
                  isExpanding={expandingId === item.id}
                  isDuplicating={duplicatingId === item.id}
                  onToggleExpand={handleToggleExpand}
                  onDuplicate={handleDuplicate}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
