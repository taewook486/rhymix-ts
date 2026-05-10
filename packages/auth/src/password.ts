/**
 * Argon2id password hashing helpers — SPEC-AUTH-001 / REQ-AUTH-001, REQ-AUTH-014, REQ-AUTH-050, REQ-AUTH-055.
 *
 * Uses the RFC 9106 second recommendation parameters (t=3, m=64 MiB, p=4)
 * with the argon2id variant. Hashes are encoded as PHC strings so that
 * future parameter upgrades remain detectable through {@link verifyPassword}'s
 * `needsRehash` flag and {@link needsUpgrade} (legacy alias).
 *
 * Implementation: `hash-wasm` (WebAssembly). 선택 이유는 모든 플랫폼에서
 * prebuilt 바이너리 없이 동일하게 동작 (pnpm isolated linker / Node 24
 * 호환성 이슈 회피). 산출되는 PHC 문자열은 표준이라 다른 argon2 구현과
 * 상호 검증 가능. Edge runtime 호환 (REQ-AUTH-001 위험 완화).
 *
 * Security invariants:
 * - REQ-AUTH-050: 평문 비밀번호는 절대 로그/예외 메시지에 포함되지 않는다.
 * - REQ-AUTH-055: 인코딩된 해시 전체는 로깅하지 않는다 (이 모듈 자체가 logger 미사용).
 *
 * @MX:ANCHOR: 모든 인증 경로(login/signup/password-change/credentials provider)의 단일 진입점.
 * @MX:REASON: 일관된 work factor 적용과 timing safety를 보장.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-001, REQ-AUTH-014
 */
import { argon2id as wasmArgon2id, argon2Verify } from 'hash-wasm';

import {
  ARGON2ID_PARAMS,
  PASSWORD_ALGO,
  PASSWORD_VERSION_TAG,
} from './password-config';

export { ARGON2ID_PARAMS, PASSWORD_ALGO, PASSWORD_VERSION_TAG };

/** Optional override for raising work factor in tests / future upgrades. */
export interface PasswordHashOptions {
  /** Memory cost in KiB. Defaults to {@link ARGON2ID_PARAMS.memoryCost}. */
  memorySize?: number;
  /** Iterations / timeCost. Defaults to {@link ARGON2ID_PARAMS.timeCost}. */
  iterations?: number;
  /** Parallelism. Defaults to {@link ARGON2ID_PARAMS.parallelism}. */
  parallelism?: number;
}

/**
 * Result of {@link verifyPassword}.
 *
 * - `valid`: whether the plaintext matches the stored hash.
 * - `needsRehash`: whether the stored hash is below current target params
 *   (or uses a legacy algorithm). Used by login flow to opportunistically
 *   upgrade hashes (REQ-AUTH-014).
 */
export interface PasswordVerifyResult {
  valid: boolean;
  needsRehash: boolean;
}

/**
 * Hash a plaintext password with Argon2id using the current parameters.
 *
 * @throws if the password is empty (defensive — callers MUST validate length
 *         via Zod before reaching this layer; this is a last-resort guard).
 */
export async function hashPassword(
  plain: string,
  opts?: PasswordHashOptions,
): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = new Uint8Array(ARGON2ID_PARAMS.saltLength);
  crypto.getRandomValues(salt);
  return wasmArgon2id({
    password: plain,
    salt,
    iterations: opts?.iterations ?? ARGON2ID_PARAMS.timeCost,
    memorySize: opts?.memorySize ?? ARGON2ID_PARAMS.memoryCost,
    parallelism: opts?.parallelism ?? ARGON2ID_PARAMS.parallelism,
    hashLength: ARGON2ID_PARAMS.hashLength,
    outputType: 'encoded',
  });
}

/**
 * Verify a plaintext password against a stored Argon2id PHC hash.
 *
 * Returns `{ valid: false }` on any malformed / non-Argon2id hash instead of
 * throwing, so callers can treat invalid data as a failed login attempt.
 *
 * Always returns `needsRehash` so callers can decide whether to upgrade
 * the stored hash on a successful login (REQ-AUTH-014).
 *
 * The hash is never echoed in error messages (REQ-AUTH-055).
 */
export async function verifyPassword(
  plain: string,
  encoded: string,
): Promise<PasswordVerifyResult> {
  const malformed: PasswordVerifyResult = { valid: false, needsRehash: false };

  if (typeof encoded !== 'string' || encoded.length === 0) return malformed;
  if (typeof plain !== 'string' || plain.length === 0) {
    // Even with a real hash, an empty plaintext can never be valid.
    return { valid: false, needsRehash: needsUpgrade(encoded) };
  }
  if (!encoded.startsWith('$argon2')) {
    // Legacy hash (md5/bcrypt/sha1). We cannot verify it here — caller must
    // bridge legacy verification before invoking us. Always flag for rehash.
    return { valid: false, needsRehash: true };
  }

  let valid = false;
  try {
    valid = await argon2Verify({ password: plain, hash: encoded });
  } catch {
    return malformed;
  }
  return { valid, needsRehash: needsUpgrade(encoded) };
}

/**
 * True when the encoded hash does not use the argon2id PHC scheme.
 *
 * Used by the login pipeline to recognize legacy md5/bcrypt/sha1 hashes that
 * must be transparently upgraded to Argon2id on the next successful login
 * (REQ-AUTH-014). Returns `true` for empty/non-string inputs as a defensive
 * default so legacy / unknown formats always trigger a rehash.
 */
export function isLegacyHash(encoded: string): boolean {
  if (typeof encoded !== 'string' || encoded.length === 0) return true;
  return !encoded.startsWith('$argon2id$');
}

/**
 * Whether an existing hash should be re-hashed at next successful login.
 *
 * `hash-wasm`은 needsRehash를 노출하지 않으므로 PHC 문자열을 직접 파싱하여
 * 임베디드 파라미터(t/m/p)를 현재 정책과 비교합니다.
 *
 * Returns `true` when:
 *   - the hash is missing / not an argon2id PHC string, or
 *   - the embedded parameters are weaker than {@link ARGON2ID_PARAMS}.
 */
export function needsUpgrade(encoded: string): boolean {
  if (isLegacyHash(encoded)) return true;
  // PHC format: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
  const match = encoded.match(/\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/);
  if (!match) return true;
  const m = Number(match[1]);
  const t = Number(match[2]);
  const p = Number(match[3]);
  if (!Number.isFinite(m) || !Number.isFinite(t) || !Number.isFinite(p)) {
    return true;
  }
  return (
    m < ARGON2ID_PARAMS.memoryCost ||
    t < ARGON2ID_PARAMS.timeCost ||
    p < ARGON2ID_PARAMS.parallelism
  );
}
