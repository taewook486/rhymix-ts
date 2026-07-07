/**
 * SEO 설정 Server Actions 테스트 — SPEC-SEO-001 AC-SEO-005, AC-SEO-006
 *
 * Tests:
 * - SETTINGS-SEO-ACTION-001: updateSeoSettingsAction → authenticates admin session
 * - SETTINGS-SEO-ACTION-002: updateSeoSettingsAction → calls tRPC updateSeo
 * - SETTINGS-SEO-ACTION-003: updateSeoSettingsAction → revalidates paths
 * - SETTINGS-SEO-ACTION-004: updateSeoSettingsAction → handles errors gracefully
 * - SETTINGS-SEO-ACTION-005: updateSeoSettingsAction → validates input fields
 * - SETTINGS-SEO-ACTION-006: updateSeoSettingsAction → persists GA ID (REQ-SEO-006)
 * - SETTINGS-SEO-ACTION-007: updateSeoSettingsAction → persists Naver code (REQ-SEO-006)
 * - SETTINGS-SEO-ACTION-008: updateSeoSettingsAction → persists robots.txt content (REQ-SEO-006)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { updateSeoSettingsAction, type ActionState } from './actions';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

// Mock dependencies
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}));

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn(),
}));

describe('SEO Settings Server Actions', () => {
  const mockCaller = {
    admin: {
      settings: {
        updateSeo: vi.fn().mockResolvedValue({ success: true }),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 관리자 세션 + 정상 caller. 각 테스트에서 필요시 override 한다.
    vi.mocked(auth).mockResolvedValue({ user: { id: 1 } } as never);
    vi.mocked(isAdminSession).mockReturnValue(true);
    vi.mocked(getServerCaller).mockResolvedValue(mockCaller as never);
    // ACTION-005 가 mockRejectedValue 로 덮어쓰므로 매 테스트마다 초기화.
    mockCaller.admin.settings.updateSeo.mockResolvedValue({ success: true });
  });

  it('SETTINGS-SEO-ACTION-001: updateSeoSettingsAction → authenticates admin session', async () => {
    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');

    const result = await updateSeoSettingsAction({}, formData);

    expect(vi.mocked(auth)).toHaveBeenCalled();
    expect(vi.mocked(isAdminSession)).toHaveBeenCalled();
  });

  it('SETTINGS-SEO-ACTION-002: updateSeoSettingsAction → returns error for non-admin', async () => {
    vi.mocked(isAdminSession).mockReturnValue(false);

    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');

    const result = await updateSeoSettingsAction({}, formData);

    expect(result).toEqual({
      error: '권한이 없습니다.',
    });
  });

  it('SETTINGS-SEO-ACTION-003: updateSeoSettingsAction → calls tRPC updateSeo', async () => {
    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');
    formData.append('defaultMetaDescription', 'Test Description');
    formData.append('ogTitle', 'OG Title');
    formData.append('ogDescription', 'OG Description');
    formData.append('ogImageUrl', 'https://example.com/og.jpg');
    formData.append('canonicalUrlPolicy', 'default');
    formData.append('sitemapEnabled', 'true');

    await updateSeoSettingsAction({}, formData);

    // action이 formData의 모든 키를 라우터에 전달하므로, 지정된 7개 필드만 검증.
    // GA/Naver/robots 필드는 ACTION-007/008/009에서 별도 검증.
    expect(mockCaller.admin.settings.updateSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMetaTitle: 'Test Site',
        defaultMetaDescription: 'Test Description',
        ogTitle: 'OG Title',
        ogDescription: 'OG Description',
        ogImageUrl: 'https://example.com/og.jpg',
        canonicalUrlPolicy: 'default',
        sitemapEnabled: true,
      }),
    );
  });

  it('SETTINGS-SEO-ACTION-004: updateSeoSettingsAction → revalidates paths', async () => {
    const { revalidatePath } = await import('next/cache');
    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');

    await updateSeoSettingsAction({}, formData);

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/admin/settings/seo');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/sitemap.xml');
  });

  it('SETTINGS-SEO-ACTION-005: updateSeoSettingsAction → handles errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCaller.admin.settings.updateSeo.mockRejectedValue(new Error('DB Error'));

    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');

    const result = await updateSeoSettingsAction({}, formData);

    expect(result).toEqual({
      error: '설정 저장에 실패했습니다.',
    });
    consoleErrorSpy.mockRestore();
  });

  it('SETTINGS-SEO-ACTION-006: updateSeoSettingsAction → validates input fields', async () => {
    const formData = new FormData();
    // Test with empty required fields
    formData.append('defaultMetaTitle', '');
    formData.append('canonicalUrlPolicy', 'none');
    formData.append('sitemapEnabled', 'false');

    const result = await updateSeoSettingsAction({}, formData);

    // action이 모든 formData 키를 항상 전달하므로, 지정된 3개 필드만 검증.
    expect(mockCaller.admin.settings.updateSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMetaTitle: '',
        canonicalUrlPolicy: 'none',
        sitemapEnabled: false,
      }),
    );
  });

  it('SETTINGS-SEO-ACTION-007: updateSeoSettingsAction → persists GA ID (REQ-SEO-006)', async () => {
    const formData = new FormData();
    formData.append('googleAnalyticsId', 'UA-12345678-1');
    formData.append('canonicalUrlPolicy', 'none');
    formData.append('sitemapEnabled', 'false');

    await updateSeoSettingsAction({}, formData);

    expect(mockCaller.admin.settings.updateSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        googleAnalyticsId: 'UA-12345678-1',
      }),
    );
  });

  it('SETTINGS-SEO-ACTION-008: updateSeoSettingsAction → persists Naver code (REQ-SEO-006)', async () => {
    const formData = new FormData();
    formData.append('naverSiteVerificationCode', 'naver123456');
    formData.append('canonicalUrlPolicy', 'none');
    formData.append('sitemapEnabled', 'false');

    await updateSeoSettingsAction({}, formData);

    expect(mockCaller.admin.settings.updateSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        naverSiteVerificationCode: 'naver123456',
      }),
    );
  });

  it('SETTINGS-SEO-ACTION-009: updateSeoSettingsAction → persists robots.txt content (REQ-SEO-006)', async () => {
    const formData = new FormData();
    formData.append('robotsTxtCustomContent', 'User-agent: *\nDisallow: /private');
    formData.append('canonicalUrlPolicy', 'none');
    formData.append('sitemapEnabled', 'false');

    await updateSeoSettingsAction({}, formData);

    expect(mockCaller.admin.settings.updateSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        robotsTxtCustomContent: 'User-agent: *\nDisallow: /private',
      }),
    );
  });

  it('SETTINGS-SEO-ACTION-010: updateSeoSettingsAction → returns success on valid update', async () => {
    const formData = new FormData();
    formData.append('defaultMetaTitle', 'Test Site');
    formData.append('canonicalUrlPolicy', 'none');
    formData.append('sitemapEnabled', 'false');

    const result = await updateSeoSettingsAction({}, formData);

    expect(result).toEqual({ success: true });
  });
});
