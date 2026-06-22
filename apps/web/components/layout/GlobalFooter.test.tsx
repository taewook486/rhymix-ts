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
});
