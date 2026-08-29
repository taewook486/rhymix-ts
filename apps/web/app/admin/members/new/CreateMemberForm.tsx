'use client';
/**
 * 회원 직접 등록 폼 (Client Component) — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-044, REQ-ADMIN2-045).
 *
 * useActionState로 createUserAction(actions.ts)을 바인딩한다.
 */
import Link from 'next/link'
import { useActionState } from 'react';
import { createUserAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function CreateMemberForm({
  groups,
}: {
  groups: Array<{ id: number; title: string; memberCount: number; isDefault: boolean }>;
}) {
  const [state, formAction, isPending] = useActionState(createUserAction, initialActionState);

  return (
    <form action={formAction} className="max-w-2xl">
      {state.error && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {state.error}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="userId">
            사용자 ID *
          </label>
          <input
            type="text"
            id="userId"
            name="userId"
            required
            maxLength={80}
            pattern="[a-z0-9][a-z0-9_-]*"
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="영문 소문자, 숫자, 언더스코어(_), 하이픈(-)만 가능"
          />
          {state.fieldErrors?.userId && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.userId.join(', ')}</p>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            영문 소문자로 시작하고 영문 소문자, 숫자, 언더스코어, 하이픈만 사용 가능
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="emailAddress">
            이메일 *
          </label>
          <input
            type="email"
            id="emailAddress"
            name="emailAddress"
            required
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="example@domain.com"
          />
          {state.fieldErrors?.emailAddress && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.emailAddress.join(', ')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            비밀번호 *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={100}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="최소 8자 이상"
          />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.password.join(', ')}</p>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            최소 8자 이상 입력하세요. 비밀번호는 안전하게 해싱되어 저장됩니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nickName">
            닉네임 *
          </label>
          <input
            type="text"
            id="nickName"
            name="nickName"
            required
            maxLength={40}
            className="w-full border border-zinc-300 rounded px-3 py-2"
            placeholder="표시될 이름"
          />
          {state.fieldErrors?.nickName && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.nickName.join(', ')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="groupId">
            그룹
          </label>
          <select id="groupId" name="groupId" className="w-full border border-zinc-300 rounded px-3 py-2">
            <option value="">기본 그룹</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title} ({group.memberCount}명)
                {group.isDefault ? ' [기본]' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-1">선택하지 않으면 기본 그룹에 자동 배정됩니다</p>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
          <Link href="/admin/members" className="px-4 py-2 text-sm bg-zinc-200 rounded hover:bg-zinc-300">
            취소
          </Link>
        </div>
      </div>
    </form>
  );
}
