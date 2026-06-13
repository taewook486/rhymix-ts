/**
 * Vitest setup file for apps/web tests
 * jsdom 환경에서 필요한 mock들을 설정
 */

import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// jest-dom 매처 확장 — toBeInTheDocument 등
expect.extend(matchers);

// window.matchMedia mock — jsdom 기본 미지원
// @MX:NOTE: [AUTO] node 환경에서는 window 객체가 없으므로 jsdom 환경에서만 mock
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // HTMLDialogElement mock — jsdom은 showModal/close를 미구현
  // @MX:NOTE: [AUTO] <dialog> 요소의 showModal/close 메서드 폴리필
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
  }
  if (!window.HTMLDialogElement.prototype.close) {
    window.HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
  }
}
