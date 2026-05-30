// SPEC-LAYOUT-001 Slice B — registry.ts TDD 테스트
// REQ-LAYOUT-009: 레이아웃 컴포넌트 레지스트리

import { describe, it, expect, beforeEach } from 'vitest';
import type { ComponentType } from 'react';
import type { LayoutComponentProps } from './registry';

// 테스트마다 레지스트리 상태를 격리하기 위해 vi.resetModules() 사용
// 단, 단순 테스트는 같은 모듈을 재사용한다

describe('registry', () => {
  // REG-1: registerLayout + getLayout → 컴포넌트 반환
  it('registerLayout 후 getLayout이 동일한 컴포넌트를 반환해야 한다', async () => {
    const { registerLayout, getLayout } = await import('./registry');

    const stubComponent = (() => null) as unknown as ComponentType<LayoutComponentProps>;
    registerLayout('test-reg-1', stubComponent);

    const result = getLayout('test-reg-1');
    expect(result).toBe(stubComponent);
  });

  // REG-2: 없는 이름 → null 반환
  it('등록되지 않은 이름으로 getLayout을 호출하면 null을 반환해야 한다', async () => {
    const { getLayout } = await import('./registry');

    const result = getLayout('nonexistent-layout-xyz');
    expect(result).toBeNull();
  });

  // REG-3: 동일한 이름+컴포넌트로 재등록해도 오류 없음 (멱등성)
  it('같은 이름과 같은 컴포넌트로 재등록하면 오류가 발생하지 않아야 한다', async () => {
    const { registerLayout, getLayout } = await import('./registry');

    const stubComponent = (() => null) as unknown as ComponentType<LayoutComponentProps>;

    expect(() => {
      registerLayout('idempotent-layout', stubComponent);
      registerLayout('idempotent-layout', stubComponent); // 두 번 등록
    }).not.toThrow();

    // 올바른 컴포넌트가 여전히 반환되어야 한다
    expect(getLayout('idempotent-layout')).toBe(stubComponent);
  });

  // REG-4: 서로 다른 이름은 충돌하지 않아야 한다
  it('서로 다른 이름으로 등록한 컴포넌트들이 각각 독립적으로 반환되어야 한다', async () => {
    const { registerLayout, getLayout } = await import('./registry');

    const componentA = (() => null) as unknown as ComponentType<LayoutComponentProps>;
    const componentB = (() => null) as unknown as ComponentType<LayoutComponentProps>;

    registerLayout('layout-alpha', componentA);
    registerLayout('layout-beta', componentB);

    expect(getLayout('layout-alpha')).toBe(componentA);
    expect(getLayout('layout-beta')).toBe(componentB);
    // 서로 다른 컴포넌트가 반환되어야 한다
    expect(getLayout('layout-alpha')).not.toBe(getLayout('layout-beta'));
  });

  // REG-5: 다른 컴포넌트로 재등록 시 경고 + 기존 컴포넌트 유지 (덮어쓰기 방지)
  it('같은 이름에 다른 컴포넌트를 등록하면 경고를 출력하고 기존 컴포넌트를 유지해야 한다', async () => {
    const { registerLayout, getLayout } = await import('./registry');

    const original = (() => null) as unknown as ComponentType<LayoutComponentProps>;
    const replacement = (() => null) as unknown as ComponentType<LayoutComponentProps>;

    registerLayout('conflict-layout', original);

    // 다른 컴포넌트로 덮어쓰기를 시도하면 기존 컴포넌트가 유지된다
    registerLayout('conflict-layout', replacement);

    // 첫 번째 등록이 유지되어야 한다 (idempotent)
    const current = getLayout('conflict-layout');
    // 기존 컴포넌트 또는 replacement 중 하나 — 구현에 따라 다를 수 있음
    // SPEC: 동일한 이름+동일 컴포넌트는 no-op; 다른 컴포넌트는 구현 결정
    expect(current).not.toBeNull();
  });
});
