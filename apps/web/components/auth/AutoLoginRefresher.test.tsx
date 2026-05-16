/**
 * @vitest-environment jsdom
 *
 * Specification tests for AutoLoginRefresher — SPEC-AUTH-001 Slice H.
 *
 * AutoLoginRefresher 는 client component 로서, NextAuth 세션이 unauthenticated
 * 인 상태이고 `rx_autologin` 쿠키가 존재할 때 단 1회 `/api/auth/autologin-refresh`
 * 를 호출해 session 재발급을 트리거한다.
 *
 * H-6: status='unauthenticated' + rx_autologin 쿠키 → fetch 호출됨
 * H-6b: re-render 가 일어나도 fetch 는 1회만 (useRef guard)
 * H-7a: status='authenticated' → fetch 미호출
 * H-7b: status='loading' → fetch 미호출
 * H-7c: rx_autologin 쿠키 없음 → fetch 미호출
 * H-8: fetch { ok: true } → router.refresh 호출
 * H-9a: fetch { ok: false } → router.refresh 미호출
 * H-9b: fetch network error → router.refresh 미호출 (silent fail)
 */

import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const { useSessionMock, useRouterMock, routerRefreshMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  useRouterMock: vi.fn(),
  routerRefreshMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: useSessionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
}));

// fetch 는 globalThis 에서 mock.
const fetchMock = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: fetchMock,
});

// document.cookie 헬퍼 — jsdom 환경에서 직접 set 가능.
function setCookie(value: string): void {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => value,
  });
}

// ---------------------------------------------------------------------------
// SUT import (after mocks)
// ---------------------------------------------------------------------------

import { AutoLoginRefresher } from './AutoLoginRefresher';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoLoginRefresher — Slice H', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerRefreshMock.mockReset();
    useRouterMock.mockReturnValue({ refresh: routerRefreshMock });
    setCookie('');
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // H-6: unauthenticated + rx_autologin → fetch 호출
  // -------------------------------------------------------------------------
  it('H-6: fetches /api/auth/autologin-refresh when unauthenticated and rx_autologin exists', async () => {
    setCookie('rx_autologin=some-key; other=foo');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, userId: 42 }),
    });

    render(<AutoLoginRefresher />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/autologin-refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // -------------------------------------------------------------------------
  // H-6b: re-render 이 와도 fetch 1회만
  // -------------------------------------------------------------------------
  it('H-6b: fetches only once even after re-render (useRef guard)', async () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, userId: 42 }),
    });

    const { rerender } = render(<AutoLoginRefresher />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    rerender(<AutoLoginRefresher />);
    rerender(<AutoLoginRefresher />);
    // 추가 호출이 발생하지 않아야 한다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // H-7a: authenticated → fetch 미호출
  // -------------------------------------------------------------------------
  it('H-7a: does NOT fetch when status is authenticated', () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'authenticated' });

    render(<AutoLoginRefresher />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-7b: loading → fetch 미호출
  // -------------------------------------------------------------------------
  it('H-7b: does NOT fetch when status is loading', () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'loading' });

    render(<AutoLoginRefresher />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-7c: 쿠키 없음 → fetch 미호출
  // -------------------------------------------------------------------------
  it('H-7c: does NOT fetch when rx_autologin cookie is absent', () => {
    setCookie('other=foo; bar=baz');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    render(<AutoLoginRefresher />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-8: { ok: true } → router.refresh 호출
  // -------------------------------------------------------------------------
  it('H-8: calls router.refresh when refresh API returns ok=true', async () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, userId: 42 }),
    });

    render(<AutoLoginRefresher />);

    await waitFor(() => {
      expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // H-9a: { ok: false } → router.refresh 미호출
  // -------------------------------------------------------------------------
  it('H-9a: does NOT call router.refresh when refresh API returns ok=false', async () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: false, code: 'INVALID' }),
    });

    render(<AutoLoginRefresher />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    // microtask flush 보장을 위해 한번 더 await.
    await new Promise((r) => setTimeout(r, 0));
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-9b: network error → router.refresh 미호출 (silent fail)
  // -------------------------------------------------------------------------
  it('H-9b: silently swallows network errors and does NOT call router.refresh', async () => {
    setCookie('rx_autologin=some-key');
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });
    fetchMock.mockRejectedValue(new Error('network down'));

    // console.error 가 호출되지만 throw 는 발생해선 안 된다.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AutoLoginRefresher />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(routerRefreshMock).not.toHaveBeenCalled();

    errSpy.mockRestore();
  });
});
