// @vitest-environment jsdom
/**
 * SearchIcon.test.tsx — SPEC-SEARCH-001 헤더 검색 인터랙션 테스트
 *
 * Tests for search icon interaction:
 * - Click search icon → input expands
 * - Type keyword and press Enter → navigates to /search?q={keyword}
 * - Click submit button → navigates to /search?q={keyword}
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchIcon } from './SearchIcon';

describe('SearchIcon interaction — SPEC-SEARCH-001', () => {
  beforeEach(() => {
    // Reset window.location before each test
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  // This project does not rely on RTL's global auto-cleanup (see GlobalHeader.test.tsx
  // for the established convention) — without this, `document.querySelector` in later
  // tests matches stale elements left over from earlier tests' un-unmounted renders,
  // e.g. typing into a leftover expanded input from a prior test instead of the
  // current test's freshly rendered one.
  afterEach(() => {
    cleanup();
  });

  it('S-ICON-1: search icon renders correctly', () => {
    render(<SearchIcon />);
    const icon = document.querySelector('button[aria-label="검색"]');
    expect(icon).toBeTruthy();
  });

  it('S-ICON-2: clicking icon expands input field', async () => {
    const user = userEvent.setup();
    render(<SearchIcon />);

    const icon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    expect(icon).toBeTruthy();

    // Initially input should not be visible
    const input = document.querySelector('input[type="text"]');
    expect(input).toBeNull();

    // Click to expand
    await user.click(icon);

    // Now input should be visible
    const expandedInput = document.querySelector('input[type="text"]');
    expect(expandedInput).toBeTruthy();
    expect(expandedInput).toHaveAttribute('placeholder', '검색어를 입력하세요');
  });

  it('S-ICON-3: typing keyword and pressing Enter navigates to /search?q=keyword (AC-SEARCH-001)', async () => {
    const user = userEvent.setup();
    render(<SearchIcon />);

    // Click to expand
    const icon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(icon);

    // Type keyword
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    await user.type(input, 'test query');

    // Mock window.location.href assignment
    let capturedHref = '';
    const originalLocation = window.location;
    (window as any).location = new Proxy(originalLocation, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Press Enter
    await user.keyboard('{Enter}');

    // Should navigate to /search with encoded query (component uses encodeURIComponent, not +)
    expect(capturedHref).toBe('/search?q=test%20query');
  });

  it('S-ICON-4: clicking submit button navigates to /search?q=keyword (AC-SEARCH-001)', async () => {
    const user = userEvent.setup();
    render(<SearchIcon />);

    // Click to expand
    const icon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(icon);

    // Type keyword
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(input, '한글검색');

    // Mock window.location.href
    let capturedHref = '';
    const originalLocation = window.location;
    (window as any).location = new Proxy(originalLocation, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Click submit button
    const submitButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === '검색',
    ) as HTMLButtonElement;
    expect(submitButton).toBeTruthy();

    await user.click(submitButton);

    // Should navigate to /search with encoded query (encodeURIComponent('한글검색'))
    expect(capturedHref).toBe('/search?q=%ED%95%9C%EA%B8%80%EA%B2%80%EC%83%89');
  });

  it('S-ICON-5: empty query does not navigate', async () => {
    const user = userEvent.setup();
    render(<SearchIcon />);

    // Click to expand
    const icon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(icon);

    // Mock window.location.href
    let capturedHref = '';
    const originalLocation = window.location;
    (window as any).location = new Proxy(originalLocation, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Don't type anything, just press Enter
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      await user.keyboard('{Enter}');
    }

    // Should not navigate (empty href stays empty)
    expect(capturedHref).toBe('');
  });

  it('S-ICON-6: close button hides input field', async () => {
    const user = userEvent.setup();
    render(<SearchIcon />);

    // Click to expand
    const icon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(icon);

    // Input should be visible
    let input = document.querySelector('input[type="text"]');
    expect(input).toBeTruthy();

    // Click close button (✕)
    const buttons = Array.from(document.querySelectorAll('button'));
    const closeButton = buttons.find((btn) => btn.textContent === '✕') as HTMLButtonElement;
    if (closeButton) {
      await user.click(closeButton);

      // Input should be hidden again
      input = document.querySelector('input[type="text"]');
      expect(input).toBeNull();
    }
  });
});
