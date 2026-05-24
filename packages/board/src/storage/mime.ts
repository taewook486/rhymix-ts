/**
 * MIME 화이트리스트 + 검증 헬퍼 — SPEC-CONTENT-001 Slice E Q6
 */

/**
 * MIME 타입 불일치 에러
 */
export class UnsupportedMimeTypeError extends Error {
  readonly code = 'UNSUPPORTED_MIME_TYPE' as const;
  constructor(
    public readonly mime: string,
    public readonly allowed: string[],
  ) {
    super(`지원하지 않는 MIME 타입: ${mime}. 허용: ${allowed.join(', ')}`);
    this.name = 'UnsupportedMimeTypeError';
  }
}

/**
 * 파일 용량 초과 에러
 */
export class FileTooLargeError extends Error {
  readonly code = 'FILE_TOO_LARGE' as const;
  constructor(
    public readonly maxBytes: number,
    public readonly actualBytes: number,
  ) {
    super(`파일 용량 초과: 최대 ${maxBytes} bytes, 실제 ${actualBytes} bytes`);
    this.name = 'FileTooLargeError';
  }
}

/**
 * MIME 타입별 최대 용량 (bytes)
 */
export const MIME_SIZE_LIMITS: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/gif': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'image/svg+xml': 2 * 1024 * 1024,
  'application/pdf': 25 * 1024 * 1024,
  'text/plain': 25 * 1024 * 1024,
  'text/csv': 25 * 1024 * 1024,
  'video/mp4': 100 * 1024 * 1024,
  'video/webm': 100 * 1024 * 1024,
  'audio/mpeg': 100 * 1024 * 1024,
  'audio/ogg': 100 * 1024 * 1024,
};

/**
 * 허용된 MIME 타입 목록.
 * SVG 는 env.ALLOW_SVG=true 일 때만 허용.
 */
export function getAllowedMimes(): string[] {
  const base = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
  ];
  if (process.env['ALLOW_SVG'] === 'true') {
    base.push('image/svg+xml');
  }
  return base;
}

/**
 * MIME 화이트리스트 검증 — 불허 시 UnsupportedMimeTypeError throw.
 */
export function assertMimeAllowed(mime: string): void {
  const allowed = getAllowedMimes();
  if (!allowed.includes(mime)) {
    throw new UnsupportedMimeTypeError(mime, allowed);
  }
}

/**
 * 파일 용량 검증 — 초과 시 FileTooLargeError throw.
 */
export function assertSizeAllowed(mime: string, size: number): void {
  const globalLimit = 100 * 1024 * 1024;
  if (size > globalLimit) {
    throw new FileTooLargeError(globalLimit, size);
  }
  const mimeLimit = MIME_SIZE_LIMITS[mime];
  if (mimeLimit !== undefined && size > mimeLimit) {
    throw new FileTooLargeError(mimeLimit, size);
  }
}
