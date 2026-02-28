'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  Menu as MenuIcon,
  Package,
  Settings,
  Bell,
  LogOut,
  X,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// @MX:NOTE: Admin menu structure matching ASIS Rhymix 30-item navigation
// Categories: Dashboard, Site, Member, Content, Notifications, Configuration, Advanced
// SPEC: SPEC-ADMIN-MENU-001

interface NavChildItem {
  title: string
  titleKo: string
  href: string
  permission: string
}

interface NavItem {
  title: string
  titleKo: string
  href: string
  icon: LucideIcon
  permission: string
  children?: NavChildItem[]
}

// @MX:ANCHOR: Admin navigation menu definition - used across admin layout
// @MX:REASON: Central menu structure for consistent admin navigation
const adminMenuItems: NavItem[] = [
  {
    title: 'Dashboard',
    titleKo: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'admin.access',
  },
  {
    title: 'Site',
    titleKo: '사이트',
    href: '/admin/menus',
    icon: MenuIcon,
    permission: 'site.access',
    children: [
      { title: 'Menus', titleKo: '사이트 메뉴', href: '/admin/menus', permission: 'menu.admin' },
      { title: 'Widgets', titleKo: '위젯', href: '/admin/widgets', permission: 'widget.admin' },
      { title: 'Layouts', titleKo: '레이아웃', href: '/admin/layout', permission: 'layout.admin' },
      { title: 'Themes', titleKo: '테마', href: '/admin/themes', permission: 'theme.admin' },
    ],
  },
  {
    title: 'Members',
    titleKo: '회원',
    href: '/admin/members',
    icon: Users,
    permission: 'member.access',
    children: [
      { title: 'All Members', titleKo: '회원 목록', href: '/admin/members', permission: 'member.list' },
      { title: 'Groups', titleKo: '회원 그룹', href: '/admin/groups', permission: 'group.list' },
      { title: 'Permissions', titleKo: '권한 설정', href: '/admin/permissions', permission: 'permission.admin' },
      { title: 'Points', titleKo: '포인트', href: '/admin/points', permission: 'point.admin' },
    ],
  },
  {
    title: 'Content',
    titleKo: '콘텐츠',
    href: '/admin/boards',
    icon: LayoutGrid,
    permission: 'content.access',
    children: [
      { title: 'Boards', titleKo: '게시판', href: '/admin/boards', permission: 'board.admin' },
      { title: 'Pages', titleKo: '페이지', href: '/admin/pages', permission: 'page.admin' },
      { title: 'Documents', titleKo: '문서', href: '/admin/documents', permission: 'document.list' },
      { title: 'Comments', titleKo: '댓글', href: '/admin/comments', permission: 'comment.list' },
      { title: 'Media Library', titleKo: '미디어 라이브러리', href: '/admin/media', permission: 'file.list' },
      { title: 'Polls', titleKo: '설문', href: '/admin/polls', permission: 'poll.admin' },
      { title: 'Editor', titleKo: '에디터', href: '/admin/editor', permission: 'editor.admin' },
      { title: 'Spam Filter', titleKo: '스팸필터', href: '/admin/spam-filter', permission: 'spamfilter.admin' },
      { title: 'Trash', titleKo: '휴지통', href: '/admin/trash', permission: 'trash.list' },
    ],
  },
  {
    title: 'Notifications',
    titleKo: '알림',
    href: '/admin/notifications',
    icon: Bell,
    permission: 'notification.access',
    children: [
      { title: 'Mail/SMS/Push', titleKo: '메일/SMS/푸시', href: '/admin/notifications', permission: 'notification.admin' },
      { title: 'Notification Center', titleKo: '알림 센터', href: '/admin/notification-center', permission: 'ncenterlite.admin' },
    ],
  },
  {
    title: 'Configuration',
    titleKo: '설정',
    href: '/admin/settings',
    icon: Settings,
    permission: 'config.access',
    children: [
      { title: 'General', titleKo: '시스템 설정', href: '/admin/settings', permission: 'admin.config' },
      { title: 'Admin Setup', titleKo: '관리자 설정', href: '/admin/admin-setup', permission: 'admin.setup' },
      { title: 'Filebox', titleKo: '파일박스', href: '/admin/filebox', permission: 'filebox.admin' },
      { title: 'Translations', titleKo: '다국어', href: '/admin/translations', permission: 'translation.admin' },
      { title: 'Modules', titleKo: '모듈', href: '/admin/modules', permission: 'module.admin' },
      { title: 'Analytics', titleKo: '분석', href: '/admin/analytics', permission: 'analytics.view' },
    ],
  },
  {
    title: 'Advanced',
    titleKo: '고급',
    href: '/admin/easy-install',
    icon: Package,
    permission: 'advanced.access',
    children: [
      { title: 'Easy Install', titleKo: '쉬운 설치', href: '/admin/easy-install', permission: 'autoinstall.admin' },
      { title: 'Installed Layouts', titleKo: '설치된 레이아웃', href: '/admin/installed-layouts', permission: 'layout.list' },
    ],
  },
  {
    title: 'Logs',
    titleKo: '로그',
    href: '/admin/logs',
    icon: ScrollText,
    permission: 'logs.access',
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Extract locale from pathname for locale-aware navigation
  const locale = useMemo(() => {
    const parts = pathname?.split('/') || []
    // Check if the first segment is a locale (ko, en, ja, zh)
    const locales = ['ko', 'en', 'ja', 'zh']
    if (parts[1] && locales.includes(parts[1])) {
      return parts[1]
    }
    return '' // No locale prefix
  }, [pathname])

  const localePrefix = locale ? `/${locale}` : ''

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push(localePrefix ? `${localePrefix}/signin` : '/signin')
  }

  // Build nav items with locale prefix
  const navItemsWithLocale = useMemo(() => {
    return adminMenuItems.map((item) => ({
      ...item,
      href: `${localePrefix}${item.href}`,
      children: item.children?.map((child) => ({
        ...child,
        href: `${localePrefix}${child.href}`,
      })),
    }))
  }, [localePrefix])

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href={`${localePrefix}/admin`} className="flex items-center space-x-2">
              <span className="text-xl font-bold">Rhymix</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItemsWithLocale.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.title}
                  </Link>

                  {/* Child items */}
                  {item.children && isActive && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                            pathname === child.href
                              ? 'text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User actions */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
