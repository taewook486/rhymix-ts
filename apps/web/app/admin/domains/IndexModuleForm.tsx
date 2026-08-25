'use client'
/**
 * 도메인별 인덱스(홈) 모듈 선택 폼.
 *
 * 선택한 모듈 인스턴스가 방문자 홈(`/`)에 렌더된다.
 * 미지정이면 홈은 placeholder 를 낸다 (app/page.tsx, REQ-LAYOUT-041).
 */
import { useActionState } from 'react'
import { Button } from '@rhymix-ts/ui/components'
import { setIndexModuleAction, type DomainActionState } from './actions'

export interface ModuleOption {
  id: number
  mid: string
  name: string
  moduleCode: string
}

interface IndexModuleFormProps {
  domainId: number
  currentModuleInstanceId: number | null
  options: ModuleOption[]
}

const initialState: DomainActionState = {}

export function IndexModuleForm({
  domainId,
  currentModuleInstanceId,
  options,
}: IndexModuleFormProps) {
  const [rawState, dispatch, isPending] = useActionState<DomainActionState, FormData>(
    setIndexModuleAction,
    initialState,
  )
  const state: DomainActionState = rawState ?? {}

  return (
    <form action={dispatch} className="flex items-center gap-2">
      <input type="hidden" name="domainId" value={domainId} />
      <label htmlFor={`indexModule-${domainId}`} className="sr-only">
        인덱스 모듈
      </label>
      <select
        // 저장이 끝나면 Server Action 의 revalidatePath 로 서버 컴포넌트가 다시
        // 렌더되지만, select 는 uncontrolled 라 defaultValue 만 바뀌어서는 화면이
        // 갱신되지 않는다. 현재값을 key 에 넣어 remount 시켜야 방금 저장한 값이
        // 보인다. (없으면 새로고침 전까지 직전 값을 보여줘 저장 실패로 오해한다.)
        key={`indexModule-${domainId}-${currentModuleInstanceId ?? 'none'}`}
        id={`indexModule-${domainId}`}
        name="moduleInstanceId"
        defaultValue={currentModuleInstanceId != null ? String(currentModuleInstanceId) : ''}
        className="text-sm border border-zinc-300 rounded px-2 py-1 bg-white min-w-44"
      >
        <option value="">미설정</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name} ({opt.mid})
          </option>
        ))}
      </select>
      <Button type="submit" disabled={isPending} className="text-sm">
        {isPending ? '저장 중…' : '지정'}
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.success && <span className="text-xs text-green-600">저장됨</span>}
    </form>
  )
}
