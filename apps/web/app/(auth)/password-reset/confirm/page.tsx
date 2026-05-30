'use client';

/**
 * 비밀번호 재설정 확인 페이지 — SPEC-AUTH-001 Slice F.
 *
 * URL 의 token 파라미터를 읽어 새 비밀번호와 함께 confirmPasswordResetAction 을 호출한다.
 * 성공 시 /login 으로 리다이렉트한다.
 *
 * @MX:NOTE: [AUTO] 비밀번호 재설정 확인 폼 — useSearchParams 로 URL 토큰 추출.
 */
import { Suspense, useActionState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { confirmPasswordResetAction } from '@/lib/auth/actions';
import { initialAuthActionState, type AuthActionState } from '@/lib/auth/auth-state';

function PasswordResetConfirmInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [state, formAction, isPending] = useActionState(
    confirmPasswordResetAction,
    initialAuthActionState,
  );

  // 성공 시 /login 으로 리다이렉트
  // isPending 이 false 로 전환된 후 state.ok 가 true 이면 제출 완료로 판별
  useEffect(() => {
    if (state.ok && !isPending && token) {
      router.push('/login');
    }
  }, [state.ok, isPending, token, router]);

  // 토큰이 없는 경우
  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-bold text-center mb-6">비밀번호 재설정</h1>
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded text-center" role="alert">
          유효하지 않은 링크입니다. 비밀번호 재설정을 다시 요청해주세요.
        </div>
        <div className="mt-4 text-center">
          <Link href="/password-reset" className="text-blue-600 hover:underline text-sm">
            비밀번호 재설정 요청
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">새 비밀번호 설정</h1>

      {!state.ok && (state as Extract<AuthActionState, { ok: false }>).formError && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded" role="alert">
          {(state as Extract<AuthActionState, { ok: false }>).formError}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            새 비밀번호
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '처리 중...' : '비밀번호 재설정'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          로그인으로 돌아가기
        </Link>
      </div>
    </>
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <Suspense>
      <PasswordResetConfirmInner />
    </Suspense>
  );
}
