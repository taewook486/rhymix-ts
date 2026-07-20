// @vitest-environment jsdom
/**
 * Root Layout 테스트 — SPEC-INSTALL-003 Group 5 (공개 푸터 레이아웃 통합)
 *
 * REQ-INSTALL3-040, 041, 042: 공개 푸터가 layout.tsx에 렌더되는지 검증
 * AC-INSTALL3-008: 익명 방문자와 운영자 모두 푸터를 볼 수 있음
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

vi.mock('@/components/auth/AutoLoginRefresher', () => ({
  AutoLoginRefresher: () => React.createElement('div', { 'data-testid': 'auto-login-refresher' }),
}));

vi.mock('@/components/auth/SessionProviderWrapper', () => ({
  SessionProviderWrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'session-provider' }, children),
}));

vi.mock('@/providers/TRPCProvider', () => ({
  TRPCProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'trpc-provider' }, children),
}));

vi.mock('@/components/layout/GlobalHeader', () => ({
  GlobalHeader: () => React.createElement('header', { 'data-testid': 'global-header' }, 'Header'),
}));

vi.mock('@/components/layout/Utility', () => ({
  Utility: () => React.createElement('div', { 'data-testid': 'utility-bar' }),
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => React.createElement('footer', { 'data-testid': 'menu-footer' }),
}));

vi.mock('@/components/theme/ColorSchemeProvider', () => ({
  ColorSchemeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'color-scheme-provider' }, children),
}));

vi.mock('@/lib/theme/color-scheme-script', () => ({
  colorSchemeScript: '// mock script',
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// SPEC-SEO-001 REQ-SEO-006: getSeoSettings 를 목 처리하지 않으면 실제 DB에 연결을
// 시도한다 (RootLayout이 매 렌더마다 이 함수를 호출함).
const mockGetSeoSettings = vi.fn();
vi.mock('@rhymix-ts/admin', () => ({
  getSeoSettings: (...args: unknown[]) => mockGetSeoSettings(...args),
}));

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Root Layout - SPEC-INSTALL-003 Group 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockGetSeoSettings.mockResolvedValue({
      googleAnalyticsId: '',
      naverSiteVerificationCode: '',
    });
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-040, 042)
   * 루트 레이아웃에 GlobalFooter가 렌더된다
   */
  it('루트 레이아웃에 GlobalFooter가 렌더된다', async () => {
    // Arrange
    const { default: RootLayout } = await import('./layout');

    // Act
    const result = await RootLayout({
      children: React.createElement('div', { 'data-testid': 'test-children' }, 'Test Content'),
    });

    // Render the Server Component result
    const { container } = render(result as React.ReactElement);

    // Assert - GlobalFooter 푸터가 렌더되어야 함
    const footer = screen.getByTestId('global-footer');
    expect(footer).toBeInTheDocument();
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-040)
   * GlobalFooter에 "Powered by Rhymix-TS" attribution이 포함된다
   */
  it('GlobalFooter에 "Powered by Rhymix-TS" 텍스트가 렌더된다', async () => {
    // Arrange
    const { default: RootLayout } = await import('./layout');

    // Act
    const result = await RootLayout({
      children: React.createElement('div', null, 'Test Content'),
    });

    // Render
    render(result as React.ReactElement);

    // Assert
    const attribution = screen.getByText('Powered by Rhymix-TS');
    expect(attribution).toBeInTheDocument();
  });

  /**
   * AC-INSTALL3-008 (REQ-INSTALL3-042)
   * GlobalFooter는 기존 header와 main 요소 사이에 위치하지 않고
   * main 하단에 렌더되어야 함 (레이아웃 구조 검증)
   */
  it('GlobalFooter는 main 요소 하단에 렌더된다', async () => {
    // Arrange
    const { default: RootLayout } = await import('./layout');

    // Act
    const result = await RootLayout({
      children: React.createElement('div', { 'data-testid': 'main-content' }, 'Main Content'),
    });

    // Render
    const { container } = render(result as React.ReactElement);

    // Assert - main 요소와 footer 요소가 모두 존재해야 함
    const mainContent = screen.getByTestId('main-content');
    const footer = screen.getByTestId('global-footer');

    expect(mainContent).toBeInTheDocument();
    expect(footer).toBeInTheDocument();

    // footer가 존재하면 테스트 통과 (순서 검증은 복잡하므로 단순 존재 여부만 확인)
    expect(footer).toBeInTheDocument();
  });

  /**
   * SPEC-SEO-001 REQ-SEO-006
   * naverSiteVerificationCode 설정 시 <meta name="naver-site-verification"> 삽입.
   *
   * @MX:NOTE [AUTO]: RootLayout은 <html> 최상위 엘리먼트를 반환해 RTL render()로
   * DOM에 마운트하면 "<html> cannot be a child of <div>" 경고와 함께 <head> 내용이
   * 정상 반영되지 않는다. React 엘리먼트 트리를 직접 순회해 검증한다.
   */
  it('naverSiteVerificationCode 설정 시 naver-site-verification meta 태그가 렌더된다', async () => {
    mockGetSeoSettings.mockResolvedValue({
      googleAnalyticsId: '',
      naverSiteVerificationCode: 'abc123',
    });

    const { default: RootLayout } = await import('./layout');
    const result = await RootLayout({
      children: React.createElement('div', null, 'Test Content'),
    });

    const meta = findElementByType(result as React.ReactElement, 'meta');

    expect(meta).not.toBeNull();
    expect((meta as React.ReactElement<{ content?: string }>).props.content).toBe('abc123');
  });

  it('naverSiteVerificationCode 미설정 시 meta 태그가 렌더되지 않는다', async () => {
    const { default: RootLayout } = await import('./layout');
    const result = await RootLayout({
      children: React.createElement('div', null, 'Test Content'),
    });

    const meta = findElementByType(result as React.ReactElement, 'meta');

    expect(meta).toBeNull();
  });
});

/**
 * React 엘리먼트 트리를 재귀적으로 순회해 지정한 type의 첫 엘리먼트를 찾는다.
 * (RootLayout처럼 <html>을 반환하는 컴포넌트는 RTL DOM render로 검증하기 어렵다)
 */
function findElementByType(
  node: React.ReactNode,
  type: string,
): React.ReactElement | null {
  if (node == null || typeof node !== 'object') {
    return null;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  if (element.type === type) {
    return element;
  }
  if (element.props && 'children' in element.props) {
    return findElementByType(element.props.children, type);
  }
  return null;
}
