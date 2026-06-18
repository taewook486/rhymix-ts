'use client';
/**
 * 문서 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-074)
 *
 * useActionState로 Server Action(actions.ts)을 바인딩한다.
 * page.tsx는 Server Component로 초기 설정값만 조회해서 props로 넘긴다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-074
 */
import { useActionState } from 'react';
import { updateDocumentConfigAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function DocumentConfigForm({
  initial,
}: {
  initial: {
    sortOrder: string;
    pageSize: number;
    allowGuestWrite: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateDocumentConfigAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="sortOrder">
          정렬 기준
        </label>
        <select
          id="sortOrder"
          name="sortOrder"
          defaultValue={initial.sortOrder}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
          <option value="comment_count">댓글많은순</option>
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          문서 목록의 기본 정렬 순서를 선택합니다.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="pageSize">
          페이지당 문서 수
        </label>
        <input
          type="number"
          id="pageSize"
          name="pageSize"
          defaultValue={initial.pageSize}
          min={1}
          max={100}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        />
        <p className="text-xs text-zinc-500 mt-1">
          한 페이지에 표시할 문서 수를 설정합니다 (1-100).
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowGuestWrite"
            defaultChecked={initial.allowGuestWrite}
            className="rounded"
          />
          <span className="text-sm font-medium">비회원 작성 허용</span>
        </label>
        <p className="text-xs text-zinc-500">
          비회원 사용자의 문서 작성을 허용합니다.
        </p>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
