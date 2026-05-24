/**
 * Install gate 단위 테스트 — REQ-INSTALL-001, REQ-INSTALL-020.
 *
 * MW-1: Site.installedAt IS NULL 상태에서 일반 경로 → shouldRedirectToInstall=true
 * MW-2: Site.installedAt IS NOT NULL 상태에서 일반 경로 → shouldRedirectToInstall=false (회귀 방어)
 * MW-3: 미설치 상태에서도 /_next/*, /favicon.ico, /api/install/* → shouldRedirectToInstall=false
 */
import { describe, expect, it } from 'vitest';

import {
  isInstallBypassPath,
  shouldRedirectToInstall,
  type InstallStatusChecker,
} from './middleware-gate';

// ---------------------------------------------------------------------------
// isInstallBypassPath 단위 테스트
// ---------------------------------------------------------------------------

describe('isInstallBypassPath', () => {
  it('/_next/ 하위 경로는 bypass 대상이다', () => {
    expect(isInstallBypassPath('/_next/static/chunks/main.js')).toBe(true);
    expect(isInstallBypassPath('/_next/image?url=test')).toBe(true);
  });

  it('/favicon.ico 는 bypass 대상이다 (정확 일치)', () => {
    expect(isInstallBypassPath('/favicon.ico')).toBe(true);
    // /favicon.ico.bak 은 bypass 아님
    expect(isInstallBypassPath('/favicon.ico.bak')).toBe(false);
  });

  it('/api/install/* 는 bypass 대상이다', () => {
    expect(isInstallBypassPath('/api/install/rewrite-test/abc123')).toBe(true);
    expect(isInstallBypassPath('/api/install/')).toBe(true);
  });

  it('/install/* 은 bypass 대상이다 (설치 페이지 자체)', () => {
    expect(isInstallBypassPath('/install')).toBe(true);
    expect(isInstallBypassPath('/install/check-env')).toBe(true);
    expect(isInstallBypassPath('/install/db-config')).toBe(true);
  });

  it('일반 경로는 bypass 대상이 아니다', () => {
    expect(isInstallBypassPath('/')).toBe(false);
    expect(isInstallBypassPath('/dashboard')).toBe(false);
    expect(isInstallBypassPath('/admin')).toBe(false);
    expect(isInstallBypassPath('/login')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldRedirectToInstall 통합 테스트
// ---------------------------------------------------------------------------

describe('shouldRedirectToInstall', () => {
  const notInstalled: InstallStatusChecker = {
    isInstalled: async () => false,
  };
  const installed: InstallStatusChecker = {
    isInstalled: async () => true,
  };

  it('MW-1: Site.installedAt IS NULL 상태에서 / 접근 시 true 반환 (→ /install 302)', async () => {
    const result = await shouldRedirectToInstall('/', notInstalled);
    expect(result).toBe(true);
  });

  it('MW-1: Site.installedAt IS NULL 상태에서 /dashboard 접근 시 true 반환', async () => {
    const result = await shouldRedirectToInstall('/dashboard', notInstalled);
    expect(result).toBe(true);
  });

  it('MW-2: Site.installedAt IS NOT NULL 상태에서 / 접근 시 false 반환 (기존 동작 유지)', async () => {
    const result = await shouldRedirectToInstall('/', installed);
    expect(result).toBe(false);
  });

  it('MW-2: Site.installedAt IS NOT NULL 상태에서 /dashboard 접근 시 false 반환', async () => {
    const result = await shouldRedirectToInstall('/dashboard', installed);
    expect(result).toBe(false);
  });

  it('MW-3: 미설치 상태에서도 /_next/static/... 는 false 반환 (리다이렉트 제외)', async () => {
    const result = await shouldRedirectToInstall('/_next/static/chunks/page.js', notInstalled);
    expect(result).toBe(false);
  });

  it('MW-3: 미설치 상태에서도 /favicon.ico 는 false 반환', async () => {
    const result = await shouldRedirectToInstall('/favicon.ico', notInstalled);
    expect(result).toBe(false);
  });

  it('MW-3: 미설치 상태에서도 /api/install/rewrite-test/abc 는 false 반환', async () => {
    const result = await shouldRedirectToInstall('/api/install/rewrite-test/abc', notInstalled);
    expect(result).toBe(false);
  });

  it('MW-3: 미설치 상태에서도 /install/check-env 는 false 반환', async () => {
    const result = await shouldRedirectToInstall('/install/check-env', notInstalled);
    expect(result).toBe(false);
  });
});
