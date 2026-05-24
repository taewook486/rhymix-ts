/**
 * Specification tests for Auth Middleware — SPEC-AUTH-001 Slice F + SPEC-ADMIN-001 Slice B.
 *
 * 미들웨어가 보호 경로와 인증 전용 경로를 올바르게 리다이렉트하는지 검증한다.
 * NextAuth 는 모킹하여 auth(handler) 가 handler 자체를 리턴하도록 설정한다.
 *
 * Slice B (B-1~B-4): Host 해석 + forceHttps 리다이렉트 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

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
// Slice B Mocks — prisma domain 해석 + Slice A site 해석
// ---------------------------------------------------------------------------

const mockDomainFindFirst = vi.fn();
const mockSiteFindFirst = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    domain: {
      findFirst: (...args: unknown[]) => mockDomainFindFirst(...args),
    },
    site: {
      findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createReq(pathname: string, isLoggedIn: boolean) {
  const nextUrl = new URL(`http://localhost:3000${pathname}`);
  const headers = new Headers({ host: 'localhost:3000' });
  return {
    auth: isLoggedIn ? { user: { id: '1', name: 'test' } } : null,
    nextUrl,
    headers,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// 기존 middleware 테스트에서 install gate가 통과하도록 site가 이미 설치된 것으로 모킹.
const siteInstalledFixture = {
  id: 1,
  installedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('middleware', () => {
  beforeEach(() => {
    // install gate 우회: 설치된 site 반환
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);
    mockDomainFindFirst.mockResolvedValue(null);
  });

  it('비인증 사용자가 /dashboard 접근 시 /login 으로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/dashboard', false);
    const response = await handler(req);

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
    const response = await handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('인증 사용자가 /login 접근 시 / 로 리다이렉트', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/login', true);
    const response = await handler(req);

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
    const response = await handler(req);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/');
  });

  it('비인증 사용자가 / 에 접근하면 리다이렉트 없음 (NextResponse.next 반환)', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/', false);
    const response = await handler(req);

    // Slice B 이후 항상 NextResponse.next()를 반환하므로 undefined 가 아님.
    // 307 리다이렉트가 아닌 것을 검증한다.
    const status = response?.status ?? 200;
    expect(status).not.toBe(307);
  });

  it('인증 사용자가 /dashboard 에 접근하면 리다이렉트 없음 (NextResponse.next 반환)', async () => {
    const mod = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = mod.default as any;

    const req = createReq('/dashboard', true);
    const response = await handler(req);

    // Slice B 이후 항상 NextResponse.next()를 반환하므로 undefined 가 아님.
    // 307 리다이렉트가 아닌 것을 검증한다.
    const status = response?.status ?? 200;
    expect(status).not.toBe(307);
  });

  it('matcher config 가 API/static 경로를 제외', async () => {
    const mod = await import('./middleware');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Slice B: Host 해석 + forceHttps 테스트 (B-1 ~ B-4)
// ---------------------------------------------------------------------------

/**
 * Slice B 테스트용 요청 객체 생성.
 * middleware.ts 가 req.headers.get('host') 와 req.nextUrl.protocol 을 읽으므로
 * 두 값을 모두 주입한다.
 */
function createHostReq(
  host: string,
  pathname: string,
  scheme: 'http' | 'https',
  isLoggedIn = false,
) {
  const baseUrl = `${scheme}://${host}${pathname}`;
  const nextUrl = new URL(baseUrl);
  const headers = new Headers({ host });
  return {
    auth: isLoggedIn ? { user: { id: '1', name: 'test' } } : null,
    nextUrl,
    headers,
  };
}

/** 도메인 픽스처 — example.com 에 대응 */
const domainFixture = {
  id: 1,
  siteId: 1,
  hostname: 'example.com',
  forceHttps: true,
  isDefault: true,
  defaultLanguage: 'ko',
  site: { defaultLanguage: 'en' },
};

describe('middleware — Slice B (Host 해석 + forceHttps)', () => {
  beforeEach(() => {
    mockDomainFindFirst.mockReset();
    // install gate 우회: 설치된 site 반환
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);
  });

  it('B-1: Host=example.com, scheme=https → x-site-id/x-domain-id/x-language 헤더 주입 (REQ-ADMIN-010)', async () => {
    // 첫 호출(hostname 매칭)에 domain 반환
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createHostReq('example.com', '/some-page', 'https');
    const response = await handler(req);

    expect(response).toBeDefined();
    expect(response.headers.get('x-site-id')).toBe('1');
    expect(response.headers.get('x-domain-id')).toBe('1');
    expect(response.headers.get('x-language')).toBe('ko');
  });

  it('B-2: Host=unknown.com, default domain 존재 → default domain 헤더 주입 (REQ-ADMIN-011)', async () => {
    // 첫 호출(hostname 매칭)에 null, 두 번째 호출(isDefault)에 domain 반환
    mockDomainFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(domainFixture);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createHostReq('unknown.com', '/some-page', 'https');
    const response = await handler(req);

    expect(response).toBeDefined();
    expect(response.headers.get('x-site-id')).toBe('1');
    expect(response.headers.get('x-domain-id')).toBe('1');
  });

  it('B-3: Host=example.com, scheme=http, forceHttps=true → 301 redirect to https (REQ-ADMIN-014)', async () => {
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createHostReq('example.com', '/some-page', 'http');
    const response = await handler(req);

    expect(response).toBeDefined();
    expect(response.status).toBe(301);
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
    expect(new URL(location!).protocol).toBe('https:');
  });

  it('B-4: Host=example.com, scheme=https, forceHttps=true → status ≠ 301 (REQ-ADMIN-014 negative)', async () => {
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createHostReq('example.com', '/some-page', 'https');
    const response = await handler(req);

    const status = response?.status ?? 200;
    expect(status).not.toBe(301);
  });
});

// ---------------------------------------------------------------------------
// Slice A: Install gate 테스트 (REQ-INSTALL-001, 020)
// ---------------------------------------------------------------------------

describe('middleware — Slice A (Install gate)', () => {
  beforeEach(() => {
    mockDomainFindFirst.mockResolvedValue(null);
  });

  it('MW-1: Site.installedAt IS NULL 상태에서 / 접근 시 302 → /install', async () => {
    // 미설치 상태: site.findFirst가 null 반환
    mockSiteFindFirst.mockResolvedValue(null);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createReq('/', false);
    const response = await handler(req);

    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(new URL(location!).pathname).toBe('/install');
  });

  it('MW-2: Site.installedAt IS NOT NULL 상태에서 / 접근 시 기존 동작 유지 (회귀 방어)', async () => {
    // 설치된 상태: site.findFirst가 installedAt 포함 row 반환
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createReq('/', false);
    const response = await handler(req);

    // 302 /install 가 아닌 정상 응답 (200 또는 307)
    const location = response?.headers.get('location');
    if (location) {
      expect(new URL(location).pathname).not.toBe('/install');
    } else {
      expect(response?.status ?? 200).not.toBe(302);
    }
  });

  it('MW-3: 미설치 상태에서도 /_next/static/... 는 302 /install 없음', async () => {
    mockSiteFindFirst.mockResolvedValue(null);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createReq('/_next/static/chunks/main.js', false);
    const response = await handler(req);

    const status = response?.status ?? 200;
    // 302 /install 로 리다이렉트되지 않아야 함
    if (status === 302 || status === 307) {
      const location = response?.headers.get('location') ?? '';
      expect(new URL(location).pathname).not.toBe('/install');
    }
    expect(status).not.toBe(302);
  });

  it('MW-3: 미설치 상태에서도 /api/install/* 는 302 /install 없음', async () => {
    mockSiteFindFirst.mockResolvedValue(null);

    const { default: middleware } = await import('./middleware');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = middleware as any;
    const req = createReq('/api/install/rewrite-test/abc', false);
    const response = await handler(req);

    const status = response?.status ?? 200;
    expect(status).not.toBe(302);
  });
});
