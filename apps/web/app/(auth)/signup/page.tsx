'use client';

/**
 * 회원가입 페이지 — SPEC-AUTH-001 Slice F.
 *
 * useActionState 를 사용하여 signupAction 을 호출하고,
 * 성공 시 "이메일을 확인하세요" 메시지를 표시한다 (리다이렉트하지 않음).
 *
 * @MX:NOTE: [AUTO] 회원가입 폼 Client Component — signupAction Server Action 의 유일한 UI 진입점.
 */
import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';

import { signupAction } from '@/lib/auth/actions';
import { initialAuthActionState, type AuthActionState } from '@/lib/auth/auth-state';

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const wrappedAction = async (
    prev: AuthActionState,
    formData: FormData,
  ): Promise<AuthActionState> => {
    const result = await signupAction(prev, formData);
    if (result.ok) {
      setSubmitted(true);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(
    wrappedAction,
    initialAuthActionState,
  );

  // 성공 시 이메일 확인 안내 메시지 표시
  if (submitted && state.ok) {
    return (
      <>
        <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>
        <div className="text-center text-green-700 bg-green-50 p-4 rounded">
          <p className="font-medium">이메일을 확인하세요</p>
          <p className="text-sm mt-2 text-gray-600">
            입력하신 이메일 주소로 인증 링크를 발송했습니다.
          </p>
        </div>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            로그인으로 돌아가기
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>

      {!state.ok && (state as Extract<AuthActionState, { ok: false }>).formError && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded" role="alert">
          {(state as Extract<AuthActionState, { ok: false }>).formError}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <input
            id="userId"
            name="userId"
            type="text"
            required
            autoComplete="username"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="nickName" className="block text-sm font-medium text-gray-700 mb-1">
            닉네임
          </label>
          <input
            id="nickName"
            name="nickName"
            type="text"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '가입 처리 중...' : '회원가입'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        <p>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </>
  );
}
