/**
 * PageView Logging Proxy Tests - SPEC-STATS-001 (TDD RED phase).
 *
 * Test coverage for PageView logging in proxy.ts:
 * - AC-STATS-001: Page views logged to page_views table
 * - AC-STATS-006: Bot User-Agents excluded from statistics
 * - Bot exclusion patterns
 * - /api/* and /admin/* path exclusion
 * - UV dedup via session hash
 * - Existing proxy auth behavior unaffected (baseline verification)
 *
 * CRITICAL: Run existing proxy.test.ts first as baseline before any PageView changes land
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getInstallStatus = vi.fn();
const getSiteLockStatus = vi.fn();
const mockAuthFn = vi.fn().mockResolvedValue(null);

// Mock dependencies
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
    // PageView logging mocks
    pageView: {
      create: vi.fn().mockResolvedValue({}),
    },
    // DailyStat for existing stats
    dailyVisit: {
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/lib/install/site-status', () => ({
  getInstallStatus: (...args: unknown[]) => getInstallStatus(...args),
}));

vi.mock('@/lib/install/sitelock', () => ({
  getSiteLockStatus: (...args: unknown[]) => getSiteLockStatus(...args),
}));

import { prisma as _prisma } from './lib/db/prisma';

// vi.mock는 런타임에만 적용되므로 컴파일 타임에는 실제 Prisma 타입으로 추론된다.
// mock 메서드(.mock, .mockReset 등)에 접근하기 위해 any로 캐스트.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma: any = _prisma;

beforeEach(() => {
  getInstallStatus.mockReset();
  getSiteLockStatus.mockReset();
  getSiteLockStatus.mockResolvedValue({ enabled: false, allowlist: [] });
  delete process.env.INSTALL_LOCK;

  // Reset Prisma mocks
  prisma.pageView.create.mockReset();
  prisma.dailyVisit.upsert.mockReset();
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
// BASELINE: Verify existing auth behavior unaffected (CRITICAL - run first)
// ---------------------------------------------------------------------------

describe('proxy — baseline auth behavior (existing proxy.test.ts behavior preserved)', () => {
  beforeEach(() => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'http' },
    });
  });

  it('baseline: shall return HTTP 410 on /install when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/install'));
    expect(res.status).toBe(410);
  });

  it('baseline: shall allow /api/install/rewrite-test/* even when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/api/install/rewrite-test/abc'));
    expect(res.status).toBe(200);
  });

  it('baseline: shall redirect to /install when not installed', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/admin'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/install');
  });

  it('baseline: SiteLock 503 when enabled and IP not in allowlist', async () => {
    getSiteLockStatus.mockResolvedValue({
      enabled: true,
      allowlist: ['10.0.0.1'],
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo', { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).toBe(503);
  });

  it('baseline: shall bypass SiteLock for /admin/* paths', async () => {
    getSiteLockStatus.mockResolvedValue({ enabled: true, allowlist: ['10.0.0.1'] });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/admin/dashboard', { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).not.toBe(503);
  });

  it('baseline: shall set HSTS header when site scheme is https', async () => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'https' },
    });
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/foo'));
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-STATS-001 & AC-STATS-006: PageView logging with bot and path exclusion
// ---------------------------------------------------------------------------

describe('proxy — PageView logging (AC-STATS-001, AC-STATS-006)', () => {
  beforeEach(() => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'https' },
    });
  });

  it('AC-STATS-001: shall log page view to page_views table for normal page request', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          path: '/about',
          isMobile: false,
        }),
      })
    );
  });

  it('AC-STATS-006: shall exclude Googlebot from statistics', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-006: shall exclude Bingbot from statistics', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-006: shall exclude Facebook Crawler from statistics', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-006: shall exclude Twitterbot from statistics', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'Twitterbot/1.0',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-006: shall exclude generic bots with "bot" in User-Agent', async () => {
    const { proxy } = await loadProxy();
    const res = await proxy(makeReq('/about', {
      'user-agent': 'SomeRandomBot/1.0',
    }));

    expect(res.status).toBe(200);
    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-006: shall exclude crawling, spider, and crawl User-Agents', async () => {
    const { proxy } = await loadProxy();
    const crawlAgents = [
      'MyCrawler/1.0',
      'TestSpider/2.0',
      'SiteCrawler/3.0',
    ];

    for (const agent of crawlAgents) {
      await proxy(makeReq('/about', { 'user-agent': agent }));
    }

    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-001: shall log page views for legitimate browser User-Agents', async () => {
    const { proxy } = await loadProxy();
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];

    for (const browser of browsers) {
      await proxy(makeReq('/about', { 'user-agent': browser }));
    }

    expect(prisma.pageView.create).toHaveBeenCalledTimes(4);
  });

  it('AC-STATS-001: shall exclude /api/* paths from PageView logging', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/api/trpc/user.getStats', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/api/auth/callback', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/api/health', { 'user-agent': 'Mozilla/5.0' }));

    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-001: shall exclude /admin/* paths from PageView logging', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/admin/dashboard', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/admin/members', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/admin/settings', { 'user-agent': 'Mozilla/5.0' }));

    expect(prisma.pageView.create).not.toHaveBeenCalled();
  });

  it('AC-STATS-001: shall log regular page views (not /api/* or /admin/*)', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/about', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/contact', { 'user-agent': 'Mozilla/5.0' }));
    await proxy(makeReq('/board/free', { 'user-agent': 'Mozilla/5.0' }));

    expect(prisma.pageView.create).toHaveBeenCalledTimes(3);
  });

  it('AC-STATS-001: shall correctly detect mobile vs desktop User-Agents', async () => {
    const { proxy } = await loadProxy();
    // Mobile user agents
    const mobileAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    ];

    for (const agent of mobileAgents) {
      await proxy(makeReq('/mobile-test', { 'user-agent': agent }));
    }

    expect(prisma.pageView.create).toHaveBeenCalledTimes(3);
    // Verify isMobile flag was set correctly (check mock calls)
    const calls = prisma.pageView.create.mock.calls as Array<
      [{ data: { isMobile: boolean } }]
    >;
    calls.forEach((call) => {
      expect(call[0].data.isMobile).toBe(true);
    });
  });

  it('AC-STATS-001: shall set desktop isMobile=false for non-mobile User-Agents', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/desktop-test', {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }));

    const calls = prisma.pageView.create.mock.calls;
    expect(calls[0][0].data.isMobile).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UV Dedup via Session Hash (AC-STATS-001)
// ---------------------------------------------------------------------------

describe('proxy — UV deduplication via session hash (AC-STATS-001)', () => {
  beforeEach(() => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'https' },
    });
  });

  it('AC-STATS-001: shall generate session-based visitorId hash for UV tracking', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/test-page', {
      'user-agent': 'Mozilla/5.0',
      'cookie': 'session=abc123',
    }));

    expect(prisma.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitorId: expect.any(String),
          path: '/test-page',
        }),
      })
    );

    // Verify visitorId is a hash (hex string of expected length)
    const visitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;
    expect(visitorId).toMatch(/^[a-f0-9]+$/);
    expect(visitorId.length).toBeGreaterThan(0);
  });

  it('AC-STATS-001: shall generate same visitorId for same session (UV dedup)', async () => {
    const { proxy } = await loadProxy();
    const sessionCookie = 'session=abc123';
    const userAgent = 'Mozilla/5.0';

    // First request
    await proxy(makeReq('/page1', {
      'user-agent': userAgent,
      'cookie': sessionCookie,
    }));

    const firstVisitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;

    // Reset mock
    prisma.pageView.create.mockReset();

    // Second request with same session
    await proxy(makeReq('/page2', {
      'user-agent': userAgent,
      'cookie': sessionCookie,
    }));

    const secondVisitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;

    expect(firstVisitorId).toBe(secondVisitorId);
  });

  it('AC-STATS-001: shall generate different visitorId for different sessions', async () => {
    const { proxy } = await loadProxy();
    const userAgent = 'Mozilla/5.0';

    // First session
    await proxy(makeReq('/page1', {
      'user-agent': userAgent,
      'cookie': 'session=session1',
    }));

    const firstVisitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;

    // Reset mock
    prisma.pageView.create.mockReset();

    // Second session
    await proxy(makeReq('/page2', {
      'user-agent': userAgent,
      'cookie': 'session=session2',
    }));

    const secondVisitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;

    expect(firstVisitorId).not.toBe(secondVisitorId);
  });

  it('AC-STATS-001: shall handle missing session cookie gracefully', async () => {
    const { proxy } = await loadProxy();
    await proxy(makeReq('/test-page', {
      'user-agent': 'Mozilla/5.0',
      // No cookie header
    }));

    // Should still create a PageView with some visitorId
    expect(prisma.pageView.create).toHaveBeenCalled();
    const visitorId = prisma.pageView.create.mock.calls[0][0].data.visitorId;
    expect(visitorId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// PageView Data Integrity
// ---------------------------------------------------------------------------

describe('proxy — PageView data integrity (AC-STATS-001)', () => {
  beforeEach(() => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date(), scheme: 'https' },
    });
  });

  it('AC-STATS-001: shall record correct date and hour for page view', async () => {
    const { proxy } = await loadProxy();
    const testTime = new Date('2026-07-06T14:30:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(testTime.getTime());

    await proxy(makeReq('/time-test', { 'user-agent': 'Mozilla/5.0' }));

    const pageViewData = prisma.pageView.create.mock.calls[0][0].data;

    expect(pageViewData.date).toBeInstanceOf(Date);
    expect(pageViewData.hour).toBe(14); // 14:30 UTC -> hour 14
  });

  it('AC-STATS-001: shall record full path including query parameters', async () => {
    const { proxy } = await loadProxy();
    const fullPath = '/search?q=test&page=2&sort=date';
    await proxy(makeReq(fullPath, { 'user-agent': 'Mozilla/5.0' }));

    const pageViewData = prisma.pageView.create.mock.calls[0][0].data;
    expect(pageViewData.path).toBe(fullPath);
  });

  it('AC-STATS-001: shall handle non-ASCII paths correctly', async () => {
    const { proxy } = await loadProxy();
    const koreanPath = '/board/free/한글제목';
    await proxy(makeReq(koreanPath, { 'user-agent': 'Mozilla/5.0' }));

    const pageViewData = prisma.pageView.create.mock.calls[0][0].data;
    expect(pageViewData.path).toBeTruthy();
  });
});
