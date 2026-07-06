/**
 * public.seo tRPC router tests — SPEC-SEO-001 REQ-SEO-006
 *
 * PUBLIC-SEO-001: getPublicConfig → returns empty strings when no SEO settings exist
 * PUBLIC-SEO-002: getPublicConfig → returns GA ID when set
 * PUBLIC-SEO-003: getPublicConfig → returns Naver verification code when set
 * PUBLIC-SEO-004: getPublicConfig → returns robots.txt custom content when set
 * PUBLIC-SEO-005: getPublicConfig → returns all fields when fully configured
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
  },
};

// Context 타입이 요구하는 storage/scanner/uploadTokenSecret 등은 이 라우터의
// 쿼리 경로에서 사용되지 않으므로 테스트 컨텍스트는 sibling 테스트(captcha/terms)
// 와 동일하게 as any로 부분 컨텍스트를 주입한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicCtx: any = {
  session: null,
  prisma: mockPrisma,
  siteId: undefined,
};

describe('public.seo tRPC router (REQ-SEO-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
  });

  it('PUBLIC-SEO-001: getPublicConfig → returns empty strings when no SEO settings exist', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { publicSeoRouter } = await import('./seo');
    const caller = publicSeoRouter.createCaller(publicCtx);
    const result = await caller.getPublicConfig();

    expect(result).toEqual({
      googleAnalyticsId: '',
      naverSiteVerificationCode: '',
      robotsTxtCustomContent: '',
    });
  });

  it('PUBLIC-SEO-002: getPublicConfig → returns GA ID when set', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'seo',
      value: {
        googleAnalyticsId: 'G-1234567890',
        naverSiteVerificationCode: '',
        robotsTxtCustomContent: '',
      },
    });

    const { publicSeoRouter } = await import('./seo');
    const caller = publicSeoRouter.createCaller(publicCtx);
    const result = await caller.getPublicConfig();

    expect(result.googleAnalyticsId).toBe('G-1234567890');
    expect(result.naverSiteVerificationCode).toBe('');
    expect(result.robotsTxtCustomContent).toBe('');
  });

  it('PUBLIC-SEO-003: getPublicConfig → returns Naver verification code when set', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'seo',
      value: {
        googleAnalyticsId: '',
        naverSiteVerificationCode: 'naver_verification_code_123',
        robotsTxtCustomContent: '',
      },
    });

    const { publicSeoRouter } = await import('./seo');
    const caller = publicSeoRouter.createCaller(publicCtx);
    const result = await caller.getPublicConfig();

    expect(result.googleAnalyticsId).toBe('');
    expect(result.naverSiteVerificationCode).toBe('naver_verification_code_123');
    expect(result.robotsTxtCustomContent).toBe('');
  });

  it('PUBLIC-SEO-004: getPublicConfig → returns robots.txt custom content when set', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'seo',
      value: {
        googleAnalyticsId: '',
        naverSiteVerificationCode: '',
        robotsTxtCustomContent: 'User-agent: *\nDisallow: /private',
      },
    });

    const { publicSeoRouter } = await import('./seo');
    const caller = publicSeoRouter.createCaller(publicCtx);
    const result = await caller.getPublicConfig();

    expect(result.googleAnalyticsId).toBe('');
    expect(result.naverSiteVerificationCode).toBe('');
    expect(result.robotsTxtCustomContent).toBe('User-agent: *\nDisallow: /private');
  });

  it('PUBLIC-SEO-005: getPublicConfig → returns all fields when fully configured', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'seo',
      value: {
        googleAnalyticsId: 'G-ABCDEFGHIJ',
        naverSiteVerificationCode: 'abc123def456',
        robotsTxtCustomContent: 'User-agent: *\nAllow: /\nDisallow: /admin',
      },
    });

    const { publicSeoRouter } = await import('./seo');
    const caller = publicSeoRouter.createCaller(publicCtx);
    const result = await caller.getPublicConfig();

    expect(result).toEqual({
      googleAnalyticsId: 'G-ABCDEFGHIJ',
      naverSiteVerificationCode: 'abc123def456',
      robotsTxtCustomContent: 'User-agent: *\nAllow: /\nDisallow: /admin',
    });
  });
});
