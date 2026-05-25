/**
 * Site install-status lookup (REQ-INSTALL-002, 020, 042) — RED-first specification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn();
const siteSettingFindFirst = vi.fn();

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    site: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    siteSetting: {
      findFirst: (...args: unknown[]) => siteSettingFindFirst(...args),
    },
  },
}));

beforeEach(() => {
  findFirst.mockReset();
  siteSettingFindFirst.mockReset();
  // REQ-INSTALL-042: 기본적으로 install_lock DB 행 없음으로 초기화.
  siteSettingFindFirst.mockResolvedValue(null);
  delete process.env.INSTALL_LOCK;
  vi.resetModules();
});

afterEach(() => {
  delete process.env.INSTALL_LOCK;
});

async function loadModule() {
  return await import('./site-status');
}

describe('getInstallStatus', () => {
  it('the system shall return installed=false when no Site row and INSTALL_LOCK is unset', async () => {
    findFirst.mockResolvedValue(null);
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(false);
    expect(status.site).toBeNull();
  });

  it('the system shall return installed=true when a Site row exists with installedAt', async () => {
    const site = { id: 1, installedAt: new Date('2026-01-01T00:00:00Z') };
    findFirst.mockResolvedValue(site);
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(true);
    expect(status.site).toEqual(site);
  });

  it('the system shall return installed=true when INSTALL_LOCK=1 even with no Site row (defensive)', async () => {
    findFirst.mockResolvedValue(null);
    process.env.INSTALL_LOCK = '1';
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(true);
    expect(status.site).toBeNull();
    expect(status.lockedAt).toBeInstanceOf(Date);
  });

  it('the system shall return installed=true when both INSTALL_LOCK=1 and Site exists', async () => {
    const site = { id: 1, installedAt: new Date('2026-01-01T00:00:00Z') };
    findFirst.mockResolvedValue(site);
    process.env.INSTALL_LOCK = '1';
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(true);
    expect(status.site).toEqual(site);
  });
});

// ---------------------------------------------------------------------------
// REQ-INSTALL-042: 클라우드 환경 DB 폴백 (SiteSetting install_lock 키)
// ---------------------------------------------------------------------------

describe('getInstallStatus — REQ-INSTALL-042 cloud DB fallback', () => {
  it('SLDB-1: no INSTALL_LOCK env, no Site row, but SiteSetting install_lock=true → installed: true', async () => {
    findFirst.mockResolvedValue(null);
    siteSettingFindFirst.mockResolvedValue({ key: 'install_lock', value: true });
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(true);
  });

  it('SLDB-2: no INSTALL_LOCK env, no Site row, SiteSetting install_lock=false → installed: false', async () => {
    findFirst.mockResolvedValue(null);
    siteSettingFindFirst.mockResolvedValue({ key: 'install_lock', value: false });
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(false);
  });

  it('SLDB-3: no INSTALL_LOCK env, no Site row, no SiteSetting install_lock → installed: false', async () => {
    findFirst.mockResolvedValue(null);
    siteSettingFindFirst.mockResolvedValue(null);
    const { getInstallStatus } = await loadModule();
    const status = await getInstallStatus();
    expect(status.installed).toBe(false);
  });
});
