/**
 * spamfilter domain tests — TDD RED phase.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-120~123
 */
import { describe, it, expect, vi } from 'vitest';
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

  describe('checkRateLimit (DB-backed sliding window)', () => {
    /**
     * In-memory fake of the content_rate_limits ledger so unit tests exercise the
     * real DB-backed code path without a live database (plain vi.fn delegate object).
     */
    function createLedgerPrisma() {
      const rows: { identifier: string; endpoint: string; createdAt: Date }[] = [];
      const contentRateLimit = {
        count: vi.fn(async ({ where }: any) => {
          return rows.filter(
            (r) =>
              r.identifier === where.identifier &&
              r.endpoint === where.endpoint &&
              r.createdAt > where.createdAt.gt,
          ).length;
        }),
        create: vi.fn(async ({ data }: any) => {
          rows.push({
            identifier: data.identifier,
            endpoint: data.endpoint,
            createdAt: new Date(),
          });
          return data;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          const matching = rows
            .filter(
              (r) =>
                r.identifier === where.identifier &&
                r.endpoint === where.endpoint &&
                r.createdAt > where.createdAt.gt,
            )
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          return matching[0] ?? null;
        }),
      };
      return { contentRateLimit };
    }

    it('should allow submission within rate limit and record each attempt', async () => {
      const config: RateLimitConfig = {
        maxSubmissions: 5,
        windowSeconds: 60,
      };
      const userId = 1;
      const action = 'document.create';
      const prisma = createLedgerPrisma();

      // 5회 허용
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(userId, action, config, {
          prisma: prisma as any,
        });
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeNull();
      }

      // 각 허용 시 ledger row 1개씩 기록되었다.
      expect(prisma.contentRateLimit.create).toHaveBeenCalledTimes(5);
    });

    it('should reject submission exceeding rate limit', async () => {
      const config: RateLimitConfig = {
        maxSubmissions: 3,
        windowSeconds: 60,
      };
      const userId = 1;
      const action = 'document.create';
      const prisma = createLedgerPrisma();

      // 3회 허용
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(userId, action, config, { prisma: prisma as any });
      }

      // 4번째는 차단 — 새 row 를 기록하지 않는다.
      const result = await checkRateLimit(userId, action, config, {
        prisma: prisma as any,
      });
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(prisma.contentRateLimit.create).toHaveBeenCalledTimes(3);
    });

    it('should isolate counts per user (multi-instance safe via shared DB)', async () => {
      const config: RateLimitConfig = { maxSubmissions: 1, windowSeconds: 60 };
      const action = 'comment.create';
      const prisma = createLedgerPrisma();

      const a = await checkRateLimit(1, action, config, { prisma: prisma as any });
      const b = await checkRateLimit(2, action, config, { prisma: prisma as any });
      // Different users do not share the same counter.
      expect(a.allowed).toBe(true);
      expect(b.allowed).toBe(true);

      // The same user is now over the limit.
      const aAgain = await checkRateLimit(1, action, config, { prisma: prisma as any });
      expect(aAgain.allowed).toBe(false);
    });
  });
});
