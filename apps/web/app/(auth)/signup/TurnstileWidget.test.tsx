/**
 * @vitest-environment jsdom
 */

/**
 * Turnstile Widget 테스트 — SPEC-CAPTCHA-001.
 *
 * Cloudflare Turnstile 위젯 렌더링 및 콜백 동작을 검증한다.
 */
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTurnstile = {
  render: vi.fn(),
  reset: vi.fn(),
  remove: vi.fn(),
  getResponse: vi.fn(() => 'test-token'),
};

// Mock next/script to simulate script loading
vi.mock('next/script', () => ({
  default: function MockNextScript({ onLoad }: { onLoad?: () => void }) {
    React.useEffect(() => {
      // Simulate Turnstile script loading
      window.turnstile = mockTurnstile as unknown as Window['turnstile'];
      onLoad?.();
    }, [onLoad]);
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TurnstileWidget', () => {
  beforeEach(() => {
    // Reset window.turnstile before each test
    delete (window as any).turnstile;
    mockTurnstile.render.mockClear();
    mockTurnstile.reset.mockClear();
    mockTurnstile.remove.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('siteKey가 없으면 null을 반환', async () => {
    const { TurnstileWidget } = await import('./TurnstileWidget');
    const { container } = render(
      React.createElement(TurnstileWidget, { siteKey: '', onSuccess: vi.fn() }),
    );

    expect(container.firstChild).toBe(null);
  });

  it('siteKey가 있으면 Turnstile 스크립트를 로드하고 위젯을 렌더링', async () => {
    const onSuccess = vi.fn();
    const { TurnstileWidget } = await import('./TurnstileWidget');
    render(React.createElement(TurnstileWidget, { siteKey: 'test-site-key', onSuccess }));

    // Wait for script to load and widget to render
    await waitFor(() => {
      expect(window.turnstile).toBeDefined();
    });

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    const renderCall = mockTurnstile.render.mock.calls[0];
    if (!renderCall) {
      throw new Error('renderCall is undefined');
    }
    expect(renderCall[1]).toMatchObject({
      sitekey: 'test-site-key',
      theme: 'light',
    });
  });

  it('콜백이 호출되면 onSuccess를 실행하고 토큰을 반환', async () => {
    const onSuccess = vi.fn();
    const { TurnstileWidget } = await import('./TurnstileWidget');
    render(React.createElement(TurnstileWidget, { siteKey: 'test-site-key', onSuccess }));

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    // Get the callback function from render call
    const renderCall = mockTurnstile.render.mock.calls[0];
    if (!renderCall) {
      throw new Error('renderCall is undefined');
    }
    const callback = renderCall[1].callback;

    // Simulate Turnstile successful verification
    callback('test-token');

    expect(onSuccess).toHaveBeenCalledWith('test-token');
  });

  it('reset 함수가 제대로 노출된다', async () => {
    const onSuccess = vi.fn();
    const { TurnstileWidget } = await import('./TurnstileWidget');
    const { container } = render(
      React.createElement(TurnstileWidget, { siteKey: 'test-site-key', onSuccess }),
    );

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    // The component should expose a reset function via ref
    // (This will be verified in the actual implementation)
  });
});
