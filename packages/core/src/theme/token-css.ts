import type { ThemeTokens } from './types';

const DEFAULT_PREFIX = '--rx';

/**
 * ThemeTokens를 CSS 변수 선언 블록(:root { ... })으로 변환한다.
 * @MX:ANCHOR: [AUTO] CSS 변수 생성의 핵심 진입점
 * @MX:REASON: REQ-THEME-030/031/032 - 토큰 → CSS 변수 변환 불변 계약
 */
export function generateCssVariables(tokens: ThemeTokens, prefix: string = DEFAULT_PREFIX): string {
  const lines: string[] = [];

  // colors: { primary, background, foreground, accent }
  for (const [key, value] of Object.entries(tokens.colors)) {
    lines.push(`  ${prefix}-color-${key}: ${value};`);
  }

  // typography
  lines.push(`  ${prefix}-font-family-base: ${tokens.typography.fontFamilyBase};`);
  lines.push(`  ${prefix}-font-family-heading: ${tokens.typography.fontFamilyHeading};`);
  lines.push(`  ${prefix}-base-size: ${tokens.typography.baseSize};`);

  // spacing: { unit: number }
  lines.push(`  ${prefix}-spacing-unit: ${tokens.spacing.unit};`);

  // radii: { sm, md, lg }
  for (const [key, value] of Object.entries(tokens.radii)) {
    lines.push(`  ${prefix}-radii-${key}: ${value};`);
  }

  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * dark 모드 CSS 변수 블록(.dark { ... })을 생성한다.
 * dark variant가 없으면 null을 반환한다.
 */
export function generateDarkCssVariables(tokens: ThemeTokens): string | null {
  if (tokens.dark?.colors === undefined) {
    return null;
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(tokens.dark.colors)) {
    if (value !== undefined) {
      lines.push(`  ${DEFAULT_PREFIX}-color-${key}: ${value};`);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return `.dark {\n${lines.join('\n')}\n}`;
}

/**
 * Tailwind config extend.colors에 사용할 CSS 변수 참조 맵을 반환한다.
 * REQ-THEME-033
 */
export function getTailwindThemeExtension(tokens: ThemeTokens): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(tokens.colors)) {
    result[key] = `var(${DEFAULT_PREFIX}-color-${key})`;
  }
  return result;
}
