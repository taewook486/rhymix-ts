/**
 * InMemoryStorage — 테스트 전용 FileStorage 구현체.
 *
 * 실제 HTTP 요청 없이 in-memory Map 으로 파일을 관리한다.
 * presign URL 은 페이크 URL 을 반환하고, put() helper 로 직접 파일을 채워넣는다.
 */
import type { FileStorage } from './types';

interface StoredFile {
  buffer: Buffer;
  contentType: string;
}

export class InMemoryStorage implements FileStorage {
  private readonly store = new Map<string, StoredFile>();

  /**
   * 테스트 helper — 직접 파일을 채워넣는다.
   * presign URL 을 실제로 PUT 하지 않고, 이 메서드로 대체한다.
   */
  put(key: string, buffer: Buffer, contentType: string): void {
    this.store.set(key, { buffer, contentType });
  }

  async getUploadPresignedUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn?: number;
  }): Promise<{
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
    key: string;
  }> {
    return {
      url: `memory://put/${input.key}`,
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      key: input.key,
    };
  }

  async getDownloadUrl(input: {
    key: string;
    expiresIn?: number;
    forceAttachment?: boolean;
    filename?: string;
  }): Promise<string> {
    return `memory://get/${input.key}`;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    const file = this.store.get(key);
    if (!file) return null;
    return { size: file.buffer.length, contentType: file.contentType };
  }
}
