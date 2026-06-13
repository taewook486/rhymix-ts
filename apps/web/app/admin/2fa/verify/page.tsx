/**
 * 2FA 검증 페이지 — SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * TOTP 코드 검증을 위한 페이지.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-004~005
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { TwoFactorVerifyForm } from './TwoFactorVerifyForm'

export const dynamic = 'force-dynamic'

export default async function TwoFactorVerifyPage() {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/admin/2fa/verify')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">2단계 인증 확인</h1>
        <p className="text-sm text-zinc-600 mb-6">
          인증 앱에서 생성된 코드를 입력하세요.
        </p>

        <TwoFactorVerifyForm />
      </div>
    </div>
  )
}
