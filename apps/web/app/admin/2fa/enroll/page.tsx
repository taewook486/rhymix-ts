/**
 * 2FA 등록 페이지 — SPEC-ADMIN-2FA-OTP-001 M6.
 *
 * 페이지 자체는 세션 가드만 담당. QR/시크릿 발급(enrollStart)과 코드 확인
 * (enrollConfirm), 백업코드 표시는 TwoFactorEnrollForm 클라이언트 컴포넌트가
 * tRPC mutation 으로 처리한다 (REQ-2OTP-020~026).
 *
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-020, 021
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { TwoFactorEnrollForm } from './TwoFactorEnrollForm'

export const dynamic = 'force-dynamic'

export default async function TwoFactorEnrollPage() {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/admin/2fa/enroll')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">2단계 인증 설정</h1>
        <p className="text-sm text-zinc-600 mb-6">
          인증 앱을 사용하여 2단계 인증을 설정하세요.
        </p>

        <TwoFactorEnrollForm />
      </div>
    </div>
  )
}
