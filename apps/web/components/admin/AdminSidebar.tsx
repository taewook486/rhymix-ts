'use client'
/**
 * Admin 사이드바 컴포넌트 — SPEC-ADMIN-001 Slice C + Slice D + SPEC-ADMIN-EXTRAS-001 Slice A+B.
 *
 * @MX:NOTE: [AUTO] sidebar IA 의 single source of truth.
 *           spec.md line 904-926 과 1:1 매핑.
 *           Slice D: /admin/menu, /admin/logs 활성화.
 *           Slice A: /admin/settings/export, /admin/settings/import 추가.
 *           Slice B: favorites section 추가 (DnD 지원).
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@rhymix-ts/ui'
import {
  LayoutDashboard,
  Package,
  Menu,
  ScrollText,
  Users,
  Settings,
  Activity,
  Trash2,
  Puzzle,
  Palette,
  Download,
  Upload,
  GripVertical,
  X,
  Star,
  FileText,
  MessageSquare,
  Bell,
  ShieldCheck,
  UserPlus,
  SlidersHorizontal,
} from 'lucide-react'
import { trpc } from '@/providers/TRPCProvider'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface NavItem {
  href: string
  label: string
  icon?: React.ElementType
  disabled?: boolean
}

interface NavSection {
  section: string
  items: NavItem[]
}

interface FavoriteItem {
  id: number
  label: string
  href: string
  icon?: string | null
  listOrder: number
}

const NAV: ReadonlyArray<NavSection> = [
  {
    section: '대시보드',
    items: [
      { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    ],
  },
  {
    section: '콘텐츠',
    items: [
      { href: '/admin/modules', label: '게시판(모듈)', icon: Package },
      { href: '/admin/widgets', label: '위젯 시스템', icon: Puzzle },
      { href: '/admin/pages', label: '페이지', icon: FileText },
      { href: '/admin/documents', label: '전체 문서 관리', icon: FileText },
      { href: '/admin/comments', label: '전체 댓글 관리', icon: MessageSquare },
    ],
  },
  {
    section: '사이트 설정',
    items: [
      { href: '/admin/settings/site', label: '일반 설정', icon: Settings },
      { href: '/admin/menu', label: '메뉴 편집', icon: Menu },
      { href: '/admin/site/design', label: '디자인', icon: Palette },
      { href: '/admin/settings/notification', label: '알림 설정', icon: Bell },
      { href: '/admin/settings/security', label: '보안 설정', icon: ShieldCheck },
      { href: '/admin/settings/export', label: '내보내기', icon: Download },
      { href: '/admin/settings/import', label: '가져오기', icon: Upload },
    ],
  },
  {
    section: '회원',
    items: [
      { href: '/admin/members', label: '회원 관리', icon: Users },
      { href: '/admin/members/groups', label: '회원 그룹', icon: Users },
      { href: '/admin/members/new', label: '회원 등록', icon: UserPlus },
      { href: '/admin/members/settings', label: '회원 설정', icon: SlidersHorizontal },
    ],
  },
  {
    section: '시스템',
    items: [
      { href: '/admin/logs', label: '관리자 로그', icon: ScrollText },
      { href: '/admin/system', label: '시스템 헬스', icon: Activity },
      { href: '/admin/system/cache', label: '캐시 관리', icon: Trash2 },
    ],
  },
]

/**
 * SortableFavoriteItem — DnD 지원 즐겨찾기 항목
 */
function SortableFavoriteItem({
  favorite,
  isActive,
  onRemove,
}: {
  favorite: FavoriteItem
  isActive: boolean
  onRemove: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favorite.id,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  // 아이콘 렌더링 (문자열 → Lucide 아이콘 매핑)
  const IconComponent = favorite.icon
    ? (() => {
        // 간단한 아이콘 매핑 (확장 가능)
        const iconMap: Record<string, React.ElementType> = {
          LayoutDashboard,
          Package,
          Menu,
          ScrollText,
          Users,
          Settings,
          Activity,
          Trash2,
          Puzzle,
          Palette,
          Download,
          Upload,
        }
        return iconMap[favorite.icon] || Star
      })()
    : Star

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Link
        href={favorite.href}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded transition-opacity',
          isActive ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
          isDragging && 'opacity-50'
        )}
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-200"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        {IconComponent && <IconComponent className="h-4 w-4 text-amber-400" />}
        <span className="flex-1">{favorite.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onRemove(favorite.id)
          }}
          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </Link>
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  // favorites 조회
  const { data: favoritesData } = trpc.admin.favorite.list.useQuery()

  // remove mutation
  const removeMutation = trpc.admin.favorite.remove.useMutation({
    onSuccess: () => {
      toast.success('즐겨찾기 삭제 완료')
    },
    onError: (error) => {
      toast.error('즐겨찾기 삭제 실패', { description: error.message })
    },
  })

  // reorder mutation
  const reorderMutation = trpc.admin.favorite.reorder.useMutation({
    onSuccess: () => {
      toast.success('순서 변경 완료')
    },
    onError: (error) => {
      toast.error('순서 변경 실패', { description: error.message })
    },
  })

  useEffect(() => {
    if (favoritesData) {
      setFavorites(favoritesData)
    }
  }, [favoritesData])

  // DnD 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // DnD 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = favorites.findIndex((f) => f.id === Number(active.id))
      const newIndex = favorites.findIndex((f) => f.id === Number(over.id))

      const newFavorites = [...favorites]
      const [removed] = newFavorites.splice(oldIndex, 1)
      newFavorites.splice(newIndex, 0, removed!)

      // listOrder 업데이트
      const items = newFavorites.map((fav, idx) => ({
        id: fav.id,
        listOrder: idx,
      }))

      reorderMutation.mutate({ items })
      setFavorites(newFavorites)
    }
  }

  const handleRemove = (id: number) => {
    removeMutation.mutate({ id })
    setFavorites((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <nav aria-label="관리자 사이드바" className="bg-zinc-900 text-zinc-100 p-4 overflow-y-auto">
      <div className="mb-6 px-3 py-2">
        <span className="text-sm font-bold text-zinc-100">Rhymix 관리자</span>
      </div>

      {/* 즐겨찾기 섹션 */}
      {favorites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-2 px-3 flex items-center gap-2">
            <Star className="h-3 w-3 text-amber-400" />
            즐겨찾기
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={favorites.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {favorites.map((favorite) => (
                  <li key={favorite.id}>
                    <SortableFavoriteItem
                      favorite={favorite}
                      isActive={pathname === favorite.href}
                      onRemove={handleRemove}
                    />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 네비게이션 섹션 */}
      {NAV.map((group) => (
        <div key={group.section} className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-2 px-3">
            {group.section}
          </h3>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              if (item.disabled) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed rounded"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                      <span className="ml-auto text-xs text-zinc-600">(준비중)</span>
                    </span>
                  </li>
                )
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors',
                      isActive
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
