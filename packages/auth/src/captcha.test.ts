/**
 * CAPTCHA verification tests — SPEC-CAPTCHA-001 REQ-CAPTCHA-003
 *
 * Tests for Turnstile verification:
 * - verifyTurnstileToken: official test keys로 검증 성공/실패 시나리오
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyTurnstileToken, TURNSTILE_TEST_KEYS } from './captcha';

describe('captcha verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyTurnstileToken', () => {
    it('should verify valid token with official test keys', async () => {
      // Turnstile official test keys는 항상 성공 응답을 반환
      const result = await verifyTurnstileToken({
        token: 'valid-test-token',
        secretKey: TURNSTILE_TEST_KEYS.SECRET_KEY,
        remoteIp: '127.0.0.1',
      });

      expect(result.success).toBe(true);
      expect(result['error-codes']).toEqual([]);
      expect(result.challenge_ts).toBeDefined();
      expect(result.hostname).toBeDefined();
    });

    it('should verify token without remoteIp', async () => {
      const result = await verifyTurnstileToken({
        token: 'valid-test-token',
        secretKey: TURNSTILE_TEST_KEYS.SECRET_KEY,
      });

      expect(result.success).toBe(true);
    });

    it('should throw error on network failure', async () => {
      // fetch를 모킹하여 네트워크 오류 시뮬레이션
      global.fetch = vi.fn(async () => {
        throw new Error('Network error');
      }) as any;

      await expect(
        verifyTurnstileToken({
          token: 'any-token',
          secretKey: TURNSTILE_TEST_KEYS.SECRET_KEY,
        }),
      ).rejects.toThrow('Network error');

      vi.restoreAllMocks();
    });

    it('should throw error on non-200 response', async () => {
      // fetch를 모킹하여 500 에러 시뮬레이션
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })) as any;

      await expect(
        verifyTurnstileToken({
          token: 'any-token',
          secretKey: TURNSTILE_TEST_KEYS.SECRET_KEY,
        }),
      ).rejects.toThrow('Turnstile verification failed: 500 Internal Server Error');

      vi.restoreAllMocks();
    });

    it('should return success=false for invalid token', async () => {
      // 실제 Turnstile API는 invalid token에 대해 success:false 반환
      // 테스트 키로는 항상 success:true이므로 fetch 직접 모킹
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      })) as any;

      const result = await verifyTurnstileToken({
        token: 'invalid-token',
        secretKey: TURNSTILE_TEST_KEYS.SECRET_KEY,
      });

      expect(result.success).toBe(false);
      expect(result['error-codes']).toEqual(['invalid-input-response']);

      vi.restoreAllMocks();
    });
  });

  describe('TURNSTILE_TEST_KEYS', () => {
    it('should have official test keys', () => {
      expect(TURNSTILE_TEST_KEYS.SITE_KEY).toBe('1x00000000000000000000AA');
      expect(TURNSTILE_TEST_KEYS.SECRET_KEY).toBe('1x0000000000000000000000000000000AA');
    });
  });
});
