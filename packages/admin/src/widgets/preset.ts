/**
 * Widget Preset 헬퍼 — SPEC-ADMIN-EXTRAS-001 REQ-060~065
 *
 * validatePresetProps: 프리셋 props를 현재 widgetDef의 propsSchema로 재검증.
 * REQ-062: 적용 전 재검증 결과를 caller에게 반환해서 UI 경고 표시 가능하도록.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-060~065
 */

import type { ZodIssue, ZodType, ZodTypeDef } from 'zod';

/**
 * WidgetDefinition의 구조적 부분 타입 — @rhymix-ts/core에 의존하지 않도록 인라인 정의.
 * propsSchema만 필요하므로 최소 인터페이스로 구성한다.
 */
interface WidgetDefinitionLike {
  propsSchema: ZodType<unknown, ZodTypeDef, unknown>;
}

/**
 * validatePresetProps
 *
 * 프리셋 props를 widgetDef의 propsSchema로 safe-parse하여 검증 결과를 반환한다.
 * valid=false일 때 issues 배열로 ZodIssue 목록을 제공하여
 * 호출 측(UI)에서 경고를 표시할 수 있도록 한다.
 *
 * @param widgetDef - 적용 대상 WidgetDefinition
 * @param props - 검증할 프리셋 props (unknown 허용)
 * @returns { valid: true } | { valid: false; issues: ZodIssue[] }
 */
// @MX:ANCHOR: [AUTO] validatePresetProps — widget preset 적용 경로 전체에서 호출됨
// @MX:REASON: tRPC router, admin UI, preset apply 3개 이상에서 fan_in >= 3
export function validatePresetProps(
  widgetDef: WidgetDefinitionLike,
  props: unknown,
): { valid: true } | { valid: false; issues: ZodIssue[] } {
  const result = widgetDef.propsSchema.safeParse(props);

  if (result.success) {
    return { valid: true };
  }

  return { valid: false, issues: result.error.issues };
}
