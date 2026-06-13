/**
 * image-pipeline.ts — Sharp 기반 이미지 처리 파이프라인
 *
 * @MX:NOTE [AUTO]: 이미지 업로드 시 thumbnail/variant 자동 생성.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-030~037
 */
import type sharp from 'sharp';
import type { FileStorage } from './storage/types';

// sharp is a native binary; loaded lazily so Turbopack/webpack don't bundle it.
async function getSharp(): Promise<typeof sharp> {
  const m = await import('sharp');
  return m.default as typeof sharp;
}

export interface ImageProcessResult {
  width: number;
  height: number;
  variantsGenerated: string[];
}

/**
 * 이미지 버퍼를 처리하여 storage에 variant를 저장한다.
 * exif strip + auto-rotate + thumbnail/small/medium/large variants 생성.
 *
 * @MX:ANCHOR [AUTO]: upload route에서 직접 호출. fan_in >= 3 예상.
 * @MX:REASON: upload route, completeUpload, 테스트 등 여러 호출자.
 */
export async function processImage(input: {
  storage: FileStorage;
  storageKey: string;
  originalBuffer: Buffer;
  mimeType: string;
}): Promise<ImageProcessResult> {
  const { storage, storageKey, originalBuffer, mimeType } = input;

  try {
    const sharp = await getSharp();
    const sharpInstance = sharp(originalBuffer, { animated: mimeType === 'image/gif' });
    const metadata = await sharpInstance.metadata();
    const { width = 0, height = 0, format, pages } = metadata;

    // animated gif: skip variants (except thumb from first frame)
    if (format === 'gif' && (pages ?? 1) > 1) {
      if (storage.write) {
        await storage.write({ key: storageKey, body: originalBuffer, contentType: 'image/gif' });
        const thumb = await sharp(originalBuffer, { animated: false })
          .rotate()
          .withMetadata({ exif: {} })
          .resize(200, 200, { fit: 'inside' })
          .webp({ quality: 80 })
          .toBuffer();
        await storage.write({ key: `${storageKey}.thumb.webp`, body: thumb, contentType: 'image/webp' });
      }
      return { width, height, variantsGenerated: ['thumb'] };
    }

    // exif strip + auto-rotate original
    const processed = sharp(originalBuffer).rotate().withMetadata({ exif: {} });
    const processedBuffer = await processed.toBuffer();
    if (storage.write) {
      await storage.write({ key: storageKey, body: processedBuffer, contentType: mimeType });
    }

    // generate variants based on longest side
    const longest = Math.max(width, height);
    const variantDefs = [
      { name: 'thumb', size: 200 },
      ...(longest > 480 ? [{ name: 'small', size: 480 }] : []),
      ...(longest > 1024 ? [{ name: 'medium', size: 1024 }] : []),
      ...(longest > 2048 ? [{ name: 'large', size: 2048 }] : []),
    ];

    const generated = await Promise.all(
      variantDefs.map(async (v) => {
        const buf = await sharp(originalBuffer)
          .rotate()
          .withMetadata({ exif: {} })
          .resize(v.size, v.size, { fit: 'inside' })
          .webp({ quality: 80 })
          .toBuffer();
        if (storage.write) {
          await storage.write({
            key: `${storageKey}.${v.name}.webp`,
            body: buf,
            contentType: 'image/webp',
          });
        }
        return v.name;
      }),
    );

    return { width, height, variantsGenerated: generated };
  } catch (err) {
    console.error('[image-pipeline] processImage failed:', err);
    return { width: 0, height: 0, variantsGenerated: [] };
  }
}

/** 주어진 mimeType이 이미지인지 확인 */
export function isImageMimeType(mimeType: string): boolean {
  return /^image\/(jpeg|png|webp|gif|avif|heic)$/.test(mimeType);
}
