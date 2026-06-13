import { describe, it, expect, afterEach } from 'vitest';
import { _resetStorageInstances } from './factory';
import { InMemoryStorage } from './memory';
import { LocalDiskStorage } from './local-disk';
import { NoopScanner } from './scanner';

describe('StorageFactory', () => {
  afterEach(() => {
    _resetStorageInstances();
    delete process.env.STORAGE_BACKEND;
    delete process.env.VIRUS_SCAN_BACKEND;
  });

  it('STORAGE_BACKEND=memory면 InMemoryStorage 반환', async () => {
    process.env.STORAGE_BACKEND = 'memory';
    const { getStorage } = await import('./factory.js');
    const storage = getStorage();
    expect(storage).toBeInstanceOf(InMemoryStorage);
  });

  it('STORAGE_BACKEND=local면 LocalDiskStorage 반환', async () => {
    process.env.STORAGE_BACKEND = 'local';
    const { getStorage } = await import('./factory.js');
    const storage = getStorage();
    expect(storage).toBeInstanceOf(LocalDiskStorage);
  });

  it('getStorage는 싱글턴을 반환한다', async () => {
    process.env.STORAGE_BACKEND = 'memory';
    const { getStorage } = await import('./factory.js');
    expect(getStorage()).toBe(getStorage());
  });

  it('_resetStorageInstances 후 새 인스턴스 생성', async () => {
    process.env.STORAGE_BACKEND = 'memory';
    const { getStorage } = await import('./factory.js');
    const first = getStorage();
    _resetStorageInstances();
    const second = getStorage();
    expect(first).not.toBe(second);
  });

  it('VIRUS_SCAN_BACKEND=noop면 NoopScanner 반환', async () => {
    process.env.VIRUS_SCAN_BACKEND = 'noop';
    const { getScanner } = await import('./factory.js');
    const scanner = getScanner();
    expect(scanner).toBeInstanceOf(NoopScanner);
  });

  it('알 수 없는 STORAGE_BACKEND면 에러를 던진다', async () => {
    process.env.STORAGE_BACKEND = 'unknown_backend';
    const { getStorage } = await import('./factory.js');
    expect(() => getStorage()).toThrow('Unknown STORAGE_BACKEND');
  });
});
