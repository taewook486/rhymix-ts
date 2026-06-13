'use client'
/**
 * TwoFactorEnrollForm 컴포넌트 — SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * TOTP 등록 폼. 6자리 코드 입력 및 확인.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~003
 */
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function TwoFactorEnrollForm() {
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
      // await trpc.admin.twoFactor.enroll.mutate({ code })
      // toast.success('2단계 인증이 등록되었습니다')

      // 현재는 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('2단계 인증이 등록되었습니다 (개발 모드)')

      const callbackUrl = searchParams.get('callbackUrl') || '/admin'
      router.push(callbackUrl)
    } catch (error) {
      toast.error('등록 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          className="text-center text-2xl tracking-widest"
          required
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
          '등록하기'
        )}
      </Button>
    </form>
  )
}
