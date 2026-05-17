/**
 * Admin Shell 레이아웃 — SPEC-ADMIN-001 Slice C + Slice I.
 *
 * 모든 /admin/* 라우트가 이 레이아웃을 통과한다.
 * Server Component 로 session 을 검사하고 비관리자는 redirect 한다.
 *
 * @MX:ANCHOR: [AUTO] REQ-ADMIN-020/021/023 의 UI 진입점.
 * @MX:REASON: 권한 우회 경로 차단 — layout 단계 redirect 가 없으면
 *             client navigation 으로 admin 페이지가 일시적으로 비관리자에게
 *             노출될 수 있음. tRPC protectedAdminProcedure 와 함께 이중 게이트를 형성.
 *             Slice I (REQ-ADMIN-023): 2FA 게이트 추가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020, REQ-ADMIN-021, REQ-ADMIN-023
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/admin-middleware'
import { isAdminTwoFactorRequired, isSessionTwoFactorVerified } from '@/lib/auth/two-factor'
import { prisma } from '@rhymix-ts/db'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { Toaster } from '@rhymix-ts/ui/components'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()

  if (!isAdminSession(session)) {
    redirect('/login?callbackUrl=/admin')
  }

  // 2FA 강제 게이트 (REQ-ADMIN-023)
  // NOTE: 실제 OTP 검증 UI(/login/two-factor)는 SPEC-AUTH-001 후속 슬라이스에서 구현.
  const twoFactorRequired = await isAdminTwoFactorRequired(prisma)
  if (twoFactorRequired && !isSessionTwoFactorVerified(session)) {
    redirect('/login/two-factor?callbackUrl=/admin')
  }

  const userName = session.user.id ? String(session.user.id) : '관리자'

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '220px 1fr' }}>
      <AdminSidebar />
      <div className="grid" style={{ gridTemplateRows: '56px 1fr' }}>
        <AdminTopbar userName={userName} />
        <main className="p-6 overflow-y-auto bg-zinc-50">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}
