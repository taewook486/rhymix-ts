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
import { redirect } from 'next/navigation';

import {
  signup,
  type SignupErrorCode,
  verifyEmail,
  type VerifyEmailErrorCode,
  requestPasswordReset,
  confirmPasswordReset,
  type ConfirmResetResult,
  createAutoLogin,
} from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';
import { mailDispatcher } from '@/lib/mail/dispatcher';

import { signIn, auth } from './config';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { resolveDefaultSiteId } from './site';
import type { AuthActionState } from './auth-state';
export type { AuthActionState } from './auth-state';

// SPEC-CAPTCHA-001: 가입 폼에서 넘어오는 약관 동의 목록 형태 검증 — signup() 내부의
// SignupInput.agreements 와 동일한 shape. 실패 시 빈 배열로 폴백(약관 미동의 취급).
const AgreementsSchema = z
  .array(z.object({ key: z.string(), version: z.string() }))
  .default([]);

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
 * 메일은 `mailDispatcher` 싱글톤을 통해 발송 — SMTP_HOST 설정 시 SmtpMailDispatcher (SPEC-MAIL-001).
 */
export async function signupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { ip, userAgent } = await readClientHints();

  // SPEC-CAPTCHA-001: agreements와 captchaToken 추출
  const agreementsRaw = formData.get('agreements');
  const captchaToken = formData.get('captchaToken');

  let agreements: Array<{ key: string; version: string }> = [];
  if (typeof agreementsRaw === 'string') {
    try {
      const parsed: unknown = JSON.parse(agreementsRaw);
      const validated = AgreementsSchema.safeParse(parsed);
      agreements = validated.success ? validated.data : [];
    } catch {
      // JSON 파싱 실패 시 빈 배열 사용
      agreements = [];
    }
  }

  // ISSUE #1 FIX: SiteSettings에서 CAPTCHA 및 Terms 설정 동적으로 로드
  // SPEC-MEMBER-ADMIN-001 Slice D: "기본 설정" 탭 값(가입 허가 모드/가입키/인증메일
  // 유효기간/닉네임 정책/비밀번호 보안수준/Argon2id timeCost)도 함께 로드해 signup()에 주입한다.
  const siteId = await resolveDefaultSiteId(prisma);
  const [
    captchaSignupEnabled,
    captchaLoginEnabled,
    captchaSecretKey,
    requiredTerms,
    signupAccessMode,
    signupEnabledLegacy,
    signupKeySetting,
    requireEmailVerification,
    emailAuthTtlHours,
    nicknameAllowSpecialChars,
    nicknameAllowedSpecialChars,
    nicknameAllowSpacing,
    passwordPolicyLevel,
    argon2TimeCost,
  ] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'security.captcha.signup.enabled' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'security.captcha.login.enabled' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'security.captcha.turnstile.secretKey' } } }),
    prisma.terms.findMany({
      where: { siteId, required: true, active: true },
      select: { id: true },
    }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.signup.accessMode' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.signup.enabled' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.signup.key' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.signup.requireEmailVerification' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.signup.emailAuthTtlHours' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.nickname.allowSpecialChars' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.nickname.allowedSpecialChars' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.nickname.allowSpacing' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.password.policyLevel' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'security.password.argon2TimeCost' } } }),
  ]);

  const captchaEnabled = Boolean(captchaSignupEnabled?.value) && Boolean(captchaSecretKey?.value);
  const requiredTermsIds = requiredTerms.map((t) => t.id);

  // REQ-MADM-016: accessMode 키가 아직 없으면(마이그레이션 전) 기존
  // member.signup.enabled 불리언에서 유도한다 — admin.settings.getDefault와 동일한 하위 호환 규칙.
  const rawAccessMode = signupAccessMode?.value as 'ALLOW' | 'DENY' | 'SIGNUP_KEY' | undefined;
  const accessMode: 'ALLOW' | 'DENY' | 'SIGNUP_KEY' =
    rawAccessMode === 'ALLOW' || rawAccessMode === 'DENY' || rawAccessMode === 'SIGNUP_KEY'
      ? rawAccessMode
      : (signupEnabledLegacy?.value as boolean | undefined) === false
        ? 'DENY'
        : 'ALLOW';

  // REQ-MADM-025: PasswordPolicyLevel(NORMAL/STRONG/VERY_STRONG) → signup() lowercase config.
  const policyLevel = (passwordPolicyLevel?.value as string | undefined) ?? 'NORMAL';
  const passwordPolicy: 'normal' | 'strong' | 'very_strong' =
    policyLevel === 'VERY_STRONG' ? 'very_strong' : policyLevel === 'STRONG' ? 'strong' : 'normal';

  const result = await signup(
    {
      userId: String(formData.get('userId') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      nickName: String(formData.get('nickName') ?? ''),
      ip,
      userAgent,
      agreements,
      captchaToken: captchaToken ? String(captchaToken) : undefined,
      // REQ-MADM-017: 가입 URL의 key 파라미터(signup 폼의 숨은 필드로 전달됨).
      signupKey: (formData.get('key') as string | null) ?? undefined,
    },
    {
      prisma,
      mail: mailDispatcher,
      config: {
        // REQ-MADM-018 재사용: 기존 member.signup.requireEmailVerification 키를 그대로 소비.
        enableConfirm: (requireEmailVerification?.value as boolean | undefined) ?? true,
        signupTokenTtlHours: (emailAuthTtlHours?.value as number | undefined) ?? 24,
        passwordPolicy,
        // ISSUE #1 FIX: CAPTCHA 및 Terms 설정 주입
        captchaEnabled,
        captchaSecretKey: captchaSecretKey?.value as string,
        requiredTermsIds,
        // SPEC-MEMBER-ADMIN-001 Slice D
        accessMode,
        signupKeyValue: (signupKeySetting?.value as string | undefined) || undefined,
        nicknamePolicy: {
          allowSpecialChars: (nicknameAllowSpecialChars?.value as boolean | undefined) ?? false,
          allowedSpecialChars: (nicknameAllowedSpecialChars?.value as string | undefined) ?? '',
          allowSpacing: (nicknameAllowSpacing?.value as boolean | undefined) ?? false,
        },
        argon2TimeCost: (argon2TimeCost?.value as number | undefined) ?? undefined,
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
    case 'CAPTCHA_FAILED':
      return '로봇 확인에 실패했습니다. 다시 시도해주세요.';
    case 'TERMS_REQUIRED':
      return '필수 약관에 동의해주세요.';
    case 'SIGNUP_CLOSED':
      return '현재 회원가입이 허용되지 않거나, 가입키가 올바르지 않습니다.';
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
  const callbackUrl = String(formData.get('callbackUrl') ?? '').trim() || '/';
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
        if (session?.user?.id) {
          const userId = Number.parseInt(session.user.id, 10);
          if (Number.isFinite(userId) && userId > 0) {
            const { ip, userAgent } = await readClientHints();
            const result = await createAutoLogin(
              { userId, ip, userAgent, deviceId: undefined },
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
          }
        }
      } catch {
        // autologin 발급 실패 시에도 로그인 자체는 성공.
      }
    }
    redirect(callbackUrl);
    // 프로덕션에서는 redirect()가 NEXT_REDIRECT를 throw해 여기 도달 불가.
    // 테스트에서는 redirect가 mock(no-op)되므로 이 return이 { ok: true }를 반환.
    return { ok: true };
  } catch (err) {
    // ISSUE #1 FIX: CAPTCHA_REQUIRED 에러 코드 처리 추가
    if (isCredentialsError(err)) {
      // packages/auth/login.ts가 throw한 CustomException인 경우
      const e = err as { code?: string };
      if (e.code === 'CAPTCHA_REQUIRED') {
        return {
          ok: false,
          code: 'CAPTCHA_REQUIRED',
          formError: 'CAPTCHA 확인이 필요합니다.',
        };
      }
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
  const e = err as { type?: string; name?: string; code?: string };
  // ISSUE #1 FIX: CAPTCHA_REQUIRED를 CredentialsError로 간주하여 loginAction에서 잡지하도록 처리
  if (e.code === 'CAPTCHA_REQUIRED') {
    return true;
  }
  const t = e.type;
  const n = e.name;
  return (
    t === 'CredentialsSignin' ||
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

  // 인증 완료 후 환영 메일 발송 (fire-and-forget) — REQ-MAIL-072
  void (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { emailAddress: true, nickName: true },
      });
      if (!user) return;

      await mailDispatcher.dispatch({
        template: 'welcome',
        to: user.emailAddress,
        subject: '가입을 환영합니다!',
        vars: {
          userName: user.nickName ?? user.emailAddress,
          siteUrl: process.env.NEXTAUTH_URL ?? 'https://example.com',
          loginUrl: `${process.env.NEXTAUTH_URL ?? 'https://example.com'}/login`,
        },
      });
    } catch (err) {
      console.error('[mail] welcome mail failed:', err);
    }
  })();

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
 * 메일은 `mailDispatcher` 싱글톤을 통해 발송 — SMTP_HOST 설정 시 SmtpMailDispatcher (SPEC-MAIL-001).
 */
export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get('identifier') ?? '').trim();

  await requestPasswordReset(
    { identifier },
    { prisma, mail: mailDispatcher },
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

  // SPEC-MEMBER-ADMIN-001 REQ-MADM-025/026: "기본 설정" 탭의 비밀번호 보안수준/
  // Argon2id timeCost가 비밀번호 재설정 경로에도 동일하게 반영되도록 배선한다.
  const siteId = await resolveDefaultSiteId(prisma);
  const [passwordPolicyLevel, argon2TimeCost] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'member.password.policyLevel' } } }),
    prisma.siteSetting.findUnique({ where: { siteId_key: { siteId, key: 'security.password.argon2TimeCost' } } }),
  ]);
  const policyLevel = (passwordPolicyLevel?.value as string | undefined) ?? 'NORMAL';
  const passwordPolicy: 'normal' | 'strong' | 'very_strong' =
    policyLevel === 'VERY_STRONG' ? 'very_strong' : policyLevel === 'STRONG' ? 'strong' : 'normal';

  const result = await confirmPasswordReset(
    { token, newPassword },
    {
      prisma,
      config: {
        passwordPolicy,
        argon2TimeCost: (argon2TimeCost?.value as number | undefined) ?? undefined,
      },
    },
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
