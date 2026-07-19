'use client';

/**
 * 로그인 페이지 — SPEC-AUTH-001 Slice F (updated in Slice G).
 *
 * useActionState 를 사용하여 loginAction 을 호출하고,
 * 에러 메시지를 표시하며 성공 시 callbackUrl 또는 / 로 리다이렉트한다.
 *
 * Slice G: rememberMe 체크박스 추가 — 선택 시 autologin 쿠키를 발급한다.
 * SPEC-SOCIAL-LOGIN-001: 소셜 로그인 버튼 추가 (REQ-SOCIAL-001/002).
 *
 * @MX:NOTE: 로그인 폼 Client Component — loginAction Server Action 의 유일한 UI 진입점.
 */
import React, { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { loginAction } from '@/lib/auth/actions';
import { initialAuthActionState, type AuthActionState } from '@/lib/auth/auth-state';
import { signIn } from 'next-auth/react';
import { trpc } from '@/providers/TRPCProvider';
import type { TurnstileWidgetRef } from '../signup/TurnstileWidget';
import { TurnstileWidget } from '../signup/TurnstileWidget';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const turnstileRef = React.useRef<TurnstileWidgetRef>(null);
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = React.useState(false);

  const wrappedAction = async (
    prev: AuthActionState,
    formData: FormData,
  ): Promise<AuthActionState> => {
    // CAPTCHA 토큰 추가
    if (captchaToken) {
      formData.append('captchaToken', captchaToken);
    }

    const result = await loginAction(prev, formData);

    // CAPTCHA_REQUIRED 오류 시 CAPTCHA 표시
    if (!result.ok && result.code === 'CAPTCHA_REQUIRED') {
      setCaptchaRequired(true);
    } else if (!result.ok) {
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

  // Real tRPC query to public.captcha.getConfig
  const { data: captchaConfig } = trpc.public.captcha.getConfig.useQuery();

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

        {/* SPEC-CAPTCHA-001 REQ-CAPTCHA-004: 로그인 실패 시 CAPTCHA 요구 */}
        {(captchaRequired || captchaConfig?.loginEnabled) && (
          <div className="space-y-2">
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={captchaConfig?.siteKey || ''}
              onSuccess={setCaptchaToken}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || (captchaRequired && !captchaToken)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-001/002: 소셜 로그인 버튼 */}
      <SocialLoginButtons isPending={isPending} />

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

/**
 * Social login buttons component (REQ-SOCIAL-001/002, AC-SOCIAL-001/004).
 *
 * Fetches admin-configured social login settings and conditionally renders
 * Kakao/Google login buttons. Buttons are hidden when disabled by admin (AC-SOCIAL-004).
 */
function SocialLoginButtons({ isPending }: { isPending: boolean }) {
  // SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005, AC-SOCIAL-004: 관리자 설정을 실제로 조회한다.
  const { data: socialConfig, isLoading } = trpc.public.social.getConfig.useQuery();
  const kakaoEnabled = socialConfig?.kakao.enabled ?? false;
  const googleEnabled = socialConfig?.google.enabled ?? false;

  if (isLoading) {
    return null; // Don't render while loading
  }

  if (!kakaoEnabled && !googleEnabled) {
    return null; // Don't render section if no providers enabled
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">또는 소셜 로그인</span>
        </div>
      </div>

      <div className="space-y-2">
        {kakaoEnabled && (
          <button
            type="button"
            onClick={() => signIn('kakao', { callbackUrl: window.location.origin })}
            disabled={isPending}
            className="w-full py-2 px-4 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3C6.48 3 2 6.48 2 12C2 17.52 6.48 21 12 21C17.52 21 22 17.52 22 12C22 6.48 17.52 3 12 3ZM12 7.5C13.66 7.5 15 8.84 15 10.5C15 12.16 13.66 13.5 12 13.5C10.34 13.5 9 12.16 9 10.5C9 8.84 10.34 7.5 12 7.5ZM12 18.5C10.5 18.5 9.14 18.06 8.25 17.39C10.07 16.11 13.93 16.11 15.75 17.39C14.86 18.06 13.5 18.5 12 18.5Z" />
            </svg>
            카카오 계정으로 시작하기
          </button>
        )}

        {googleEnabled && (
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: window.location.origin })}
            disabled={isPending}
            className="w-full py-2 px-4 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 시작하기
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
