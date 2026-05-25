import { describe, it, expect } from 'vitest';
import { mergeThemeLayers, validateThemeInheritance } from './inheritance';

describe('mergeThemeLayers', () => {
  const parent = {
    name: 'parent-theme',
    layouts: { default: 'parent/layouts/default', blog: 'parent/layouts/blog' },
    skins: { 'board:default': 'parent/skins/board-default', 'gallery:list': 'parent/skins/gallery-list' },
    tokens: { primary: '#ff0000', secondary: '#00ff00' },
  };

  const child = {
    name: 'child-theme',
    layouts: { default: 'child/layouts/default', portfolio: 'child/layouts/portfolio' },
    skins: { 'board:default': 'child/skins/board-default' },
    tokens: { primary: '#0000ff' },
  };

  // IH-1: child layouts override parent layouts
  it('IH-1: child layouts override parent layouts', () => {
    const result = mergeThemeLayers(child, parent);
    expect(result.layouts.default).toBe('child/layouts/default');
  });

  // IH-2: parent layouts fill missing child layouts
  it('IH-2: parent layouts fill missing child layouts', () => {
    const result = mergeThemeLayers(child, parent);
    expect(result.layouts.blog).toBe('parent/layouts/blog');
    expect(result.layouts.portfolio).toBe('child/layouts/portfolio');
  });

  // IH-3: child only (no parent) → child values returned
  it('IH-3: returns child values directly when no parent provided', () => {
    const result = mergeThemeLayers(child);
    expect(result.layouts).toEqual(child.layouts);
    expect(result.skins).toEqual(child.skins);
    expect(result.tokens).toEqual(child.tokens);
  });

  // IH-4: skins merge correctly
  it('IH-4: child skins override parent skins and parent fills missing skins', () => {
    const result = mergeThemeLayers(child, parent);
    expect(result.skins['board:default']).toBe('child/skins/board-default');
    expect(result.skins['gallery:list']).toBe('parent/skins/gallery-list');
  });
});

describe('validateThemeInheritance', () => {
  // IH-5: no parent declared → valid=true
  it('IH-5: valid when no parent is declared in child manifest', () => {
    const result = validateThemeInheritance({
      childManifestParent: undefined,
      installedThemeNames: ['some-theme'],
    });
    expect(result).toEqual({ valid: true });
  });

  // IH-6: parent declared and installed → valid=true
  it('IH-6: valid when parent is declared and is installed', () => {
    const result = validateThemeInheritance({
      childManifestParent: 'base-theme',
      installedThemeNames: ['base-theme', 'other-theme'],
    });
    expect(result).toEqual({ valid: true });
  });

  // IH-7: parent declared but NOT installed → valid=false, PARENT_THEME_MISSING
  it('IH-7: invalid when parent is declared but not installed', () => {
    const result = validateThemeInheritance({
      childManifestParent: 'missing-theme',
      installedThemeNames: ['other-theme'],
    });
    expect(result).toEqual({
      valid: false,
      error: 'PARENT_THEME_MISSING',
      parentName: 'missing-theme',
    });
  });
});
