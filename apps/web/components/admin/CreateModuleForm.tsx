'use client'
/**
 * 모듈 인스턴스 생성 폼 — SPEC-ADMIN-001 Slice C.
 *
 * useActionState 로 Server Action 을 연결. progressive enhancement 지원.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020
 */
import { useActionState } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { createModuleAction, type ActionState } from '@/app/admin/modules/actions'

interface CreateModuleFormProps {
  siteId: number
}

const initialState: ActionState = {}

export function CreateModuleForm({ siteId }: CreateModuleFormProps) {
  const [rawState, dispatch, isPending] = useActionState<ActionState, FormData>(
    createModuleAction,
    initialState
  )
  const state: ActionState = rawState ?? {}

  return (
    <form action={dispatch} className="space-y-4 max-w-md">
      <input type="hidden" name="siteId" value={siteId} />

      <div className="space-y-1">
        <Label htmlFor="mid">mid</Label>
        <Input
          id="mid"
          name="mid"
          placeholder="mid (예: notice)"
          required
          minLength={1}
          maxLength={80}
        />
        {state.fieldErrors?.mid && (
          <p className="text-xs text-red-600">{state.fieldErrors.mid[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="moduleCode">모듈 코드</Label>
        <Input
          id="moduleCode"
          name="moduleCode"
          placeholder="moduleCode (예: board)"
          required
        />
        {state.fieldErrors?.moduleCode && (
          <p className="text-xs text-red-600">{state.fieldErrors.moduleCode[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          placeholder="이름 (예: 공지사항)"
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중…' : '모듈 추가'}
        </Button>
      </div>
    </form>
  )
}
