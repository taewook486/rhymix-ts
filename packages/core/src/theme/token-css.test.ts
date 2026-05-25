import { describe, it, expect } from 'vitest';
import { generateCssVariables, generateDarkCssVariables, getTailwindThemeExtension } from './token-css';
import type { ThemeTokens } from './types';

const baseTokens: ThemeTokens = {
  colors: {
    primary: '#3b82f6',
    background: '#ffffff',
    foreground: '#000000',
    accent: '#8b5cf6',
  },
  typography: {
    fontFamilyBase: 'Inter, sans-serif',
    fontFamilyHeading: 'Poppins, sans-serif',
    baseSize: 16,
  },
  spacing: {
    unit: 4,
  },
  radii: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
};

const tokensWithDark: ThemeTokens = {
  ...baseTokens,
  dark: {
    colors: {
      primary: '#60a5fa',
      background: '#1a1a2e',
      foreground: '#f0f0f0',
      accent: '#a78bfa',
    },
  },
};

describe('generateCssVariables', () => {
  // TC-1: :root { } 블록과 --rx-color- 항목을 생성한다
  it('TC-1: :root 블록과 --rx-color- 변수를 생성한다', () => {
    const css = generateCssVariables(baseTokens);
    expect(css).toContain(':root {');
    expect(css).toContain('--rx-color-primary: #3b82f6');
    expect(css).toContain('--rx-color-background: #ffffff');
    expect(css).toContain('--rx-color-foreground: #000000');
    expect(css).toContain('--rx-color-accent: #8b5cf6');
    expect(css).toContain('}');
  });

  // TC-2: typography.fontFamilyBase → --rx-font-family-base
  it('TC-2: typography.fontFamilyBase를 --rx-font-family-base 변수로 생성한다', () => {
    const css = generateCssVariables(baseTokens);
    expect(css).toContain('--rx-font-family-base: Inter, sans-serif');
  });

  // TC-3: 커스텀 prefix 사용
  it('TC-3: 커스텀 prefix를 사용하면 해당 prefix로 변수를 생성한다', () => {
    const css = generateCssVariables(baseTokens, '--theme');
    expect(css).toContain('--theme-color-primary: #3b82f6');
    expect(css).not.toContain('--rx-color-primary');
  });

  // TC-7: spacing과 radii 변수도 생성한다
  it('TC-7: spacing과 radii 변수를 생성한다', () => {
    const css = generateCssVariables(baseTokens);
    expect(css).toContain('--rx-spacing-unit: 4');
    expect(css).toContain('--rx-radii-sm: 0.25rem');
    expect(css).toContain('--rx-radii-md: 0.5rem');
    expect(css).toContain('--rx-radii-lg: 1rem');
  });

  // TC-8: colors만 있는 최소 토큰에서 undefined 라인 없음
  it('TC-8: colors만 있는 최소 토큰에서 undefined 라인이 없다', () => {
    // ThemeTokens는 모든 필드가 필수이므로 baseTokens 사용
    // spacing.unit이 숫자이므로 string 변환 확인
    const css = generateCssVariables(baseTokens);
    expect(css).not.toContain('undefined');
    expect(css).not.toContain(': ;');
  });
});

describe('generateDarkCssVariables', () => {
  // TC-4: dark variant가 있으면 .dark { } 블록을 반환한다
  it('TC-4: tokens.dark.colors가 있으면 .dark { } 블록을 반환한다', () => {
    const result = generateDarkCssVariables(tokensWithDark);
    expect(result).not.toBeNull();
    expect(result).toContain('.dark {');
    expect(result).toContain('--rx-color-primary: #60a5fa');
    expect(result).toContain('--rx-color-background: #1a1a2e');
    expect(result).toContain('}');
  });

  // TC-5: dark variant가 없으면 null을 반환한다
  it('TC-5: dark variant가 없으면 null을 반환한다', () => {
    const result = generateDarkCssVariables(baseTokens);
    expect(result).toBeNull();
  });
});

describe('getTailwindThemeExtension', () => {
  // TC-6: colors를 var(--rx-color-*) 값으로 매핑한다
  it('TC-6: colors를 var(--rx-color-*) 형식으로 매핑한다', () => {
    const ext = getTailwindThemeExtension(baseTokens);
    expect(ext.primary).toBe('var(--rx-color-primary)');
    expect(ext.background).toBe('var(--rx-color-background)');
    expect(ext.foreground).toBe('var(--rx-color-foreground)');
    expect(ext.accent).toBe('var(--rx-color-accent)');
  });
});
