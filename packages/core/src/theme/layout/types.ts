// SPEC-LAYOUT-001 Slice A — 레이아웃 도메인 타입 정의
// REQ-LAYOUT-004, REQ-LAYOUT-005, REQ-LAYOUT-007

/**
 * 데이터베이스 Layout 행의 TypeScript 표현.
 * 모바일 레이아웃은 Phase 1에서 제외 (layoutType은 항상 'DESKTOP').
 * REQ-LAYOUT-004
 */
export interface LayoutConfig {
  /** Layout.id (cuid) */
  id: string;
  /** Theme.id */
  themeId: string;
  /** Layout.name (예: "default") */
  name: string;
  /** 사용자에게 표시되는 레이아웃 이름 */
  title: string;
  /** 디스크 경로 또는 레지스트리 키 */
  layoutPath: string;
  /** Phase 1에서 모바일 레이아웃 제외 */
  layoutType: 'DESKTOP';
  /** SPEC-THEME-001 레거시 호환 siteSrl */
  siteSrl: number | null;
  /** raw JSON - extra-vars.ts에서 ParsedExtraVars로 검증 */
  extraVars: unknown;
}

/**
 * LayoutProvider에 주입되는 컨텍스트 값.
 * SPEC-WIDGET-001이 이 인터페이스를 read-only consumer로 사용한다.
 * REQ-LAYOUT-005, SPEC-LAYOUT-001 §5.5
 */
export interface LayoutContextValue {
  site: {
    id: number;
    title: string | null;
  };
  domain: {
    id: number;
    hostname: string;
  };
  /** 현재 인증된 사용자, 미인증이면 null */
  user: { id: number; nickname: string } | null;
  /** GNB 메뉴 아이템 목록 (SPEC-WIDGET-001 GNB 렌더링에 사용) */
  menu: { id: number; title: string; url: string | null }[];
  /** 활성 레이아웃의 파싱된 extraVars */
  extraVars: ParsedExtraVars;
}

/**
 * Layout.extraVars JSON 필드의 파싱 결과.
 * layoutExtraVarsSchema로 safeParse된 결과 타입.
 * REQ-LAYOUT-007
 */
export interface ParsedExtraVars {
  siteTitle?: string;
  logoImageUrl?: string;
  logoText?: string;
  footerText?: string;
  /** 기본값: 'MAIN_PAGE' */
  layoutType: 'MAIN_PAGE' | 'SUB_PAGE';
}

/**
 * resolveLayoutFromInstance의 반환 타입 — 판별 유니온.
 * REQ-LAYOUT-011
 */
export type ResolveResult =
  | {
      type: 'component';
      config: LayoutConfig;
      /** 해석 출처 */
      source: 'module_instance' | 'domain' | 'site';
    }
  | { type: 'fallback' };
