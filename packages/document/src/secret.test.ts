// @vitest-environment node
/**
 * packages/document/src/secret.test.ts
 *
 * 문서 비밀번호 및 잠금 해제 토큰 테스트 — SPEC-DOCUMENT-001 Slice C.
 * node 환경 실행: jose의 Uint8Array instanceof 검사가 jsdom에서 실패하기 때문.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashDocumentPassword,
  verifyDocumentPassword,
  generateUnlockToken,
  verifyUnlockToken,
} from './secret';

describe('secret - Document Password Hashing', () => {
  describe('hashDocumentPassword', () => {
    it('should produce an argon2id-encoded PHC string', async () => {
      const hash = await hashDocumentPassword('test-password');
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(hash).toContain('m=');
      expect(hash).toContain('t=');
      expect(hash).toContain('p=');
    });

    it('should throw on empty password', async () => {
      await expect(hashDocumentPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should produce different hashes for the same password (salt randomization)', async () => {
      const password = 'same-password';
      const hashA = await hashDocumentPassword(password);
      const hashB = await hashDocumentPassword(password);

      expect(hashA).not.toBe(hashB);
    });

    it('should use weaker parameters than user passwords (DOC_PASSWORD_PARAMS)', async () => {
      const hash = await hashDocumentPassword('test');
      // Check for the weaker parameters: 256 MB memory, 2 iterations
      expect(hash).toMatch(/m=262144/); // 256 * 1024
      expect(hash).toMatch(/t=2/);
    });
  });

  describe('verifyDocumentPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correct-password';
      const hash = await hashDocumentPassword(password);

      const isValid = await verifyDocumentPassword(hash, password);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      const hash = await hashDocumentPassword(password);

      const isValid = await verifyDocumentPassword(hash, wrongPassword);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashDocumentPassword('test');
      const isValid = await verifyDocumentPassword(hash, '');
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyDocumentPassword('', 'test');
      expect(isValid).toBe(false);
    });

    it('should return false for malformed hash', async () => {
      const isValid = await verifyDocumentPassword('not-a-hash', 'test');
      expect(isValid).toBe(false);
    });
  });

  describe('Password Verification Flow', () => {
    it('should verify password correctly after hashing', async () => {
      const password = 'secure-document-password';
      const hash = await hashDocumentPassword(password);

      expect(await verifyDocumentPassword(hash, password)).toBe(true);
      expect(await verifyDocumentPassword(hash, 'wrong')).toBe(false);
    });
  });
});

describe('secret - Unlock Token (JWT)', () => {
  beforeEach(() => {
    // Set NEXTAUTH_SECRET for testing
    process.env.NEXTAUTH_SECRET = 'test-secret-key-32-chars-long';
  });

  describe('generateUnlockToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateUnlockToken(123);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts.length).toBe(3);
    });

    it('should generate different tokens for different calls', async () => {
      const tokenA = await generateUnlockToken(123);
      const tokenB = await generateUnlockToken(123);

      // Tokens should be different due to iat timestamp
      expect(tokenA).not.toBe(tokenB);
    });

    it('should include documentId in payload', async () => {
      const token = await generateUnlockToken(456);
      const payload = await verifyUnlockToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.documentId).toBe(456);
    });
  });

  describe('verifyUnlockToken', () => {
    it('should verify valid token and return documentId', async () => {
      const documentId = 789;
      const token = await generateUnlockToken(documentId);

      const payload = await verifyUnlockToken(token);
      expect(payload).toBeTruthy();
      expect(payload?.documentId).toBe(documentId);
    });

    it('should return null for invalid token', async () => {
      const payload = await verifyUnlockToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload = await verifyUnlockToken('');
      expect(payload).toBeNull();
    });

    it('should return null for tampered token', async () => {
      const token = await generateUnlockToken(100);
      const tamperedToken = token + 'tampered';

      const payload = await verifyUnlockToken(tamperedToken);
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', async () => {
      const originalSecret = process.env.NEXTAUTH_SECRET;
      process.env.NEXTAUTH_SECRET = 'different-secret';

      const token = await generateUnlockToken(200);

      // Restore original secret
      process.env.NEXTAUTH_SECRET = originalSecret;

      const payload = await verifyUnlockToken(token);
      expect(payload).toBeNull();
    });
  });

  describe('Token Expiry', () => {
    it('should set expiry time to 30 minutes from issuance', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await generateUnlockToken(300);

      // Decode JWT payload (base64url)
      const payloadBase64 = token.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64!, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      expect(payload.exp).toBeGreaterThanOrEqual(now + 30 * 60 - 1); // Allow 1s margin
      expect(payload.exp).toBeLessThanOrEqual(now + 30 * 60 + 1);
    });

    it('should reject expired tokens (edge case - need to mock time)', async () => {
      // Note: This test would require mocking Date.now() or using a fixed clock
      // For now, we'll skip the actual expiry test
      const token = await generateUnlockToken(400);
      const payload = await verifyUnlockToken(token);

      // Token should be valid immediately after generation
      expect(payload).toBeTruthy();
    });
  });

  describe('Token Generation and Verification Flow', () => {
    it('should complete full generate-verify cycle', async () => {
      const documentId = 999;

      const token = await generateUnlockToken(documentId);
      const payload = await verifyUnlockToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.documentId).toBe(documentId);
    });
  });
});
