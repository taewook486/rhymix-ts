// SPEC-LAYOUT-001 Slice B — 레이아웃 슬롯 Server Component
// 콘텐츠를 감싸는 thin pass-through Server Component

import type { ReactNode } from 'react';

/**
 * Phase 1에서 정의된 슬롯 이름.
 * Phase 1: "content"만 지원.
 * 추후 슬롯 확장 시 이 타입에 추가한다.
 */
type SlotName = 'content';

/**
 * LayoutSlot — 레이아웃 내 특정 영역을 마킹하는 Server Component.
 * Phase 1에서는 "content" 슬롯만 사용되며 pass-through로 동작한다.
 *
 * 사용 예:
 * ```tsx
 * <LayoutSlot name="content">
 *   <ModuleOutput />
 * </LayoutSlot>
 * ```
 */
export function LayoutSlot({
  name: _name,
  children,
}: {
  /** 슬롯 이름 — Phase 1에서는 "content"만 허용 */
  name: SlotName;
  children: ReactNode;
}) {
  // Phase 1: 슬롯은 단순 pass-through — 추후 슬롯 렌더링 로직 확장 예정
  return <>{children}</>;
}
