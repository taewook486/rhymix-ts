'use client'
/**
 * AdminLog 필터 UI — SPEC-ADMIN-001 Slice D.
 *
 * URL 쿼리 파라미터 동기화 (router.push).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 */
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'

interface AdminLogFiltersProps {
  initial: {
    actor?: string
    action?: string
    target?: string
    from?: string
    to?: string
    page?: string
  }
}

export function AdminLogFilters({ initial }: AdminLogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
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
