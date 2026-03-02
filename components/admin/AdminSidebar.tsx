'use client'

/**
 * @MX:ANCHOR: Admin sidebar navigation component
 * @MX:REASON: Main admin navigation with permission filtering and locale support
 * SPEC: SPEC-ADMIN-MENU-001
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Menu as MenuIcon,
  LogOut,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAdminMenu } from '@/hooks/use-admin-menu'

export function AdminSidebar() {
  const {
    visibleMenuItems,
    localePrefix,
    menuGroupStates,
    toggleMenuGroup,
    isActive,
    getTitle,
    isLoadingPermissions,
  } = useAdminMenu()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push(localePrefix ? `${localePrefix}/signin` : '/signin')
  }

  // Build nav items with locale prefix
  const navItemsWithLocale = useMemo(() => {
    return visibleMenuItems.map((item) => ({
      ...item,
      href: `${localePrefix}${item.href}`,
      children: item.children?.map((child) => ({
        ...child,
        href: `${localePrefix}${child.href}`,
      })),
    }))
  }, [visibleMenuItems, localePrefix])

  // Show loading state while permissions are being fetched
  if (isLoadingPermissions) {
    return (
      <aside className="fixed lg:static inset-y-0 left-0 z-40 w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href={`${localePrefix}/admin`} className="flex items-center space-x-2">
              <span className="text-xl font-bold">Rhymix</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </nav>
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
              const itemIsActive = isActive(item.href.replace(localePrefix, ''))
              const isExpanded = menuGroupStates[item.href.replace(localePrefix, '')] || itemIsActive

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      itemIsActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => {
                      setMobileMenuOpen(false)
                      // Toggle expansion for items with children
                      if (item.children) {
                        toggleMenuGroup(item.href.replace(localePrefix, ''))
                      }
                    }}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {getTitle(item)}
                    {item.children && (
                      <span className="ml-auto">
                        {isExpanded ? '−' : '+'}
                      </span>
                    )}
                  </Link>

                  {/* Child items - show when parent is active or expanded */}
                  {item.children && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                            isActive(child.href.replace(localePrefix, ''))
                              ? 'text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {getTitle(child)}
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
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
