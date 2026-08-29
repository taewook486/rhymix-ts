'use client';

/**
 * 회원가입 페이지 — SPEC-AUTH-001 Slice F + SPEC-CAPTCHA-001 REQ-CAPTCHA-001/003.
 *
 * useActionState 를 사용하여 signupAction 을 호출하고,
 * 성공 시 "이메일을 확인하세요" 메시지를 표시한다 (리다이렉트하지 않음).
 *
 * SPEC-CAPTCHA-001: 이용약관 동의 체크박스와 Turnstile CAPTCHA 위젯 추가.
 *
 * @MX:NOTE: [AUTO] 회원가입 폼 Client Component — signupAction Server Action 의 유일한 UI 진입점.
 * @MX:SPEC: SPEC-AUTH-001 Slice F + SPEC-CAPTCHA-001 REQ-CAPTCHA-001, REQ-CAPTCHA-003
 */
import React, { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/providers/TRPCProvider';

import { signupAction } from '@/lib/auth/actions';
import { initialAuthActionState, type AuthActionState } from '@/lib/auth/auth-state';
import { TermsConsent } from './TermsConsent';
import { TurnstileWidget, type TurnstileWidgetRef } from './TurnstileWidget';

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  // REQ-MADM-017: 가입키 모드일 때 URL의 ?key= 파라미터를 폼에 실어 signupAction으로 전달.
  const searchParams = useSearchParams();
  const signupKeyParam = searchParams.get('key') ?? '';

  // 약관 동의 상태 관리 - {key, version}[] 형태로 저장
  const [agreements, setAgreements] = useState<Array<{ key: string; version: string }>>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const wrappedAction = async (
    prev: AuthActionState,
    formData: FormData,
  ): Promise<AuthActionState> => {
    // agreements를 JSON 문자열로 추가 (FormData는 배열을 직접 지원하지 않음)
    formData.append('agreements', JSON.stringify(agreements));

    // CAPTCHA 토큰 추가
    if (captchaToken) {
      formData.append('captchaToken', captchaToken);
    }

    const result = await signupAction(prev, formData);
    if (result.ok) {
      setSubmitted(true);
    } else {
      // 실패 시 Turnstile 위젯 재설정
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(
    wrappedAction,
    initialAuthActionState,
  );

  // Real tRPC queries
  const { data: captchaConfig } = trpc.public.captcha.getConfig.useQuery();
  const { data: terms } = trpc.public.terms.listActive.useQuery();

  // 필수 약관 수 (AC-CAPTCHA-002: submit disabled until required terms checked)
  // terms 에서 그대로 파생되므로 상태로 들고 있을 이유가 없다.
  const requiredTermsCount = terms?.filter((t: { required: boolean }) => t.required).length ?? 0;

  const handleToggleAgreement = (term: { id: number; type: string; required: boolean }) => {
    setAgreements((prev) => {
      const exists = prev.find((a) => a.key === term.type);
      if (exists) {
        return prev.filter((a) => a.key !== term.type);
      } else {
        return [...prev, { key: term.type, version: '' }]; // TODO: version 필드가 추가되면 실제 값 사용
      }
    });
  };

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
        {/* REQ-MADM-017: 가입키 모드일 때 서버(signup())가 검증할 값을 그대로 전달. */}
        <input type="hidden" name="key" value={signupKeyParam} />

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

        {/* SPEC-CAPTCHA-001 REQ-CAPTCHA-001: 이용약관 동의 */}
        <TermsConsent
          selectedAgreements={new Set(agreements.filter((a) => {
            // Find terms with matching key in agreements array
            const term = terms?.find((t: { id: number; type: string; title: string; content: string; required: boolean }) => t.type === a.key);
            return term && term.required;
          }).map((a) => {
            const term = terms?.find((t: { id: number; type: string; title: string; content: string; required: boolean }) => t.type === a.key);
            return term?.id ?? 0;
          }))}
          onToggleAgreement={handleToggleAgreement}
          terms={terms ?? []}
        />

        {/* SPEC-CAPTCHA-001 REQ-CAPTCHA-003: Turnstile CAPTCHA */}
        {captchaConfig?.signupEnabled && (
          <div className="space-y-2">
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={captchaConfig.siteKey}
              onSuccess={setCaptchaToken}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || (requiredTermsCount > 0 && agreements.filter((a) => {
            const term = terms?.find((t: { id: number; type: string; title: string; content: string; required: boolean }) => t.type === a.key);
            return term && term.required;
          }).length < requiredTermsCount) || (captchaConfig?.signupEnabled && !captchaToken)}
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
