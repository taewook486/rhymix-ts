'use client'
/**
 * TwoFactorEnrollForm — SPEC-ADMIN-2FA-OTP-001 M6.
 *
 * 단계별 흐름:
 *   1. 마운트 시 enrollStart 로 후보 시크릿 + QR 데이터 URL 발급 (REQ-2OTP-020).
 *   2. QR 과 base32 수동 입력 폴백 표시. 사용자가 6자리 코드 입력 후 enrollConfirm 호출 (REQ-2OTP-021).
 *   3. 검증 통과 시 백업코드 1회 표시 (REQ-2OTP-022, 025, 026). 명시적 확인 전까지
 *      navigate 하지 않는다 — 사용자가 코드를 저장하지 않은 채 이탈하면 복구 불가.
 *   4. 확인 체크 후 update() + callbackUrl 이동. REQ-2OTP-042: 서버측 one-shot
 *      marker 를 jwt callback 이 읽어 session.user.twoFactorVerified = true 로 채움.
 *      클라이언트 update() 페이로드는 신뢰하지 않으므로 빈 페이로드로 세션만 갱신.
 *
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-020, 021, 022, 025, 026, 042, 046
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trpc } from '@/providers/TRPCProvider'
import { Button, Checkbox, Input, Label } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { AlertTriangle, Copy, Loader2 } from 'lucide-react'

interface EnrollStartData {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

export function TwoFactorEnrollForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update } = useSession()

  // 단계 1 데이터 — enrollStart 결과 (QR/시크릿).
  const [enrollData, setEnrollData] = useState<EnrollStartData | null>(null)
  // 단계 2 입력값 — 6자리 TOTP 코드.
  const [code, setCode] = useState('')
  // 단계 3 데이터 — enrollConfirm 이 반환한 1회용 백업코드.
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  // 백업코드 저장 확인 — true 여야 완료 버튼 활성화 (코드 유실 방지).
  const [acknowledged, setAcknowledged] = useState(false)

  // enrollStart mutation — 페이지 진입 시 1회. 결과로 QR/시크릿 표시.
  const enrollStart = trpc.admin.twoFactor.enrollStart.useMutation({
    onSuccess: (data) => {
      setEnrollData(data)
    },
    onError: (error) => {
      toast.error('시크릿 발급 실패', { description: error.message })
    },
  })

  // enrollConfirm mutation — 코드 검증 + 암호화 저장 + 백업코드 발급.
  const enrollConfirm = trpc.admin.twoFactor.enrollConfirm.useMutation()

  // 마운트 시 enrollStart 1회 호출.
  // @MX:WARN: [AUTO] Strict Mode/dev 중복 호출 방지용 ref 가드.
  //   @MX:REASON: React dev Strict Mode 는 useEffect 를 2회 실행한다. 후보 시크릿이
  //     2회 발급되면 첫 QR 을 스캔한 사용자가 코드를 입력할 때 두 번째 시크릿으로
  //     덮어쓰여 있어 검증이 실패한다. 백엔드도 같은 userId 덮어쓰기로 1차 방어하지만
  //     클라이언트에서도 ref 로 1회 호출을 보장한다.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    enrollStart.mutate()
  }, [enrollStart])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      toast.error('6자리 코드를 입력하세요')
      return
    }
    try {
      const data = await enrollConfirm.mutateAsync({ code })
      // REQ-2OTP-022/025: 백업코드는 이 시점에 1회만 평문으로 반환됨.
      setBackupCodes(data.backupCodes)
      toast.success('2단계 인증이 활성화되었습니다.')
    } catch (error) {
      // REQ-2OTP-043/049: 서버가 동일한 일반 메시지로 응답. 클라이언트는 이유를 추가 추론하지 않는다.
      toast.error('인증 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  }

  const handleComplete = async () => {
    // REQ-2OTP-042: 성공적으로 marker 가 등록된 상태에서 update() 로 세션을 갱신하면
    //   다음 요청의 jwt callback 이 marker 를 소비하여 twoFactorVerified=true 를 채운다.
    //   클라이언트 페이로드는 jwt callback 이 무시하므로 인자 없이 호출한다.
    await update()
    const callbackUrl = searchParams.get('callbackUrl') || '/admin'
    router.push(callbackUrl)
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('복사되었습니다.')
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  // --- 단계 3: 백업코드 표시 ---
  if (backupCodes) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                백업 코드를 지금 반드시 저장하세요.
              </p>
              <p className="text-xs text-red-700 mt-1">
                이 코드는 지금 한 번만 표시됩니다. 인증 앱에 접근할 수 없을 때
                계정 복구에 사용됩니다. 안전한 곳에 보관하세요.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border rounded space-y-2">
          {backupCodes.map((c) => (
            <div key={c} className="flex items-center justify-between">
              <code className="text-sm font-mono tracking-wider">{c}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(c)}
                aria-label="백업 코드 복사"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="backup-ack"
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
          />
          <Label htmlFor="backup-ack" className="text-sm">
            백업 코드를 안전한 곳에 저장했습니다.
          </Label>
        </div>

        <Button
          type="button"
          onClick={handleComplete}
          disabled={!acknowledged}
          className="w-full"
        >
          완료
        </Button>
      </div>
    )
  }

  // --- 단계 1/2: QR + 코드 입력 ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {enrollData ? (
        <>
          {/* QR 코드 — 서버가 생성한 data:image/svg+xml;base64,... 를 직접 렌더.
              @MX:NOTE: [AUTO] 시크릿이 클라이언트 번들/네트워크에 노출되는 표면을 줄이기 위해
                         QR 생성은 서버 측에서 수행한다 (Q2 결정). */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white border rounded">
              <img
                src={enrollData.qrCodeDataUrl}
                alt="2단계 인증 QR 코드"
                width={200}
                height={200}
              />
            </div>
            <p className="text-xs text-zinc-500 text-center">
              인증 앱(Google Authenticator 등)으로 이 QR 코드를 스캔하세요.
            </p>
          </div>

          {/* 수동 입력 폴백 (REQ-2OTP-020) */}
          <div className="p-3 bg-zinc-50 border rounded">
            <p className="text-xs text-zinc-500 mb-1">
              QR 스캔이 안 되면 이 키를 수동으로 입력하세요:
            </p>
            <div className="flex items-center gap-2">
              {/* data-testid: Playwright e2e 가 base32 시크릿을 추출하여 TOTP 코드를
                  계산할 수 있도록 부여 (SPEC-ADMIN-2FA-OTP-001 M7). 다른 안정적
                  셀렉터가 없어 추가. 프로덕션 동작에는 영향 없음. */}
              <code data-testid="totp-secret" className="text-sm font-mono break-all flex-1">
                {enrollData.secret}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(enrollData.secret)}
                aria-label="시크릿 키 복사"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* 6자리 코드 입력 (REQ-2OTP-021) */}
          <div className="space-y-2">
            <Label htmlFor="code">인증 코드</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(value)
              }}
              pattern="\d{6}"
              maxLength={6}
              inputMode="numeric"
              className="text-center text-2xl tracking-widest"
              required
              autoFocus
            />
            <p className="text-xs text-zinc-500">
              인증 앱에서 표시되는 6자리 코드를 입력하세요
            </p>
          </div>

          <Button
            type="submit"
            disabled={enrollConfirm.isPending || code.length !== 6}
            className="w-full"
          >
            {enrollConfirm.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                확인 중...
              </>
            ) : (
              '등록하기'
            )}
          </Button>
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}
    </form>
  )
}
