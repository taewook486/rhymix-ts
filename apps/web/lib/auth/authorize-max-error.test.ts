/**
 * credentialsProvider.authorize — 관리자가 저장한 "최대 로그인 실패 횟수" 반영.
 *
 * 이 테스트가 존재하는 이유: 관리자 회원 설정(apps/web/app/admin/members/settings)의
 * maxFailedAttempts 는 SiteSetting `member.login.maxFailedAttempts` 로 저장되지만,
 * authorize() 가 login() 에 maxErrorCount 를 넘기지 않아 packages/auth 의 기본값 5 가
 * 항상 쓰였다. 값을 3 으로 바꿔도 로그인 제한에 반영되지 않았다.
 * windowMinutes 는 저장 화면이 없어 이 테스트의 대상이 아니다(SPEC-LEGACY-PARITY-002 몫).
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loginMock, siteSettings } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  siteSettings: new Map<string, unknown>(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  login: loginMock,
  consumeAutoLoginMarker: vi.fn(),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    site: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
    // 키별로 저장된 값을 돌려준다. 없는 키는 null.
    siteSetting: {
      findUnique: vi.fn(async (args: { where: { siteId_key: { key: string } } }) => {
        const key = args.where.siteId_key.key;
        return siteSettings.has(key) ? { key, value: siteSettings.get(key) } : null;
      }),
    },
  },
}));

vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock('next-auth/providers/credentials', () => ({ default: (config: unknown) => config }));
vi.mock('./callbacks', () => ({
  createJwtCallback: () => vi.fn(),
  createSessionCallback: () => vi.fn(),
  createSignInCallback: () => vi.fn(),
}));

import { credentialsProvider } from './config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authorize = (credentialsProvider as any).authorize as (
  credentials: Record<string, unknown> | undefined,
  req?: Request,
) => Promise<unknown>;

function makeReq(): Request {
  return new Request('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'vitest-ua' },
  });
}

async function loginConfig(): Promise<Record<string, unknown>> {
  await authorize({ identifier: 'alice', password: 'pw' }, makeReq());
  expect(loginMock).toHaveBeenCalledTimes(1);
  const ctx = loginMock.mock.calls[0]![1] as { config: Record<string, unknown> };
  return ctx.config;
}

describe('authorize → login() 의 maxErrorCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    siteSettings.clear();
    loginMock.mockResolvedValue({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });

  it('저장된 값이 3 이면 login() 에 maxErrorCount 3 을 넘긴다', async () => {
    siteSettings.set('member.login.maxFailedAttempts', 3);

    const config = await loginConfig();

    expect(config.maxErrorCount).toBe(3);
  });

  it('저장된 값이 10 이면 10 을 넘긴다 (기본값 5 보다 큰 값도 반영)', async () => {
    siteSettings.set('member.login.maxFailedAttempts', 10);

    const config = await loginConfig();

    expect(config.maxErrorCount).toBe(10);
  });

  it('저장된 값이 없으면 지정하지 않아 login() 의 기본값(5)이 유지된다', async () => {
    const config = await loginConfig();

    expect(config.maxErrorCount).toBeUndefined();
  });

  it.each([0, -1, 2.5, '3', null, true])('쓸 수 없는 값(%j)은 무시하고 기본 동작을 유지한다', async (bad) => {
    siteSettings.set('member.login.maxFailedAttempts', bad);

    const config = await loginConfig();

    expect(config.maxErrorCount).toBeUndefined();
  });

  it('windowMinutes 는 건드리지 않는다 (저장 화면 없음, SPEC-LEGACY-PARITY-002 몫)', async () => {
    siteSettings.set('member.login.maxFailedAttempts', 3);

    const config = await loginConfig();

    expect(config.windowMinutes).toBeUndefined();
  });

  it('기존 CAPTCHA 설정 전달은 그대로다', async () => {
    siteSettings.set('security.captcha.login.enabled', true);
    siteSettings.set('security.captcha.turnstile.secretKey', 'sk');
    siteSettings.set('security.login.captchaThreshold', 2);
    siteSettings.set('member.login.maxFailedAttempts', 3);

    const config = await loginConfig();

    expect(config.captchaEnabled).toBe(true);
    expect(config.captchaSecretKey).toBe('sk');
    expect(config.captchaThreshold).toBe(2);
    expect(config.maxErrorCount).toBe(3);
  });
});
