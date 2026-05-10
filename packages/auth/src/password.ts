/**
 * Argon2id password hashing helpers (SPEC-AUTH-001 / REQ-AUTH-001).
 *
 * Uses the RFC 9106 second recommendation parameters (t=3, m=64 MiB, p=4)
 * with the argon2id variant. Hashes are tagged via PHC encoding so that
 * future parameter upgrades remain detectable through {@link needsUpgrade}.
 *
 * Implementation: `hash-wasm` (WebAssembly). 선택 이유는 모든 플랫폼에서
 * prebuilt 바이너리 없이 동일하게 동작 (pnpm isolated linker / Node 24
 * 호환성 이슈 회피). 산출되는 PHC 문자열은 표준이라 다른 argon2 구현과
 * 상호 검증 가능. native 대비 약 2~3배 느리지만 Argon2id의 본래 cost
 * 자체가 크기 때문에 실 세계 영향은 미미합니다.
 */
import { argon2id as wasmArgon2id, argon2Verify } from 'hash-wasm';

/** Stable identifier for the current hashing scheme. */
export const PASSWORD_VERSION_TAG = 'argon2id-v1' as const;

/**
 * Current Argon2id work factors. Update together with PASSWORD_VERSION_TAG
 * when raising the cost. RFC 9106 second recommendation:
 *   t=3, m=2^16 KiB (= 64 MiB), p=4.
 */
export const ARGON2ID_PARAMS = {
  timeCost: 3,
  memoryCost: 65536,
  parallelism: 4,
} as const;

/**
 * Hash a plaintext password with Argon2id using the current parameters.
 *
 * @throws if the password is empty (defensive — callers must validate length).
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  // 16 bytes는 RFC 9106 권장 salt 최소 크기.
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return wasmArgon2id({
    password: plain,
    salt,
    iterations: ARGON2ID_PARAMS.timeCost,
    memorySize: ARGON2ID_PARAMS.memoryCost,
    parallelism: ARGON2ID_PARAMS.parallelism,
    hashLength: 32,
    outputType: 'encoded',
  });
}

/**
 * Verify a plaintext password against a stored Argon2id PHC hash.
 *
 * Returns false on any malformed / non-Argon2 hash instead of throwing,
 * so callers can treat invalid data as a failed login attempt.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (typeof hash !== 'string' || hash.length === 0) return false;
  if (typeof plain !== 'string' || plain.length === 0) return false;
  if (!hash.startsWith('$argon2')) return false;
  try {
    return await argon2Verify({ password: plain, hash });
  } catch {
    return false;
  }
}

/**
 * Check whether an existing hash should be re-hashed at next successful login.
 *
 * `@node-rs/argon2`는 needsRehash를 노출하지 않으므로 PHC 문자열을 직접
 * 파싱하여 임베디드 파라미터(t/m/p)를 현재 정책과 비교합니다.
 *
 * Returns true when:
 *   - the hash is missing / not an Argon2id PHC string, or
 *   - the embedded parameters are weaker than {@link ARGON2ID_PARAMS}.
 */
export function needsUpgrade(hash: string): boolean {
  if (typeof hash !== 'string' || hash.length === 0) return true;
  if (!hash.startsWith('$argon2id$')) return true;
  // PHC 형식: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
  const match = hash.match(/\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/);
  if (!match) return true;
  const m = Number(match[1]);
  const t = Number(match[2]);
  const p = Number(match[3]);
  return (
    m < ARGON2ID_PARAMS.memoryCost ||
    t < ARGON2ID_PARAMS.timeCost ||
    p < ARGON2ID_PARAMS.parallelism
  );
}
