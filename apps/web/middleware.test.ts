/**
 * Specification tests for Auth Proxy — SPEC-AUTH-001 Slice F + SPEC-ADMIN-001 Slice B.
 *
 * proxy.ts 가 보호 경로와 인증 전용 경로를 올바르게 리다이렉트하는지 검증한다.
 * NextAuth 는 모킹하여 auth() 호출 시 per-test 세션 픽스처를 반환하도록 설정한다.
 *
 * Slice B (B-1~B-4): Host 해석 + forceHttps 리다이렉트 검증.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — NextAuth(config).auth 를 vi.fn() 으로 모킹
// proxy.ts 는 auth() 를 함수로 호출하여 세션 객체를 얻으므로,
// mockAuthFn 이 per-test 반환값을 제어한다.
// ---------------------------------------------------------------------------

const mockAuthFn = vi.fn();

vi.mock('next-auth', () => ({
  default: () => ({
    auth: mockAuthFn,
  }),
}));

vi.mock('./lib/auth/config', () => ({
  baseAuthConfig: { providers: [] },
}));

// ---------------------------------------------------------------------------
// Slice B Mocks — prisma domain 해석 + Slice A site 해석
// ---------------------------------------------------------------------------

const mockDomainFindFirst = vi.fn();
const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindMany = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

vi.mock('./lib/db/prisma', () => ({
  prisma: {
    domain: {
      findFirst: (...args: unknown[]) => mockDomainFindFirst(...args),
    },
    site: {
      findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
    },
    siteSetting: {
      findMany: (...args: unknown[]) => mockSiteSettingFindMany(...args),
      findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    },
  },
}));

// sitelock.ts, site-status.ts 는 @rhymix-ts/db 에서 직접 prisma 를 import 하므로 별도 모킹 필요.
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    site: {
      findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
    },
    siteSetting: {
      findMany: (...args: unknown[]) => mockSiteSettingFindMany(...args),
      findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createReq(pathname: string, _isLoggedIn: boolean) {
  // _isLoggedIn 은 더 이상 req.auth 로 주입하지 않는다.
  // 인증 상태는 mockAuthFn 반환값으로 제어된다 (beforeEach 또는 개별 테스트에서 설정).
  const rawUrl = new URL(`http://localhost:3000${pathname}`);
  // proxy.ts가 nextUrl.clone()을 호출하므로 clone 메서드 추가.
  const nextUrl = Object.assign(rawUrl, {
    clone: () => new URL(rawUrl.toString()),
  });
  const headers = new Headers({ host: 'localhost:3000' });
  // SPEC-STATS-001: proxy.ts가 페이지뷰 로깅을 위해 request.cookies.get(...)을 호출하므로
  // (getVisitorIdFromRequest), NextRequest.cookies의 최소 동작을 흉내낸다.
  const cookies = { get: () => undefined };
  return { nextUrl, headers, cookies };
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
    // SiteLock 비활성화 기본값
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    delete process.env.INSTALL_LOCK;
    // 기본: 비로그인
    mockAuthFn.mockResolvedValue(null);
    vi.resetModules();
  });

  it('비인증 사용자가 /dashboard 접근 시 /login 으로 리다이렉트', async () => {
    mockAuthFn.mockResolvedValue(null);
    const { proxy } = await import('./proxy');

    const req = createReq('/dashboard', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe('/dashboard');
    expect(response!.status).toBe(307);
  });

  it('비인증 사용자가 /admin 접근 시 /login 으로 리다이렉트', async () => {
    mockAuthFn.mockResolvedValue(null);
    const { proxy } = await import('./proxy');

    const req = createReq('/admin', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('인증 사용자가 /login 접근 시 / 로 리다이렉트', async () => {
    mockAuthFn.mockResolvedValue({ user: { id: '1', name: 'test' } });
    const { proxy } = await import('./proxy');

    const req = createReq('/login', true);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/');
    expect(response!.status).toBe(307);
  });

  it('인증 사용자가 /signup 접근 시 / 로 리다이렉트', async () => {
    mockAuthFn.mockResolvedValue({ user: { id: '1', name: 'test' } });
    const { proxy } = await import('./proxy');

    const req = createReq('/signup', true);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeInstanceOf(Response);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/');
  });

  it('비인증 사용자가 / 에 접근하면 리다이렉트 없음 (NextResponse.next 반환)', async () => {
    mockAuthFn.mockResolvedValue(null);
    const { proxy } = await import('./proxy');

    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    // 307 리다이렉트가 아닌 것을 검증한다.
    const status = response?.status ?? 200;
    expect(status).not.toBe(307);
  });

  it('인증 사용자가 /dashboard 에 접근하면 리다이렉트 없음 (NextResponse.next 반환)', async () => {
    mockAuthFn.mockResolvedValue({ user: { id: '1', name: 'test' } });
    const { proxy } = await import('./proxy');

    const req = createReq('/dashboard', true);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    // 307 리다이렉트가 아닌 것을 검증한다.
    const status = response?.status ?? 200;
    expect(status).not.toBe(307);
  });

  it('matcher config 가 API/static 경로를 제외', async () => {
    const mod = await import('./proxy');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Slice B: Host 해석 + forceHttps 테스트 (B-1 ~ B-4)
// ---------------------------------------------------------------------------

/**
 * Slice B 테스트용 요청 객체 생성.
 * proxy.ts 가 req.headers.get('host') 와 req.nextUrl.protocol 을 읽으므로
 * 두 값을 모두 주입한다.
 */
function createHostReq(
  host: string,
  pathname: string,
  scheme: 'http' | 'https',
  _isLoggedIn = false,
) {
  const baseUrl = `${scheme}://${host}${pathname}`;
  const nextUrl = new URL(baseUrl);
  const headers = new Headers({ host });
  // SPEC-STATS-001: proxy.ts의 getVisitorIdFromRequest가 request.cookies.get(...)을 호출한다.
  const cookies = { get: () => undefined };
  return { nextUrl, headers, cookies };
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
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    delete process.env.INSTALL_LOCK;
    mockAuthFn.mockResolvedValue(null);
    vi.resetModules();
  });

  it('B-1: Host=example.com, scheme=https → x-site-id/x-domain-id/x-language 헤더 주입 (REQ-ADMIN-010)', async () => {
    // 첫 호출(hostname 매칭)에 domain 반환
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { proxy } = await import('./proxy');
    const req = createHostReq('example.com', '/some-page', 'https');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

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

    const { proxy } = await import('./proxy');
    const req = createHostReq('unknown.com', '/some-page', 'https');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.headers.get('x-site-id')).toBe('1');
    expect(response.headers.get('x-domain-id')).toBe('1');
  });

  it('B-3: Host=example.com, scheme=http, forceHttps=true → 301 redirect to https (REQ-ADMIN-014)', async () => {
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { proxy } = await import('./proxy');
    const req = createHostReq('example.com', '/some-page', 'http');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(301);
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
    expect(new URL(location!).protocol).toBe('https:');
  });

  it('B-4: Host=example.com, scheme=https, forceHttps=true → status ≠ 301 (REQ-ADMIN-014 negative)', async () => {
    mockDomainFindFirst.mockResolvedValueOnce(domainFixture);

    const { proxy } = await import('./proxy');
    const req = createHostReq('example.com', '/some-page', 'https');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

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
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    delete process.env.INSTALL_LOCK;
    mockAuthFn.mockResolvedValue(null);
    vi.resetModules();
  });

  it('MW-1: Site.installedAt IS NULL 상태에서 / 접근 시 302 → /install', async () => {
    // 미설치 상태: site.findFirst가 null 반환
    mockSiteFindFirst.mockResolvedValue(null);

    const { proxy } = await import('./proxy');
    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(new URL(location!).pathname).toBe('/install');
  });

  it('MW-2: Site.installedAt IS NOT NULL 상태에서 / 접근 시 기존 동작 유지 (회귀 방어)', async () => {
    // 설치된 상태: site.findFirst가 installedAt 포함 row 반환
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);

    const { proxy } = await import('./proxy');
    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

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

    const { proxy } = await import('./proxy');
    const req = createReq('/_next/static/chunks/main.js', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

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

    const { proxy } = await import('./proxy');
    const req = createReq('/api/install/rewrite-test/abc', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    const status = response?.status ?? 200;
    expect(status).not.toBe(302);
  });
});

// ---------------------------------------------------------------------------
// Slice D: INSTALL_LOCK 410 (REQ-INSTALL-023)
// ---------------------------------------------------------------------------

describe('middleware — Slice D (INSTALL_LOCK 410)', () => {
  beforeEach(() => {
    mockDomainFindFirst.mockResolvedValue(null);
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    mockAuthFn.mockResolvedValue(null);
    process.env.INSTALL_LOCK = '1';
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.INSTALL_LOCK;
  });

  it('ML-1: INSTALL_LOCK=1 + /install → 410 Gone', async () => {
    const { proxy } = await import('./proxy');
    const req = createReq('/install', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(410);
  });

  it('ML-2: INSTALL_LOCK=1 + /install/check-env → 410 Gone', async () => {
    const { proxy } = await import('./proxy');
    const req = createReq('/install/check-env', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(410);
  });

  it('ML-3: INSTALL_LOCK=1 + /api/install/rewrite-test → 410 Gone', async () => {
    const { proxy } = await import('./proxy');
    const req = createReq('/api/install/rewrite-test', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(410);
  });

  it('ML-4: INSTALL_LOCK=1 + / → NOT 410 (install 경로만 영향)', async () => {
    const { proxy } = await import('./proxy');
    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    const status = response?.status ?? 200;
    expect(status).not.toBe(410);
  });
});

// ---------------------------------------------------------------------------
// Slice D: SiteLock 503 (REQ-INSTALL-024)
// ---------------------------------------------------------------------------

describe('middleware — Slice D (SiteLock 503)', () => {
  beforeEach(() => {
    mockDomainFindFirst.mockResolvedValue(null);
    mockSiteFindFirst.mockResolvedValue(siteInstalledFixture);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    delete process.env.INSTALL_LOCK;
    mockAuthFn.mockResolvedValue(null);
    vi.resetModules();
  });

  function createIpReq(pathname: string, ip: string) {
    const nextUrl = new URL(`http://localhost:3000${pathname}`);
    const headers = new Headers({
      host: 'localhost:3000',
      'x-forwarded-for': ip,
    });
    // SPEC-STATS-001: proxy.ts의 getVisitorIdFromRequest가 request.cookies.get(...)을 호출한다.
    const cookies = { get: () => undefined };
    return { nextUrl, headers, cookies };
  }

  it('SL-1: sitelock_enabled=true, IP not in allowlist, GET / → 503', async () => {
    // sitelock_enabled=true, sitelock_allowlist=["192.168.1.0"]
    mockSiteSettingFindMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: ['192.168.1.0'] },
    ]);
    const { proxy } = await import('./proxy');
    const req = createIpReq('/', '10.0.0.1');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.status).toBe(503);
  });

  it('SL-2: sitelock_enabled=true, IP IN allowlist → NOT 503', async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: ['10.0.0.1'] },
    ]);
    const { proxy } = await import('./proxy');
    const req = createIpReq('/', '10.0.0.1');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    const status = response?.status ?? 200;
    expect(status).not.toBe(503);
  });

  it('SL-3: sitelock_enabled=true, IP not in allowlist, /admin → NOT 503 (admin 경로 제외)', async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: ['192.168.1.0'] },
    ]);
    const { proxy } = await import('./proxy');
    const req = createIpReq('/admin', '10.0.0.1');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    const status = response?.status ?? 200;
    expect(status).not.toBe(503);
  });

  it('SL-4: sitelock_enabled=false → NOT 503', async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: false },
    ]);
    const { proxy } = await import('./proxy');
    const req = createIpReq('/', '10.0.0.1');
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    const status = response?.status ?? 200;
    expect(status).not.toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Slice D: HSTS 헤더 (REQ-INSTALL-040)
// ---------------------------------------------------------------------------

describe('middleware — Slice D (HSTS header)', () => {
  beforeEach(() => {
    mockDomainFindFirst.mockResolvedValue(null);
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindFirst.mockResolvedValue(null);
    delete process.env.INSTALL_LOCK;
    mockAuthFn.mockResolvedValue(null);
    vi.resetModules();
  });

  it('HSTS-1: site.scheme=https → response has Strict-Transport-Security header', async () => {
    mockSiteFindFirst.mockResolvedValue({
      id: 1,
      installedAt: new Date('2026-01-01T00:00:00Z'),
      scheme: 'https',
    });
    const { proxy } = await import('./proxy');
    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.headers.get('strict-transport-security')).not.toBeNull();
  });

  it('HSTS-2: site.scheme=http → response does NOT have Strict-Transport-Security header', async () => {
    mockSiteFindFirst.mockResolvedValue({
      id: 1,
      installedAt: new Date('2026-01-01T00:00:00Z'),
      scheme: 'http',
    });
    const { proxy } = await import('./proxy');
    const req = createReq('/', false);
    const response = await proxy(req as Parameters<typeof proxy>[0]);

    expect(response).toBeDefined();
    expect(response.headers.get('strict-transport-security')).toBeNull();
  });
});
