'use client';

/**
 * 비밀번호 재설정 요청 페이지 — SPEC-AUTH-001 Slice F.
 *
 * identifier 를 입력받아 requestPasswordResetAction 을 호출한다.
 * REQ-AUTH-051: 사용자 존재 여부를 노출하지 않으므로 제출 후 항상 동일한 성공 메시지를 표시한다.
 *
 * @MX:NOTE: [AUTO] 비밀번호 재설정 요청 폼 — 항상 성공 메시지 표시 (REQ-AUTH-051).
 */
import { useActionState, useState } from 'react';
import Link from 'next/link';

import {
  requestPasswordResetAction,
  initialAuthActionState,
  type AuthActionState,
} from '@/lib/auth/actions';

export default function PasswordResetPage() {
  const [submitted, setSubmitted] = useState(false);

  const wrappedAction = async (
    prev: AuthActionState,
    formData: FormData,
  ): Promise<AuthActionState> => {
    const result = await requestPasswordResetAction(prev, formData);
    setSubmitted(true);
    return result;
  };

  const [state, formAction, isPending] = useActionState(
    wrappedAction,
    initialAuthActionState,
  );

  // 제출 후 항상 성공 메시지 (REQ-AUTH-051)
  if (submitted && state.ok) {
    return (
      <>
        <h1 className="text-2xl font-bold text-center mb-6">비밀번호 재설정</h1>
        <div className="text-green-700 bg-green-50 p-4 rounded text-center">
          <p className="font-medium">이메일이 전송되었습니다</p>
          <p className="text-sm mt-2 text-gray-600">
            등록된 이메일 주소로 비밀번호 재설정 링크를 전송했습니다.
            메일을 확인해주세요.
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
      <h1 className="text-2xl font-bold text-center mb-6">비밀번호 재설정</h1>

      <p className="text-sm text-gray-600 mb-4 text-center">
        가입 시 사용한 아이디 또는 이메일을 입력하세요.
      </p>

      <form action={formAction} className="space-y-4">
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

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '전송 중...' : '재설정 링크 전송'}
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
