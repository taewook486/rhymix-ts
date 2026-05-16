'use client'
/**
 * Admin 사이드바 컴포넌트 — SPEC-ADMIN-001 Slice C + Slice D.
 *
 * @MX:NOTE: [AUTO] sidebar IA 의 single source of truth.
 *           spec.md line 904-926 과 1:1 매핑.
 *           Slice D: /admin/menu, /admin/logs 활성화.
 * @MX:SPEC: SPEC-ADMIN-001 Admin Shell IA
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@rhymix-ts/ui'
import { LayoutDashboard, Package, Menu, ScrollText, Users, Settings } from 'lucide-react'

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
      { href: '/admin/content/pages', label: '페이지', disabled: true },
      { href: '/admin/content/documents', label: '문서', disabled: true },
    ],
  },
  {
    section: '사이트 설정',
    items: [
      { href: '/admin/settings/site', label: '일반 설정', icon: Settings },
      { href: '/admin/menu', label: '메뉴 편집', icon: Menu },
    ],
  },
  {
    section: '회원',
    items: [
      { href: '/admin/members', label: '회원 관리', icon: Users },
      { href: '/admin/members/groups', label: '회원 그룹', disabled: true },
    ],
  },
  {
    section: '시스템',
    items: [
      { href: '/admin/logs', label: '관리자 로그', icon: ScrollText },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="관리자 사이드바"
      className="bg-zinc-900 text-zinc-100 p-4 overflow-y-auto"
    >
      <div className="mb-6 px-3 py-2">
        <span className="text-sm font-bold text-zinc-100">Rhymix 관리자</span>
      </div>
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
