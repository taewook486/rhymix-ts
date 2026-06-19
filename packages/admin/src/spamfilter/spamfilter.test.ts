/**
 * spamfilter domain tests — TDD RED phase.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-120~123
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkSpamViolation,
  checkRateLimit,
  type SpamFilterResult,
  type RateLimitConfig,
} from './spamfilter';

describe('spamfilter domain', () => {
  describe('checkSpamViolation', () => {
    it('should detect denied word in content', async () => {
      const deniedWords = ['스팸', '광고', '바이아그라'];
      const content = '이것은 스팸 광고입니다.';
      const result = await checkSpamViolation(content, deniedWords);
      expect(result.isSpam).toBe(true);
      expect(result.matchedWord).toBe('스팸');
    });

    it('should pass when content contains no denied words', async () => {
      const deniedWords = ['스팸', '광고'];
      const content = '정상적인 게시물입니다.';
      const result = await checkSpamViolation(content, deniedWords);
      expect(result.isSpam).toBe(false);
      expect(result.matchedWord).toBeNull();
    });

    it('should detect denied word case-insensitively', async () => {
      const deniedWords = ['viagra'];
      const content = 'Buy VIAGRA now'; // 대문자
      const result = await checkSpamViolation(content, deniedWords);
      expect(result.isSpam).toBe(true);
      expect(result.matchedWord).toBe('viagra');
    });

    it('should detect denied word with partial match', async () => {
      const deniedWords = ['casino'];
      const content = 'Visit bestcasino.com today';
      const result = await checkSpamViolation(content, deniedWords);
      expect(result.isSpam).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow submission within rate limit', async () => {
      const config: RateLimitConfig = {
        maxSubmissions: 5,
        windowSeconds: 60,
      };
      const userId = 1;
      const action = 'document.create';

      // 5회 허용
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(userId, action, config, {
          prisma: {} as any,
        });
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeNull();
      }
    });

    it('should reject submission exceeding rate limit', async () => {
      const config: RateLimitConfig = {
        maxSubmissions: 3,
        windowSeconds: 60,
      };
      const userId = 1;
      const action = 'document.create';

      // 3회 허용
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(userId, action, config, { prisma: {} as any });
      }

      // 4번째는 차단
      const result = await checkRateLimit(userId, action, config, {
        prisma: {} as any,
      });
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });
});
