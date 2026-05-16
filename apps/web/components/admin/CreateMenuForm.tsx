'use client'
/**
 * 메뉴 생성 폼 — SPEC-ADMIN-001 Slice D.
 *
 * useActionState + createMenuAction.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
 */
import { useActionState } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { createMenuAction, type ActionState } from '@/app/admin/menu/actions'

interface CreateMenuFormProps {
  siteId: number
}

export function CreateMenuForm({ siteId }: CreateMenuFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    createMenuAction,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <input type="hidden" name="siteId" value={siteId} />

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="space-y-1">
        <Label htmlFor="title">메뉴 이름</Label>
        <Input
          id="title"
          name="title"
          placeholder="메뉴 이름을 입력하세요"
          required
          maxLength={80}
        />
        {state?.fieldErrors?.title && (
          <p className="text-xs text-red-500">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isAdminMenu" name="isAdminMenu" className="h-4 w-4" />
        <Label htmlFor="isAdminMenu">관리자 전용 메뉴</Label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? '생성 중…' : '메뉴 생성'}
      </Button>
    </form>
  )
}
