// SPEC-LAYOUT-001 Slice B — 레이아웃 컴포넌트 레지스트리
// REQ-LAYOUT-009: 정적 등록 전용 레지스트리 (동적 import 금지)

import type { ComponentType, ReactNode } from 'react';
import type { ParsedExtraVars } from './types';

/**
 * 레이아웃 컴포넌트가 받는 props.
 * REQ-LAYOUT-009
 */
export interface LayoutComponentProps {
  children: ReactNode;
  extraVars: ParsedExtraVars;
}

/**
 * 레이아웃 이름 → 컴포넌트 맵.
 * 모듈 레벨 싱글턴 — 등록 후 불변.
 * REQ-LAYOUT-009: 동적 import 금지, 명시적 등록만 허용.
 */
// @MX:ANCHOR: [AUTO] layoutRegistry — 레이아웃 컴포넌트 레지스트리 저장소
// @MX:REASON: registerLayout + getLayout + renderModuleWithLayout 모두 이 맵에 fan_in >= 3
const layoutRegistry = new Map<string, ComponentType<LayoutComponentProps>>();

/**
 * 레이아웃 컴포넌트를 레지스트리에 등록한다.
 * 멱등성: 같은 이름에 같은 컴포넌트를 재등록하면 no-op.
 * 같은 이름에 다른 컴포넌트를 등록하면 경고를 출력하고 기존 컴포넌트를 유지한다.
 *
 * REQ-LAYOUT-009
 */
// @MX:ANCHOR: [AUTO] registerLayout — 레이아웃 등록 공개 API
// @MX:REASON: themes/default, 테스트 픽스처, apps/web 초기화 코드에서 호출됨 (fan_in >= 3 예상)
export function registerLayout(
  name: string,
  component: ComponentType<LayoutComponentProps>,
): void {
  const existing = layoutRegistry.get(name);

  // 동일한 이름에 이미 등록된 경우
  if (existing !== undefined) {
    if (existing === component) {
      // 동일한 컴포넌트 재등록 → 완전 멱등, no-op
      return;
    }
    // 다른 컴포넌트로 덮어쓰기 시도 → 경고 출력 후 기존 유지
    console.warn(
      `[Layout] registerLayout: '${name}' 이름이 이미 등록되어 있습니다. 기존 컴포넌트를 유지합니다.`,
    );
    return;
  }

  layoutRegistry.set(name, component);
}

/**
 * 이름으로 레이아웃 컴포넌트를 조회한다.
 * 없으면 null 반환.
 *
 * REQ-LAYOUT-009
 */
export function getLayout(name: string): ComponentType<LayoutComponentProps> | null {
  return layoutRegistry.get(name) ?? null;
}
