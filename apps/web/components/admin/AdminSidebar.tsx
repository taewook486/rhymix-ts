'use client'
/**
 * Admin 사이드바 컴포넌트 — SPEC-ADMIN-001 Slice C + Slice D + SPEC-ADMIN-EXTRAS-001 Slice A+B
 *                     + SPEC-CONTENT-PARITY-001 M1.
 *
 * @MX:NOTE: [AUTO] sidebar IA 의 single source of truth.
 *           spec.md line 904-926 과 1:1 매핑.
 *           Slice D: /admin/menu, /admin/logs 활성화.
 *           Slice A: /admin/settings/export, /admin/settings/import 추가.
 *           Slice B: favorites section 추가 (DnD 지원).
 *           SPEC-CONTENT-PARITY-001 M1(REQ-CPAR-001~002): '콘텐츠' 섹션에 파일/휴지통/
 *           스팸필터 링크 추가 + 레거시 순서(게시판→페이지→문서→댓글→파일→설문→스팸필터→
 *           휴지통) 반영. 스팸필터는 허브+탭(design.md D-4)이므로 사이드바는 첫 탭
 *           (/admin/settings/spamfilter/ip)으로 연결.
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA, SPEC-CONTENT-PARITY-001 REQ-CPAR-001~002
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
  BarChart3,
  Target,
  FolderArchive,
  Shield,
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

// SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-001: 레거시 admin GNB 6그룹 순서
// (사이트 제작/편집→회원→콘텐츠→즐겨찾기→설정→고급)에 맞춰 5개 고정 그룹으로 재배치.
// 대시보드는 그룹 목록과 별도 랜딩 링크로 유지. 즐겨찾기는 NAV 배열에 없고 렌더 로직에서
// '콘텐츠' 그룹 직후에 조건부 삽입한다(REQ-AMP-004, 아래 렌더 부분 참고).
// 전체 href 값은 재배치 전과 동일 집합을 유지한다(REQ-AMP-008) — 순서·그룹 소속만 변경.
const NAV: ReadonlyArray<NavSection> = [
  {
    section: '대시보드',
    items: [
      { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    ],
  },
  {
    // REQ-AMP-002: "사이트 제작/편집" 그룹 — 기존 "사이트 설정"에서 메뉴 편집/디자인 이동.
    section: '사이트 제작/편집',
    items: [
      { href: '/admin/menu', label: '메뉴 편집', icon: Menu },
      { href: '/admin/site/design', label: '디자인', icon: Palette },
    ],
  },
  {
    section: '회원',
    items: [
      { href: '/admin/members', label: '회원 관리', icon: Users },
      { href: '/admin/members/groups', label: '회원 그룹', icon: Users },
      { href: '/admin/members/new', label: '회원 등록', icon: UserPlus },
      { href: '/admin/members/settings', label: '회원 설정', icon: SlidersHorizontal },
      { href: '/admin/site/points', label: '포인트', icon: Target },
    ],
  },
  {
    // SPEC-CONTENT-PARITY-001 REQ-CPAR-001: 레거시 콘텐츠 메뉴 순서
    // (게시판→페이지→문서→댓글→파일→설문→스팸필터→휴지통)를 참고해 재배열.
    // 위젯 시스템은 rhymix-ts 고유 항목으로 유지(위치는 구현 결정 — 게시판 다음 배치).
    // SPEC-ADMIN-MENU-PARITY-001 §2: 위젯 시스템은 이 그룹에 그대로 유지한다(이동하지 않음).
    section: '콘텐츠',
    items: [
      { href: '/admin/modules', label: '게시판(모듈)', icon: Package },
      { href: '/admin/widgets', label: '위젯 시스템', icon: Puzzle },
      { href: '/admin/pages', label: '페이지', icon: FileText },
      { href: '/admin/documents', label: '전체 문서 관리', icon: FileText },
      { href: '/admin/comments', label: '전체 댓글 관리', icon: MessageSquare },
      { href: '/admin/files', label: '파일 관리', icon: FolderArchive },
      { href: '/admin/polls', label: '설문', icon: BarChart3 },
      // REQ-CPAR-002: 허브+탭 확정 — 사이드바는 단일 링크만, 첫 탭(ip)으로 연결.
      { href: '/admin/settings/spamfilter/ip', label: '스팸필터', icon: Shield },
      { href: '/admin/trash', label: '휴지통', icon: Trash2 },
    ],
  },
  {
    // REQ-AMP-005: "설정" 그룹 — 메뉴 편집/디자인/내보내기/가져오기는 다른 그룹으로 이동.
    section: '설정',
    items: [
      { href: '/admin/settings/site', label: '일반 설정', icon: Settings },
      { href: '/admin/settings/notification', label: '알림 설정', icon: Bell },
      { href: '/admin/settings/security', label: '보안 설정', icon: ShieldCheck },
    ],
  },
  {
    // REQ-AMP-003: "고급" 그룹 — 내보내기/가져오기(구 "사이트 설정") + 기존 "시스템" 3항목.
    // 위젯 시스템은 포함하지 않는다(콘텐츠 그룹에 유지, §2 참고).
    section: '고급',
    items: [
      { href: '/admin/settings/export', label: '내보내기', icon: Download },
      { href: '/admin/settings/import', label: '가져오기', icon: Upload },
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
        {/* 아이콘은 즐겨찾기 데이터가 들고 있는 컴포넌트다 — 렌더 중 새로 만들지 않는다. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
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

  // 즐겨찾기는 DnD 로 로컬에서 재정렬되므로 서버 데이터를 로컬 상태로 복사한다.
  useEffect(() => {
    if (favoritesData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

      {/* 네비게이션 섹션 */}
      {NAV.map((group) => (
        <div key={group.section}>
          <div className="mb-6">
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

          {/*
            REQ-AMP-004: 즐겨찾기 섹션은 '콘텐츠' 그룹 렌더링 직후 & '설정' 그룹 이전에
            조건부 렌더(1건 이상일 때만). 레거시 GNB의 즐겨찾기 삽입 위치(설정류 그룹 직전)와
            동일한 DOM 순서를 재현한다.
          */}
          {group.section === '콘텐츠' && favorites.length > 0 && (
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
        </div>
      ))}
    </nav>
  )
}
