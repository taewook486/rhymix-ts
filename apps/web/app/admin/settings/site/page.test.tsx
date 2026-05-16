// @vitest-environment jsdom
/**
 * Site 설정 페이지 기본 렌더 테스트 — SPEC-ADMIN-001 Slice E-4.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      site: {
        get: vi.fn().mockResolvedValue({
          id: 1,
          defaultLanguage: 'ko',
          timeZone: 'Asia/Seoul',
        }),
        domain: {
          list: vi.fn().mockResolvedValue([
            { id: 1, hostname: 'example.com', isDefault: true, forceHttps: false },
          ]),
        },
      },
    },
  }),
}));

describe('AdminSiteSettingsPage (Slice E-4)', () => {
  it('E-4-UI: 사이트 정보와 도메인 목록을 렌더한다', async () => {
    const { default: AdminSiteSettingsPage } = await import('./page');
    const result = await AdminSiteSettingsPage();

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('사이트 설정')).toBeTruthy();
    expect(getByText('ko')).toBeTruthy();
    expect(getByText('example.com')).toBeTruthy();
  });
});
