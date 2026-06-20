/**
 * route.test.ts — SPEC-FEED-001 Slice A (T-006)
 *
 * GET /{mid}/atom Route Handler 검증 — REQ-FEED-003.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveFeedXml = vi.fn();

vi.mock('@rhymix-ts/board/feed', () => ({
  resolveFeedXml: (...args: unknown[]) => mockResolveFeedXml(...args),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

describe('GET /[mid]/atom (SPEC-FEED-001 T-006)', () => {
  beforeEach(() => {
    mockResolveFeedXml.mockReset();
  });

  it('ATOM-ROUTE-1 (REQ-FEED-003): 200 + application/atom+xml + 본문', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<feed></feed>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/atom', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/atom+xml; charset=utf-8');
    expect(await res.text()).toBe('<feed></feed>');
  });

  it('ATOM-ROUTE-2: x-site-id 헤더가 없으면 404', async () => {
    const { GET } = await import('./route.js');
    const req = new Request('https://example.com/notice/atom');
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });
    expect(res.status).toBe(404);
    expect(mockResolveFeedXml).not.toHaveBeenCalled();
  });

  it('ATOM-ROUTE-3: resolveFeedXml 이 404 를 반환하면 그대로 전달한다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 404 });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/atom', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });
    expect(res.status).toBe(404);
  });

  it('ATOM-ROUTE-4: resolveFeedXml 에 format="atom" 이 전달된다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<feed></feed>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/atom', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(mockResolveFeedXml).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'atom', siteId: 1, mid: 'notice' }),
    );
  });

  it('ATOM-ROUTE-5 (REQ-FEED-041/T-008): 200 응답에 Cache-Control s-maxage/SWR 헤더가 포함된다', async () => {
    mockResolveFeedXml.mockResolvedValue({ status: 200, xml: '<feed></feed>' });
    const { GET } = await import('./route.js');

    const req = new Request('https://example.com/notice/atom', {
      headers: { 'x-site-id': '1', host: 'example.com' },
    });
    const res = await GET(req, { params: Promise.resolve({ mid: 'notice' }) });

    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600',
    );
  });

  it('ATOM-ROUTE-6 (REQ-FEED-040/T-008): 라우트 세그먼트가 revalidate=300 을 export 한다', async () => {
    const routeModule = await import('./route.js');
    expect(routeModule.revalidate).toBe(300);
  });
});
