'use server';

/**
 * Server Actions — SPEC-AUTH-001 Slice C (updated in Slice G).
 *
 * 본 파일은 React Server Actions 형태로 가입/로그인/이메일 인증을 노출한다.
 * tRPC 프로시저(spec.md L425) 는 Slice D 이후로 미룬다 — Slice C 는 Auth.js v5
 * Credentials Provider + Server Actions 만으로 폼 흐름이 완성된다.
 *
 * 모든 액션은 `useActionState` 호환 형태 `{ ok, fieldErrors?, code? }` 를 반환한다.
 *
 * @MX:ANCHOR: 인증 폼의 단일 Server Action 진입점 — 모든 사용자 입력은 본 함수를 통과한다.
 * @MX:REASON: IP/UA 추출, 정책 적용, 도메인 함수 호출이 한 곳에 모여야 우회로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-013, REQ-AUTH-051
 */
import { headers } from 'next/headers';

import {
  signup,
  type SignupErrorCode,
  verifyEmail,
  type VerifyEmailErrorCode,
  NoopMailDispatcher,
  requestPasswordReset,
  confirmPasswordReset,
  type ConfirmResetResult,
  createAutoLogin,
} from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

import { signIn, auth } from './config';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthActionState =
  | { ok: true }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
      /** 도메인 코드 (UI 토스트/알림에 직접 매핑할 수 있도록 노출). */
      code?: SignupErrorCode | VerifyEmailErrorCode | 'INVALID_CREDENTIALS' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'WEAK_PASSWORD';
    };

export const initialAuthActionState: AuthActionState = { ok: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Next.js `headers()` 에서 IP 와 User-Agent 를 추출.
 * Auth.js 는 자체 헤더를 받지 않으므로 Next.js layer 가 주입해야 한다.
 */
async function readClientHints(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const xff = h.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0';
  const userAgent = h.get('user-agent') ?? '';
  return { ip, userAgent };
}

// ---------------------------------------------------------------------------
// signupAction
// ---------------------------------------------------------------------------

/**
 * 회원가입 Server Action.
 *
 * `signup()` 의 실패 코드를 그대로 노출하되, 사용자에게 보여줄 메시지로 매핑.
 * 메일 디스패처는 NoopMailDispatcher — 실제 SMTP 는 SPEC-INFRA-001 도입 시 교체.
 */
export async function signupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { ip, userAgent } = await readClientHints();
  const result = await signup(
    {
      userId: String(formData.get('userId') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      nickName: String(formData.get('nickName') ?? ''),
      ip,
      userAgent,
    },
    {
      prisma,
      mail: new NoopMailDispatcher(),
      config: {
        enableConfirm: true,
        signupTokenTtlHours: 24,
        passwordPolicy: 'normal',
      },
    },
  );
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      formError: signupErrorMessage(result.code),
    };
  }
  return { ok: true };
}

function signupErrorMessage(code: SignupErrorCode): string {
  switch (code) {
    case 'VALIDATION_FAILED':
      return '입력값을 확인해주세요.';
    case 'IDENTIFIER_TAKEN':
      return '이미 사용 중인 아이디 또는 이메일입니다.';
    case 'IDENTIFIER_DENIED':
      return '사용할 수 없는 아이디 또는 닉네임입니다.';
    case 'WEAK_PASSWORD':
      return '비밀번호가 너무 약합니다. 다른 비밀번호를 사용하세요.';
  }
}

// ---------------------------------------------------------------------------
// loginAction
// ---------------------------------------------------------------------------

/**
 * 로그인 Server Action — Auth.js v5 의 `signIn('credentials', ...)` 을 호출한다.
 *
 * `signIn` 내부에서 Credentials Provider 의 `authorize()` 가 실행되며, 그 안에서
 * `packages/auth/login()` 이 호출되어 검증/감사로그/rehash 가 일어난다.
 *
 * Auth.js 는 자체 redirect throw 를 사용하므로, 호출이 throw 하면 그대로 전파해
 * Next.js 의 정상 redirect 처리로 이어지게 한다 (catch 절은 인증 실패만 캐치).
 */
/** * 로그인 Server Action — Auth.js v5 의 `signIn('credentials', ...)` 을 호출한다. * * `signIn` 내부에서 Credentials Provider 의 `authorize()` 가 실행되며, 그 안에서 * `packages/auth/login()` 이 호출되어 검증/감사로그/rehash 가 일어난다. * * Slice G: rememberMe 옵션이 추가되어 true 일 때 `createAutoLogin()` 을 호출해 * autologin 쿠키를 발급한다. * * Auth.js 는 자체 redirect throw 를 사용하므로, 호출이 throw 하면 그대로 전파해 * Next.js 의 정상 redirect 처리로 이어지게 한다 (catch 절은 인증 실패만 캐치). */
export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const rememberMe = String(formData.get('rememberMe') ?? '') === 'on';
  const password = String(formData.get('password') ?? '');
  if (!identifier || !password) {
    return {
      ok: false,
      code: 'INVALID_CREDENTIALS',
      formError: '아이디 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  try {
    await signIn('credentials', {
      identifier,
      password,
      redirect: false,
    });
    // Slice G: rememberMe 일 때 autologin 쿠키 발급.
    if (rememberMe) {
      try {
        const session = await auth();
        if (!session?.user?.id) {
          return { ok: true };
        }
        const userId = Number.parseInt(session.user.id, 10);
        if (!Number.isFinite(userId) || userId <= 0) {
          return { ok: true };
        }
        const { ip, userAgent } = await readClientHints();
        const result = await createAutoLogin(
          {
            userId,
            ip,
            userAgent,
            deviceId: undefined,
          },
          { prisma },
        );
        const cookieStore = await cookies();
        cookieStore.set('rx_autologin', result.securityKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
      } catch {
        // autologin 발급 실패 시에도 로그인 자체는 성공.
      }
    }
    return { ok: true };
  } catch (err) {
    // CredentialsSignin 등 Auth.js 가 throw 하는 인증 실패를 일관 응답으로 변환.
    // REQ-AUTH-051: 어떤 단계에서 실패했는지 노출하지 않는다.
    if (isCredentialsError(err)) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        formError: '아이디 또는 비밀번호가 올바르지 않습니다.',
      };
    }
    // Next.js redirect 등 다른 예외는 그대로 전파.
    throw err;
  }
}

function isCredentialsError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const t = (err as { type?: unknown; name?: unknown }).type;
  const n = (err as { name?: unknown }).name;
  return (
    t === 'CredentialsSignin' ||
    n === 'CredentialsSignin' ||
    n === 'AuthError'
  );
}

// ---------------------------------------------------------------------------
// verifyEmailAction
// ---------------------------------------------------------------------------

/**
 * 이메일 인증 Server Action — verify-email 페이지의 form action 또는
 * 링크 클릭 시 호출하는 wrapper.
 */
export async function verifyEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get('token') ?? '');
  const result = await verifyEmail({ token }, { prisma });
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      formError: verifyEmailMessage(result.code),
    };
  }
  return { ok: true };
}

function verifyEmailMessage(code: VerifyEmailErrorCode): string {
  switch (code) {
    case 'TOKEN_INVALID':
      return '인증 링크가 유효하지 않습니다. 다시 발송해주세요.';
    case 'TOKEN_EXPIRED':
      return '인증 링크가 만료되었습니다. 다시 발송해주세요.';
  }
}

// ---------------------------------------------------------------------------
// requestPasswordResetAction
// ---------------------------------------------------------------------------

/**
 * 비밀번호 재설정 요청 Server Action.
 *
 * REQ-AUTH-051: 식별자 존재 여부를 노출하지 않으므로 항상 ok:true 를 반환.
 * 메일 디스패처는 NoopMailDispatcher — 실제 SMTP 는 SPEC-INFRA-001 도입 시 교체.
 */
export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get('identifier') ?? '').trim();

  await requestPasswordReset(
    { identifier },
    { prisma, mail: new NoopMailDispatcher() },
  );

  // REQ-AUTH-051: 항상 ok:true (사용자 존재 여부 미노출).
  return { ok: true };
}

// ---------------------------------------------------------------------------
// confirmPasswordResetAction
// ---------------------------------------------------------------------------

/**
 * 비밀번호 재설정 확인 Server Action.
 */
export async function confirmPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get('token') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!token || !newPassword) {
    return {
      ok: false,
      code: 'TOKEN_INVALID',
      formError: '유효하지 않은 요청입니다.',
    };
  }

  const result = await confirmPasswordReset(
    { token, newPassword },
    { prisma },
  );

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      formError: confirmResetMessage(result.code),
    };
  }
  return { ok: true };
}

function confirmResetMessage(code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'WEAK_PASSWORD'): string {
  switch (code) {
    case 'TOKEN_INVALID':
      return '비밀번호 재설정 링크가 유효하지 않습니다.';
    case 'TOKEN_EXPIRED':
      return '비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.';
    case 'WEAK_PASSWORD':
      return '비밀번호가 너무 약합니다. 다른 비밀번호를 사용하세요.';
  }
}
