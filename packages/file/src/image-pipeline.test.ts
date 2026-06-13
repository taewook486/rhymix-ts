import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { processImage, isImageMimeType } from './image-pipeline.js';
import type { FileStorage } from './storage/types.js';

// 테스트용 100x100 JPEG 이미지 생성
async function makeTestJpeg(width = 100, height = 100): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 100, g: 100, b: 100 } } })
    .jpeg()
    .toBuffer();
}

// 테스트용 mock storage (write/read 추적)
function makeMockStorage() {
  const written = new Map<string, Buffer>();
  const storage: FileStorage & Required<Pick<FileStorage, 'write' | 'read'>> = {
    write: vi.fn(async (input: { key: string; body: Buffer | Uint8Array; contentType: string }) => {
      written.set(input.key, Buffer.from(input.body));
    }),
    read: vi.fn(async (key: string) => written.get(key) ?? null),
    delete: vi.fn(async () => {}),
    head: vi.fn(async () => null),
    getUploadPresignedUrl: vi.fn(),
    getDownloadUrl: vi.fn(async () => ''),
    streamRead: vi.fn(() => null),
  };
  return { storage, written };
}

describe('processImage', () => {
  it('JPEG를 처리하고 thumb variant를 생성한다', async () => {
    const { storage, written } = makeMockStorage();
    const buf = await makeTestJpeg(800, 600);
    const result = await processImage({ storage, storageKey: 'test/img', originalBuffer: buf, mimeType: 'image/jpeg' });
    expect(result.variantsGenerated).toContain('thumb');
    expect(written.has('test/img.thumb.webp')).toBe(true);
  });

  it('작은 이미지(200px 이하)는 thumb만 생성된다', async () => {
    const { storage } = makeMockStorage();
    const buf = await makeTestJpeg(100, 100);
    const result = await processImage({ storage, storageKey: 'test/small', originalBuffer: buf, mimeType: 'image/jpeg' });
    expect(result.variantsGenerated).toEqual(['thumb']);
    expect(result.variantsGenerated).not.toContain('small');
  });

  it('큰 이미지(2048px 초과)는 large variant도 생성된다', async () => {
    const { storage } = makeMockStorage();
    const buf = await makeTestJpeg(2200, 2200);
    const result = await processImage({ storage, storageKey: 'test/large', originalBuffer: buf, mimeType: 'image/jpeg' });
    expect(result.variantsGenerated).toContain('large');
  });

  it('invalid 버퍼는 빈 variantsGenerated로 graceful 처리', async () => {
    const { storage } = makeMockStorage();
    const result = await processImage({
      storage,
      storageKey: 'test/invalid',
      originalBuffer: Buffer.from('not an image'),
      mimeType: 'image/jpeg',
    });
    expect(result.variantsGenerated).toEqual([]);
  });
});

describe('isImageMimeType', () => {
  it.each([
    ['image/jpeg', true],
    ['image/png', true],
    ['image/webp', true],
    ['image/gif', true],
    ['application/pdf', false],
    ['video/mp4', false],
    ['text/plain', false],
  ])('%s → %s', (mime, expected) => {
    expect(isImageMimeType(mime)).toBe(expected);
  });
});
