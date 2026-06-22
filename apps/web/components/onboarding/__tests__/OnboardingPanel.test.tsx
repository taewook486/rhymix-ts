/**
 * OnboardingPanel 컴포넌트 테스트 — SPEC-INSTALL-003 REQ-INSTALL3-010, 011.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { vi, expect, describe, it, afterEach } from 'vitest';
import { OnboardingPanel } from '../OnboardingPanel';

describe('OnboardingPanel', () => {
  afterEach(() => {
    cleanup();
  });

  describe('REQ-INSTALL3-010, 011, 012: Panel links', () => {
    it('should have exactly 5 guided links to verified admin routes', () => {
      // When: render OnboardingPanel
      render(<OnboardingPanel />);

      // Then: should have exactly 5 links with correct hrefs
      const links = screen.getAllByRole('link').filter((link) =>
        link.getAttribute('href')?.startsWith('/admin')
      );

      expect(links).toHaveLength(5);

      const hrefs = links.map((link) => link.getAttribute('href'));
      expect(hrefs).toContain('/admin/settings/site');
      expect(hrefs).toContain('/admin/menu');
      expect(hrefs).toContain('/admin/site/design');
      expect(hrefs).toContain('/admin/modules');
      expect(hrefs).toContain('/admin/domains');
    });

    it('should have descriptive labels for each link', () => {
      // When: render OnboardingPanel
      render(<OnboardingPanel />);

      // Then: should have labels
      expect(screen.getByText(/사이트 제목.*일반 설정/)).toBeInTheDocument();
      expect(screen.getByText(/메뉴 편집/)).toBeInTheDocument();
      expect(screen.getByText(/디자인.*레이아웃 변경/)).toBeInTheDocument();
      expect(screen.getByText(/모듈 관리/)).toBeInTheDocument();
      expect(screen.getByText(/홈페이지.*인덱스 모듈.*변경/)).toBeInTheDocument();
    });
  });
});
