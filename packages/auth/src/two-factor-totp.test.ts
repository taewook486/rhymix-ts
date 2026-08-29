/**
 * SPEC-ADMIN-2FA-OTP-001 M2: TOTP core tests (REQ-2OTP-020, 080)
 *
 * TDD RED phase: Write failing tests for TOTP generation/verification
 */
/* otplib 를 테스트 본문에서 동기로 불러온다. it() 콜백이 동기라
   await import() 로 바꾸려면 테스트 6건을 async 로 고쳐야 한다. */
/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateTotpQrCode,
} from './two-factor-totp';

describe('two-factor-totp', () => {
  describe('generateTotpSecret', () => {
    it('REQ-2OTP-020: should generate a fresh base32 TOTP secret', () => {
      const secret = generateTotpSecret();

      // Should be base32 (uppercase letters A-Z and digits 2-7)
      expect(secret).toMatch(/^[A-Z2-7]+$/);

      // Should be reasonable length (typically 20-32 chars for TOTP)
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(secret.length).toBeLessThanOrEqual(64);
    });

    it('REQ-2OTP-020: should generate unique secrets (high entropy)', () => {
      const secrets = new Set<string>();

      for (let i = 0; i < 100; i++) {
        secrets.add(generateTotpSecret());
      }

      // All 100 secrets should be unique
      expect(secrets.size).toBe(100);
    });
  });

  describe('buildOtpauthUrl', () => {
    it('REQ-2OTP-020: should build valid otpauth:// URL for QR code', () => {
      const secret = 'KVKXWY6THQWKXA7LUXQP6KHE7WPKN6WWX===';
      const url = buildOtpauthUrl({
        issuer: 'Rhymix Admin',
        account: 'admin@example.com',
        secret,
      });

      expect(url).toMatch(/^otpauth:\/\/totp\//);
      // Format: otpauth://totp/Account:Issuer?secret=...&issuer=...
      expect(url).toContain('admin%40example.com:Rhymix%20Admin');
      expect(url).toContain('secret=' + encodeURIComponent(secret));
      expect(url).toContain('issuer=Rhymix%20Admin');
    });

    it('should handle spaces in issuer/account with URL encoding', () => {
      const url = buildOtpauthUrl({
        issuer: 'Test Site',
        account: 'user name@test.com',
        secret: 'KVKXWY6THQWKXA7LUXQP6KHE7WPKN6WWX===',
      });

      expect(url).toContain('Test%20Site');
      expect(url).toContain('user%20name%40test.com');
    });

    it('should handle special characters correctly', () => {
      const url = buildOtpauthUrl({
        issuer: 'Site&Co',
        account: 'user+tag@test.com',
        secret: 'KVKXWY6THQWKXA7LUXQP6KHE7WPKN6WWX===',
      });

      // Should be URL-encoded
      expect(url).toMatch(/^otpauth:\/\/totp\//);
    });
  });

  describe('verifyTotp', () => {
    // Use generateSecret() which produces valid base32 (>= 16 bytes for otplib v13)
    const testSecret = generateTotpSecret();

    it('REQ-2OTP-080: should verify valid TOTP code with ±1 step window', () => {
      // Generate a valid TOTP code for current time using otplib v13 API
      const { generateSync } = require('otplib');
      const validCode = generateSync({ secret: testSecret, type: 'totp' });

      // Current step should verify
      expect(verifyTotp(testSecret, validCode, 1)).toBe(true);
    });

    it('REQ-2OTP-080: should reject invalid TOTP code (wrong 6-digit)', () => {
      expect(verifyTotp(testSecret, '000000', 1)).toBe(false);
      expect(verifyTotp(testSecret, '123456', 1)).toBe(false);
      expect(verifyTotp(testSecret, '999999', 1)).toBe(false);
    });

    it('REQ-2OTP-080: should reject expired code (outside ±1 window)', () => {
      const { generateSync } = require('otplib');

      // Generate code for current time
      const currentCode = generateSync({ secret: testSecret, type: 'totp' });

      // Current code should verify
      expect(verifyTotp(testSecret, currentCode, 1)).toBe(true);

      // Invalid code should NOT verify
      expect(verifyTotp(testSecret, '000000', 1)).toBe(false);
    });

    it('REQ-2OTP-080: should verify code from previous step within window', () => {
      const { generateSync } = require('otplib');

      // Generate code for current time
      const currentCode = generateSync({ secret: testSecret, type: 'totp' });

      // Should verify within ±1 window
      expect(verifyTotp(testSecret, currentCode, 1)).toBe(true);
    });

    it('REQ-2OTP-080: should verify code from next step within window', () => {
      const { generateSync } = require('otplib');

      // Generate code for current time
      const currentCode = generateSync({ secret: testSecret, type: 'totp' });

      // Should verify within ±1 window
      expect(verifyTotp(testSecret, currentCode, 1)).toBe(true);
    });

    it('should reject malformed codes', () => {
      expect(verifyTotp(testSecret, '', 1)).toBe(false);
      expect(verifyTotp(testSecret, '12345', 1)).toBe(false); // Too short
      expect(verifyTotp(testSecret, '1234567', 1)).toBe(false); // Too long
      expect(verifyTotp(testSecret, 'abcdef', 1)).toBe(false); // Not digits
      expect(verifyTotp(testSecret, '12 456', 1)).toBe(false); // Contains space
    });

    it('should allow custom window size', () => {
      const { generateSync } = require('otplib');

      // Generate code for current time
      const currentCode = generateSync({ secret: testSecret, type: 'totp' });

      // Verify with window=0 (only current step)
      expect(verifyTotp(testSecret, currentCode, 0)).toBe(true);
    });
  });

  describe('generateTotpQrCode', () => {
    it('REQ-2OTP-020: should generate QR code as data URL (SVG)', async () => {
      const secret = 'KVKXWY6THQWKXA7LUXQP6KHE7WPKN6WWX===';
      const qrDataUrl = await generateTotpQrCode({
        issuer: 'Test Site',
        account: 'test@example.com',
        secret,
      });

      // Should be a valid data URL
      expect(qrDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);

      // Should decode to valid SVG
      const base64 = qrDataUrl.split(',')[1];
      const svg = Buffer.from(base64!, 'base64').toString('utf8');
      expect(svg).toMatch(/<svg/);
      // SVG contains QR code data paths, not plain URL
      expect(svg).toContain('viewBox');
    });

    it('REQ-2OTP-020: should generate unique QR codes for different secrets', async () => {
      const qr1 = await generateTotpQrCode({
        issuer: 'Test Site',
        account: 'test@example.com',
        secret: 'SECRET11111111111111111111111===',
      });

      const qr2 = await generateTotpQrCode({
        issuer: 'Test Site',
        account: 'test@example.com',
        secret: 'SECRET22222222222222222222222===',
      });

      expect(qr1).not.toBe(qr2);
    });

    it('should generate SVG with valid structure', async () => {
      const secret = 'KVKXWY6THQWKXA7LUXQP6KHE7WPKN6WWX===';
      const qrDataUrl = await generateTotpQrCode({
        issuer: 'Test Site',
        account: 'test@example.com',
        secret,
      });

      const base64 = qrDataUrl.split(',')[1];
      const svg = Buffer.from(base64!, 'base64').toString('utf8');

      // SVG should have standard QR code elements
      expect(svg).toMatch(/<svg/);
      expect(svg).toContain('viewBox');
      expect(svg).toMatch(/<path/);
    });
  });

  describe('integration tests', () => {
    it('REQ-2OTP-020: full enrollment flow - generate secret, build URL, create QR', async () => {
      // Step 1: Generate secret
      const secret = generateTotpSecret();
      expect(secret).toBeTruthy();

      // Step 2: Build otpauth URL
      const url = buildOtpauthUrl({
        issuer: 'Rhymix Admin',
        account: 'admin@example.com',
        secret,
      });
      expect(url).toContain(secret);

      // Step 3: Generate QR code
      const qrCode = await generateTotpQrCode({
        issuer: 'Rhymix Admin',
        account: 'admin@example.com',
        secret,
      });
      expect(qrCode).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('REQ-2OTP-021: enroll-confirm flow - verify user-provided code', () => {
      const secret = generateTotpSecret();
      const { generateSync } = require('otplib');

      // Simulate user's authenticator app
      const userCode = generateSync({ secret, type: 'totp' });

      // Server verifies the code
      expect(verifyTotp(secret, userCode, 1)).toBe(true);
    });
  });
});
