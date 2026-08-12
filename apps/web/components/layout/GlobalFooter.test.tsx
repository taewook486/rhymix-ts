// @vitest-environment jsdom
/**
 * GlobalFooter 컴포넌트 테스트 — SPEC-INSTALL-003 Group 5 (공개 푸터)
 *
 * REQ-INSTALL3-040: 공개 푸터에 "Powered by Rhymix-TS" attribution 렌더
 * REQ-INSTALL3-041: Terms/Privacy 링크 금지 (페이지 없음, route-fabrication prohibition)
 * REQ-INSTALL3-042: 푸터는 온보딩 해제 상태와 무관하게 항상 렌더 (공개 chrome)
 *
 * AC-INSTALL3-008: 익명 방문자와 운영자 모두 "Powered by Rhymix-TS" 표시,
 *                온보딩 해제 상태와 무관하게 푸터 노출,
 *                존재하지 않는 Terms/Privacy 페이지 링크 없음
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

describe('GlobalFooter - SPEC-INSTALL-003 Group 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-040)
   * 푸터가 "Powered by Rhymix-TS" attribution을 렌더한다
   */
  it('푸터가 "Powered by Rhymix-TS" 텍스트를 렌더한다', async () => {
    // Arrange
    const { GlobalFooter } = await import('./GlobalFooter');

    // Act
    render(React.createElement(GlobalFooter));

    // Assert
    const attribution = screen.getByText('Powered by Rhymix-TS');
    expect(attribution).toBeInTheDocument();
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-041)
   * 푸터는 Terms of Service 또는 Privacy Policy 링크를 포함하지 않는다
   * (해당 페이지가 존재하지 않으므로 링크 금지 - route-fabrication prohibition)
   */
  it('푸터에 /terms 또는 /privacy 링크가 없다', async () => {
    // Arrange
    const { GlobalFooter } = await import('./GlobalFooter');

    // Act
    render(React.createElement(GlobalFooter));

    // Assert - Terms/Privacy 링크가 존재하면 안 됨
    const termsLink = screen.queryByRole('link', { name: /terms/i });
    const privacyLink = screen.queryByRole('link', { name: /privacy/i });

    expect(termsLink).not.toBeInTheDocument();
    expect(privacyLink).not.toBeInTheDocument();

    // 모든 링크의 href를 확인하여 /terms, /privacy 경로가 없는지 확인
    const allLinks = screen.queryAllByRole('link');
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).not.toMatch(/\/(terms|privacy)/i);
    });
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-042)
   * 푸터는 항상 렌더되며 (온보딩 해제 상태와 무관)
   * 공용 chrome 컴포넌트로서 조건부 렌더링이 없다
   */
  it('푸터는 조건부 렌더링 없이 항상 렌더된다', async () => {
    // Arrange
    const { GlobalFooter } = await import('./GlobalFooter');

    // Act
    const { container } = render(React.createElement(GlobalFooter));

    // Assert - 푸터가 null이 아니고 실제 DOM을 렌더해야 함
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild).toBeInstanceOf(HTMLElement);
  });

  /**
   * SPEC-LAYOUT-001 REQ-LAYOUT-030~033 (구 DefaultLayout DL-6/DL-7에서 이전)
   *
   * SPEC-FRONT-PARITY-001 REQ-FP-003(문서당 <footer> 1개)에 따라 DefaultLayout의
   * 자체 푸터가 제거되면서, footerText 렌더 책임이 GlobalFooter로 이전되었다.
   * 원 테스트는 themes/default/layouts/default.test.tsx의 DL-6/DL-7이었다.
   */
  describe('footerText (SPEC-LAYOUT-001에서 이전)', () => {
    it('footerText가 없으면 기본 텍스트 "Powered by Rhymix-TS"를 사용한다', async () => {
      const { GlobalFooter } = await import('./GlobalFooter');

      render(React.createElement(GlobalFooter));

      expect(screen.getByText('Powered by Rhymix-TS')).toBeInTheDocument();
    });

    it('footerText가 있으면 커스텀 텍스트를 사용하고 기본 텍스트는 렌더하지 않는다', async () => {
      const { GlobalFooter } = await import('./GlobalFooter');

      render(React.createElement(GlobalFooter, { footerText: '커스텀 푸터 텍스트' }));

      expect(screen.getByText('커스텀 푸터 텍스트')).toBeInTheDocument();
      expect(screen.queryByText('Powered by Rhymix-TS')).not.toBeInTheDocument();
    });
  });

  /**
   * SPEC-MENU-001 REQ-MENU-030~034 (구 Footer.tsx에서 이전)
   * FOOTER 슬롯 콘텐츠는 children으로 주입되며, GlobalFooter는 이를 렌더해야 한다.
   * (실제 슬롯 조회는 FooterMenuSlot.tsx가 담당 — prisma/next-auth 의존 격리)
   */
  it('children으로 주입된 FOOTER 슬롯 콘텐츠를 렌더한다', async () => {
    const { GlobalFooter } = await import('./GlobalFooter');

    render(
      React.createElement(
        GlobalFooter,
        null,
        React.createElement('nav', { 'data-testid': 'footer-menu-slot' }, '메뉴'),
      ),
    );

    expect(screen.getByTestId('footer-menu-slot')).toBeInTheDocument();
    // attribution도 함께 렌더되어야 한다 (REQ-INSTALL3-042)
    expect(screen.getByText('Powered by Rhymix-TS')).toBeInTheDocument();
  });
});
