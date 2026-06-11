/**
 * packages/document/src/secret.ts
 *
 * 문서 비밀번호 및 잠금 해제 토큰 관리 — SPEC-DOCUMENT-001 Slice C (REQ-DOC-050~055).
 *
 * 문서 비밀번호는 argon2id로 해시하여 저장 (user password와 별개).
 * 잠금 해제 토큰은 JWT 형식으로 생성하여 일정 시간 유효.
 *
 * @MX:NOTE [AUTO]: 문서 비밀번호는 사용자 비밀번호와 다른 별도의 해시.
 * @MX:REASON: 문서 비밀번호는 사용자 계정과 무관하게 문서 단위로 관리됨.
 */
import { argon2id, argon2Verify } from 'hash-wasm';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 문서 비밀번호 argon2id 파라미터 (사용자 비밀번호보다 약함) */
const DOC_PASSWORD_PARAMS = {
  saltLength: 16,
  hashLength: 32,
  memorySize: 256 * 1024, // 256 MB (사용자: 64 MB)
  iterations: 2, // 2 iterations (사용자: 3)
  parallelism: 1,
};

/** 잠금 해제 토큰 유효기간 (30분) */
const UNLOCK_TOKEN_EXPIRY = 30 * 60; // seconds

// ---------------------------------------------------------------------------
// 문서 비밀번호 해시
// ---------------------------------------------------------------------------

/**
 * 문서 비밀번호를 argon2id로 해시한다.
 *
 * @param password - 평문 비밀번호
 * @returns argon2id PHC 형식 해시 문자열
 */
export async function hashDocumentPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }

  const salt = new Uint8Array(DOC_PASSWORD_PARAMS.saltLength);
  crypto.getRandomValues(salt);

  return argon2id({
    password,
    salt,
    iterations: DOC_PASSWORD_PARAMS.iterations,
    memorySize: DOC_PASSWORD_PARAMS.memorySize,
    parallelism: DOC_PASSWORD_PARAMS.parallelism,
    hashLength: DOC_PASSWORD_PARAMS.hashLength,
    outputType: 'encoded',
  });
}

/**
 * 문서 비밀번호를 검증한다.
 *
 * @param hash - 저장된 해시
 * @param password - 검증할 평문 비밀번호
 * @returns 일치 여부
 */
export async function verifyDocumentPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (typeof hash !== 'string' || hash.length === 0) return false;
  if (typeof password !== 'string' || password.length === 0) return false;

  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 잠금 해제 토큰 (JWT)
// ---------------------------------------------------------------------------

/**
 * 잠금 해제 토큰 페이로드.
 */
export interface UnlockTokenPayload {
  documentId: number;
  iat: number;
  exp: number;
}

/**
 * 문서 잠금 해제 토큰을 생성한다.
 *
 * @param documentId - 문서 ID
 * @returns JWT 토큰 문자열
 */
export async function generateUnlockToken(documentId: number): Promise<string> {
  const secretKey = (process.env.NEXTAUTH_SECRET ?? 'dev-secret-replace-in-production-32-chars-long') + '-doc-unlock';
  const key = new TextEncoder().encode(secretKey);

  const now = Math.floor(Date.now() / 1000);

  // jti: 동시 호출 시 동일 토큰 발급 방지용 랜덤 nonce
  return new SignJWT({ documentId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + UNLOCK_TOKEN_EXPIRY)
    .setJti(crypto.randomUUID())
    .sign(key);
}

/**
 * 잠금 해제 토큰을 검증하고 페이로드를 추출한다.
 *
 * @param token - JWT 토큰 문자열
 * @returns 토큰 페이로드 또는 null (유효하지 않은 경우)
 */
export async function verifyUnlockToken(
  token: string,
): Promise<{ documentId: number } | null> {
  try {
    const secretKey = (process.env.NEXTAUTH_SECRET ?? 'dev-secret-replace-in-production-32-chars-long') + '-doc-unlock';
    const key = new TextEncoder().encode(secretKey);

    const { payload } = await jwtVerify(token, key) as { payload: JWTPayload & { documentId?: unknown } };

    if (typeof payload.documentId !== 'number') {
      return null;
    }

    return { documentId: payload.documentId };
  } catch {
    return null;
  }
}
