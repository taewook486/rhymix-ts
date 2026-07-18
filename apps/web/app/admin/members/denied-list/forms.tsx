'use client';
/**
 * 아이디/닉네임 차단 등록 폼 (Client Component) — SPEC-MEMBER-ADMIN-001 Slice B.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-005, REQ-MADM-008
 */
import { useActionState } from 'react';
import { addDeniedAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function AddDeniedForm() {
  const [state, formAction, isPending] = useActionState(addDeniedAction, initialActionState);

  return (
    <form action={formAction} className="flex gap-2 items-start mb-6">
      <select name="type" className="border border-zinc-300 rounded px-3 py-2 text-sm" defaultValue="NICK_NAME">
        <option value="USER_ID">아이디</option>
        <option value="NICK_NAME">닉네임</option>
      </select>
      <div>
        <input
          type="text"
          name="pattern"
          required
          minLength={1}
          placeholder="차단할 패턴을 입력하세요"
          className="border border-zinc-300 rounded px-3 py-2 text-sm w-64"
        />
        {(state.error || state.fieldErrors?.pattern) && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {state.error ?? state.fieldErrors?.pattern?.[0]}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? '등록 중...' : '등록'}
      </button>
    </form>
  );
}
