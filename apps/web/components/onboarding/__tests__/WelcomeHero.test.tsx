/**
 * WelcomeHero 컴포넌트 테스트 — SPEC-INSTALL-003 REQ-INSTALL3-020, 021.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { vi, expect, describe, it, afterEach } from 'vitest';
import { WelcomeHero } from '../WelcomeHero';

describe('WelcomeHero', () => {
  afterEach(() => {
    cleanup();
  });

  describe('REQ-INSTALL3-020: Hero/welcome copy', () => {
    it('should render success copy', () => {
      // When: render WelcomeHero
      render(<WelcomeHero />);

      // Then: should have success copy
      expect(screen.getByText(/설치가 성공적으로 완료되었습니다/)).toBeInTheDocument();
      expect(screen.getByText(/Rhymix-TS가 설치되었고/)).toBeInTheDocument();
    });
  });

  describe('REQ-INSTALL3-021: Primary CTA', () => {
    it('should have CTA linking to /admin', () => {
      // When: render WelcomeHero
      render(<WelcomeHero />);

      // Then: should have CTA button with href=/admin
      const ctaButton = screen.getByRole('link', { name: /시작하기/ });
      expect(ctaButton.getAttribute('href')).toBe('/admin');
    });
  });
});
