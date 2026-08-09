'use client'
/**
 * 모듈 인스턴스 편집 폼 — SPEC-CONTENT-PARITY-001 M5 (REQ-CPAR-024).
 *
 * `/admin/modules/[id]` 상세 화면의 dead link(`/admin/modules/[id]/edit`)를 해소하는
 * 실제 편집 폼. useActionState 로 updateModuleAction Server Action 을 연결한다.
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-024
 */
import { useActionState } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
import { updateModuleAction, type ActionState } from '@/app/admin/modules/actions'

interface ModuleEditFormProps {
  instanceId: number
  initialTitle: string
  initialBrowserTitle: string
  initialDescription: string
}

const initialState: ActionState = {}

export function ModuleEditForm({
  instanceId,
  initialTitle,
  initialBrowserTitle,
  initialDescription,
}: ModuleEditFormProps) {
  const [rawState, dispatch, isPending] = useActionState<ActionState, FormData>(
    updateModuleAction.bind(null, instanceId),
    initialState,
  )
  const state: ActionState = rawState ?? {}

  return (
    <form action={dispatch} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" defaultValue={initialTitle} required minLength={1} />
        {state.fieldErrors?.title && (
          <p className="text-xs text-red-600">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="browserTitle">브라우저 제목</Label>
        <Input id="browserTitle" name="browserTitle" defaultValue={initialBrowserTitle} />
        {state.fieldErrors?.browserTitle && (
          <p className="text-xs text-red-600">{state.fieldErrors.browserTitle[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">설명</Label>
        <Input id="description" name="description" defaultValue={initialDescription} />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-600">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  )
}
