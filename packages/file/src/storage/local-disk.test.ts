import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalDiskStorage } from './local-disk';

describe('LocalDiskStorage', () => {
  let tmpDir: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rx-file-test-'));
    storage = new LocalDiskStorage(tmpDir);
  });

  afterEach(async () => {
    await rmdir(tmpDir, { recursive: true }).catch(() => {});
  });

  it('파일을 쓰고 읽을 수 있다', async () => {
    const key = 'test/hello.txt';
    const body = Buffer.from('hello world');
    await storage.write({ key, body, contentType: 'text/plain' });
    const result = await storage.read(key);
    expect(result?.toString()).toBe('hello world');
  });

  it('존재하지 않는 파일 read는 null 반환', async () => {
    const result = await storage.read('nonexistent/file.txt');
    expect(result).toBeNull();
  });

  it('head는 파일 크기와 contentType을 반환한다', async () => {
    const key = 'test/meta.bin';
    const body = Buffer.alloc(100);
    await storage.write({ key, body, contentType: 'application/octet-stream' });
    const meta = await storage.head(key);
    expect(meta?.size).toBe(100);
  });

  it('head는 존재하지 않는 파일에 대해 null 반환', async () => {
    const meta = await storage.head('missing.txt');
    expect(meta).toBeNull();
  });

  it('delete는 파일을 삭제한다', async () => {
    const key = 'del/test.txt';
    await storage.write({ key, body: Buffer.from('x'), contentType: 'text/plain' });
    await storage.delete(key);
    const result = await storage.read(key);
    expect(result).toBeNull();
  });

  it('delete는 존재하지 않는 파일에 대해 에러 없이 idempotent 처리', async () => {
    await expect(storage.delete('nope.txt')).resolves.not.toThrow();
  });

  it('path traversal 공격을 차단한다 (sanitization)', async () => {
    // path traversal는 sanitize되어 root 내에 안전하게 저장됨
    const key = '../../../etc/passwd';
    await storage.write({ key, body: Buffer.from('x'), contentType: 'text/plain' });
    // 파일이 root 내부에 저장되었는지 확인
    const result = await storage.read('etc/passwd');
    expect(result?.toString()).toBe('x');
  });

  it('getDownloadUrl은 /api/files/by-key URL을 반환한다', async () => {
    const url = await storage.getDownloadUrl({ key: '2024/01/test.jpg' });
    expect(url).toContain('/api/files/by-key/');
  });

  it('getUploadPresignedUrl은 지원하지 않아 에러를 던진다', async () => {
    await expect(
      storage.getUploadPresignedUrl({ key: 'x', contentType: 'image/jpeg', contentLength: 100 })
    ).rejects.toThrow();
  });
});
