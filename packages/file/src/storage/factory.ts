/**
 * factory.ts — Storage + Scanner factory
 *
 * @MX:NOTE [AUTO]: STORAGE_BACKEND / VIRUS_SCAN_BACKEND 환경변수로 backend 선택.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-019, REQ-FILE-060
 */
import type { FileStorage, VirusScanner } from './types.js';
import { InMemoryStorage } from './memory.js';
import { S3Storage } from './s3.js';
import { LocalDiskStorage } from './local-disk.js';
import { NoopScanner } from './scanner.js';
import { ClamAVScanner } from './clamav.js';

let storageInstance: FileStorage | null = null;
let scannerInstance: VirusScanner | null = null;

export function getStorage(): FileStorage {
  if (storageInstance) return storageInstance;

  const backend = process.env.STORAGE_BACKEND ?? 'local';
  switch (backend) {
    case 'local':
      storageInstance = new LocalDiskStorage(process.env.RX_LOCAL_STORAGE_ROOT ?? './uploads');
      break;
    case 's3':
      storageInstance = new S3Storage({
        bucket: process.env.AWS_S3_BUCKET!,
        region: process.env.AWS_REGION!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        endpoint: process.env.AWS_S3_ENDPOINT,
        forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      });
      break;
    case 'memory':
      storageInstance = new InMemoryStorage();
      break;
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${backend}`);
  }
  return storageInstance;
}

export function getScanner(): VirusScanner {
  if (scannerInstance) return scannerInstance;

  const backend = process.env.VIRUS_SCAN_BACKEND ?? 'noop';
  switch (backend) {
    case 'noop':
      scannerInstance = new NoopScanner();
      break;
    case 'clamav':
      scannerInstance = new ClamAVScanner({
        host: process.env.CLAMAV_HOST ?? 'localhost',
        port: Number(process.env.CLAMAV_PORT ?? 3310),
        failOpen: process.env.CLAMAV_FAIL_OPEN === 'true',
      });
      break;
    default:
      throw new Error(`Unknown VIRUS_SCAN_BACKEND: ${backend}`);
  }
  return scannerInstance;
}

/** 테스트 전용 — 싱글턴 캐시 초기화 */
export function _resetStorageInstances(): void {
  storageInstance = null;
  scannerInstance = null;
}
