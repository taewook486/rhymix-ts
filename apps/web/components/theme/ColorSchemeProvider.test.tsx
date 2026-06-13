/**
 * ColorSchemeProvider 컴포넌트 테스트
 *
 * REQ-THEME-POLISH-030~032, REQ-THEME-POLISH-067
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { ColorSchemeProvider, useColorScheme } from './ColorSchemeProvider';

describe('ColorSchemeProvider', () => {
  beforeEach(() => {
    // localStorage 및 document 초기화
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
  });

  it('초기 렌더에서 colorScheme은 light 여야 한다', () => {
    function TestComponent() {
      const { colorScheme } = useColorScheme();
      return <div>Current: {colorScheme}</div>;
    }

    render(
      <ColorSchemeProvider>
        <TestComponent />
      </ColorSchemeProvider>,
    );

    expect(screen.getByText(/Current: light/i)).toBeInTheDocument();
  });

  it('toggle 함수를 호출하면 colorScheme이 반전되어야 한다', async () => {
    function TestComponent() {
      const { colorScheme, toggle } = useColorScheme();
      return (
        <div>
          <span>Current: {colorScheme}</span>
          <button onClick={toggle}>Toggle</button>
        </div>
      );
    }

    render(
      <ColorSchemeProvider>
        <TestComponent />
      </ColorSchemeProvider>,
    );

    const button = screen.getByText(/Toggle/i);
    button.click();

    await waitFor(() => {
      expect(screen.getByText(/Current: dark/i)).toBeDefined();
    });
  });

  it('toggle 함수를 두 번 호출하면 원래 상태로 돌아와야 한다', async () => {
    function TestComponent() {
      const { colorScheme, toggle } = useColorScheme();
      return (
        <div>
          <span>Current: {colorScheme}</span>
          <button onClick={toggle}>Toggle</button>
        </div>
      );
    }

    render(
      <ColorSchemeProvider>
        <TestComponent />
      </ColorSchemeProvider>,
    );

    const button = screen.getByText(/Toggle/i);
    button.click();
    button.click();

    await waitFor(() => {
      expect(screen.getByText(/Current: light/i)).toBeDefined();
    });
  });

  it('toggle 시 localStorage에 rx-color-scheme 값이 저장되어야 한다', async () => {
    function TestComponent() {
      const { toggle } = useColorScheme();
      return <button onClick={toggle}>Toggle</button>;
    }

    render(
      <ColorSchemeProvider>
        <TestComponent />
      </ColorSchemeProvider>,
    );

    const button = screen.getByText(/Toggle/i);
    button.click();

    await waitFor(() => {
      expect(localStorage.getItem('rx-color-scheme')).toBe('dark');
    });
  });

  it('supportsDarkMode=false를 전달하면 해당 값이 유지되어야 한다', () => {
    function TestComponent() {
      const { supportsDarkMode } = useColorScheme();
      return <div>Supported: {supportsDarkMode ? 'yes' : 'no'}</div>;
    }

    render(
      <ColorSchemeProvider supportsDarkMode={false}>
        <TestComponent />
      </ColorSchemeProvider>,
    );

    expect(screen.getByText(/Supported: no/i)).toBeInTheDocument();
  });
});
