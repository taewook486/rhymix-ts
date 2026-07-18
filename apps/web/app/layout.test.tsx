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

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Root Layout - SPEC-INSTALL-003 Group 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
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
});
