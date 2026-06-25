/**
 * SPEC-ADMIN-2FA-OTP-001 M1: AES-256-GCM encryption tests (REQ-2OTP-002, 005, 006, 044)
 *
 * TDD RED phase: Write failing tests for encryption/decryption requirements
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptSecret, decryptSecret } from './two-factor-crypto';

describe('two-factor-crypto', () => {
  const TEST_KEY = 'test-key-32-bytes-long-for-aes-256-gcm-exactly!';
  const ORIGINAL_KEY = process.env.TWO_FACTOR_ENC_KEY;

  beforeEach(() => {
    // Set test key before each test
    process.env.TWO_FACTOR_ENC_KEY = TEST_KEY;
  });

  afterEach(() => {
    // Restore original key after each test
    if (ORIGINAL_KEY !== undefined) {
      process.env.TWO_FACTOR_ENC_KEY = ORIGINAL_KEY;
    } else {
      delete process.env.TWO_FACTOR_ENC_KEY;
    }
  });

  describe('encryptSecret', () => {
    it('REQ-2OTP-005: should throw when TWO_FACTOR_ENC_KEY is missing', () => {
      delete process.env.TWO_FACTOR_ENC_KEY;
      expect(() => encryptSecret('test-secret')).toThrow('TWO_FACTOR_ENC_KEY must be set');
    });

    it('REQ-2OTP-006: should use unique IV for each encryption (IV reuse breaks GCM)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const result1 = encryptSecret(plaintext);
      const result2 = encryptSecret(plaintext);

      // Parse the format: base64(iv):base64(tag):base64(ciphertext)
      const [iv1] = result1.split(':');
      const [iv2] = result2.split(':');

      // IVs must be different (CSPRNG generated)
      expect(iv1).not.toBe(iv2);
    });

    it('REQ-2OTP-002: should encrypt TOTP secret to AES-256-GCM ciphertext', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptSecret(plaintext);

      // Format should be: base64(iv):base64(authTag):base64(ciphertext)
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      const [ivB64, tagB64, ciphertextB64] = parts;

      // Should be valid base64
      expect(() => Buffer.from(ivB64!, 'base64')).not.toThrow();
      expect(() => Buffer.from(tagB64!, 'base64')).not.toThrow();
      expect(() => Buffer.from(ciphertextB64!, 'base64')).not.toThrow();

      // IV should be 12 bytes (GCM standard nonce size)
      const iv = Buffer.from(ivB64!, 'base64');
      expect(iv.length).toBe(12);

      // Auth tag should be 16 bytes (GCM standard)
      const tag = Buffer.from(tagB64!, 'base64');
      expect(tag.length).toBe(16);

      // Ciphertext should NOT be the plaintext
      expect(ciphertextB64).not.toBe(plaintext);
    });

    it('should handle empty secret (edge case)', () => {
      const encrypted = encryptSecret('');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });
  });

  describe('decryptSecret', () => {
    it('REQ-2OTP-005: should throw when TWO_FACTOR_ENC_KEY is missing', () => {
      delete process.env.TWO_FACTOR_ENC_KEY;
      expect(() => decryptSecret('invalid')).toThrow('TWO_FACTOR_ENC_KEY must be set');
    });

    it('REQ-2OTP-044: should fail closed on corrupt/invalid data (throw, not return plaintext)', () => {
      const invalidData = 'invalid-format';
      expect(() => decryptSecret(invalidData)).toThrow();
    });

    it('should round-trip: encrypt then decrypt returns original', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should round-trip with different keys (simulating key rotation)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';

      // Encrypt with key1
      process.env.TWO_FACTOR_ENC_KEY = 'key1-32-bytes-long-for-aes-256-gcm!!';
      const encrypted = encryptSecret(plaintext);

      // Try to decrypt with key2 (should fail)
      process.env.TWO_FACTOR_ENC_KEY = 'key2-32-bytes-long-for-aes-256-gcm!!';
      expect(() => decryptSecret(encrypted)).toThrow();

      // Decrypt with correct key1
      process.env.TWO_FACTOR_ENC_KEY = 'key1-32-bytes-long-for-aes-256-gcm!!';
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('REQ-2OTP-006: should decrypt correctly with unique IVs (each encryption had different IV)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';

      // Encrypt multiple times (each has unique IV)
      const encrypted1 = encryptSecret(plaintext);
      const encrypted2 = encryptSecret(plaintext);
      const encrypted3 = encryptSecret(plaintext);

      // All should decrypt to the same plaintext despite different IVs
      expect(decryptSecret(encrypted1)).toBe(plaintext);
      expect(decryptSecret(encrypted2)).toBe(plaintext);
      expect(decryptSecret(encrypted3)).toBe(plaintext);
    });
  });

  describe('AES-256-GCM IV uniqueness (REQ-2OTP-006)', () => {
    it('should generate statistically unique IVs across 100 encryptions', () => {
      const plaintext = 'test-secret';
      const ivs = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const encrypted = encryptSecret(plaintext);
        const [ivB64] = encrypted.split(':');
        ivs.add(ivB64!);
      }

      // All 100 IVs should be unique (collision probability is negligible)
      expect(ivs.size).toBe(100);
    });
  });
});
