/**
 * 기본 디자인 토큰 상수 — SPEC-MENU-001 REQ-MENU-060.
 *
 * 설치 시 ThemeAssignment.tokensOverride에 사용되는 기본값.
 * /admin/site/design 화면과 레이아웃 렌더링 레이어에서
 * 토큰이 없을时的 폴백값으로도 사용됨 (REQ-MENU-062).
 *
 * @MX:NOTE: [AUTO] themeTokensSchema와 동일한 구조 유지
 * tokensOverride 필드에 저장되며 Zod 검증 통과 필요
 */
import type { ThemeTokens } from './types';

/**
 * 기본 디자인 토큰.
 *
 * 색상: 읽기 쉬운 높은 대비 팔레트 (접근성 고려)
 * 타이포그래피: 시스템 기본 폰트 패밀리
 * 간격: 4px 기반 그리드 (8px = 1rem)
 * 라운딩: 부드러운 but 명확한 UI 경계
 */
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    primary: '#3B82F6',      // Modern blue
    background: '#FFFFFF',    // Clean white
    foreground: '#0F172A',    // Dark slate for text
    accent: '#8B5CF6',        // Purple accent
  },
  typography: {
    fontFamilyBase: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyHeading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: 16,             // Standard browser base
  },
  spacing: {
    unit: 4,                  // 4px base unit (0.25rem)
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  dark: {
    colors: {
      primary: '#60A5FA',
      background: '#0F172A',
      foreground: '#F8FAFC',
      accent: '#A78BFA',
    },
  },
};
