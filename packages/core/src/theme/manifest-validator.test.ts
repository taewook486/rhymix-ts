import { describe, it, expect } from 'vitest';
import { parseManifest } from './manifest-validator';

// 공통 유효한 매니페스트 픽스처
const validManifest = {
  name: 'my-theme',
  version: '1.0.0',
  displayName: 'My Theme',
  author: 'Test Author',
  layouts: ['default'],
  skins: { board: ['default'] },
  widgetStyles: [],
  tokensSchema: {},
  supportsDarkMode: false,
};

describe('parseManifest', () => {
  // MV-1: 유효한 매니페스트 → ok: true, manifest 반환
  it('MV-1: valid manifest returns ok:true with manifest', () => {
    const result = parseManifest(validManifest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.name).toBe('my-theme');
      expect(result.manifest.version).toBe('1.0.0');
      expect(result.manifest.displayName).toBe('My Theme');
    }
  });

  // MV-2: name 필드 누락 → ok: false, MANIFEST_INVALID, field='name'
  it('MV-2: missing name returns ok:false with field=name', () => {
    const input = { ...validManifest, name: undefined };
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
      expect(result.field).toBe('name');
    }
  });

  // MV-3: layouts 누락 → ok: false, MANIFEST_INVALID
  it('MV-3: missing layouts returns ok:false', () => {
    const { layouts: _, ...input } = validManifest;
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // MV-4: skins 누락 → ok: false, MANIFEST_INVALID
  it('MV-4: missing skins returns ok:false', () => {
    const { skins: _, ...input } = validManifest;
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // MV-5: tokensSchema 누락 → ok: false, MANIFEST_INVALID
  it('MV-5: missing tokensSchema returns ok:false', () => {
    const { tokensSchema: _, ...input } = validManifest;
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // MV-6: 유효하지 않은 semver (예: "1.0") → ok: false, field='version'
  it('MV-6: invalid semver version returns ok:false with field=version', () => {
    const input = { ...validManifest, version: '1.0' };
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
      expect(result.field).toBe('version');
    }
  });

  // MV-7: 유효한 semver "2.1.0" → ok: true
  it('MV-7: valid semver "2.1.0" returns ok:true', () => {
    const input = { ...validManifest, version: '2.1.0' };
    const result = parseManifest(input);
    expect(result.ok).toBe(true);
  });

  // MV-8: pre-release semver "1.0.0-beta.1" → ok: true
  it('MV-8: valid semver with pre-release "1.0.0-beta.1" returns ok:true', () => {
    const input = { ...validManifest, version: '1.0.0-beta.1' };
    const result = parseManifest(input);
    expect(result.ok).toBe(true);
  });

  // MV-9: 대문자가 포함된 name → ok: false
  it('MV-9: name with uppercase returns ok:false', () => {
    const input = { ...validManifest, name: 'MyTheme' };
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // MV-10: 공백이 포함된 name → ok: false
  it('MV-10: name with spaces returns ok:false', () => {
    const input = { ...validManifest, name: 'my theme' };
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // MV-11: 선택적 author 생략 → ok: true
  it('MV-11: omitting optional author returns ok:true', () => {
    const { author: _, ...input } = validManifest;
    const result = parseManifest(input);
    expect(result.ok).toBe(true);
  });

  // MV-12: 선택적 parent 제공 → ok: true, parent 보존
  it('MV-12: optional parent provided returns ok:true with parent preserved', () => {
    const input = { ...validManifest, parent: 'base-theme' };
    const result = parseManifest(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.parent).toBe('base-theme');
    }
  });

  // MV-13: supportsDarkMode 생략 시 기본값 false → ok: true
  it('MV-13: omitting supportsDarkMode defaults to false', () => {
    const { supportsDarkMode: _, ...input } = validManifest;
    const result = parseManifest(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.supportsDarkMode).toBe(false);
    }
  });

  // MV-14: 빈 문자열 name → ok: false
  it('MV-14: empty string name returns ok:false', () => {
    const input = { ...validManifest, name: '' };
    const result = parseManifest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });
});
