/**
 * Upload Token — HMAC-SHA256 서명된 단순 JWT (재 구현).
 *
 * next-auth JWT 의존성 없이 Node.js crypto 모듈만 사용.
 * payload = { storageKey, mimeType, fileSize, memberId, exp: number (unix seconds) }
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface UploadTokenPayload {
  storageKey: string;
  sourceFilename: string;
  mimeType: string;
  fileSize: number;
  memberId: string;
  exp: number;
}

/**
 * HMAC-SHA256 서명된 업로드 토큰 생성.
 * exp = now + ttlSeconds.
 */
export function signUploadToken(
  payload: Omit<UploadTokenPayload, 'exp'>,
  secret: string,
  ttlSeconds = 600,
): string {
  const tokenPayload: UploadTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * 업로드 토큰 검증 + payload 추출.
 * 실패 시 InvalidUploadTokenError throw.
 */
export function verifyUploadToken(token: string, secret: string): UploadTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new InvalidUploadTokenError('토큰 형식 불일치');
  }
  const [header, body, sig] = parts as [string, string, string];
  const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  // timing-safe compare
  const sigBuf = Buffer.from(sig, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new InvalidUploadTokenError('토큰 서명 불일치');
  }

  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as UploadTokenPayload;
  } catch {
    throw new InvalidUploadTokenError('토큰 payload 파싱 실패');
  }

  if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) {
    throw new InvalidUploadTokenError('토큰 만료');
  }

  return payload;
}

export class InvalidUploadTokenError extends Error {
  readonly code = 'INVALID_UPLOAD_TOKEN' as const;
  constructor(reason: string) {
    super(`유효하지 않은 업로드 토큰: ${reason}`);
    this.name = 'InvalidUploadTokenError';
  }
}
