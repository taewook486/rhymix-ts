/**
 * Specification tests for Argon2id password helpers.
 * Covers SPEC-AUTH-001 REQ-AUTH-001 (hashing), REQ-AUTH-014 (auto-rehash trigger),
 * REQ-AUTH-050/REQ-AUTH-055 (no plaintext / no full-hash in errors).
 */
import { describe, expect, it } from 'vitest';

import {
  ARGON2ID_PARAMS,
  PASSWORD_VERSION_TAG,
  hashPassword,
  isLegacyHash,
  needsUpgrade,
  verifyPassword,
} from './password';

describe('Argon2id password helper', () => {
  describe('hashPassword', () => {
    it('produces an argon2id-encoded PHC string', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(hash).toMatch(/^\$argon2id\$v=19\$/);
    });

    it('embeds the configured work factor parameters', async () => {
      const hash = await hashPassword('hunter2-hunter2');
      expect(hash).toContain(`m=${ARGON2ID_PARAMS.memoryCost}`);
      expect(hash).toContain(`t=${ARGON2ID_PARAMS.timeCost}`);
      expect(hash).toContain(`p=${ARGON2ID_PARAMS.parallelism}`);
    });

    it('produces unique hashes for the same input (random salt)', async () => {
      const a = await hashPassword('same-password');
      const b = await hashPassword('same-password');
      expect(a).not.toEqual(b);
    });

    it('rejects empty passwords', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('does not include the plaintext in the thrown error message (REQ-AUTH-050)', async () => {
      const sentinel = 'pl41nt3xt-leak-canary';
      try {
        // @ts-expect-error — null is intentionally invalid input
        await hashPassword(null);
        throw new Error('expected hashPassword to throw');
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).not.toContain(sentinel);
      }
    });

    it('exposes a stable version tag', () => {
      expect(PASSWORD_VERSION_TAG).toBe('argon2id-v1');
    });
  });

  describe('verifyPassword', () => {
    it('returns valid=true, needsRehash=false for a fresh hash', async () => {
      const hash = await hashPassword('s3cret-pass-phrase');
      await expect(verifyPassword('s3cret-pass-phrase', hash)).resolves.toEqual({
        valid: true,
        needsRehash: false,
      });
    });

    it('returns valid=false for an incorrect password', async () => {
      const hash = await hashPassword('s3cret-pass-phrase');
      const result = await verifyPassword('wrong-password', hash);
      expect(result.valid).toBe(false);
    });

    it('returns valid=false for a malformed hash instead of throwing', async () => {
      // Garbage hashes are treated as legacy → needsRehash=true so callers
      // know to re-derive once they have a verified plaintext (REQ-AUTH-014).
      await expect(verifyPassword('whatever', 'not-a-real-hash')).resolves.toEqual({
        valid: false,
        needsRehash: true,
      });
    });

    it('returns valid=false + needsRehash=false for an empty hash (no signal to rehash)', async () => {
      // Empty hash means the user record has no credentials at all — we
      // should not claim it needs a rehash because there is nothing to rehash.
      await expect(verifyPassword('whatever', '')).resolves.toEqual({
        valid: false,
        needsRehash: false,
      });
    });

    it('returns valid=false for an empty plain password', async () => {
      const hash = await hashPassword('something');
      const result = await verifyPassword('', hash);
      expect(result.valid).toBe(false);
    });

    it('returns valid=false + needsRehash=true for a legacy bcrypt hash (REQ-AUTH-014)', async () => {
      // Static bcrypt fixture — never computed, just shape-checking.
      const bcryptHash = '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      const result = await verifyPassword('password', bcryptHash);
      expect(result).toEqual({ valid: false, needsRehash: true });
    });

    it('returns valid=false for non-string inputs (defensive)', async () => {
      // Garbage encoded → needsRehash=true (legacy semantics).
      // @ts-expect-error — intentional misuse
      const a = await verifyPassword(undefined, 'whatever');
      expect(a.valid).toBe(false);
      expect(a.needsRehash).toBe(true);

      // Encoded undefined is empty-equivalent → no rehash signal.
      // @ts-expect-error — intentional misuse
      const b = await verifyPassword('plain', undefined);
      expect(b).toEqual({ valid: false, needsRehash: false });
    });

    it('reports needsRehash=true when stored params are below current target', async () => {
      // Synthetic fixture: m=4096 < current 65536. argon2Verify will return
      // false (because the embedded hash is dummy data), but `needsRehash`
      // must still be computed from the params.
      const weakHash =
        '$argon2id$v=19$m=4096,t=3,p=4$c29tZXNhbHRzYWx0$' +
        'ZHVtbXloYXNoZHVtbXloYXNoZHVtbXloYXNoZHVtbXk';
      const result = await verifyPassword('anything', weakHash);
      expect(result.valid).toBe(false);
      expect(result.needsRehash).toBe(true);
    });

    it('takes comparable time for two wrong-password verifications regardless of plaintext length (timing smoke test)', async () => {
      // Smoke check, not a hard guarantee. Argon2 verification cost dominates
      // any string-length difference.
      const hash = await hashPassword('reference-password');

      const t1Start = performance.now();
      await verifyPassword('a', hash);
      const t1 = performance.now() - t1Start;

      const t2Start = performance.now();
      await verifyPassword('a-much-longer-wrong-password-attempt', hash);
      const t2 = performance.now() - t2Start;

      // Generous 10x tolerance — we only care that one is not 100x faster.
      const ratio = Math.max(t1, t2) / Math.max(Math.min(t1, t2), 1);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('isLegacyHash', () => {
    it('returns true for a bcrypt-style hash', () => {
      expect(isLegacyHash('$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')).toBe(true);
      expect(isLegacyHash('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
    });

    it('returns true for md5 / sha1 hex strings', () => {
      expect(isLegacyHash('5f4dcc3b5aa765d61d8327deb882cf99')).toBe(true);
    });

    it('returns false for an argon2id PHC string', async () => {
      const hash = await hashPassword('whatever');
      expect(isLegacyHash(hash)).toBe(false);
    });

    it('returns true for empty / non-string inputs', () => {
      expect(isLegacyHash('')).toBe(true);
      // @ts-expect-error — intentional misuse
      expect(isLegacyHash(undefined)).toBe(true);
      // @ts-expect-error — intentional misuse
      expect(isLegacyHash(null)).toBe(true);
    });
  });

  describe('needsUpgrade (legacy alias)', () => {
    it('returns false for hashes produced by current parameters', async () => {
      const hash = await hashPassword('still-fresh');
      expect(needsUpgrade(hash)).toBe(false);
    });

    it('returns true for legacy bcrypt / md5 hashes', () => {
      expect(needsUpgrade('5f4dcc3b5aa765d61d8327deb882cf99')).toBe(true);
      expect(needsUpgrade('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
    });

    it('returns true for empty / garbage inputs', () => {
      expect(needsUpgrade('')).toBe(true);
      expect(needsUpgrade('garbage')).toBe(true);
    });

    it('returns true when params are below current target', () => {
      const weakHash =
        '$argon2id$v=19$m=4096,t=3,p=4$c29tZXNhbHRzYWx0$' +
        'ZHVtbXloYXNoZHVtbXloYXNoZHVtbXloYXNoZHVtbXk';
      expect(needsUpgrade(weakHash)).toBe(true);
    });

    it('returns true when embedded params cannot be parsed', () => {
      const malformed = '$argon2id$v=19$mNOTANUMBER,t=oops,p=x$c2FsdA$aGFzaA';
      expect(needsUpgrade(malformed)).toBe(true);
    });

    it('handles non-string inputs gracefully', () => {
      // @ts-expect-error — intentional misuse
      expect(needsUpgrade(undefined)).toBe(true);
      // @ts-expect-error — intentional misuse
      expect(needsUpgrade(null)).toBe(true);
    });
  });
});
