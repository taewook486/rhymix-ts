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
} = vi.hoisted(() => ({
  headersGetMock: vi.fn((name: string) => {
    if (name === 'x-forwarded-for') return '203.0.113.5';
    if (name === 'user-agent') return 'vitest-ua';
    return null;
  }),
  signupMock: vi.fn(),
  verifyEmailMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: headersGetMock }),
}));

vi.mock('@rhymix-ts/auth', () => ({
  signup: signupMock,
  verifyEmail: verifyEmailMock,
  // NoopMailDispatcher는 actions.ts에서 사용되므로 가벼운 더블 제공.
  NoopMailDispatcher: class {
    async dispatch(): Promise<void> {
      /* noop */
    }
  },
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

vi.mock('@/lib/auth/config', () => ({
  signIn: signInMock,
}));

import {
  signupAction,
  loginAction,
  verifyEmailAction,
  initialAuthActionState,
} from './actions';

beforeEach(() => {
  signupMock.mockReset();
  verifyEmailMock.mockReset();
  signInMock.mockReset();
  headersGetMock.mockClear();
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
