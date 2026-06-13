/**
 * 2FA 등록 페이지 — SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * TOTP 등록을 위한 QR 코드 표시 및 검증.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~003
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

  // TODO: TOTP 시크릿 발급 (backend 팀에서 구현 필요)
  const secret = 'JBSWY3DPEHPK3PXP' // 예시용 (실제로는 백엔드에서 발급)

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">2단계 인증 설정</h1>
        <p className="text-sm text-zinc-600 mb-6">
          인증 앱을 사용하여 2단계 인증을 설정하세요.
        </p>

        <div className="space-y-6">
          {/* QR 코드 영역 (백엔드 구현 후 주석 해제) */}
          {/* <div className="flex justify-center p-4 bg-zinc-100 rounded">
            <QRCodeCanvas value={otpauthUrl} size={200} />
          </div> */}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              <strong>개발 중:</strong> QR 코드 생성은 백엔드 구현이 필요합니다.
              현재는 UI 템플릿만 제공됩니다.
            </p>
          </div>

          {/* 시크릿 키 표시 */}
          <div className="p-4 bg-zinc-100 rounded">
            <p className="text-xs text-zinc-500 mb-2">시크릿 키 (백엔드 구현 시 실제 값 적용)</p>
            <code className="text-sm font-mono">{secret}</code>
          </div>

          {/* 백업 코드 표시 (등록 후) */}
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-800">
              <strong>중요:</strong> 백업 코드는 등록 완료 후 한 번만 표시됩니다.
              안전한 곳에 보관하세요.
            </p>
          </div>

          <TwoFactorEnrollForm />
        </div>
      </div>
    </div>
  )
}
