'use client'
/**
 * TwoFactorVerifyForm 컴포넌트 — SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * TOTP 검증 폼. 6자리 코드 입력 및 확인.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-004~005
 */
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

export function TwoFactorVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      toast.error('6자리 코드를 입력하세요')
      return
    }

    setIsPending(true)

    try {
      // TODO: tRPC mutation 호출 (백엔드 구현 필요)
      // await trpc.admin.twoFactor.verify.mutate({ code })
      // toast.success('2단계 인증이 확인되었습니다')

      // 현재는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('2단계 인증이 확인되었습니다 (개발 모드)')

      const callbackUrl = searchParams.get('callbackUrl') || '/admin'
      router.push(callbackUrl)
    } catch (error) {
      toast.error('검증 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-zinc-100 rounded-full">
          <ShieldCheck className="h-12 w-12 text-zinc-600" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">인증 코드</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6)
            setCode(value)
          }}
          className="text-center text-2xl tracking-widest"
          required
          autoFocus
        />
        <p className="text-xs text-zinc-500">인증 앱에서 표시되는 6자리 코드를 입력하세요</p>
      </div>

      <Button type="submit" disabled={isPending || code.length !== 6} className="w-full">
        {isPending ? (
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
          인증 앱에 접근할 수 없나요?{' '}
          <a href="/admin/2fa/backup" className="text-blue-600 hover:underline">
            백업 코드 사용
          </a>
        </p>
      </div>
    </form>
  )
}
