'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Home, FileText, LogIn, UserPlus, User as UserIcon, Settings, LogOut, Shield, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/board', label: 'Board', icon: FileText },
]

const authLinks = [
  { href: '/signin', label: 'Sign In', icon: LogIn },
  { href: '/signup', label: 'Sign Up', icon: UserPlus },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ display_name?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
    router.push('/')
    setMobileMenuOpen(false)
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Show loading state or default links
  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Rhymix</span>
          </Link>
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
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
          href="/admin"
          className={cn(
            'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
            pathname?.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
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
              href="/dashboard"
              className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/settings"
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
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Rhymix</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-6">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Desktop Auth Links / User Menu */}
        <div className="hidden md:flex md:items-center md:space-x-4">
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
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                      isActive(link.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Auth Links / User Menu for Mobile */}
            <div className="space-y-2">
              {user ? (
                <>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/settings"
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
