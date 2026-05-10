/**
 * Argon2id work-factor configuration — SPEC-AUTH-001 / REQ-AUTH-001.
 *
 * Centralized so future tuning (raising memory cost, parallelism) only
 * requires editing this file. Update PASSWORD_VERSION_TAG together with
 * the params when raising cost so audit logs can correlate hash-version.
 *
 * RFC 9106 second recommendation: t=3, m=2^16 KiB (= 64 MiB), p=4.
 *
 * @MX:ANCHOR: 단일 진실 원천 — password.ts/verifyPassword/needsRehash가 모두 이 값을 참조한다.
 * @MX:REASON: 워크 팩터를 코드 곳곳에 흩어두면 일부만 상향되어 일관성 없는 해시가 생성될 위험.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-001
 */

/** Stable identifier for the current hashing scheme. */
export const PASSWORD_VERSION_TAG = 'argon2id-v1' as const;

/** Default Argon2id work factors (kept narrow & readonly for safety). */
export const ARGON2ID_PARAMS = {
  /** RFC 9106 'iterations' (a.k.a. timeCost). */
  timeCost: 3,
  /** Memory cost in KiB. 65536 = 64 MiB. */
  memoryCost: 65536,
  /** Lanes / parallelism. */
  parallelism: 4,
  /** Hash length in bytes (post-encoding). */
  hashLength: 32,
  /** Salt length in bytes (RFC 9106 minimum recommendation). */
  saltLength: 16,
} as const;

/** Algorithm name persisted to `User.passwordAlgo`. */
export const PASSWORD_ALGO = 'argon2id' as const;
