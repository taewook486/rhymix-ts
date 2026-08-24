'use client'
/**
 * 도메인별 인덱스(홈) 모듈 선택 폼.
 *
 * 선택한 모듈 인스턴스가 방문자 홈(`/`)에 렌더된다.
 * 미지정이면 홈은 placeholder 를 낸다 (app/page.tsx, REQ-LAYOUT-041).
 */
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  // Server Action 이 끝나도 이 클라이언트 컴포넌트는 저장 이전의 서버 prop 을
  // 그대로 들고 재렌더된다. 그러면 select 가 방금 저장한 값이 아니라 직전 값을
  // 보여줘서 "저장이 안 됐다"고 오해하게 된다. 성공 시 서버 컴포넌트를
  // 다시 가져와 prop 을 최신화한다.
  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={dispatch} className="flex items-center gap-2">
      <input type="hidden" name="domainId" value={domainId} />
      <label htmlFor={`indexModule-${domainId}`} className="sr-only">
        인덱스 모듈
      </label>
      <select
        // 서버 값이 바뀌면 remount 시켜 defaultValue 를 다시 적용한다.
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
