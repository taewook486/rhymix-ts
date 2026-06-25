'use client'
/**
 * TwoFactorVerifyForm — SPEC-ADMIN-2FA-OTP-001 M6.
 *
 * 단일 입력 필드가 TOTP 모드↔백업코드 모드 토글로 전환된다 (REQ-2OTP-050).
 *   - TOTP 모드 (기본): inputMode=numeric, pattern=\d{6}, maxLength=6
 *   - 백업코드 모드: 영숫자 + 하이픈 허용, maxLength=11 (표시용 하이픈 포함),
 *     정규화된 10자 canonical 값으로 서버에 전달 (REQ-2OTP-026/051).
 * 한 번에 하나의 모드만 활성 (동시 두 필드 금지). 기존 "/admin/2fa/backup"
 * dead link 대신 토글 버튼으로 통합 (Q7/REQ-2OTP-050 결정).
 *
 * 제출 시 verify({code, mode}) 호출 — 서버가 모드 기반 경로 분기 (REQ-2OTP-051).
 * 성공 시 update() + callbackUrl 이동 (REQ-2OTP-042, 서버측 marker).
 *
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-040, 043, 050, 051, 085
 */
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trpc } from '@/providers/TRPCProvider'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

type VerifyMode = 'totp' | 'backup'

/**
 * 백업코드 입력값을 표시 형식(XXXXX-XXXXX)으로 정규화.
 * 서버는 하이픈 유무·대소문자 무관하게 canonical 10자로 정규화하여 검증 (REQ-2OTP-026).
 * 여기서는 사용자 입력 UX만 담당 — 공백/특수문자 제거 후 대문자화 + 하이픈 삽입.
 */
function formatBackupInput(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10)
  if (clean.length <= 5) return clean
  return `${clean.slice(0, 5)}-${clean.slice(5)}`
}

export function TwoFactorVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update } = useSession()

  const [mode, setMode] = useState<VerifyMode>('totp')
  const [code, setCode] = useState('')

  const verify = trpc.admin.twoFactor.verify.useMutation()

  const handleModeToggle = () => {
    setMode((prev) => (prev === 'totp' ? 'backup' : 'totp'))
    // 모드 전환 시 기존 입력값 초기화 — 형식이 서로 다르므로 혼란 방지.
    setCode('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 모드별 canonical 값과 기대 길이. 서버도 검증하지만 즉시 클라이언트 피드백.
    const canonicalCode = mode === 'backup' ? code.replace(/-/g, '') : code
    const expectedLength = mode === 'backup' ? 10 : 6
    if (canonicalCode.length !== expectedLength) {
      toast.error(
        mode === 'backup' ? '10자리 백업 코드를 입력하세요' : '6자리 코드를 입력하세요',
      )
      return
    }

    try {
      await verify.mutateAsync({ code: canonicalCode, mode })
      // REQ-2OTP-042: 서버측 marker가 등록된 상태. update()로 세션을 갱신하면
      //   다음 요청의 jwt callback이 marker를 소비하여 twoFactorVerified=true 세팅.
      //   클라이언트 페이로드는 무시되므로 인자 없이 호출.
      await update()
      toast.success('2단계 인증이 확인되었습니다.')
      const callbackUrl = searchParams.get('callbackUrl') || '/admin'
      router.push(callbackUrl)
    } catch (error) {
      // REQ-2OTP-043/049/051: 서버는 동일한 일반 메시지로 응답. 모드·이유 추가 추론 금지.
      toast.error('검증 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  }

  const isTotp = mode === 'totp'
  const canonicalLength = isTotp ? code.length : code.replace(/-/g, '').length
  const expectedLength = isTotp ? 6 : 10

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-zinc-100 rounded-full">
          <ShieldCheck className="h-12 w-12 text-zinc-600" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">{isTotp ? '인증 코드' : '백업 코드'}</Label>
        <Input
          id="code"
          type="text"
          inputMode={isTotp ? 'numeric' : 'text'}
          pattern={isTotp ? '\\d{6}' : '[A-Za-z0-9-]{6,11}'}
          placeholder={isTotp ? '000000' : 'ABCDE-FGHIJ'}
          value={code}
          onChange={(e) => {
            if (isTotp) {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            } else {
              setCode(formatBackupInput(e.target.value))
            }
          }}
          maxLength={isTotp ? 6 : 11}
          className="text-center text-2xl tracking-widest"
          required
          autoFocus
        />
        <p className="text-xs text-zinc-500">
          {isTotp
            ? '인증 앱에서 표시되는 6자리 코드를 입력하세요'
            : '등록 시 저장한 백업 코드를 입력하세요'}
        </p>
      </div>

      <Button
        type="submit"
        disabled={verify.isPending || canonicalLength !== expectedLength}
        className="w-full"
      >
        {verify.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            확인 중...
          </>
        ) : (
          '확인하기'
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-zinc-500">
          {isTotp ? '인증 앱에 접근할 수 없나요? ' : '인증 앱 코드를 사용하시겠어요? '}
          <button
            type="button"
            onClick={handleModeToggle}
            className="text-blue-600 hover:underline"
          >
            {isTotp ? '백업 코드 사용' : 'TOTP 코드 사용'}
          </button>
        </p>
      </div>
    </form>
  )
}
