/**
 * RootPage integration 테스트 — SPEC-INSTALL-003 AC-INSTALL3-001~005, 007.
 *
 * TDD RED phase: 이 파일의 테스트는 구현 전 실패 상태여야 함.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RootPage from '../page';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    domain: {
      findUnique: vi.fn(),
    },
    siteSetting: {
        findFirst: vi.fn(),
    },
    site: {
        findFirst: vi.fn(),
    }
  },
}));

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/modules/registry', () => ({
  getModuleDefinition: vi.fn(() => ({
    routes: {
      index: vi.fn(() => Promise.resolve({ html: '<div>Board Output</div>' })),
    },
  })),
}));

vi.mock('@rhymix-ts/core', () => ({
  renderModuleWithLayout: vi.fn(() => '<div>Board Layout</div>'),
  runPageView: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';

describe('RootPage integration - RED phase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock headers
    vi.mock('next/headers', () => ({
      headers: vi.fn(() =>
        Promise.resolve({
          get: (key: string) => {
            if (key === 'x-domain-id') return '1';
            return null;
          },
        })
      ),
    }));
  });

  describe('AC-INSTALL3-001: Authenticated + not dismissed', () => {
    it('should render both onboarding surface and board output', async () => {
      // Given: authenticated operator, not dismissed
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: '1', name: 'Admin' },
      });
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // When: render RootPage
      const { container } = render(<RootPage />);

      // Then: should render onboarding surface
      await waitFor(() => {
        expect(screen.getByText(/설치가 성공적으로 완료되었습니다/)).toBeInTheDocument();
      });

      // And: should render board output
      expect(screen.getByText(/Board Output/)).toBeInTheDocument();
    });
  });

  describe('AC-INSTALL3-002: Authenticated + dismissed', () => {
    it('should render only board output when onboarding dismissed', async () => {
      // Given: authenticated operator, dismissed
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: '1', name: 'Admin' },
      });
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        key: 'operator_onboarding_dismissed',
        value: true,
      });

      // When: render RootPage
      const { container } = render(<RootPage />);

      // Then: should not render onboarding
      expect(screen.queryByText(/설치가 성공적으로 완료되었습니다/)).not.toBeInTheDocument();

      // And: should render board output
      expect(screen.getByText(/Board Output/)).toBeInTheDocument();
    });
  });

  describe('AC-INSTALL3-003: Anonymous visitor', () => {
    it('should render only board output for anonymous visitors', async () => {
      // Given: anonymous visitor
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // When: render RootPage
      const { container } = render(<RootPage />);

      // Then: should not render onboarding
      expect(screen.queryByText(/설치가 성공적으로 완료되었습니다/)).not.toBeInTheDocument();
      expect(screen.queryByText(/시작하기/)).not.toBeInTheDocument();

      // And: should render board output
      expect(screen.getByText(/Board Output/)).toBeInTheDocument();
    });
  });

  describe('AC-INSTALL3-004: Panel has exact admin links', () => {
    it('should have exactly 5 admin links with correct hrefs', async () => {
      // Given: authenticated operator, not dismissed
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: '1', name: 'Admin' },
      });
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // When: render RootPage
      render(<RootPage />);

      // Then: should have 5 admin links
      await waitFor(() => {
        const adminLinks = screen.getAllByRole('link').filter((link) =>
          link.getAttribute('href')?.startsWith('/admin')
        );
        expect(adminLinks).toHaveLength(5);

        const hrefs = adminLinks.map((link) => link.getAttribute('href'));
        expect(hrefs).toContain('/admin/settings/site');
        expect(hrefs).toContain('/admin/menu');
        expect(hrefs).toContain('/admin/site/design');
        expect(hrefs).toContain('/admin/modules');
        expect(hrefs).toContain('/admin/domains');
      });
    });
  });

  describe('AC-INSTALL3-005: Hero has copy + CTA', () => {
    it('should have hero copy and CTA to /admin', async () => {
      // Given: authenticated operator, not dismissed
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: '1', name: 'Admin' },
      });
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // When: render RootPage
      render(<RootPage />);

      // Then: should have success copy
      await waitFor(() => {
        expect(screen.getByText(/설치가 성공적으로 완료되었습니다/)).toBeInTheDocument();
      });

      // And: should have CTA to /admin
      const ctaButton = screen.getByRole('link', { name: /시작하기/ });
      expect(ctaButton.getAttribute('href')).toBe('/admin');
    });
  });

  describe('AC-INSTALL3-007: Only GitHub external link', () => {
    it('should have only GitHub repo external link', async () => {
      // Given: authenticated operator, not dismissed
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: '1', name: 'Admin' },
      });
      (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        defaultLayoutId: 'layout-1',
        indexModuleInstance: {
          id: 1,
          moduleCode: 'board',
          config: {},
        },
        siteId: 1,
      });
      (prisma.siteSetting.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // When: render RootPage
      render(<RootPage />);

      // Then: should have only GitHub link
      await waitFor(() => {
        const externalLinks = screen.getAllByRole('link').filter((link) =>
          link.getAttribute('href')?.startsWith('http')
        );
        expect(externalLinks).toHaveLength(1);
        expect(externalLinks[0].getAttribute('href')).toBe('https://github.com/taewook486/rhymix-ts');
      });
    });
  });
});
