'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, Menu, ChevronDown } from 'lucide-react'
import { getMenus, getMenuItems } from '@/app/actions/menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  title: string
  url: string
  icon?: string
  children?: NavItem[]
}

export function MainNav() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<NavItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMenuItems = useCallback(async () => {
    try {
      // Get header menu
      const menusResult = await getMenus()
      if (!menusResult.success || !menusResult.data) {
        // Fallback to default menu items if database fetch fails
        setMenuItems([
          { id: 'board', title: '게시판', url: '/board' },
          { id: 'documents', title: '문서', url: '/documents' },
        ])
        return
      }

      const headerMenu = menusResult.data.find(m => m.location === 'header' && m.is_active)
      if (!headerMenu) {
        // Fallback to default menu items if no header menu found
        setMenuItems([
          { id: 'board', title: '게시판', url: '/board' },
          { id: 'documents', title: '문서', url: '/documents' },
        ])
        return
      }

      // Get menu items for header menu
      const itemsResult = await getMenuItems(headerMenu.id)
      if (!itemsResult.success || !itemsResult.data) {
        setMenuItems([
          { id: 'board', title: '게시판', url: '/board' },
          { id: 'documents', title: '문서', url: '/documents' },
        ])
        return
      }

      // Filter visible items and build navigation tree
      const visibleItems = itemsResult.data
        .filter(item => item.is_visible && item.is_active)
        .sort((a, b) => a.order_index - b.order_index)

      // Build tree structure for nested menus
      const buildTree = (items: typeof visibleItems, parentId: string | null = null): NavItem[] => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            id: item.id,
            title: item.title,
            url: item.url,
            icon: item.icon || undefined,
            children: buildTree(items, item.id),
          }))
      }

      const navItems = buildTree(visibleItems)

      // If no items from database, use defaults
      if (navItems.length === 0) {
        setMenuItems([
          { id: 'board', title: '게시판', url: '/board' },
          { id: 'documents', title: '문서', url: '/documents' },
        ])
      } else {
        setMenuItems(navItems)
      }
    } catch (error) {
      console.error('Failed to load menu items:', error)
      // Fallback to default menu items on error
      setMenuItems([
        { id: 'board', title: '게시판', url: '/board' },
        { id: 'documents', title: '문서', url: '/documents' },
      ])
    } finally {
      setMenuLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
    loadMenuItems()
  }, [loadUser, loadMenuItems])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Render navigation item (handles both simple links and dropdowns)
  const renderNavItem = (item: NavItem) => {
    // If item has children, render as dropdown
    if (item.children && item.children.length > 0) {
      return (
        <DropdownMenu key={item.id}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
              {item.title}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {item.children.map(child => (
              <DropdownMenuItem key={child.id} asChild>
                <Link href={child.url} className="w-full">
                  {child.title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    // Simple link
    return (
      <Link
        key={item.id}
        href={item.url}
        className="text-sm font-medium hover:text-primary transition-colors"
      >
        {item.title}
      </Link>
    )
  }

  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl">
          Rhymix TS
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          {menuLoading ? (
            // Show skeleton while loading
            <>
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </>
          ) : (
            menuItems.map(renderNavItem)
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {loading ? (
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        ) : user ? (
          <>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                관리
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <Link href="/member/signin">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                로그인
              </Button>
            </Link>
            <Link href="/member/signup">
              <Button size="sm">회원가입</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
