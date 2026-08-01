/**
 * Proxy (구 middleware) 테스트 — SPEC-INSTALL-001.
 *
 * 커버리지:
 *  - REQ-INSTALL-001: 미설치 시 /install 리다이렉트
 *  - REQ-INSTALL-020: 설치 상태 게이트
 *  - REQ-INSTALL-023: INSTALL_LOCK + 410 Gone 처리
 *  - REQ-INSTALL-024: SiteLock 활성화 시 503 차단 + IP allowlist
 *  - REQ-INSTALL-040: scheme=https + 설치 완료 시 HSTS 헤더
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getInstallStatus = vi.fn();
const getSiteLockStatus = vi.fn();
const mockAuthFn = vi.fn().mockResolvedValue(null);

// proxy.ts가 next-auth를 직접 import하므로 실제 next-auth가 로드되지 않도록 mock.
// (next-auth/lib/env.js → next/server ESM 해석 실패 방지)
vi.mock('next-auth', () => ({
  default: () => ({ auth: mockAuthFn }),
}));

vi.mock('./lib/auth/config', () => ({
  baseAuthConfig: { providers: [] },
}));

vi.mock('./lib/db/prisma', () => ({
  prisma: {
    domain: { findFirst: vi.fn().mockResolvedValue(null) },
    site: { findFirst: vi.fn().mockResolvedValue(null) },
    siteSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/install/site-status', () => ({
  getInstallStatus: (...args: unknown[]) => getInstallStatus(...args),
}));

vi.mock('@/lib/install/sitelock', () => ({
  getSiteLockStatus: (...args: unknown[]) => getSiteLockStatus(...args),
}));

beforeEach(() => {
  getInstallStatus.mockReset();
  getSiteLockStatus.mockReset();
  // 기본값: SiteLock 비활성.
  getSiteLockStatus.mockResolvedValue({ enabled: false, allowlist: [] });
  delete process.env.INSTALL_LOCK;
});

afterEach(() => {
  delete process.env.INSTALL_LOCK;
});

function makeReq(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(`http://example.com${path}`), {
    headers: new Headers(headers),
  });
}

async function loadProxy() {
  return await import('./proxy');
}

// ---------------------------------------------------------------------------
// 기존 (Slice B/D) 동작 회귀 테스트
// ---------------------------------------------------------------------------

describe('proxy — install gate', () => {
  it('the system shall return HTTP 410 on /install when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    getInstallStatus.mockResolvedValue({ installed: true, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/install'));
    expect(res.status).toBe(410);
  });

  it('the system shall allow /api/install/rewrite-test/* even when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    getInstallStatus.mockResolvedValue({ installed: true, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/api/install/rewrite-test/abc'));
    expect(res.status).toBe(200);
  });

  it('the system shall redirect to /install when not installed and request is outside install scope', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/admin'));
    // REQ-INSTALL-001: 미설치 시 302 Temporary Redirect → /install
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/install');
  });

  it('the system shall pass through /install routes when not installed', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/install/check-env'));
    expect(res.status).toBe(200);
  });

  it('the system shall pass through /api/install/* routes when not installed', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/api/install/license'));
    expect(res.status).toBe(200);
  });

  it('the system shall allow /install/complete when INSTALL_LOCK=1 (one-shot welcome)', async () => {
    process.env.INSTALL_LOCK = '1';
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'http' },
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/install/complete'));
    expect(res.status).toBe(200);
  });

  it('the system shall pass through ordinary routes when already installed', async () => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'http' },
    });
    const { proxy } = await loadProxy();
    // /about 은 protectedRoutes에 포함되지 않는 공개 경로 — install gate만 검증.
    const res = await proxy(makeReq('/about'));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// REQ-INSTALL-024: SiteLock 503
// ---------------------------------------------------------------------------

describe('proxy — REQ-INSTALL-024 SiteLock', () => {
  beforeEach(() => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'http' },
    });
  });

  it('the system shall pass through when SiteLock is disabled', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: false, allowlist: [] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo'));
    expect(res.status).toBe(200);
  });

  it('the system shall pass through when caller IP is in the allowlist', async () => {
    getSiteLockStatus.mockResolvedValue({
      enabled: true,
      allowlist: ['203.0.113.7'],
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo', { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).toBe(200);
  });

  it('the system shall return 503 when SiteLock is enabled and IP is not in allowlist', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: true, allowlist: ['10.0.0.1'] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo', { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).toContain('text/html');
    const body = await res.text();
    expect(body).toContain('사이트 잠금');
    expect(body).toContain('203.0.113.7');
    expect(body).toContain('lang="ko"');
  });

  it('the system shall bypass SiteLock for /admin/* paths (auth-gated separately)', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: true, allowlist: ['10.0.0.1'] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/admin/dashboard', { 'x-forwarded-for': '203.0.113.7' }));
    // SiteLock은 우회되어 503이 아닌 응답 반환 (이후 auth gate에서 307 redirect 발생).
    expect(res.status).not.toBe(503);
  });

  it('the system shall bypass SiteLock for /api/auth/* paths', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: true, allowlist: ['10.0.0.1'] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/api/auth/signin', { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).toBe(200);
  });

  it('the system shall report unknown when no IP headers are present (and block if not allowlisted)', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: true, allowlist: ['10.0.0.1'] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo'));
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toContain('unknown');
  });
});

// ---------------------------------------------------------------------------
// REQ-INSTALL-040: HSTS
// ---------------------------------------------------------------------------

describe('proxy — REQ-INSTALL-040 HSTS', () => {
  it('the system shall set HSTS header when site scheme is https and installed', async () => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'https' },
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo'));
    expect(res.status).toBe(200);
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
  });

  it('the system shall not set HSTS header when site scheme is http', async () => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'http' },
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo'));
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('the system shall not set HSTS header when not installed (pre-install state)', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/install/check-env'));
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });
});
