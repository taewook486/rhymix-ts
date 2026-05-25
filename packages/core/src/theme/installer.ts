import { parseManifest } from './manifest-validator';

export type InstallResult =
  | { ok: true; theme: InstalledTheme }
  | { ok: false; error: 'MANIFEST_INVALID'; field: string; message: string }
  | { ok: false; error: 'THEME_ALREADY_INSTALLED'; existingVersion: string }
  | { ok: false; error: 'PARENT_THEME_MISSING'; parentName: string };

export interface InstalledTheme {
  name: string;
  displayName: string;
  version: string;
  author?: string;
  parent?: string;
  status: 'installed';
  installedAt: Date;
}

export interface InstallOptions {
  manifest: unknown;
  existingThemes?: string[];
  installedAt?: Date;
}

// @MX:ANCHOR: [AUTO] 테마 설치 파이프라인 진입점
// @MX:REASON: REQ-THEME-070/071/072 - installTheme 불변 계약

/**
 * 순수 비즈니스 로직으로 테마를 설치한다.
 * 파일시스템 I/O 및 DB 호출 없음.
 * REQ-THEME-070/071/072
 */
export function installTheme(opts: InstallOptions): InstallResult {
  const existing = opts.existingThemes ?? [];

  // 1. 매니페스트 파싱 및 검증
  const parsed = parseManifest(opts.manifest);
  if (!parsed.ok) {
    return {
      ok: false,
      error: 'MANIFEST_INVALID',
      field: parsed.field,
      message: parsed.message,
    };
  }

  const manifest = parsed.manifest;

  // 2. 이미 설치된 테마 확인
  if (existing.includes(manifest.name)) {
    return {
      ok: false,
      error: 'THEME_ALREADY_INSTALLED',
      existingVersion: manifest.version,
    };
  }

  // 3. 부모 테마 존재 여부 확인
  if (manifest.parent !== undefined && !existing.includes(manifest.parent)) {
    return {
      ok: false,
      error: 'PARENT_THEME_MISSING',
      parentName: manifest.parent,
    };
  }

  // 4. 설치 성공
  const installedTheme: InstalledTheme = {
    name: manifest.name,
    displayName: manifest.displayName,
    version: manifest.version,
    author: manifest.author,
    parent: manifest.parent,
    status: 'installed',
    installedAt: opts.installedAt ?? new Date(),
  };

  return { ok: true, theme: installedTheme };
}
