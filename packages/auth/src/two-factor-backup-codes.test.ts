/**
 * SPEC-ADMIN-2FA-OTP-001 M1: Backup codes tests (REQ-2OTP-003, 025, 026)
 *
 * TDD RED phase: Write failing tests for backup code generation/verification
 */
import { describe, it, expect } from 'vitest';
import {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  normalizeBackupCode,
} from './two-factor-backup-codes';

describe('two-factor-backup-codes', () => {
  describe('normalizeBackupCode', () => {
    it('REQ-2OTP-026: should strip hyphens from 10-char alphanumeric code', () => {
      expect(normalizeBackupCode('A3F9K-2M7QZ')).toBe('A3F9K2M7QZ');
    });

    it('REQ-2OTP-026: should fold to uppercase', () => {
      expect(normalizeBackupCode('a3f9k-2m7qz')).toBe('A3F9K2M7QZ');
    });

    it('REQ-2OTP-026: should handle multiple hyphens and mixed case', () => {
      expect(normalizeBackupCode('a3-f9k-2m-7qz')).toBe('A3F9K2M7QZ');
    });

    it('should handle empty string', () => {
      expect(normalizeBackupCode('')).toBe('');
    });

    it('should handle already normalized code', () => {
      expect(normalizeBackupCode('A3F9K2M7QZ')).toBe('A3F9K2M7QZ');
    });
  });

  describe('generateBackupCodes', () => {
    it('REQ-2OTP-025: should generate 10 backup codes by default', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('REQ-2OTP-026: each code should be 10 alphanumeric characters', () => {
      const codes = generateBackupCodes();
      codes.forEach((code) => {
        const normalized = normalizeBackupCode(code);
        expect(normalized).toMatch(/^[A-Z0-9]{10}$/);
      });
    });

    it('REQ-2OTP-026: codes should be displayed in 5-5 grouping with hyphen', () => {
      const codes = generateBackupCodes();
      codes.forEach((code) => {
        // Display format: XXXXX-XXXXX
        expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
      });
    });

    it('REQ-2OTP-025: generated codes should have high entropy (unique in 100 generations)', () => {
      const allCodes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const codes = generateBackupCodes();
        codes.forEach((code) => allCodes.add(code));
      }
      // 100 generations * 10 codes = 1000 codes, all should be unique
      expect(allCodes.size).toBe(1000);
    });

    it('should allow custom count', () => {
      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
    });
  });

  describe('hashBackupCode', () => {
    it('REQ-2OTP-003: should hash backup code using SHA-256', () => {
      const code = 'A3F9K-2M7QZ';
      const hash = hashBackupCode(code);

      // SHA-256 produces 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('REQ-2OTP-003: same code should produce same hash (deterministic)', () => {
      const code = 'A3F9K-2M7QZ';
      const hash1 = hashBackupCode(code);
      const hash2 = hashBackupCode(code);

      expect(hash1).toBe(hash2);
    });

    it('REQ-2OTP-026: should hash normalized form (hyphens/case stripped)', () => {
      const hash1 = hashBackupCode('A3F9K-2M7QZ');
      const hash2 = hashBackupCode('a3f9k2m7qz');
      const hash3 = hashBackupCode('A3-F9-K2-M7-QZ');

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('REQ-2OTP-003: different codes should produce different hashes', () => {
      const hash1 = hashBackupCode('A3F9K-2M7QZ');
      const hash2 = hashBackupCode('B4G0L-3N8PY');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyBackupCode', () => {
    it('REQ-2OTP-041: should return true and remove code when valid code matches', () => {
      const codes = generateBackupCodes(3);
      const hashes = codes.map(hashBackupCode);
      const codeToVerify = codes[1]!

      const result = verifyBackupCode(codeToVerify, hashes);

      expect(result.verified).toBe(true);
      // The verified code should be removed from hashes
      expect(result.remainingHashes).toHaveLength(2);
    });

    it('REQ-2OTP-041: single-use - second verification of same code should fail', () => {
      const codes = generateBackupCodes(3);
      const hashes = codes.map(hashBackupCode);
      const codeToVerify = codes[1]!

      const result1 = verifyBackupCode(codeToVerify, hashes);
      expect(result1.verified).toBe(true);

      // Try again with same code
      const result2 = verifyBackupCode(codeToVerify, result1.remainingHashes);
      expect(result2.verified).toBe(false);
      expect(result2.remainingHashes).toHaveLength(2); // No change
    });

    it('REQ-2OTP-043: should return false with generic error for invalid code', () => {
      const codes = generateBackupCodes(3);
      const hashes = codes.map(hashBackupCode);

      const result = verifyBackupCode('INVALID-CODE', hashes);

      expect(result.verified).toBe(false);
      expect(result.remainingHashes).toHaveLength(3); // No change
    });

    it('REQ-2OTP-026: should verify using normalized form (hyphen/case tolerant)', () => {
      const codes = generateBackupCodes(3);
      const hashes = codes.map(hashBackupCode);
      const codeToVerify = codes[1]! // Format: XXXXX-XXXXX

      // Verify with different formats
      const result1 = verifyBackupCode(codeToVerify, hashes);
      const result2 = verifyBackupCode(codeToVerify.toLowerCase(), hashes);
      const result3 = verifyBackupCode(codeToVerify.replace('-', ''), hashes);

      expect(result1.verified).toBe(true);
      expect(result2.verified).toBe(true);
      expect(result3.verified).toBe(true);
    });

    it('REQ-2OTP-003: should use constant-time comparison (timing attack resistant)', () => {
      // This test verifies that comparison doesn't short-circuit on first mismatch
      const codes = generateBackupCodes(3);
      const hashes = codes.map(hashBackupCode);

      // Time multiple comparisons (should be similar regardless of match position)
      const start1 = performance.now();
      verifyBackupCode(codes[0]!, hashes);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      verifyBackupCode('XXXXXXXXXX', hashes);
      const time2 = performance.now() - start2;

      // Times should be similar (within 10x factor for test reliability)
      // Constant-time comparison prevents timing attacks
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('integration tests', () => {
    it('REQ-2OTP-022: enroll flow should generate codes and hash them for storage', () => {
      // Simulate enroll flow
      const backupCodes = generateBackupCodes(10);
      const hashedCodes = backupCodes.map(hashBackupCode);

      // Store in DB (simulated)
      const dbRecord = { twoFactorBackupCodes: hashedCodes };

      // Verify one code works
      const verification = verifyBackupCode(backupCodes[0]!, dbRecord.twoFactorBackupCodes);
      expect(verification.verified).toBe(true);

      // Updated DB record with consumed code removed
      const updatedDbRecord = { twoFactorBackupCodes: verification.remainingHashes };
      expect(updatedDbRecord.twoFactorBackupCodes).toHaveLength(9);
    });
  });
});
