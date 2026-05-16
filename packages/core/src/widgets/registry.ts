/**
 * 위젯 레지스트리 — SPEC-ADMIN-001 Slice G
 *
 * 모듈 수준 Map — HMR-safe reset 지원.
 * React 의존성 없음 (packages/core 제약).
 */
import type { WidgetDefinition } from './types'

// 모듈 수준 Map (싱글턴 레지스트리)
const _registry = new Map<string, WidgetDefinition>()

/**
 * 위젯을 레지스트리에 등록한다.
 * 동일 name이 이미 존재하면 덮어쓴다.
 *
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerWidget(def: WidgetDefinition<any>): void {
  _registry.set(def.name, def as WidgetDefinition)
}

/**
 * 이름으로 위젯 정의를 조회한다.
 * 미등록 name이면 undefined 반환.
 */
export function getWidget(name: string): WidgetDefinition | undefined {
  return _registry.get(name)
}

/**
 * 등록된 모든 위젯 정의 목록을 반환한다.
 */
export function listWidgets(): WidgetDefinition[] {
  return Array.from(_registry.values())
}

/**
 * 레지스트리를 초기화한다 (테스트 격리용).
 */
export function resetWidgetRegistry(): void {
  _registry.clear()
}
