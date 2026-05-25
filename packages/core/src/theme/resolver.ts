// @MX:NOTE: [AUTO] ThemeResolver — 레이아웃 해석 체인 (module_instance → domain → site → fallback)
// @MX:SPEC: SPEC-THEME-001 Slice B REQ-THEME-010, REQ-THEME-012, REQ-THEME-013

export type LayoutResolution =
  | { type: 'component'; layoutPath: string; source: 'module_instance' | 'domain' | 'site' }
  | { type: 'fallback'; source: 'none' };

export interface ResolveLayoutOptions {
  /** 모듈 인스턴스 ID */
  mid?: string | null;
  /** 도메인 ThemeAssignment에서 가져온 레이아웃 경로 */
  domainThemeLayoutPath?: string | null;
  /** 사이트 기본 레이아웃 경로 */
  siteDefaultLayoutPath?: string | null;
  /** 모듈 인스턴스 오버라이드 레이아웃 경로 */
  moduleInstanceLayoutPath?: string | null;
}

/**
 * 레이아웃 해석 체인을 실행하여 활성 레이아웃을 결정한다.
 * 우선순위: module_instance override → domain assignment → site default → fallback
 *
 * REQ-THEME-010: 모듈 인스턴스 오버라이드 → 도메인 할당 → 사이트 기본값 순서로 해석
 * REQ-THEME-012: legacy layout_path는 컴포넌트 경로로 직접 수락 (Smarty 실행 없음)
 * REQ-THEME-013: 해석 불가 시 { type: 'fallback' } 반환 + 경고 로그
 */
// @MX:ANCHOR: [AUTO] resolveLayout — 레이아웃 해석의 핵심 진입점
// @MX:REASON: REQ-THEME-010/012/013의 중앙 실행 지점. 다수의 호출자 예정
export function resolveLayout(opts: ResolveLayoutOptions): LayoutResolution {
  // 1. 모듈 인스턴스 오버라이드
  if (opts.moduleInstanceLayoutPath) {
    return {
      type: 'component',
      layoutPath: opts.moduleInstanceLayoutPath,
      source: 'module_instance',
    };
  }

  // 2. 도메인 할당
  if (opts.domainThemeLayoutPath) {
    return {
      type: 'component',
      layoutPath: opts.domainThemeLayoutPath,
      source: 'domain',
    };
  }

  // 3. 사이트 기본값
  if (opts.siteDefaultLayoutPath) {
    return {
      type: 'component',
      layoutPath: opts.siteDefaultLayoutPath,
      source: 'site',
    };
  }

  // 4. 폴백 — 해석 불가 시 경고 출력
  // REQ-THEME-013: log a warning when no layout can be resolved
  console.warn('[ThemeResolver] 레이아웃을 해석할 수 없습니다. 폴백 레이아웃을 사용합니다.');
  return { type: 'fallback', source: 'none' };
}
