/**
 * Site install-status lookup (REQ-INSTALL-002, 020) — RED-first specification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn();

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    site: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

beforeEach(() => {
  findFirst.mockReset();
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
