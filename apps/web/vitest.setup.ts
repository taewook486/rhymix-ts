/**
 * Vitest setup file for apps/web tests
 * jsdom 환경에서 필요한 mock들을 설정
 */

import { afterEach, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// 각 테스트 후 자동 정리
afterEach(() => {
  cleanup();
});

// jest-dom 매처 확장 — toBeInTheDocument 등.
// @testing-library/jest-dom/vitest(런타임+타입 일괄 제공) 대신 이 방식을 쓴다:
// 그 진입점은 내부에서 자체적으로 require('vitest')를 하는데, jest-dom이
// vitest를 peerDependency로 선언하지 않아 pnpm이 apps/web의 로컬 vitest(v3)가
// 아니라 루트의 vitest(v2)로 우회 해석할 수 있다 — 이 경우 apps/web 테스트가
// 실행되는 실제 vitest(v3)의 expect 싱글턴에는 매처가 등록되지 않는다.
// 여기서는 이미 올바르게 resolve된 로컬 expect를 직접 extend해 이 문제를 피한다.
// 타입 선언(Assertion 인터페이스 보강)은 types/jest-dom.d.ts에서 별도로 처리한다.
expect.extend(matchers);

// server-only 모듈 mock — vitest 환경에서는 항상 유효한 것으로 처리
vi.mock('server-only', () => ({}));

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
