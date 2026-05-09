/**
 * Specification tests for Argon2id password helpers.
 * Covers REQ-AUTH-001 (password hashing).
 */
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  needsUpgrade,
  PASSWORD_VERSION_TAG,
  ARGON2ID_PARAMS,
} from './password';

describe('Argon2id password helper', () => {
  describe('hashPassword', () => {
    it('produces an Argon2id-encoded hash', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('embeds the configured work factor parameters', async () => {
      const hash = await hashPassword('hunter2-hunter2');
      // PHC format: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
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

    it('exposes a version tag', () => {
      expect(PASSWORD_VERSION_TAG).toBe('argon2id-v1');
    });
  });

  describe('verifyPassword', () => {
    it('returns true for a matching password', async () => {
      const hash = await hashPassword('s3cret-pass-phrase');
      await expect(verifyPassword('s3cret-pass-phrase', hash)).resolves.toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const hash = await hashPassword('s3cret-pass-phrase');
      await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    });

    it('returns false for a malformed hash instead of throwing', async () => {
      await expect(verifyPassword('whatever', 'not-a-real-hash')).resolves.toBe(false);
    });

    it('returns false for an empty hash', async () => {
      await expect(verifyPassword('whatever', '')).resolves.toBe(false);
    });

    it('returns false for an empty plain password', async () => {
      const hash = await hashPassword('something');
      await expect(verifyPassword('', hash)).resolves.toBe(false);
    });

    it('returns false for non-string inputs (defensive)', async () => {
      // @ts-expect-error — intentional misuse to assert defensive behavior
      await expect(verifyPassword(undefined, 'whatever')).resolves.toBe(false);
      // @ts-expect-error — intentional misuse to assert defensive behavior
      await expect(verifyPassword('plain', undefined)).resolves.toBe(false);
    });
  });

  describe('needsUpgrade', () => {
    it('returns false for hashes produced by the current parameters', async () => {
      const hash = await hashPassword('still-fresh');
      expect(needsUpgrade(hash)).toBe(false);
    });

    it('returns true when memory cost is below the current target', () => {
      // Synthetic hash with weaker parameters: m=4096 (< 65536)
      const weakHash =
        '$argon2id$v=19$m=4096,t=3,p=4$c29tZXNhbHRzYWx0$' +
        'ZHVtbXloYXNoZHVtbXloYXNoZHVtbXloYXNoZHVtbXk';
      expect(needsUpgrade(weakHash)).toBe(true);
    });

    it('returns true for legacy non-argon2id hashes (md5/bcrypt prefix)', () => {
      // Old Rhymix passwords are md5 or sha1 — strings without $argon2id$ prefix.
      expect(needsUpgrade('5f4dcc3b5aa765d61d8327deb882cf99')).toBe(true);
      expect(needsUpgrade('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
    });

    it('returns true for empty / invalid input', () => {
      expect(needsUpgrade('')).toBe(true);
      expect(needsUpgrade('garbage')).toBe(true);
    });

    it('returns true when the embedded params cannot be parsed (defensive)', () => {
      // Looks like an Argon2id PHC string but parameter section is malformed,
      // so argon2.needsRehash throws — needsUpgrade must swallow and return true.
      const malformed = '$argon2id$v=19$mNOTANUMBER,t=oops,p=x$c2FsdA$aGFzaA';
      expect(needsUpgrade(malformed)).toBe(true);
    });

    it('handles non-string inputs gracefully', () => {
      // @ts-expect-error — intentional misuse to assert defensive behavior
      expect(needsUpgrade(undefined)).toBe(true);
      // @ts-expect-error — intentional misuse to assert defensive behavior
      expect(needsUpgrade(null)).toBe(true);
    });
  });
});
