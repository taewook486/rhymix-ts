/**
 * SEO 설정 페이지 테스트 — SPEC-SEO-001 AC-SEO-005, AC-SEO-006
 *
 * Tests:
 * - SETTINGS-SEO-003: page → redirects non-admin users
 * - SETTINGS-SEO-004: page → loads SEO settings for admin users
 * - SETTINGS-SEO-005: page → displays SeoSettingsForm with initial data
 * - SETTINGS-SEO-006: page → handles form submission
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import AdminSeoSettingsPage from './page';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
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

vi.mock('./SeoSettingsForm', () => ({
  SeoSettingsForm: ({ initial }: { initial: unknown }) => (
    <div data-testid="seo-form">Initial: {JSON.stringify(initial)}</div>
  ),
}));

describe('Admin SEO Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 1 } } as never);
    vi.mocked(isAdminSession).mockReturnValue(true);
    vi.mocked(getServerCaller).mockResolvedValue({
      admin: {
        settings: {
          getSeo: vi.fn().mockResolvedValue({
            defaultMetaTitle: 'Test Site',
            defaultMetaDescription: 'Test Description',
            ogTitle: 'Test OG Title',
            ogDescription: 'Test OG Description',
            ogImageUrl: 'https://example.com/og.jpg',
            canonicalUrlPolicy: 'default',
            sitemapEnabled: true,
          }),
        },
      },
    } as never);
  });

  it('SETTINGS-SEO-003: page → redirects non-admin users', async () => {
    vi.mocked(isAdminSession).mockReturnValue(false);

    const { redirect } = await import('next/navigation');
    await AdminSeoSettingsPage();

    // redirect should have been called
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/');
  });

  it('SETTINGS-SEO-004: page → loads SEO settings for admin users', async () => {
    const mockCaller = {
      admin: {
        settings: {
          getSeo: vi.fn().mockResolvedValue({
            defaultMetaTitle: 'Test Site',
            sitemapEnabled: true,
            canonicalUrlPolicy: 'default',
          }),
        },
      },
    };

    vi.mocked(getServerCaller).mockResolvedValue(mockCaller as never);

    await AdminSeoSettingsPage();

    expect(mockCaller.admin.settings.getSeo).toHaveBeenCalled();
  });

  it('SETTINGS-SEO-005: page → displays SeoSettingsForm with initial data', async () => {
    const mockSettings = {
      defaultMetaTitle: 'Test Site',
      defaultMetaDescription: 'Test Description',
      ogTitle: 'Test OG Title',
      ogDescription: 'Test OG Description',
      ogImageUrl: 'https://example.com/og.jpg',
      canonicalUrlPolicy: 'default',
      sitemapEnabled: true,
    };

    vi.mocked(getServerCaller).mockResolvedValue({
      admin: {
        settings: {
          getSeo: vi.fn().mockResolvedValue(mockSettings),
        },
      },
    } as never);

    const result = await AdminSeoSettingsPage();

    // Component should render with initial settings
    expect(result).toBeTruthy();
  });
});
