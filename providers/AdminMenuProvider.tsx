'use client'

/**
 * @MX:ANCHOR: Admin menu context provider
 * @MX:REASON: Provides menu state management and permission filtering across admin components
 * SPEC: SPEC-ADMIN-MENU-001
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  Menu as MenuIcon,
  Package,
  Settings,
  Bell,
  ScrollText,
} from 'lucide-react'
import type {
  NavItem,
  NavChildItem,
  AdminMenuItems,
  AdminLocale,
  MenuGroupStates,
  AdminUserPermissions,
} from '@/types/admin-menu'
import { createClient } from '@/lib/supabase/client'

/**
 * @MX:NOTE: Complete admin menu structure matching ASIS Rhymix 30-item navigation
 * Categories: Dashboard, Site, Members, Content, Notifications, Configuration, Advanced, Logs
 */
const adminMenuItems: AdminMenuItems = [
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

/**
 * Admin menu context type definition
 * Exported for use in useAdminMenu hook
 */
export interface AdminMenuContextType {
  /** All menu items (unfiltered) */
  menuItems: AdminMenuItems
  /** Menu items filtered by user permissions */
  visibleMenuItems: AdminMenuItems
  /** Current active pathname */
  activePath: string
  /** Current locale from URL */
  locale: AdminLocale
  /** Locale prefix for navigation (e.g., '/ko' or '') */
  localePrefix: string
  /** Menu group expansion states */
  menuGroupStates: MenuGroupStates
  /** Toggle a menu group's expansion state */
  toggleMenuGroup: (href: string) => void
  /** Check if a path is currently active */
  isActive: (href: string) => boolean
  /** Get title based on current locale */
  getTitle: (item: { title: string; titleKo: string }) => string
  /** User permissions for menu filtering */
  userPermissions: AdminUserPermissions | null
  /** Loading state for permissions */
  isLoadingPermissions: boolean
}

const AdminMenuContext = createContext<AdminMenuContextType | undefined>(undefined)

interface AdminMenuProviderProps {
  children: ReactNode
}

/**
 * Admin menu context provider component
 * Handles menu state, permission filtering, and locale management
 */
export function AdminMenuProvider({ children }: AdminMenuProviderProps) {
  const pathname = usePathname()
  const [menuGroupStates, setMenuGroupStates] = useState<MenuGroupStates>({})
  const [userPermissions, setUserPermissions] = useState<AdminUserPermissions | null>(null)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)

  // Extract locale from pathname
  const { locale, localePrefix } = useMemo(() => {
    const parts = pathname?.split('/') || []
    const locales: AdminLocale[] = ['ko', 'en', 'ja', 'zh']
    const detectedLocale = parts[1] && locales.includes(parts[1] as AdminLocale)
      ? (parts[1] as AdminLocale)
      : 'ko'
    return {
      locale: detectedLocale,
      localePrefix: detectedLocale !== 'ko' ? `/${detectedLocale}` : '',
    }
  }, [pathname])

  // Fetch user permissions from Supabase
  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient()

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setUserPermissions(null)
          setIsLoadingPermissions(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // For admin users, grant all permissions
        // In a real implementation, you would fetch actual permissions from the database
        if (profile?.role === 'admin') {
          setUserPermissions({
            role: 'admin',
            permissions: [
              'admin.access',
              'member.access', 'member.list', 'group.list', 'permission.admin', 'point.admin',
              'content.access', 'board.admin', 'page.admin', 'document.list', 'comment.list', 'file.list', 'poll.admin', 'editor.admin', 'spamfilter.admin', 'trash.list',
              'site.access', 'menu.admin', 'widget.admin', 'layout.admin', 'theme.admin',
              'notification.access', 'notification.admin', 'ncenterlite.admin',
              'config.access', 'admin.config', 'admin.setup', 'filebox.admin', 'translation.admin', 'module.admin', 'analytics.view',
              'advanced.access', 'autoinstall.admin', 'layout.list',
              'logs.access',
            ],
          })
        } else {
          setUserPermissions(null)
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
        setUserPermissions(null)
      } finally {
        setIsLoadingPermissions(false)
      }
    }

    fetchPermissions()
  }, [])

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!userPermissions) return false
    return userPermissions.permissions.includes(permission)
  }, [userPermissions])

  // Filter menu items based on permissions
  const visibleMenuItems = useMemo(() => {
    if (isLoadingPermissions) return []

    return adminMenuItems
      .filter((item) => hasPermission(item.permission))
      .map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter((child) =>
            hasPermission(child.permission)
          )
          // Hide parent if no children are visible
          if (visibleChildren.length === 0) {
            return null
          }
          return { ...item, children: visibleChildren }
        }
        return item
      })
      .filter((item): item is NavItem => item !== null)
  }, [hasPermission, isLoadingPermissions])

  // Toggle menu group expansion
  const toggleMenuGroup = useCallback((href: string) => {
    setMenuGroupStates((prev) => ({
      ...prev,
      [href]: !prev[href],
    }))
  }, [])

  // Check if a path is active
  const isActive = useCallback(
    (href: string): boolean => {
      const fullPath = `${localePrefix}${href}`
      return pathname === fullPath || pathname?.startsWith(`${fullPath}/`)
    },
    [pathname, localePrefix]
  )

  // Get title based on locale
  const getTitle = useCallback(
    (item: { title: string; titleKo: string }): string => {
      return locale === 'ko' ? item.titleKo : item.title
    },
    [locale]
  )

  // Auto-expand active menu group on initial load
  useEffect(() => {
    if (pathname) {
      const activeItem = adminMenuItems.find(
        (item) => pathname.startsWith(`${localePrefix}${item.href}`)
      )
      if (activeItem && activeItem.children) {
        setMenuGroupStates((prev) => ({
          ...prev,
          [activeItem.href]: true,
        }))
      }
    }
  }, [pathname, localePrefix])

  const value: AdminMenuContextType = {
    menuItems: adminMenuItems,
    visibleMenuItems,
    activePath: pathname || '',
    locale,
    localePrefix,
    menuGroupStates,
    toggleMenuGroup,
    isActive,
    getTitle,
    userPermissions,
    isLoadingPermissions,
  }

  return (
    <AdminMenuContext.Provider value={value}>
      {children}
    </AdminMenuContext.Provider>
  )
}

/**
 * Hook to access admin menu context
 * @throws Error if used outside of AdminMenuProvider
 */
export function useAdminMenu(): AdminMenuContextType {
  const context = useContext(AdminMenuContext)
  if (!context) {
    throw new Error('useAdminMenu must be used within an AdminMenuProvider')
  }
  return context
}

// Export menu items for direct access if needed
export { adminMenuItems }
