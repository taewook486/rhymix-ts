'use client'
/**
 * 회원 그룹 삭제 버튼.
 *
 * 삭제 거부(마지막 그룹, 소속 회원 존재 등)는 Server Action 이 { error } 로
 * 돌려준다. 이 값을 화면에 띄우지 않으면 관리자에게는 "눌러도 아무 일이 없는
 * 버튼" 으로 보인다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-042
 */
import { useActionState } from 'react'
import { deleteGroupFormAction, type ActionState } from './actions'

const initialState: ActionState = {}

interface DeleteGroupButtonProps {
  groupId: number
  groupTitle: string
}

export function DeleteGroupButton({ groupId, groupTitle }: DeleteGroupButtonProps) {
  const [rawState, dispatch, isPending] = useActionState<ActionState, FormData>(
    deleteGroupFormAction,
    initialState,
  )
  const state: ActionState = rawState ?? {}

  return (
    <form action={dispatch}>
      <input type="hidden" name="id" value={groupId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-red-600 hover:text-red-900 disabled:text-zinc-400"
      >
        {isPending ? '삭제 중…' : '삭제'}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {groupTitle}: {state.error}
        </p>
      )}
    </form>
  )
}
