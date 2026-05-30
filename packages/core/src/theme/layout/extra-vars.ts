// SPEC-LAYOUT-001 Slice A — Layout extraVars Zod 검증 헬퍼
// REQ-LAYOUT-007: safeParse + 잘못된 필드 드롭 + console.warn

import { z } from 'zod';
import type { ParsedExtraVars } from './types';

/**
 * Layout.extraVars JSON 필드의 Zod 스키마.
 * REQ-LAYOUT-007: 선택적 필드 + layoutType 기본값 MAIN_PAGE
 */
// @MX:NOTE: [AUTO] layoutExtraVarsSchema — extraVars 필드 검증 계약
// @MX:SPEC: SPEC-LAYOUT-001 REQ-LAYOUT-007
export const layoutExtraVarsSchema = z.object({
  siteTitle: z.string().optional(),
  logoImageUrl: z.string().optional(),
  logoText: z.string().optional(),
  footerText: z.string().optional(),
  layoutType: z.enum(['MAIN_PAGE', 'SUB_PAGE']).default('MAIN_PAGE'),
});

/**
 * Layout.extraVars raw JSON을 파싱하여 ParsedExtraVars를 반환한다.
 * 잘못된 필드는 safeParse로 드롭되고 console.warn이 출력된다.
 * 파싱 실패 시 기본값 { layoutType: 'MAIN_PAGE' }를 반환한다.
 *
 * REQ-LAYOUT-007
 */
// @MX:ANCHOR: [AUTO] parseLayoutExtraVars — extraVars 파싱 진입점
// @MX:REASON: 레이아웃 렌더 파이프라인 전체에서 호출됨 (fan_in >= 3 예상)
export function parseLayoutExtraVars(raw: unknown): ParsedExtraVars {
  const result = layoutExtraVarsSchema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  // 파싱 실패 시 경고 출력 후 기본값 반환
  // REQ-LAYOUT-007: 잘못된 필드는 드롭되고 경고가 로깅된다
  console.warn(
    '[Layout] extraVars 파싱 실패, 기본값을 사용합니다:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
  );

  return { layoutType: 'MAIN_PAGE' };
}
