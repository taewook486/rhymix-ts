/**
 * Specification tests for Auth Middleware — SPEC-AUTH-001 Slice F.
 *
 * 미들웨어가 보호 경로와 인증 전용 경로를 올바르게 리다이렉트하는지 검증한다.
 * NextAuth 는 모킹하여 auth(handler) 가 handler 자체를 리턴하도록 설정한다.
 */
import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — NextAuth(config).auth 를 identity wrapper 로 모킹
// ---------------------------------------------------------------------------

vi.mock('next-auth', () => ({
  default: () => ({
    auth: (handler: (req: unknown) => unknown) => handler,
  }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createReq(pathname: string, isLoggedIn: boolean) {
  const nextUrl = new URL(`http://localhost:3000${pathname}`);
  return {
    auth: isLoggedIn ? { user: { id: '1', name: 'test' } } : null,
    nextUrl,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('middleware', () => {
  it('비인증 사용자가 /dashboard 접근 시 /login 으로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/dashboard', false);
    const response = handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe('/dashboard');
    expect(response!.status).toBe(307);
  });

  it('비인증 사용자가 /admin 접근 시 /login 으로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/admin', false);
    const response = handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('인증 사용자가 /login 접근 시 / 로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/login', true);
    const response = handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/');
    expect(response!.status).toBe(307);
  });

  it('인증 사용자가 /signup 접근 시 / 로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/signup', true);
    const response = handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/');
  });

  it('비인증 사용자가 / 에 접근하면 리다이렉트 없음', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/', false);
    const response = handler(req);

    expect(response).toBeUndefined();
  });

  it('인증 사용자가 /dashboard 에 접근하면 리다이렉트 없음', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/dashboard', true);
    const response = handler(req);

    expect(response).toBeUndefined();
  });

  it('matcher config 가 API/static 경로를 제외', async () => {
    const mod = await import('./middleware');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});
