/**
 * S3Storage — AWS SDK v3 기반 FileStorage 구현체.
 *
 * @MX:WARN [AUTO]: 외부 의존성 (AWS SDK) — 인증 실패/네트워크 지연/AWS cost 주의.
 * @MX:REASON: presign 발급 실패는 사용자 업로드 전체 차단;
 *             인증 키 누락은 부팅 단계에서 fail-fast 처리 필요.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-030, REQ-CONTENT-033
 *
 * MinIO/R2 호환: forcePathStyle=true + endpoint 옵션 지원.
 */
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FileStorage } from './types.js';

export interface S3StorageOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO/R2 endpoint (운영 AWS 는 미설정) */
  endpoint?: string;
  /** MinIO 필수, 운영 AWS 는 false */
  forcePathStyle?: boolean;
}

export class S3Storage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(opts: S3StorageOptions) {
    this.bucket = opts.bucket;
    this.client = new S3Client({
      region: opts.region,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
      ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
      ...(opts.forcePathStyle !== undefined ? { forcePathStyle: opts.forcePathStyle } : {}),
    });
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
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresIn ?? 300,
    });
    return {
      url,
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
    const params: ConstructorParameters<typeof GetObjectCommand>[0] = {
      Bucket: this.bucket,
      Key: input.key,
    };
    if (input.forceAttachment) {
      const filename = input.filename ?? input.key.split('/').pop() ?? 'download';
      params.ResponseContentDisposition = `attachment; filename="${filename}"`;
    }
    const command = new GetObjectCommand(params);
    return getSignedUrl(this.client, command, {
      expiresIn: input.expiresIn ?? 3600,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: res.ContentLength ?? 0,
        contentType: res.ContentType ?? 'application/octet-stream',
      };
    } catch (err: unknown) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}

/**
 * 환경변수에서 S3Storage 를 생성하는 팩토리.
 * 필수 환경변수 미설정 시 InMemoryStorage 로 fallback.
 */
export function createStorageFromEnv(): import('./types.js').FileStorage {
  const bucket = process.env['S3_BUCKET'];
  const region = process.env['S3_REGION'];
  const accessKeyId = process.env['S3_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['S3_SECRET_ACCESS_KEY'];

  if (bucket && region && accessKeyId && secretAccessKey) {
    return new S3Storage({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint: process.env['S3_ENDPOINT'],
      forcePathStyle: process.env['S3_FORCE_PATH_STYLE'] === 'true',
    });
  }

  // fallback: InMemoryStorage (dev/test 환경)
  const { InMemoryStorage } = require('./memory.js') as typeof import('./memory.js');
  return new InMemoryStorage();
}
