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
import { auth } from '@/lib/auth/config'
import { isAdminSession, isAdminTwoFactorRequired, isSessionTwoFactorVerified } from '@/lib/auth/admin-middleware'
import { prisma } from '@rhymix-ts/db'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
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

  // 2FA 강제 게이트 (REQ-ADMIN-023)
  // SPEC-ADMIN-EXTRAS-001 Slice B: /admin/2fa/* 경로로 이동
  // NOTE: 현재 URL 파악을 위해 middleware에서 x-pathname 헤더를 설정하거나
  //       각 페이지 컴포넌트에서 metadata를 통해 전달해야 함
  //       현재는 간단히 pathname 체크 없이 항상 2FA 게이트를 적용
  const twoFactorRequired = await isAdminTwoFactorRequired(prisma)
  if (twoFactorRequired && !isSessionTwoFactorVerified(session)) {
    // TODO: 사용자가 TOTP 등록했는지 확인하여 enroll/verify 분기
    // 현재는 enroll로 기본 이동 (등록 후 verify로 변경 필요)
    redirect('/admin/2fa/enroll?callbackUrl=/admin')
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
