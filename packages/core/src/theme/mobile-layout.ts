export type MobileLayoutSrl = -1 | -2 | number; // -1=사이트 기본, -2=반응형, N=특정 레이아웃

export type MobileLayoutResolution =
  | { type: 'responsive'; source: 'mlayout_responsive' }
  | { type: 'specific'; layoutId: number; source: 'mlayout_specific' }
  | { type: 'site_default'; source: 'mlayout_site_default' }
  | { type: 'fallback'; source: 'mlayout_fallback' };

/**
 * mlayout_srl 값에 따라 모바일 레이아웃 해석 결과를 반환한다.
 * REQ-THEME-090/091/092/093
 *
 * - mlayoutSrl = -2 → responsive
 * - mlayoutSrl = -1 → site_default
 * - mlayoutSrl >= 1 (양수) → specific (layoutId = mlayoutSrl)
 * - mlayoutSrl = null/undefined → fallback
 */
// @MX:ANCHOR: [AUTO] 모바일 레이아웃 해석 진입점
// @MX:REASON: REQ-THEME-090~093 - resolveMobileLayout 불변 계약
export function resolveMobileLayout(opts: {
  mlayoutSrl?: MobileLayoutSrl | null;
  isMobileUserAgent?: boolean;
}): MobileLayoutResolution {
  const { mlayoutSrl } = opts;

  if (mlayoutSrl === null || mlayoutSrl === undefined) {
    return { type: 'fallback', source: 'mlayout_fallback' };
  }

  if (mlayoutSrl === -2) {
    return { type: 'responsive', source: 'mlayout_responsive' };
  }

  if (mlayoutSrl === -1) {
    return { type: 'site_default', source: 'mlayout_site_default' };
  }

  if (mlayoutSrl >= 1) {
    return { type: 'specific', layoutId: mlayoutSrl, source: 'mlayout_specific' };
  }

  return { type: 'fallback', source: 'mlayout_fallback' };
}
