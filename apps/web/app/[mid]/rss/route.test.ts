/**
 * route.test.ts — SPEC-FEED-001 Slice A (T-005)
 *
 * GET /{mid}/rss Route Handler 검증 — REQ-FEED-001,002,004,005.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveFeedXml = vi.fn();

vi.mock('@rhymix-ts/board/feed', () => ({
  resolveFeedXml: (...args: unknown[]) => mockResolveFeedXml(...args),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

describe('GET /[mid]/rss (SPEC-FEED-001 T-005)', () => {
  beforeEach(() => {
    mockResolveFeedXml.mockReset();
  });

  it('RSS-ROUTE-1 (REQ-FEED-002): 200 + application/rss+xml + 본문', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<rss></rss>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/rss', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    expect(await res.text()).toBe('<rss></rss>');
  });

  it('RSS-ROUTE-2 (REQ-FEED-004): x-site-id 헤더가 없으면 404', async () => {
    const { GET } = await import('./route.js');
    const req = new Request('https://example.com/notice/rss');
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });
    expect(res.status).toBe(404);
    expect(mockResolveFeedXml).not.toHaveBeenCalled();
  });

  it('RSS-ROUTE-3: resolveFeedXml 이 404 를 반환하면 그대로 전달한다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 404 });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/rss', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });
    expect(res.status).toBe(404);
  });

  it('RSS-ROUTE-4: resolveFeedXml 에 format="rss" 와 baseUrl 이 전달된다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<rss></rss>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/rss', {
      headers: { 'x-site-id': '1', host: 'example.com', 'x-forwarded-proto': 'https' },
    });
    await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(mockResolveFeedXml).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'rss',
        siteId: 1,
        mid: 'notice',
        baseUrl: 'https://example.com',
      }),
    );
  });

  it('RSS-ROUTE-5 (REQ-FEED-041/T-008): 200 응답에 Cache-Control s-maxage/SWR 헤더가 포함된다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<rss></rss>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/rss', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600',
    );
  });

  it('RSS-ROUTE-6 (REQ-FEED-040/T-008): 라우트 세그먼트가 revalidate=300 을 export 한다', async () => {
    const routeModule = await import('./route.js');
    expect(routeModule.revalidate).toBe(300);
  });
});
