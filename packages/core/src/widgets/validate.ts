/**
 * 위젯 props 검증 유틸리티 — SPEC-WIDGET-001 Slice A
 *
 * defaultProps를 먼저 병합한 뒤 Zod safeParse를 실행한다.
 * throw하지 않고 { ok, props } | { ok, error } 유니온을 반환한다.
 */
import type { ZodError } from 'zod'
import type { WidgetDefinition } from './types'

// @MX:ANCHOR: [AUTO] validateWidgetProps — 렌더 파이프라인 + instances + 테스트에서 fan_in >= 3
// @MX:REASON: renderBodyWithWidgets, createWidgetInstance, updateWidgetInstance에서 공통 호출
/**
 * 위젯 props를 검증한다.
 *
 * 순서:
 * 1. rawProps에 def.defaultProps를 병합 (defaultProps가 우선)
 * 2. def.propsSchema.safeParse(merged) 실행
 * 3. 성공: { ok: true, props: P } 반환
 * 4. 실패: { ok: false, error: ZodError } 반환 (throw 없음)
 *
 * @param def - 위젯 정의 (propsSchema, defaultProps 포함)
 * @param rawProps - 검증할 원시 props 맵
 */
export function validateWidgetProps<P>(
  def: WidgetDefinition<P>,
  rawProps: Record<string, unknown>,
): { ok: true; props: P } | { ok: false; error: ZodError } {
  // rawProps가 우선, defaultProps는 누락된 키만 채운다
  const merged: Record<string, unknown> = {
    ...(def.defaultProps ?? {}),
    ...rawProps,
  }

  const result = def.propsSchema.safeParse(merged)
  if (result.success) {
    return { ok: true, props: result.data }
  }
  return { ok: false, error: result.error }
}
