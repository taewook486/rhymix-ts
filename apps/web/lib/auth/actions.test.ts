/**
 * Specification tests for Auth Server Actions — SPEC-AUTH-001 Slice C.
 *
 * 본 테스트는 Server Action 의 입력→출력 매핑(useActionState 호환 형태)과
 * IP/User-Agent 헤더 추출, 도메인 함수 호출 위임을 검증한다.
 *
 * 외부 의존성은 모두 모킹:
 *   - `next/headers` (Next.js 16 server-only API)
 *   - `./config` (Auth.js v5 signIn)
 *   - `@rhymix-ts/auth` 의 signup / verifyEmail
 *   - `@rhymix-ts/db` 의 prisma client
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  headersGetMock,
  signupMock,
  verifyEmailMock,
  signInMock,
  authMock,
  requestPasswordResetMock,
  confirmPasswordResetMock,
  createAutoLoginMock,
  cookieStore,
} = vi.hoisted(() => {
  const cookieSetCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];
  const cookieDeleteCalls: string[] = [];
  const cookies = {
    get: vi.fn(),
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ) => {
      cookieSetCalls.push({ name, value, options });
    },
    delete: (name: string) => {
      cookieDeleteCalls.push(name);
    },
    _setCalls: cookieSetCalls,
    _deleteCalls: cookieDeleteCalls,
    _reset() {
      cookieSetCalls.length = 0;
      cookieDeleteCalls.length = 0;
    },
  };

  return {
    headersGetMock: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '203.0.113.5';
      if (name === 'user-agent') return 'vitest-ua';
      return null;
    }),
    signupMock: vi.fn(),
    verifyEmailMock: vi.fn(),
    signInMock: vi.fn(),
    authMock: vi.fn(),
    requestPasswordResetMock: vi.fn(),
    confirmPasswordResetMock: vi.fn(),
    createAutoLoginMock: vi.fn(),
    cookieStore: cookies,
  };
});

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: headersGetMock }),
  cookies: () => Promise.resolve(cookieStore),
}));

// loginAction이 성공 시 redirect()를 호출(throw)하므로 no-op으로 교체.
// 교체 후 loginAction은 { ok: true }를 반환하게 됨.
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  signup: signupMock,
  verifyEmail: verifyEmailMock,
  requestPasswordReset: requestPasswordResetMock,
  confirmPasswordReset: confirmPasswordResetMock,
  createAutoLogin: createAutoLoginMock,
  // NoopMailDispatcher는 actions.ts에서 사용되므로 가벼운 더블 제공.
  NoopMailDispatcher: class {
    async dispatch(): Promise<void> {
      /* noop */
    }
  },
  // SPEC-MAIL-001에서 추가된 export — actions.ts가 import하지 않더라도 mock에 포함해야 함
  createMailDispatcher: vi.fn(),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

vi.mock('@/lib/auth/config', () => ({
  signIn: signInMock,
  auth: authMock,
}));

import {
  signupAction,
  loginAction,
  verifyEmailAction,
  requestPasswordResetAction,
  confirmPasswordResetAction,
} from './actions';
import { initialAuthActionState } from './auth-state';

beforeEach(() => {
  signupMock.mockReset();
  verifyEmailMock.mockReset();
  signInMock.mockReset();
  authMock.mockReset();
  requestPasswordResetMock.mockReset();
  confirmPasswordResetMock.mockReset();
  createAutoLoginMock.mockReset();
  headersGetMock.mockClear();
  cookieStore._reset();
});

function buildForm(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    fd.set(k, v);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// signupAction
// ---------------------------------------------------------------------------

describe('signupAction', () => {
  it('happy path → ok:true and forwards IP/UA from headers', async () => {
    signupMock.mockResolvedValue({ ok: true, userId: 1, status: 'UNAUTHED', requiresEmailVerification: true });
    const fd = buildForm({
      userId: 'alice',
      email: 'alice@example.com',
      password: 'correct horse battery staple',
      nickName: 'Alice',
    });
    const result = await signupAction(initialAuthActionState, fd);
    expect(result).toEqual({ ok: true });
    expect(signupMock).toHaveBeenCalledTimes(1);
    const arg = signupMock.mock.calls[0]![0] as { ip: string; userAgent: string };
    expect(arg.ip).toBe('203.0.113.5');
    expect(arg.userAgent).toBe('vitest-ua');
  });

  it('failure preserves a code + formError, password not echoed', async () => {
    signupMock.mockResolvedValue({ ok: false, code: 'IDENTIFIER_TAKEN' });
    const fd = buildForm({
      userId: 'alice',
      email: 'alice@example.com',
      password: 'super-secret-plaintext-pw',
      nickName: 'Alice',
    });
    const result = await signupAction(initialAuthActionState, fd);
    expect(result).toMatchObject({ ok: false, code: 'IDENTIFIER_TAKEN' });
    expect(JSON.stringify(result)).not.toContain('super-secret-plaintext-pw');
  });

  it('falls back to 0.0.0.0 when no IP headers present', async () => {
    headersGetMock.mockImplementationOnce(() => null);
    headersGetMock.mockImplementationOnce(() => null);
    headersGetMock.mockImplementationOnce(() => null);
    signupMock.mockResolvedValue({ ok: true, userId: 2, status: 'APPROVED', requiresEmailVerification: false });
    await signupAction(initialAuthActionState, buildForm({
      userId: 'bob', email: 'b@x.com', password: 'a-very-long-passphrase', nickName: 'Bob',
    }));
    const arg = signupMock.mock.calls[0]![0] as { ip: string };
    expect(arg.ip).toBe('0.0.0.0');
  });
});

// ---------------------------------------------------------------------------
// loginAction
// ---------------------------------------------------------------------------

describe('loginAction', () => {
  it('happy path → calls signIn with credentials and returns ok:true', async () => {
    signInMock.mockResolvedValue(undefined);
    const fd = buildForm({
      identifier: 'alice',
      password: 'correct-passphrase',
    });
    const result = await loginAction(initialAuthActionState, fd);
    expect(result).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      identifier: 'alice',
      password: 'correct-passphrase',
      redirect: false,
    });
  });

  it('CredentialsSignin error → INVALID_CREDENTIALS, no plaintext leak', async () => {
    const err = Object.assign(new Error('Invalid credentials'), {
      type: 'CredentialsSignin',
      name: 'CredentialsSignin',
    });
    signInMock.mockRejectedValue(err);
    const fd = buildForm({
      identifier: 'alice',
      password: 'super-secret-pw-xyz',
    });
    const result = await loginAction(initialAuthActionState, fd);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(JSON.stringify(result)).not.toContain('super-secret-pw-xyz');
  });

  it('empty form → INVALID_CREDENTIALS without calling signIn', async () => {
    const result = await loginAction(initialAuthActionState, buildForm({}));
    expect(result).toMatchObject({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('non-auth error (e.g., redirect) propagates', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    signInMock.mockRejectedValue(redirectErr);
    await expect(
      loginAction(initialAuthActionState, buildForm({ identifier: 'a', password: 'b' })),
    ).rejects.toBe(redirectErr);
  });

  // -------------------------------------------------------------------------
  // Slice G: rememberMe 분기
  // -------------------------------------------------------------------------

  // G-1: rememberMe=on + 로그인 성공 → createAutoLogin 호출 + 쿠키 설정
  it('G-1: rememberMe=on → calls createAutoLogin and sets rx_autologin cookie', async () => {
    signInMock.mockResolvedValue(undefined);
    authMock.mockResolvedValue({ user: { id: '42' } });
    createAutoLoginMock.mockResolvedValue({ securityKey: 'auto-login-token-xyz' });

    const fd = buildForm({
      identifier: 'alice',
      password: 'correct-passphrase',
      rememberMe: 'on',
    });
    const result = await loginAction(initialAuthActionState, fd);

    expect(result).toEqual({ ok: true });
    expect(createAutoLoginMock).toHaveBeenCalledTimes(1);
    const arg = createAutoLoginMock.mock.calls[0]![0] as {
      userId: number;
      ip: string;
      userAgent: string;
    };
    expect(arg.userId).toBe(42);
    expect(arg.ip).toBe('203.0.113.5');
    expect(arg.userAgent).toBe('vitest-ua');

    // 쿠키 설정 검증
    expect(cookieStore._setCalls.length).toBeGreaterThanOrEqual(1);
    const cookie = cookieStore._setCalls[cookieStore._setCalls.length - 1]!;
    expect(cookie.name).toBe('rx_autologin');
    expect(cookie.value).toBe('auto-login-token-xyz');
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  // G-2: rememberMe 없음 + 로그인 성공 → createAutoLogin 호출 안 함, 쿠키 미설정
  it('G-2: rememberMe absent → does NOT call createAutoLogin or set cookie', async () => {
    signInMock.mockResolvedValue(undefined);

    const fd = buildForm({
      identifier: 'alice',
      password: 'correct-passphrase',
      // rememberMe 미설정
    });
    const result = await loginAction(initialAuthActionState, fd);

    expect(result).toEqual({ ok: true });
    expect(createAutoLoginMock).not.toHaveBeenCalled();
    expect(authMock).not.toHaveBeenCalled();
    expect(cookieStore._setCalls).toHaveLength(0);
  });

  // G-3: rememberMe=on + 로그인 실패 → createAutoLogin 호출 안 함
  it('G-3: rememberMe=on but signIn fails → no autologin issued', async () => {
    const err = Object.assign(new Error('Invalid credentials'), {
      type: 'CredentialsSignin',
      name: 'CredentialsSignin',
    });
    signInMock.mockRejectedValue(err);

    const fd = buildForm({
      identifier: 'alice',
      password: 'wrong-pw',
      rememberMe: 'on',
    });
    const result = await loginAction(initialAuthActionState, fd);

    expect(result).toMatchObject({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(createAutoLoginMock).not.toHaveBeenCalled();
    expect(cookieStore._setCalls).toHaveLength(0);
  });

  // G-4: rememberMe=on + createAutoLogin throw → 로그인 자체는 성공 (graceful degradation)
  it('G-4: createAutoLogin failure does NOT break login success', async () => {
    signInMock.mockResolvedValue(undefined);
    authMock.mockResolvedValue({ user: { id: '42' } });
    createAutoLoginMock.mockRejectedValue(new Error('DB down'));

    const fd = buildForm({
      identifier: 'alice',
      password: 'correct-passphrase',
      rememberMe: 'on',
    });
    const result = await loginAction(initialAuthActionState, fd);

    expect(result).toEqual({ ok: true });
    // 쿠키는 설정되지 않아야 한다 (createAutoLogin 실패 시).
    expect(cookieStore._setCalls).toHaveLength(0);
  });

  // G-4b: rememberMe=on + session.user.id 없음 → 쿠키 미설정 (방어적 분기)
  it('G-4b: missing session user.id → graceful skip, no cookie', async () => {
    signInMock.mockResolvedValue(undefined);
    authMock.mockResolvedValue(null);

    const fd = buildForm({
      identifier: 'alice',
      password: 'correct-passphrase',
      rememberMe: 'on',
    });
    const result = await loginAction(initialAuthActionState, fd);

    expect(result).toEqual({ ok: true });
    expect(createAutoLoginMock).not.toHaveBeenCalled();
    expect(cookieStore._setCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// verifyEmailAction
// ---------------------------------------------------------------------------

describe('verifyEmailAction', () => {
  it('valid token → ok:true', async () => {
    verifyEmailMock.mockResolvedValue({ ok: true, userId: 1, alreadyVerified: false });
    const result = await verifyEmailAction(initialAuthActionState, buildForm({ token: 'tok' }));
    expect(result).toEqual({ ok: true });
    expect(verifyEmailMock).toHaveBeenCalledWith({ token: 'tok' }, expect.any(Object));
  });

  it('TOKEN_EXPIRED → user-friendly formError', async () => {
    verifyEmailMock.mockResolvedValue({ ok: false, code: 'TOKEN_EXPIRED' });
    const result = await verifyEmailAction(initialAuthActionState, buildForm({ token: 'tok' }));
    expect(result).toMatchObject({ ok: false, code: 'TOKEN_EXPIRED' });
    if (!result.ok) {
      expect(result.formError).toContain('만료');
    }
  });

  it('TOKEN_INVALID → user-friendly formError', async () => {
    verifyEmailMock.mockResolvedValue({ ok: false, code: 'TOKEN_INVALID' });
    const result = await verifyEmailAction(initialAuthActionState, buildForm({ token: 'tok' }));
    expect(result).toMatchObject({ ok: false, code: 'TOKEN_INVALID' });
  });
});

// ---------------------------------------------------------------------------
// requestPasswordResetAction
// ---------------------------------------------------------------------------

describe('requestPasswordResetAction', () => {
  it('항상 ok:true 반환 (REQ-AUTH-051)', async () => {
    requestPasswordResetMock.mockResolvedValue({ ok: true });
    const result = await requestPasswordResetAction(
      initialAuthActionState,
      buildForm({ identifier: 'alice@example.com' }),
    );
    expect(result).toEqual({ ok: true });
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// confirmPasswordResetAction
// ---------------------------------------------------------------------------

describe('confirmPasswordResetAction', () => {
  it('성공 → ok:true', async () => {
    confirmPasswordResetMock.mockResolvedValue({ ok: true });
    const result = await confirmPasswordResetAction(
      initialAuthActionState,
      buildForm({ token: 'tok', newPassword: 'new-password-strong' }),
    );
    expect(result).toEqual({ ok: true });
    expect(confirmPasswordResetMock).toHaveBeenCalledWith(
      { token: 'tok', newPassword: 'new-password-strong' },
      expect.any(Object),
    );
  });

  it('WEAK_PASSWORD → formError 포함', async () => {
    confirmPasswordResetMock.mockResolvedValue({ ok: false, code: 'WEAK_PASSWORD' });
    const result = await confirmPasswordResetAction(
      initialAuthActionState,
      buildForm({ token: 'tok', newPassword: 'short' }),
    );
    expect(result).toMatchObject({ ok: false, code: 'WEAK_PASSWORD' });
    if (!result.ok) {
      expect(typeof result.formError).toBe('string');
    }
  });

  it('빈 토큰 → TOKEN_INVALID', async () => {
    const result = await confirmPasswordResetAction(
      initialAuthActionState,
      buildForm({ token: '', newPassword: 'some-password' }),
    );
    expect(result).toMatchObject({ ok: false, code: 'TOKEN_INVALID' });
    expect(confirmPasswordResetMock).not.toHaveBeenCalled();
  });
});
