import { describe, it, expect } from 'vitest';
import { getDarkModeConfig, buildDarkMediaQuery } from './dark-mode';
import type { ThemeTokens } from './types';

const baseTokens: ThemeTokens = {
  colors: {
    primary: '#007bff',
    background: '#ffffff',
    foreground: '#000000',
    accent: '#ff5733',
  },
  typography: {
    fontFamilyBase: 'Inter, sans-serif',
    fontFamilyHeading: 'Inter, sans-serif',
    baseSize: 16,
  },
  spacing: { unit: 4 },
  radii: { sm: '4px', md: '8px', lg: '16px' },
};

const tokensWithDark: ThemeTokens = {
  ...baseTokens,
  dark: {
    colors: {
      primary: '#90cdf4',
      background: '#1a202c',
      foreground: '#f7fafc',
      accent: '#fc8181',
    },
  },
};

describe('getDarkModeConfig', () => {
  // DM-1: tokens with dark.colors → supported=true, non-null cssBlock
  it('DM-1: dark variant가 있으면 supported=true, cssBlock이 non-null이다', () => {
    const result = getDarkModeConfig(tokensWithDark);
    expect(result.supported).toBe(true);
    expect(result.cssBlock).not.toBeNull();
  });

  // DM-2: tokens without dark → supported=false, cssBlock=null
  it('DM-2: dark variant가 없으면 supported=false, cssBlock=null이다', () => {
    const result = getDarkModeConfig(baseTokens);
    expect(result.supported).toBe(false);
    expect(result.cssBlock).toBeNull();
  });

  // DM-3: cssBlock contains `.dark {` opener
  it('DM-3: cssBlock은 .dark { 로 시작한다', () => {
    const result = getDarkModeConfig(tokensWithDark);
    expect(result.cssBlock).toContain('.dark {');
  });

  // DM-6: getDarkModeConfig dark cssBlock contains --rx-color entries
  it('DM-6: cssBlock에 --rx-color 변수 항목이 포함된다', () => {
    const result = getDarkModeConfig(tokensWithDark);
    expect(result.cssBlock).toContain('--rx-color-');
  });
});

describe('buildDarkMediaQuery', () => {
  // DM-4: buildDarkMediaQuery with dark variant → returns string with @media (prefers-color-scheme: dark)
  it('DM-4: dark variant가 있으면 @media (prefers-color-scheme: dark) 문자열을 반환한다', () => {
    const result = buildDarkMediaQuery(tokensWithDark);
    expect(result).not.toBeNull();
    expect(result).toContain('@media (prefers-color-scheme: dark)');
  });

  // DM-5: buildDarkMediaQuery without dark → returns null
  it('DM-5: dark variant가 없으면 null을 반환한다', () => {
    const result = buildDarkMediaQuery(baseTokens);
    expect(result).toBeNull();
  });
});
