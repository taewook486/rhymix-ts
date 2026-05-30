'use client';

/**
 * 로그인 페이지 — SPEC-AUTH-001 Slice F (updated in Slice G).
 *
 * useActionState 를 사용하여 loginAction 을 호출하고,
 * 에러 메시지를 표시하며 성공 시 callbackUrl 또는 / 로 리다이렉트한다.
 *
 * Slice G: rememberMe 체크박스 추가 — 선택 시 autologin 쿠키를 발급한다.
 *
 * @MX:NOTE: 로그인 폼 Client Component — loginAction Server Action 의 유일한 UI 진입점.
 */
import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { loginAction } from '@/lib/auth/actions';
import { initialAuthActionState, type AuthActionState } from '@/lib/auth/auth-state';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialAuthActionState,
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>

      {!state.ok && (state as Extract<AuthActionState, { ok: false }>).formError && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded" role="alert">
          {(state as Extract<AuthActionState, { ok: false }>).formError}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
            아이디 또는 이메일
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            className="w-4 h-4 border border-gray-300 rounded cursor-pointer"
            disabled={isPending}
          />
          <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer">
            로그인 상태 유지
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600 space-y-2">
        <p>
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
        <p>
          <Link href="/password-reset" className="text-blue-600 hover:underline">
            비밀번호 찾기
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
