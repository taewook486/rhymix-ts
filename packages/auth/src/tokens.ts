/**
 * Opaque token utilities — SPEC-AUTH-001 Slice B.
 *
 * 모든 인증 비밀(EmailAuthToken.authKey, AutoLogin.securityKey 등)은 본 모듈을
 * 통해서만 발급한다. base64url 인코딩(패딩 없음)을 사용하므로 URL/쿠키에 그대로
 * 실어 보낼 수 있고, 32바이트 기본 길이로 256비트의 엔트로피를 보장한다.
 *
 * @MX:ANCHOR: 인증 비밀의 단일 발급 지점.
 * @MX:REASON: 토큰 길이/엔트로피/문자셋이 코드 곳곳에 흩어지면 한 곳만 약해져도 시스템 전체가 위험.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-011, REQ-AUTH-018
 */

export interface TokenSpec {
  /** Number of random bytes to use. Defaults to 32 (≈256 bits of entropy). */
  bytes?: number;
}

const DEFAULT_BYTES = 32;

/**
 * Generate an opaque base64url token without padding.
 *
 * Uses Web Crypto's getRandomValues which is available in Node 20+ and Edge
 * runtime (REQ-AUTH-001 platform-portability constraint). The output is safe
 * to embed in URLs and cookie values without further encoding.
 */
export function generateToken(spec?: TokenSpec): string {
  const len = spec?.bytes ?? DEFAULT_BYTES;
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/**
 * Timing-safe equality comparison for short secrets (token strings, hashes).
 *
 * Returns false immediately for length mismatches — note that for the
 * authentication paths in this SPEC, the lengths are public (e.g., always 43
 * chars for a 32-byte token), so revealing a length-mismatch through early
 * return does not leak useful information. The constant-time loop is what
 * matters for equal-length comparisons.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Encode raw bytes as base64url without padding (RFC 4648 §5). */
function toBase64Url(bytes: Uint8Array): string {
  // Buffer is available in Node and Edge runtimes; keeps us off third-party deps.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer;
  let b64: string;
  if (B && typeof B.from === 'function') {
    b64 = B.from(bytes).toString('base64');
  } else {
    // Pure-JS fallback (browser/edge without Buffer).
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
