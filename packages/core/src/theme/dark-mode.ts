import type { ThemeTokens } from './types';
import { generateDarkCssVariables } from './token-css';

export interface DarkModeConfig {
  supported: boolean;
  cssBlock: string | null;
}

// @MX:ANCHOR: [AUTO] dark mode 설정 조회 진입점
// @MX:REASON: REQ-THEME-040/041/042 - getDarkModeConfig 불변 계약

/**
 * ThemeTokens의 dark variant 여부를 기반으로 dark mode 설정을 반환한다.
 * dark.colors가 존재하면 supported=true, cssBlock을 생성한다.
 * REQ-THEME-040/041/042
 */
export function getDarkModeConfig(tokens: ThemeTokens): DarkModeConfig {
  const cssBlock = generateDarkCssVariables(tokens);
  if (cssBlock === null) {
    return { supported: false, cssBlock: null };
  }
  return { supported: true, cssBlock };
}

/**
 * @media (prefers-color-scheme: dark) 미디어 쿼리 블록을 생성한다.
 * dark variant가 없으면 null을 반환한다.
 * REQ-THEME-043
 */
export function buildDarkMediaQuery(tokens: ThemeTokens): string | null {
  if (tokens.dark?.colors === undefined) {
    return null;
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(tokens.dark.colors)) {
    if (value !== undefined) {
      lines.push(`    --rx-color-${key}: ${value};`);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return `@media (prefers-color-scheme: dark) {\n  :root {\n${lines.join('\n')}\n  }\n}`;
}
