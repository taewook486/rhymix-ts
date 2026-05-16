'use client'
/**
 * Admin 상단 바 컴포넌트 — SPEC-ADMIN-001 Slice C.
 */
import Link from 'next/link'

interface AdminTopbarProps {
  userName: string
}

export function AdminTopbar({ userName }: AdminTopbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">관리자</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{userName}</span>
        <Link
          href="/api/auth/signout"
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          로그아웃
        </Link>
      </div>
    </header>
  )
}
