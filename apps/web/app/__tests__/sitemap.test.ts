/**
 * sitemap.ts 테스트 — SPEC-SEO-001 AC-SEO-002, REQ-SEO-002
 *
 * Tests:
 * - SITEMAP-001: sitemap → returns array with valid entries
 * - SITEMAP-002: sitemap → includes static routes (/, /login, /signup, /search)
 * - SITEMAP-003: sitemap → includes dynamic board routes (/{mid})
 * - SITEMAP-004: sitemap → includes dynamic article routes (/{mid}/{id})
 * - SITEMAP-005: sitemap → sets lastModified from document lastUpdate
 * - SITEMAP-006: sitemap → sets changeFrequency (daily for boards, weekly for articles)
 * - SITEMAP-007: sitemap → limits document query to 50,000 (take: 50000)
 * - SITEMAP-008: sitemap → returns empty when sitemapEnabled is false
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// getSeoSettings 가 prisma 를 사용하므로 모킹. 직접 쿼리(board/document)도 동일 prisma 사용.
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    board: { findMany: vi.fn() },
    document: { findMany: vi.fn() },
    siteSetting: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@rhymix-ts/admin', () => ({
  getSeoSettings: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getSeoSettings } from '@rhymix-ts/admin';

describe('sitemap.ts (AC-SEO-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: sitemap 활성화 + 빈 보드/문서
    vi.mocked(getSeoSettings).mockResolvedValue({
      defaultMetaTitle: '',
      defaultMetaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImageUrl: '',
      canonicalUrlPolicy: 'none',
      sitemapEnabled: true,
      googleAnalyticsId: '',
      naverSiteVerificationCode: '',
      robotsTxtCustomContent: '',
    });
    vi.mocked(prisma.board.findMany).mockResolvedValue([]);
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
  });

  it('SITEMAP-001: sitemap → returns array with valid entries', async () => {
    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // 모든 엔트리는 url 을 가져야 한다
    for (const entry of result) {
      expect(entry.url).toBeTruthy();
      expect(entry.url).toMatch(/^https?:\/\//);
    }
  });

  it('SITEMAP-002: sitemap → includes static routes (/, /login, /signup, /search)', async () => {
    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();
    const urls = result.map((e) => e.url);

    expect(urls.some((u) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/login'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/signup'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/search'))).toBe(true);
  });

  it('SITEMAP-003: sitemap → includes dynamic board routes (/{mid})', async () => {
    vi.mocked(prisma.board.findMany).mockResolvedValue([
      {
        updatedAt: new Date('2024-01-01'),
        moduleInstance: { mid: 'freeboard' },
      },
      {
        updatedAt: new Date('2024-01-02'),
        moduleInstance: { mid: 'notice' },
      },
    ] as never);

    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();
    const urls = result.map((e) => e.url);

    expect(urls.some((u) => u.endsWith('/freeboard'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/notice'))).toBe(true);
  });

  it('SITEMAP-004: sitemap → includes dynamic article routes (/{mid}/{id})', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      {
        id: 1,
        lastUpdate: new Date('2024-01-01'),
        board: { moduleInstance: { mid: 'freeboard' } },
      },
      {
        id: 2,
        lastUpdate: new Date('2024-01-02'),
        board: { moduleInstance: { mid: 'freeboard' } },
      },
    ] as never);

    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();
    const urls = result.map((e) => e.url);

    expect(urls.some((u) => u.endsWith('/freeboard/1'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/freeboard/2'))).toBe(true);
  });

  it('SITEMAP-005: sitemap → sets lastModified from document lastUpdate', async () => {
    const testDate = new Date('2024-06-15T12:00:00Z');
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      {
        id: 1,
        lastUpdate: testDate,
        board: { moduleInstance: { mid: 'freeboard' } },
      },
    ] as never);

    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();

    const articleEntry = result.find((e) => e.url.endsWith('/freeboard/1'));
    expect(articleEntry).toBeTruthy();
    expect(articleEntry!.lastModified).toEqual(testDate);
  });

  it('SITEMAP-006: sitemap → sets changeFrequency (daily for boards, weekly for articles)', async () => {
    vi.mocked(prisma.board.findMany).mockResolvedValue([
      {
        updatedAt: new Date('2024-01-01'),
        moduleInstance: { mid: 'freeboard' },
      },
    ] as never);
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      {
        id: 1,
        lastUpdate: new Date('2024-01-01'),
        board: { moduleInstance: { mid: 'freeboard' } },
      },
    ] as never);

    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();

    const boardEntry = result.find((e) => e.url.endsWith('/freeboard'));
    const articleEntry = result.find((e) => e.url.endsWith('/freeboard/1'));

    expect(boardEntry!.changeFrequency).toBe('daily');
    expect(articleEntry!.changeFrequency).toBe('weekly');
  });

  it('SITEMAP-007: sitemap → limits document query to 50,000 (take: 50000)', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);

    const sitemap = (await import('../sitemap')).default;
    await sitemap();

    // document.findMany 가 take: 50000 (또는 그 이하, 정적/보드 엔트리 수만큼 감소) 로 호출되었는지 확인.
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: expect.any(Number),
      }),
    );
    const callArg = vi.mocked(prisma.document.findMany).mock.calls[0]![0];
    expect(callArg?.take).toBeLessThanOrEqual(50000);
    expect(callArg?.take).toBeGreaterThan(0);
  });

  it('SITEMAP-008: sitemap → returns empty when sitemapEnabled is false', async () => {
    vi.mocked(getSeoSettings).mockResolvedValue({
      defaultMetaTitle: '',
      defaultMetaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImageUrl: '',
      canonicalUrlPolicy: 'none',
      sitemapEnabled: false,
      googleAnalyticsId: '',
      naverSiteVerificationCode: '',
      robotsTxtCustomContent: '',
    });

    const sitemap = (await import('../sitemap')).default;
    const result = await sitemap();

    expect(result).toEqual([]);
    // 비활성화 시 보드/문서 쿼리를 호출하지 않는다.
    expect(prisma.board.findMany).not.toHaveBeenCalled();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });
});
