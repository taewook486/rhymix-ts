'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'

export function MainNav() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl">
          Rhymix TS
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/board" className="text-sm font-medium hover:text-primary transition-colors">
            게시판
          </Link>
          <Link href="/documents" className="text-sm font-medium hover:text-primary transition-colors">
            문서
          </Link>
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
