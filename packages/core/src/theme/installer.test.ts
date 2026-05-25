import { describe, it, expect } from 'vitest';
import { installTheme } from './installer';

const validManifest = {
  name: 'my-theme',
  displayName: 'My Theme',
  version: '1.0.0',
  author: 'Test Author',
  layouts: ['default'],
  skins: { default: ['light'] },
  widgetStyles: [],
  tokensSchema: {},
  supportsDarkMode: false,
};

describe('installTheme', () => {
  // IN-1: valid manifest, no existing themes → ok:true, status='installed'
  it('IN-1: 유효한 매니페스트, 기존 테마 없음 → ok:true, status=installed', () => {
    const result = installTheme({ manifest: validManifest });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.status).toBe('installed');
    }
  });

  // IN-2: valid manifest, name already in existingThemes → THEME_ALREADY_INSTALLED
  it('IN-2: 이미 설치된 테마 이름 → THEME_ALREADY_INSTALLED 반환', () => {
    const result = installTheme({
      manifest: validManifest,
      existingThemes: ['my-theme'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('THEME_ALREADY_INSTALLED');
      if (result.error === 'THEME_ALREADY_INSTALLED') {
        expect(result.existingVersion).toBeDefined();
      }
    }
  });

  // IN-3: manifest missing required field → MANIFEST_INVALID
  it('IN-3: 필수 필드 누락 매니페스트 → MANIFEST_INVALID 반환', () => {
    const result = installTheme({ manifest: { name: 'incomplete' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('MANIFEST_INVALID');
    }
  });

  // IN-4: manifest with parent, parent in existingThemes → ok:true
  it('IN-4: parent가 있고 existingThemes에 포함 → ok:true', () => {
    const manifestWithParent = { ...validManifest, name: 'child-theme', parent: 'base-theme' };
    const result = installTheme({
      manifest: manifestWithParent,
      existingThemes: ['base-theme'],
    });
    expect(result.ok).toBe(true);
  });

  // IN-5: manifest with parent, parent NOT in existingThemes → PARENT_THEME_MISSING
  it('IN-5: parent가 있고 existingThemes에 없음 → PARENT_THEME_MISSING 반환', () => {
    const manifestWithParent = { ...validManifest, name: 'child-theme', parent: 'base-theme' };
    const result = installTheme({
      manifest: manifestWithParent,
      existingThemes: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('PARENT_THEME_MISSING');
      if (result.error === 'PARENT_THEME_MISSING') {
        expect(result.parentName).toBe('base-theme');
      }
    }
  });

  // IN-6: ok result has correct name, displayName, version from manifest
  it('IN-6: 성공 결과에 매니페스트의 name, displayName, version이 포함된다', () => {
    const result = installTheme({ manifest: validManifest });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.name).toBe('my-theme');
      expect(result.theme.displayName).toBe('My Theme');
      expect(result.theme.version).toBe('1.0.0');
    }
  });

  // IN-7: ok result installedAt is a Date object
  it('IN-7: 성공 결과의 installedAt은 Date 인스턴스다', () => {
    const result = installTheme({ manifest: validManifest });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.installedAt).toBeInstanceOf(Date);
    }
  });

  // IN-8: existingThemes=undefined (omitted) treated as empty array
  it('IN-8: existingThemes 미지정 시 빈 배열로 처리된다', () => {
    const result = installTheme({ manifest: validManifest });
    expect(result.ok).toBe(true);
  });
});
