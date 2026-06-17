'use client';
/**
 * 회원 그룹 생성/수정 폼 (Client Components) — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-041).
 */
import { useActionState } from 'react';
import { createGroupAction, updateGroupAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(createGroupAction, initialActionState);

  return (
    <form action={formAction} className="max-w-2xl">
      {state.error && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {state.error}
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">
            그룹명 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={80}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="그룹명을 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">
            설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="그룹에 대한 설명을 입력하세요 (선택)"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isDefault" value="on" className="rounded" />
            <span className="text-sm">기본 그룹 (신규 가입자 자동 배정)</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isAdmin" value="on" className="rounded" />
            <span className="text-sm">관리자 그룹</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="listOrder">
            표시 순서
          </label>
          <input
            type="number"
            id="listOrder"
            name="listOrder"
            defaultValue={0}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            min={0}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          <a href="/admin/members/groups" className="px-4 py-2 text-sm bg-zinc-200 rounded hover:bg-zinc-300">
            취소
          </a>
        </div>
      </div>
    </form>
  );
}

export function EditGroupForm({
  group,
}: {
  group: {
    id: number;
    title: string;
    description: string | null;
    isDefault: boolean;
    isAdmin: boolean;
    listOrder: number;
  };
}) {
  const [state, formAction, isPending] = useActionState(updateGroupAction, initialActionState);

  return (
    <form action={formAction} className="max-w-2xl">
      {state.error && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {state.error}
        </p>
      )}
      <input type="hidden" name="id" value={group.id} />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">
            그룹명 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={80}
            defaultValue={group.title}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="그룹명을 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">
            설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={group.description || ''}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="그룹에 대한 설명을 입력하세요 (선택)"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isDefault"
              value="on"
              defaultChecked={group.isDefault}
              className="rounded"
            />
            <span className="text-sm">기본 그룹 (신규 가입자 자동 배정)</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isAdmin"
              value="on"
              defaultChecked={group.isAdmin}
              className="rounded"
            />
            <span className="text-sm">관리자 그룹</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="listOrder">
            표시 순서
          </label>
          <input
            type="number"
            id="listOrder"
            name="listOrder"
            defaultValue={group.listOrder}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            min={0}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          <a href="/admin/members/groups" className="px-4 py-2 text-sm bg-zinc-200 rounded hover:bg-zinc-300">
            취소
          </a>
        </div>
      </div>
    </form>
  );
}
