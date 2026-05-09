/**
 * Argon2id password hashing helpers (SPEC-AUTH-001 / REQ-AUTH-001).
 *
 * Uses the RFC 9106 second recommendation parameters (t=3, m=64 MiB, p=4)
 * with the argon2id variant. Hashes are tagged via PHC encoding so that
 * future parameter upgrades remain detectable through {@link needsUpgrade}.
 */
import * as argon2 from 'argon2';

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

const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  ...ARGON2ID_PARAMS,
};

/**
 * Hash a plaintext password with Argon2id using the current parameters.
 *
 * @throws if the password is empty (defensive — callers must validate length).
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  return argon2.hash(plain, HASH_OPTIONS);
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
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Check whether an existing hash should be re-hashed at next successful login.
 *
 * Returns true when:
 *   - the hash is missing / not an Argon2id PHC string, or
 *   - the embedded parameters are weaker than {@link ARGON2ID_PARAMS}.
 */
export function needsUpgrade(hash: string): boolean {
  if (typeof hash !== 'string' || hash.length === 0) return true;
  if (!hash.startsWith('$argon2id$')) return true;
  try {
    return argon2.needsRehash(hash, ARGON2ID_PARAMS);
  } catch {
    return true;
  }
}
