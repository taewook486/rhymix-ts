'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
  Home,
  FileText,
  LogIn,
  UserPlus,
  User as UserIcon,
  Settings,
  LogOut,
  Shield,
  LayoutDashboard,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { locales } from '@/lib/i18n/config'
import type { User } from '@supabase/supabase-js'
import type { Menu as MenuType, MenuItem } from '@/lib/supabase/database.types'

// Icon mapping for dynamic icon names
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  'file-text': FileText,
  user: UserIcon,
  settings: Settings,
  login: LogIn,
  'log-in': LogIn,
  logout: LogOut,
  'log-out': LogOut,
}

interface MenuItemWithChildren extends MenuItem {
  children: MenuItemWithChildren[]
}

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{
    display_name?: string
    role?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItemWithChildren[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Extract locale from pathname (e.g., '/ko/home' -> 'ko')
  // Only set localePrefix if pathname starts with a valid locale
  const firstSegment = pathname.split('/')[1]
  const isValidLocale = locales.includes(firstSegment as any)
  const locale = isValidLocale ? firstSegment : 'ko'
  const localePrefix = isValidLocale ? `/${locale}` : ''

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    // Load header menu from database
    loadHeaderMenu()
  }, [])

  const loadHeaderMenu = async () => {
    try {
      const supabase = createClient()

      // Get active header menu
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('location', 'header')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()

      if (menuError || !menu) {
        // Use default menu items if no database menu
        setMenuItems(getDefaultMenuItems())
        return
      }

      // Get menu items
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', menu.id)
        .eq('is_active', true)
        .eq('is_visible', true)
        .order('order_index', { ascending: true })

      if (itemsError || !items || items.length === 0) {
        setMenuItems(getDefaultMenuItems())
        return
      }

      // Build hierarchical structure
      const hierarchicalItems = buildMenuTree(items as MenuItem[])
      setMenuItems(hierarchicalItems)
    } catch (error) {
      console.error('Failed to load menu:', error)
      setMenuItems(getDefaultMenuItems())
    }
  }

  const getDefaultMenuItems = (): MenuItemWithChildren[] => [
    {
      id: '1',
      menu_id: 'default',
      parent_id: null,
      title: 'Home',
      url: localePrefix,
      type: 'link',
      icon: 'home',
      badge: null,
      target: '_self',
      rel: null,
      css_class: null,
      style: null,
      depth: 0,
      path: '',
      order_index: 0,
      is_active: true,
      is_visible: true,
      is_new_window: false,
      is_nofollow: false,
      required_role: 'all',
      config: {},
      created_at: '',
      updated_at: '',
      children: [],
    },
    {
      id: '2',
      menu_id: 'default',
      parent_id: null,
      title: 'Board',
      url: `${localePrefix}/board`,
      type: 'link',
      icon: 'file-text',
      badge: null,
      target: '_self',
      rel: null,
      css_class: null,
      style: null,
      depth: 0,
      path: '',
      order_index: 1,
      is_active: true,
      is_visible: true,
      is_new_window: false,
      is_nofollow: false,
      required_role: 'all',
      config: {},
      created_at: '',
      updated_at: '',
      children: [],
    },
  ]

  const buildMenuTree = (items: MenuItem[]): MenuItemWithChildren[] => {
    const itemMap = new Map<string, MenuItemWithChildren>()
    const rootItems: MenuItemWithChildren[] = []

    // First pass: create map with empty children arrays
    items.forEach((item) => {
      // Filter by required_role
      if (item.required_role === 'member' && !user) return
      if (item.required_role === 'admin' && profile?.role !== 'admin')
        return

      itemMap.set(item.id, { ...item, children: [] })
    })

    // Second pass: build tree structure
    items.forEach((item) => {
      const node = itemMap.get(item.id)
      if (!node) return

      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          parent.children.push(node)
        } else {
          rootItems.push(node)
        }
      } else {
        rootItems.push(node)
      }
    })

    return rootItems
  }

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, role')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push(localePrefix)
    setMobileMenuOpen(false)
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: MenuItemWithChildren, isMobile = false) => {
    const hasChildren = item.children && item.children.length > 0
    const Icon = item.icon ? iconMap[item.icon] : null

    // Handle external links
    const isExternal =
      item.url?.startsWith('http') || item.is_new_window

    const linkContent = (
      <>
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.title}</span>
        {hasChildren && !isMobile && (
          <ChevronDown className="h-3 w-3 ml-1" />
        )}
        {isExternal && <ExternalLink className="h-3 w-3 ml-1" />}
      </>
    )

    if (isMobile) {
      return (
        <div key={item.id} className="space-y-1">
          {isExternal ? (
            <a
              href={item.url || '#'}
              target={item.is_new_window ? '_blank' : undefined}
              rel={item.is_nofollow ? 'nofollow' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive(item.url || '')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {linkContent}
            </a>
          ) : (
            <Link
              href={item.url || '#'}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive(item.url || '')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {linkContent}
            </Link>
          )}
          {hasChildren && (
            <div className="ml-4 space-y-1">
              {item.children.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    // Desktop with dropdown for children
    if (hasChildren) {
      return (
        <div key={item.id} className="relative group">
          <button
            className={cn(
              'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
              isActive(item.url || '') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {linkContent}
          </button>
          <div className="absolute left-0 mt-2 w-48 rounded-md border bg-popover shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="p-2 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.id}
                  href={child.url || '#'}
                  className={cn(
                    'flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                    isActive(child.url || '') && 'bg-accent'
                  )}
                >
                  {child.icon && iconMap[child.icon] && (
                    <span className="text-muted-foreground">
                      {(() => {
                        const ChildIcon = iconMap[child.icon!]
                        return <ChildIcon className="h-4 w-4" />
                      })()}
                    </span>
                  )}
                  <span>{child.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Simple link
    return isExternal ? (
      <a
        key={item.id}
        href={item.url || '#'}
        target={item.is_new_window ? '_blank' : undefined}
        rel={item.is_nofollow ? 'nofollow' : undefined}
        className={cn(
          'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
          isActive(item.url || '') ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {linkContent}
      </a>
    ) : (
      <Link
        key={item.id}
        href={item.url || '#'}
        className={cn(
          'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
          isActive(item.url || '') ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {linkContent}
      </Link>
    )
  }

  // Get locale prefix for all links
  const authLinks = [
    { href: `${localePrefix}/signin`, label: 'Sign In', icon: LogIn },
    { href: `${localePrefix}/signup`, label: 'Sign Up', icon: UserPlus },
  ]

  // Show loading state
  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Rhymix</span>
          </Link>
          <div className="hidden md:flex md:items-center md:space-x-6">
            {menuItems.map((item) => renderNavItem(item))}
          </div>
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        </nav>
      </header>
    )
  }

  // User menu for authenticated users
  const userMenu = user ? (
    <>
      {/* Admin Link */}
      {profile?.role === 'admin' && (
        <Link
          href={`${localePrefix}/admin`}
          className={cn(
            'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
            pathname?.startsWith(`${localePrefix}/admin`) ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}

      {/* User Dropdown Trigger */}
      <div className="relative group">
        <Button variant="ghost" size="sm" className="flex items-center space-x-2">
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {profile?.display_name || user.email?.split('@')[0]}
          </span>
        </Button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <div className="p-2 space-y-1">
            <Link
              href={`${localePrefix}/member/profile`}
              className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Profile</span>
            </Link>
            <Link
              href={`${localePrefix}/member/settings`}
              className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <div className="border-t my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  ) : (
    authLinks.map((link) => {
      const Icon = link.icon
      return (
        <Button
          key={link.href}
          asChild
          variant={link.href === '/signup' ? 'default' : 'ghost'}
          size="sm"
        >
          <Link href={link.href} className="flex items-center space-x-1">
            <Icon className="h-4 w-4" />
            <span>{link.label}</span>
          </Link>
        </Button>
      )
    })
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href={localePrefix} className="flex items-center space-x-2">
          <span className="text-xl font-bold">Rhymix</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-6">
          {menuItems.map((item) => renderNavItem(item))}
        </div>

        {/* Desktop Auth Links / User Menu */}
        <div className="hidden md:flex md:items-center md:space-x-4">
          <ThemeSwitcher />
          {userMenu}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Navigation Links */}
            <div className="space-y-2">
              {menuItems.map((item) => renderNavItem(item, true))}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Auth Links / User Menu for Mobile */}
            <div className="space-y-2">
              {user ? (
                <>
                  {profile?.role === 'admin' && (
                    <Link
                      href={`${localePrefix}/admin`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link
                    href={`${localePrefix}/member/profile`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href={`${localePrefix}/member/settings`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                authLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
