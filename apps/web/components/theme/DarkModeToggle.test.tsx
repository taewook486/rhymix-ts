/**
 * DarkModeToggle 컴포넌트 테스트
 *
 * REQ-THEME-POLISH-061: Click → <html class="dark"> toggle, localStorage 저장, disabled 검증
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { ColorSchemeProvider } from './ColorSchemeProvider';
import { DarkModeToggle } from './DarkModeToggle';

describe('DarkModeToggle', () => {
  beforeEach(() => {
    // localStorage 및 document 초기화
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
  });

  it('렌더링되어야 한다', () => {
    render(
      <ColorSchemeProvider>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('supportsDarkMode=true일 때 버튼이 활성화되어야 한다', () => {
    render(
      <ColorSchemeProvider supportsDarkMode={true}>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('supportsDarkMode=false일 때 버튼이 비활성화되어야 한다', () => {
    render(
      <ColorSchemeProvider supportsDarkMode={false}>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.getAttribute('title')).toBe('이 테마는 다크모드를 지원하지 않습니다');
  });

  it('클릭 시 colorScheme이 토글되어야 한다', async () => {
    function TestComponent() {
      return (
        <ColorSchemeProvider>
          <DarkModeToggle />
        </ColorSchemeProvider>
      );
    }

    render(<TestComponent />);

    const button = screen.getByRole('button');
    // 초기 상태: light
    expect(button.getAttribute('aria-label')).toBe('다크 모드로 전환');

    button.click();

    // 토글 후: dark (상태 업데이트 대기)
    await waitFor(() => {
      expect(button.getAttribute('aria-label')).toBe('라이트 모드로 전환');
    });
  });

  it('클릭 시 localStorage에 rx-color-scheme이 저장되어야 한다', async () => {
    render(
      <ColorSchemeProvider>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(localStorage.getItem('rx-color-scheme')).toBe('dark');
    });
  });

  it('클릭 시 document.documentElement에 dark 클래스가 추가되어야 한다', async () => {
    render(
      <ColorSchemeProvider>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('다시 클릭하면 dark 클래스가 제거되어야 한다', async () => {
    render(
      <ColorSchemeProvider>
        <DarkModeToggle />
      </ColorSchemeProvider>,
    );

    const button = screen.getByRole('button');
    button.click(); // dark mode on

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    button.click(); // dark mode off

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
