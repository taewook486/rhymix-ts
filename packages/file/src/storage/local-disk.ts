/**
 * local-disk.ts — LocalDiskStorage
 *
 * STORAGE_BACKEND=local 환경에서 로컬 파일시스템을 storage backend로 사용.
 * presigned URL 없이 직접 write/read 방식.
 *
 * @MX:NOTE [AUTO]: 개발/테스트 환경 전용. 프로덕션은 STORAGE_BACKEND=s3 사용.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-019, REQ-FILE-052
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, unlink, stat } from 'node:fs/promises';
import { join, resolve, normalize, sep } from 'node:path';
import type { FileStorage } from './types.js';

export class LocalDiskStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  /** Path traversal 방어 — root 바깥 접근 차단 */
  private safePath(key: string): string {
    const normalized = normalize(key).replace(/^(\.\.[/\\])+/, '');
    const full = join(this.root, normalized);
    if (!full.startsWith(this.root + sep) && full !== this.root) {
      throw new Error(`Path traversal detected: ${key}`);
    }
    return full;
  }

  async write(input: { key: string; body: Buffer | Uint8Array; contentType: string }): Promise<void> {
    const filePath = this.safePath(input.key);
    await mkdir(filePath.substring(0, filePath.lastIndexOf(sep)), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(filePath);
      ws.write(Buffer.from(input.body));
      ws.end();
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(this.safePath(key));
    } catch {
      return null;
    }
  }

  streamRead(key: string): import('node:fs').ReadStream | null {
    try {
      return createReadStream(this.safePath(key));
    } catch {
      return null;
    }
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const s = await stat(this.safePath(key));
      return { size: s.size, contentType: 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.safePath(key));
    } catch {
      // file already gone — idempotent
    }
  }

  async getUploadPresignedUrl(): Promise<never> {
    throw new Error('LocalDiskStorage does not support presigned upload URLs. Use direct write() instead.');
  }

  async getDownloadUrl(input: { key: string; filename?: string }): Promise<string> {
    const encoded = encodeURIComponent(input.key);
    return `/api/files/by-key/${encoded}/download`;
  }
}
