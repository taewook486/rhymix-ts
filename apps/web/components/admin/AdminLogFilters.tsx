'use client'
/**
 * AdminLog 필터 UI — SPEC-ADMIN-001 Slice D + SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * URL 쿼리 파라미터 동기화 (router.push).
 * SPEC-ADMIN-EXTRAS-001 Slice B: IP 필터 추가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072, SPEC-ADMIN-EXTRAS-001 REQ-LOG-IP-001~002
 */
import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'

interface AdminLogFiltersProps {
  initial: {
    actor?: string
    action?: string
    target?: string
    from?: string
    to?: string
    page?: string
    ip?: string
  }
}

export function AdminLogFilters({ initial }: AdminLogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [ipError, setIpError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()

    // IP 필터 유효성 검사
    const ipValue = fd.get('ip') as string | null
    if (ipValue && ipValue.trim()) {
      // 간단한 IP 형식 검사 (CIDR 허용)
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[\d:]+(\/\d{1,2})?$/
      if (!ipPattern.test(ipValue.trim())) {
        setIpError('올바른 IP 주소 또는 CIDR 표기를 입력하세요 (예: 192.168.1.1 또는 10.0.0.0/24)')
        toast.error('IP 주소 형식이 올바르지 않습니다')
        return
      }
      setIpError(null)
    }

    for (const [key, value] of fd.entries()) {
      if (value && typeof value === 'string' && value.trim()) {
        params.set(key, value.trim())
      }
    }
    // 필터 변경 시 page 를 1 로 리셋
    params.set('page', '1')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function handleReset() {
    setIpError(null)
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <Label htmlFor="filter-actor">actorId</Label>
        <Input
          id="filter-actor"
          name="actor"
          type="number"
          defaultValue={initial.actor}
          placeholder="사용자 ID"
          className="w-28 h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-action">action</Label>
        <Input
          id="filter-action"
          name="action"
          defaultValue={initial.action}
          placeholder="admin.menu.create"
          className="w-48 h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-target">target</Label>
        <Input
          id="filter-target"
          name="target"
          defaultValue={initial.target}
          placeholder="menu:1"
          className="w-32 h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-ip">IP</Label>
        <Input
          id="filter-ip"
          name="ip"
          type="text"
          defaultValue={initial.ip}
          placeholder="192.168.1.1 또는 10.0.0.0/24"
          className="w-48 h-8 text-sm"
          onChange={() => setIpError(null)}
        />
        {ipError && (
          <p className="text-xs text-red-600 mt-1">{ipError}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-from">시작일</Label>
        <Input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={initial.from}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-to">종료일</Label>
        <Input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={initial.to}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          검색
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleReset}>
          초기화
        </Button>
      </div>
    </form>
  )
}
