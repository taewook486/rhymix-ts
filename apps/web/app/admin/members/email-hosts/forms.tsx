'use client';
/**
 * 이메일 호스트 등록 폼 (Client Component) — SPEC-MEMBER-ADMIN-001 Slice E.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-030
 */
import { useActionState } from 'react';
import { addEmailHostAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function AddEmailHostForm() {
  const [state, formAction, isPending] = useActionState(addEmailHostAction, initialActionState);

  return (
    <form action={formAction} className="flex gap-2 items-start mb-6">
      <select name="policy" className="border border-zinc-300 rounded px-3 py-2 text-sm" defaultValue="ALLOW">
        <option value="ALLOW">허용</option>
        <option value="DENY">차단</option>
      </select>
      <div>
        <input
          type="text"
          name="host"
          required
          minLength={1}
          placeholder="호스트를 입력하세요 (예: gmail.com)"
          className="border border-zinc-300 rounded px-3 py-2 text-sm w-64"
        />
        {(state.error || state.fieldErrors?.host) && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {state.error ?? state.fieldErrors?.host?.[0]}
          </p>
        )}
      </div>
      <div>
        <input
          type="text"
          name="reason"
          placeholder="사유 (선택 사항)"
          className="border border-zinc-300 rounded px-3 py-2 text-sm w-48"
        />
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
