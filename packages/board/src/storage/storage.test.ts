/**
 * storage.test.ts — SPEC-CONTENT-001 Slice E
 *
 * F-1 ~ F-6: FileStorage interface + InMemoryStorage + MIME/size 가드 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryStorage } from './memory';
import { assertMimeAllowed, assertSizeAllowed, UnsupportedMimeTypeError, FileTooLargeError } from './mime';
import { S3Storage } from './s3';

// AWS SDK mock
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn().mockResolvedValue({
    ContentLength: 1024,
    ContentType: 'image/png',
  });
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
    HeadObjectCommand: vi.fn().mockImplementation((p: Record<string, unknown>) => ({ ...p, type: 'HeadObject' })),
    DeleteObjectCommand: vi.fn().mockImplementation((p: Record<string, unknown>) => ({ ...p, type: 'DeleteObject' })),
    PutObjectCommand: vi.fn().mockImplementation((p: Record<string, unknown>) => ({ ...p, type: 'PutObject' })),
    GetObjectCommand: vi.fn().mockImplementation((p: Record<string, unknown>) => ({ ...p, type: 'GetObject' })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/attachments/test.png?signature=abc123'),
}));

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  // F-2: put + head round-trip
  it('F-2: put + head round-trip → 사이즈/Content-Type 일치', async () => {
    const key = 'attachments/2024/01/test.png';
    const buffer = Buffer.from('fake-image-data');
    storage.put(key, buffer, 'image/png');

    const result = await storage.head(key);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(buffer.length);
    expect(result!.contentType).toBe('image/png');
  });

  // F-3: delete 후 head → null
  it('F-3: delete 후 head → null', async () => {
    const key = 'attachments/2024/01/delete-me.pdf';
    storage.put(key, Buffer.from('pdf-content'), 'application/pdf');
    expect(await storage.head(key)).not.toBeNull();

    await storage.delete(key);
    expect(await storage.head(key)).toBeNull();
  });

  it('getUploadPresignedUrl → 페이크 URL 반환', async () => {
    const result = await storage.getUploadPresignedUrl({
      key: 'attachments/2024/01/test.png',
      contentType: 'image/png',
      contentLength: 1024,
    });
    expect(result.url).toContain('memory://put/');
    expect(result.method).toBe('PUT');
    expect(result.headers['Content-Type']).toBe('image/png');
    expect(result.key).toBe('attachments/2024/01/test.png');
  });

  it('getDownloadUrl → 페이크 URL 반환', async () => {
    const result = await storage.getDownloadUrl({ key: 'attachments/test.png' });
    expect(result).toBe('memory://get/attachments/test.png');
  });

  it('존재하지 않는 키 head → null', async () => {
    expect(await storage.head('non-existent-key')).toBeNull();
  });
});

describe('S3Storage', () => {
  let storage: S3Storage;

  beforeEach(() => {
    storage = new S3Storage({
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });
  });

  // F-1: getUploadPresignedUrl → URL + method:PUT 반환
  it('F-1: getUploadPresignedUrl → URL + method:PUT + headers 반환', async () => {
    const result = await storage.getUploadPresignedUrl({
      key: 'attachments/2024/01/uuid.png',
      contentType: 'image/png',
      contentLength: 1024,
      expiresIn: 300,
    });
    expect(result.url).toContain('https://s3.example.com');
    expect(result.method).toBe('PUT');
    expect(result.headers['Content-Type']).toBe('image/png');
    expect(result.key).toBe('attachments/2024/01/uuid.png');
  });

  // F-4: getDownloadUrl(forceAttachment=true) → ResponseContentDisposition 포함
  it('F-4: getDownloadUrl forceAttachment=true → getSignedUrl 에 ResponseContentDisposition 옵션 전달', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const mockGetSignedUrl = vi.mocked(getSignedUrl);
    const MockGetObjectCommand = vi.mocked(GetObjectCommand);

    await storage.getDownloadUrl({
      key: 'attachments/test.png',
      forceAttachment: true,
      filename: 'myfile.png',
    });

    expect(MockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: expect.stringContaining('attachment'),
      }),
    );
    expect(mockGetSignedUrl).toHaveBeenCalled();
  });
});

describe('MIME + Size 검증', () => {
  // F-5: 허용되지 않는 MIME → UnsupportedMimeTypeError
  it('F-5: assertMimeAllowed 허용 안 되는 MIME → UnsupportedMimeTypeError', () => {
    expect(() => assertMimeAllowed('application/x-msdownload')).toThrow(UnsupportedMimeTypeError);
    expect(() => assertMimeAllowed('application/x-msdownload')).toThrow('지원하지 않는 MIME 타입');
  });

  it('assertMimeAllowed 허용 MIME → 통과', () => {
    expect(() => assertMimeAllowed('image/png')).not.toThrow();
    expect(() => assertMimeAllowed('image/jpeg')).not.toThrow();
    expect(() => assertMimeAllowed('application/pdf')).not.toThrow();
  });

  // F-6: image/png 10MB 초과 → FileTooLargeError
  it('F-6: assertSizeAllowed image/png 11MB → FileTooLargeError', () => {
    expect(() => assertSizeAllowed('image/png', 11 * 1024 * 1024)).toThrow(FileTooLargeError);
  });

  it('assertSizeAllowed image/png 5MB → 통과', () => {
    expect(() => assertSizeAllowed('image/png', 5 * 1024 * 1024)).not.toThrow();
  });

  it('assertSizeAllowed 100MB 초과 → 글로벌 상한 적용', () => {
    expect(() => assertSizeAllowed('video/mp4', 101 * 1024 * 1024)).toThrow(FileTooLargeError);
  });
});
