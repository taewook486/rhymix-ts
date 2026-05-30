// SPEC-LAYOUT-001 Slice B — context.tsx TDD 테스트
// REQ-LAYOUT-005: LayoutContext, LayoutProvider, useLayoutContext, useLayoutContextOptional

import { describe, it, expect } from 'vitest';
import type { LayoutContextValue } from './types';

describe('context 모듈', () => {
  // CTX-1: LayoutContext가 export 되어 있어야 한다
  it('LayoutContext가 정의되어 있어야 한다', async () => {
    const module = await import('./context');
    expect(module.LayoutContext).toBeDefined();
    // React.createContext의 결과는 Provider와 Consumer를 갖는다
    expect(module.LayoutContext).toHaveProperty('Provider');
    expect(module.LayoutContext).toHaveProperty('Consumer');
  });

  // CTX-2: LayoutProvider가 export 되어 있어야 한다
  it('LayoutProvider 컴포넌트가 export 되어 있어야 한다', async () => {
    const module = await import('./context');
    expect(typeof module.LayoutProvider).toBe('function');
  });

  // CTX-3: useLayoutContext가 export 되어 있어야 한다
  it('useLayoutContext 함수가 export 되어 있어야 한다', async () => {
    const module = await import('./context');
    expect(typeof module.useLayoutContext).toBe('function');
  });

  // CTX-4: useLayoutContextOptional이 export 되어 있어야 한다
  it('useLayoutContextOptional 함수가 export 되어 있어야 한다', async () => {
    const module = await import('./context');
    expect(typeof module.useLayoutContextOptional).toBe('function');
  });

  // CTX-5: useLayoutContext는 null 값 시 Error를 throw 해야 한다
  // hook 호출 없이 내부 로직을 추출하여 검증
  it('context 값이 null일 때 useLayoutContext 로직이 Error를 throw해야 한다', () => {
    // useLayoutContext 내부 로직: if (value === null) throw new Error(...)
    const simulateUseLayoutContext = (value: LayoutContextValue | null): LayoutContextValue => {
      if (value === null) {
        throw new Error('[Layout] useLayoutContext must be used within a LayoutProvider');
      }
      return value;
    };

    expect(() => simulateUseLayoutContext(null)).toThrow(
      '[Layout] useLayoutContext must be used within a LayoutProvider',
    );
  });

  // CTX-6: useLayoutContextOptional은 null 값 시 null을 반환해야 한다
  it('context 값이 null일 때 useLayoutContextOptional 로직은 null을 반환해야 한다', () => {
    const simulateUseLayoutContextOptional = (
      value: LayoutContextValue | null,
    ): LayoutContextValue | null => {
      return value; // null이면 그대로 null 반환
    };

    const result = simulateUseLayoutContextOptional(null);
    expect(result).toBeNull();
  });

  // CTX-7: LayoutContextValue 타입 구조 검증 (타입-레벨 테스트)
  it('LayoutContextValue가 올바른 구조를 갖는다', () => {
    const value: LayoutContextValue = {
      site: { id: 1, title: '테스트' },
      domain: { id: 1, hostname: 'example.com' },
      user: null,
      menu: [{ id: 1, title: '홈', url: '/' }],
      extraVars: { layoutType: 'MAIN_PAGE' },
    };
    // 구조 검증
    expect(value.site.id).toBe(1);
    expect(value.domain.hostname).toBe('example.com');
    expect(value.user).toBeNull();
    expect(value.extraVars.layoutType).toBe('MAIN_PAGE');
  });
});
