/**
 * SiteLock 상태 조회 테스트 (REQ-INSTALL-024) — RED-first.
 *
 * SiteSetting 테이블에서 sitelock_enabled / sitelock_allowlist를 읽어
 * 503 차단 결정에 사용할 형태로 반환한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    siteSetting: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

beforeEach(() => {
  findMany.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

async function loadModule() {
  return await import('./sitelock');
}

describe('getSiteLockStatus', () => {
  it('the system shall return enabled=false and empty allowlist when no SiteSetting rows exist', async () => {
    findMany.mockResolvedValue([]);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(false);
    expect(status.allowlist).toEqual([]);
  });

  it('the system shall return enabled=true when sitelock_enabled value is true', async () => {
    findMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: ['127.0.0.1', '203.0.113.7'] },
    ]);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(true);
    expect(status.allowlist).toEqual(['127.0.0.1', '203.0.113.7']);
  });

  it('the system shall return enabled=false when sitelock_enabled value is false', async () => {
    findMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: false },
      { key: 'sitelock_allowlist', value: ['127.0.0.1'] },
    ]);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(false);
    expect(status.allowlist).toEqual(['127.0.0.1']);
  });

  it('the system shall return safe defaults when SiteSetting table is missing (P2021)', async () => {
    const err = Object.assign(new Error('table missing'), { code: 'P2021' });
    findMany.mockRejectedValue(err);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(false);
    expect(status.allowlist).toEqual([]);
  });

  it('the system shall return safe defaults when database is unreachable (P2010)', async () => {
    const err = Object.assign(new Error('connection refused'), { code: 'P2010' });
    findMany.mockRejectedValue(err);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(false);
    expect(status.allowlist).toEqual([]);
  });

  it('the system shall rethrow non-recoverable errors', async () => {
    findMany.mockRejectedValue(new Error('unexpected'));
    const { getSiteLockStatus } = await loadModule();
    await expect(getSiteLockStatus()).rejects.toThrow('unexpected');
  });

  it('the system shall coerce a non-array allowlist value to empty list', async () => {
    findMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: 'not-an-array' },
    ]);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.enabled).toBe(true);
    expect(status.allowlist).toEqual([]);
  });

  it('the system shall filter non-string entries from allowlist', async () => {
    findMany.mockResolvedValue([
      { key: 'sitelock_enabled', value: true },
      { key: 'sitelock_allowlist', value: ['127.0.0.1', 42, null, '203.0.113.7'] },
    ]);
    const { getSiteLockStatus } = await loadModule();
    const status = await getSiteLockStatus();
    expect(status.allowlist).toEqual(['127.0.0.1', '203.0.113.7']);
  });
});
