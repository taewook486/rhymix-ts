'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  FileText,
  Menu as MenuIcon,
  Package,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Members',
    href: '/admin/members',
    icon: Users,
    children: [
      { title: 'All Members', href: '/admin/members' },
      { title: 'Groups', href: '/admin/groups' },
      { title: 'Permissions', href: '/admin/permissions' },
    ],
  },
  {
    title: 'Content',
    href: '/admin/boards',
    icon: LayoutGrid,
    children: [
      { title: 'Boards', href: '/admin/boards' },
      { title: 'Pages', href: '/admin/pages' },
      { title: 'Media Library', href: '/admin/media' },
    ],
  },
  {
    title: 'Appearance',
    href: '/admin/menus',
    icon: MenuIcon,
    children: [
      { title: 'Menus', href: '/admin/menus' },
      { title: 'Widgets', href: '/admin/widgets' },
      { title: 'Themes', href: '/admin/themes' },
    ],
  },
  {
    title: 'Configuration',
    href: '/admin/settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/admin/settings' },
      { title: 'Modules', href: '/admin/modules' },
      { title: 'Analytics', href: '/admin/analytics' },
    ],
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
  const navItemsWithLocale = [
    {
      title: 'Dashboard',
      href: `${localePrefix}/admin`,
      icon: LayoutDashboard,
    },
    {
      title: 'Members',
      href: `${localePrefix}/admin/members`,
      icon: Users,
      children: [
        { title: 'All Members', href: `${localePrefix}/admin/members` },
        { title: 'Groups', href: `${localePrefix}/admin/groups` },
        { title: 'Permissions', href: `${localePrefix}/admin/permissions` },
      ],
    },
    {
      title: 'Content',
      href: `${localePrefix}/admin/boards`,
      icon: LayoutGrid,
      children: [
        { title: 'Boards', href: `${localePrefix}/admin/boards` },
        { title: 'Pages', href: `${localePrefix}/admin/pages` },
        { title: 'Media Library', href: `${localePrefix}/admin/media` },
      ],
    },
    {
      title: 'Appearance',
      href: `${localePrefix}/admin/menus`,
      icon: MenuIcon,
      children: [
        { title: 'Menus', href: `${localePrefix}/admin/menus` },
        { title: 'Widgets', href: `${localePrefix}/admin/widgets` },
        { title: 'Themes', href: `${localePrefix}/admin/themes` },
      ],
    },
    {
      title: 'Configuration',
      href: `${localePrefix}/admin/settings`,
      icon: Settings,
      children: [
        { title: 'General', href: `${localePrefix}/admin/settings` },
        { title: 'Modules', href: `${localePrefix}/admin/modules` },
        { title: 'Analytics', href: `${localePrefix}/admin/analytics` },
      ],
    },
  ]

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
