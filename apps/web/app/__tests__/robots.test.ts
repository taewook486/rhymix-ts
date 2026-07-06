/**
 * robots.ts 테스트 — SPEC-SEO-001 AC-SEO-003, REQ-SEO-003
 *
 * Tests:
 * - ROBOTS-001: robots → returns structured object with rules
 * - ROBOTS-002: robots → default rules include userAgent '*'
 * - ROBOTS-003: robots → default rules include Allow '/'
 * - ROBOTS-004: robots → default rules include Disallow '/admin' (REQ-SEO-003)
 * - ROBOTS-005: robots → default rules include Disallow '/api'
 * - ROBOTS-006: robots → includes Sitemap reference
 * - ROBOTS-007: robots → overrides with custom content from settings
 * - ROBOTS-008: robots → handles empty custom content gracefully
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    siteSetting: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@rhymix-ts/admin', () => ({
  getSeoSettings: vi.fn(),
}));

import { getSeoSettings } from '@rhymix-ts/admin';

describe('robots.ts (AC-SEO-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 커스텀 robots 내용 없음
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
  });

  it('ROBOTS-001: robots → returns structured object with rules', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    expect(result).toBeTruthy();
    expect(result.rules).toBeTruthy();
    expect(result.sitemap).toBeTruthy();
  });

  it('ROBOTS-002: robots → default rules include userAgent "*"', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const allAgents = rules.flatMap((r) =>
      Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent],
    );
    expect(allAgents).toContain('*');
  });

  it('ROBOTS-003: robots → default rules include Allow "/"', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const allows = rules.flatMap((r) =>
      Array.isArray(r.allow) ? r.allow : r.allow ? [r.allow] : [],
    );
    expect(allows).toContain('/');
  });

  it('ROBOTS-004: robots → default rules include Disallow "/admin" (REQ-SEO-003)', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallows = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : [],
    );
    expect(disallows).toContain('/admin');
  });

  it('ROBOTS-005: robots → default rules include Disallow "/api"', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallows = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : [],
    );
    expect(disallows).toContain('/api');
  });

  it('ROBOTS-006: robots → includes Sitemap reference', async () => {
    const robots = (await import('../robots')).default;
    const result = await robots();

    expect(result.sitemap).toBeTruthy();
    expect(result.sitemap).toContain('/sitemap.xml');
  });

  it('ROBOTS-007: robots → overrides with custom content from settings', async () => {
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
      robotsTxtCustomContent: 'User-agent: *\nDisallow: /private\nAllow: /public',
    });

    const robots = (await import('../robots')).default;
    const result = await robots();

    // 커스텀 내용의 디렉티브가 반영되어야 한다.
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallows = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : [],
    );
    const allows = rules.flatMap((r) =>
      Array.isArray(r.allow) ? r.allow : r.allow ? [r.allow] : [],
    );

    expect(disallows).toContain('/private');
    expect(allows).toContain('/public');
  });

  it('ROBOTS-008: robots → handles empty custom content gracefully', async () => {
    // 빈 커스텀 내용 → 기본 규칙 사용
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

    const robots = (await import('../robots')).default;
    const result = await robots();

    // 기본 규칙이 그대로 적용된다.
    expect(result).toBeTruthy();
    expect(result.sitemap).toContain('/sitemap.xml');

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallows = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : [],
    );
    expect(disallows).toContain('/admin');
    expect(disallows).toContain('/api');
  });
});
