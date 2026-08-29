/**
 * Admin Shell 레이아웃 — SPEC-ADMIN-001 Slice C + Slice I + SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * 모든 /admin/* 라우트가 이 레이아웃을 통과한다.
 * Server Component 로 session 을 검사하고 비관리자는 redirect 한다.
 *
 * @MX:ANCHOR: [AUTO] REQ-ADMIN-020/021/023 의 UI 진입점.
 * @MX:REASON: 권한 우회 경로 차단 — layout 단계 redirect 가 없으면
 *             client navigation 으로 admin 페이지가 일반적으로 비관리자에게
 *             노출될 수 있음. tRPC protectedAdminProcedure 와 함께 이중 게이트를 형성.
 *             Slice I (REQ-ADMIN-023): 2FA 게이트 추가.
 *             SPEC-ADMIN-EXTRAS-001 Slice B: 2FA enroll/verify 경로 추가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020, REQ-ADMIN-021, REQ-ADMIN-023
 */
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/admin-middleware'
import { checkAdmin2FA } from '@rhymix-ts/admin/security'
import { prisma } from '@rhymix-ts/db'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AdminFooter } from '@/components/admin/AdminFooter'
import { Toaster } from '@rhymix-ts/ui/components'

export const dynamic = 'force-dynamic'

// 2FA 게이트 예외 경로
const TWO_FACTOR_EXCEPT_PATHS = new Set([
  '/admin/2fa/enroll',
  '/admin/2fa/verify',
  '/admin/logout',
])

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()

  if (!isAdminSession(session)) {
    redirect('/login?callbackUrl=/admin')
  }

  // 2FA 강제 게이트 (REQ-ADMIN-023, REQ-2OTP-060~062)
  // proxy.ts가 x-pathname 요청 헤더를 주입하므로 여기서 현재 경로를 읽을 수 있다.
  const headersList = await headers()
  const currentPathname = headersList.get('x-pathname') ?? ''
  if (!TWO_FACTOR_EXCEPT_PATHS.has(currentPathname)) {
    // @MX:ANCHOR: [AUTO] checkAdmin2FA 가 need-enroll/need-verify 를 구분하는
    //   canonical 게이트 — 등록 여부와 무관하게 enroll로만 보내던 이전 동작(TODO)을
    //   대체한다.
    // @MX:REASON: 이미 등록된 관리자를 다시 enroll로 보내면 새 시크릿이 발급되어
    //   기존 등록(및 백업코드)을 덮어쓰는 사고로 이어질 수 있다 (REQ-2OTP-061/062).
    const result = await checkAdmin2FA(session, prisma, 1)
    if (result === 'need-enroll') {
      redirect('/admin/2fa/enroll?callbackUrl=/admin')
    } else if (result === 'need-verify') {
      redirect('/admin/2fa/verify?callbackUrl=/admin')
    }
  }

  const userName = session.user.id ? String(session.user.id) : '관리자'

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '220px 1fr' }}>
      <AdminSidebar />
      <div className="grid" style={{ gridTemplateRows: '56px 1fr auto' }}>
        <AdminTopbar userName={userName} />
        <div className="p-6 overflow-y-auto bg-zinc-50">{children}</div>
        <AdminFooter />
      </div>
      <Toaster position="top-right" />
    </div>
  )
}
