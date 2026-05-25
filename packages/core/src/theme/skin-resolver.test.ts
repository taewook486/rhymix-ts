import { describe, it, expect } from 'vitest';
import { resolveSkin } from './skin-resolver';

describe('resolveSkin', () => {
  // SK-1: themeSkinsMap에서 찾으면 source 'active'
  it('SK-1: themeSkinsMap에 skin이 있으면 source active를 반환한다', () => {
    const result = resolveSkin('board', 'default', {
      themeSkinsMap: { 'board:default': 'skins/board/default.tsx' },
    });
    expect(result.source).toBe('active');
    expect(result.componentPath).toBe('skins/board/default.tsx');
  });

  // SK-2: midSkinOverride가 skinName과 매칭되면 source 'override'
  it('SK-2: midSkinOverride가 있으면 source override를 반환한다', () => {
    const result = resolveSkin('board', 'default', {
      themeSkinsMap: { 'board:default': 'skins/board/default.tsx' },
      mid: '123',
      midSkinOverride: 'custom',
      overrideSkinsMap: { 'board:custom': 'skins/board/custom.tsx' },
    });
    expect(result.source).toBe('override');
    expect(result.componentPath).toBe('skins/board/custom.tsx');
  });

  // SK-3: themeSkinsMap에 없고 parentSkinsMap에 있으면 source 'parent'
  it('SK-3: themeSkinsMap에 없고 parentSkinsMap에 있으면 source parent를 반환한다', () => {
    const result = resolveSkin('board', 'default', {
      themeSkinsMap: {},
      parentSkinsMap: { 'board:default': 'parent/skins/board/default.tsx' },
    });
    expect(result.source).toBe('parent');
    expect(result.componentPath).toBe('parent/skins/board/default.tsx');
  });

  // SK-4: 아무것도 없으면 source 'fallback', componentPath = 'built-in/default-skin'
  it('SK-4: 아무것도 없으면 source fallback과 built-in/default-skin을 반환한다', () => {
    const result = resolveSkin('board', 'unknown', {});
    expect(result.source).toBe('fallback');
    expect(result.componentPath).toBe('built-in/default-skin');
  });

  // SK-5: midSkinOverride가 themeSkinsMap보다 우선순위가 높다
  it('SK-5: midSkinOverride는 themeSkinsMap보다 우선순위가 높다', () => {
    const result = resolveSkin('board', 'default', {
      themeSkinsMap: { 'board:default': 'skins/board/default.tsx' },
      mid: '42',
      midSkinOverride: 'special',
      overrideSkinsMap: { 'board:special': 'skins/board/special.tsx' },
    });
    expect(result.source).toBe('override');
    expect(result.componentPath).toBe('skins/board/special.tsx');
  });

  // SK-6: themeSkinsMap이 비어있고 parentSkinsMap에 있으면 source 'parent'
  it('SK-6: themeSkinsMap이 비어있고 parentSkinsMap에 있으면 source parent를 반환한다', () => {
    const result = resolveSkin('widget', 'list', {
      themeSkinsMap: {},
      parentSkinsMap: { 'widget:list': 'parent/skins/widget/list.tsx' },
    });
    expect(result.source).toBe('parent');
    expect(result.componentPath).toBe('parent/skins/widget/list.tsx');
  });
});
