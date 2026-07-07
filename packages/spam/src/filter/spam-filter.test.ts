/**
 * SPEC-SPAM-001: 스팸 필터 서비스 테스트
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-001~007
 * @MX:TEST: [TDD] 스팸 필터 핵심 기능 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpamFilter } from './spam-filter';
import { SpamCheckResult } from '../types';
import type { SpamFilterConfig, SpamCheckInput } from '../types';

// Mock Prisma Client
const mockPrisma = {
  spamDeniedWord: {
    findMany: vi.fn(),
  },
  spamUrlBlacklist: {
    findMany: vi.fn(),
  },
  document: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  comment: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  spamReviewQueue: {
    create: vi.fn(),
  },
  documentReport: {
    count: vi.fn(),
  },
  commentReport: {
    count: vi.fn(),
  },
  siteSetting: {
    findUnique: vi.fn(),
  },
};

describe('SpamFilter', () => {
  let spamFilter: SpamFilter;
  let defaultConfig: SpamFilterConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    spamFilter = new SpamFilter(mockPrisma as any);
    defaultConfig = {
      forbiddenWordsEnabled: true,
      urlBlacklistEnabled: true,
      duplicateContentEnabled: true,
      duplicateContentWindowMinutes: 1,
      reportThresholdDocument: 5,
      reportThresholdComment: 5,
      akismetEnabled: false,
      actionOnSpam: 'queue',
    };
  });

  describe('checkForbiddenWords (REQ-SPAM-001)', () => {
    it('should detect forbidden word in content', async () => {
      const mockWords = [{ word: 'spam' }];
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue(mockWords);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'This is spam content',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.FORBIDDEN_WORD);
      expect(result.reason).toBe('금지된 단어가 포함되어 있습니다');
      expect(result.metadata?.matchedWord).toBe('spam');
    });

    it('should detect forbidden word in title', async () => {
      const mockWords = [{ word: 'casino' }];
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue(mockWords);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Normal content',
        title: 'Best casino offers',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.FORBIDDEN_WORD);
      expect(result.metadata?.matchedWord).toBe('casino');
    });

    it('should be case-insensitive', async () => {
      const mockWords = [{ word: 'VIAGRA' }];
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue(mockWords);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'buy viagra now',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
    });

    it('should pass when no forbidden words found', async () => {
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue([]);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'This is clean content',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(false);
      expect(result.result).toBe(SpamCheckResult.CLEAN);
    });

    it('should skip forbidden word check when disabled', async () => {
      const config = { ...defaultConfig, forbiddenWordsEnabled: false };

      const input: SpamCheckInput = {
        type: 'document',
        content: 'This is spam content',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, config);

      expect(result.isSpam).toBe(false);
      expect(mockPrisma.spamDeniedWord.findMany).not.toHaveBeenCalled();
    });
  });

  describe('checkBlacklistUrls (REQ-SPAM-002)', () => {
    it('should detect blacklisted URL domain', async () => {
      const mockBlacklist = [{ domain: 'spam.com', isRegex: false }];
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue(mockBlacklist);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Visit http://spam.com for offers',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.BLACKLIST_URL);
      expect(result.metadata?.matchedDomain).toBe('spam.com');
    });

    it('should detect blacklisted subdomain', async () => {
      const mockBlacklist = [{ domain: 'spam.com', isRegex: false }];
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue(mockBlacklist);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Visit http://www.spam.com for offers',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.BLACKLIST_URL);
    });

    it('should support regex pattern matching', async () => {
      const mockBlacklist = [{ domain: '.*\\.bad\\.com', isRegex: true }];
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue(mockBlacklist);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Visit http://any.bad.com for offers',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.BLACKLIST_URL);
    });

    it('should pass when no blacklisted URLs found', async () => {
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue([]);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Visit https://example.com',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(false);
      expect(result.result).toBe(SpamCheckResult.CLEAN);
    });

    it('should handle URLs without http prefix', async () => {
      const mockBlacklist = [{ domain: 'spam.com', isRegex: false }];
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue(mockBlacklist);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Visit spam.com for offers',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
    });
  });

  describe('checkDuplicateContent (REQ-SPAM-004)', () => {
    it('should detect duplicate content within time window', async () => {
      const existingDoc = {
        id: 1,
        content: 'Same content here',
        regdate: new Date(),
      };
      (mockPrisma.document.findFirst as any).mockResolvedValue(existingDoc);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Same content here',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.DUPLICATE_CONTENT);
      expect(result.reason).toBe('동일한 내용을 연속으로 게시할 수 없습니다');
    });

    it('should normalize content for comparison', async () => {
      const existingDoc = {
        id: 1,
        content: 'Same   content   here',
        regdate: new Date(),
      };
      (mockPrisma.document.findFirst as any).mockResolvedValue(existingDoc);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Same content here', // Different whitespace
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true); // Should match after normalization
    });

    it('should be case-insensitive for duplicate detection', async () => {
      const existingDoc = {
        id: 1,
        content: 'Same content here',
        regdate: new Date(),
      };
      (mockPrisma.document.findFirst as any).mockResolvedValue(existingDoc);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'SAME CONTENT HERE', // Different case
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
    });

    it('should pass when content is outside time window', async () => {
      // 실제 Prisma는 regdate: { gte: windowStart } where 절로 필터링하므로
      // 윈도우 밖의 레코드는 findFirst 결과에 애초에 포함되지 않는다.
      (mockPrisma.document.findFirst as any).mockResolvedValue(null);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Same content here',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(false); // Outside 1-minute window
    });

    it('should detect duplicate comments', async () => {
      const existingComment = {
        id: 1,
        content: 'Same comment',
        regdate: new Date(),
      };
      (mockPrisma.comment.findFirst as any).mockResolvedValue(existingComment);

      const input: SpamCheckInput = {
        type: 'comment',
        content: 'Same comment',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.DUPLICATE_CONTENT);
    });

    it('should skip duplicate check when disabled', async () => {
      const config = { ...defaultConfig, duplicateContentEnabled: false };

      const input: SpamCheckInput = {
        type: 'document',
        content: 'Same content here',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, config);

      expect(result.isSpam).toBe(false);
      expect(mockPrisma.document.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('checkReportThreshold (REQ-SPAM-003)', () => {
    it('should detect when report count exceeds threshold', async () => {
      (mockPrisma.documentReport.count as any).mockResolvedValue(6);

      const result = await spamFilter.checkReportThreshold('document', 1, 5);

      expect(result).toBe(true);
    });

    it('should pass when report count is below threshold', async () => {
      (mockPrisma.documentReport.count as any).mockResolvedValue(3);

      const result = await spamFilter.checkReportThreshold('document', 1, 5);

      expect(result).toBe(false);
    });

    it('should check comment reports', async () => {
      (mockPrisma.commentReport.count as any).mockResolvedValue(6);

      const result = await spamFilter.checkReportThreshold('comment', 1, 5);

      expect(result).toBe(true);
    });

    it('should handle exactly at threshold', async () => {
      (mockPrisma.documentReport.count as any).mockResolvedValue(5);

      const result = await spamFilter.checkReportThreshold('document', 1, 5);

      expect(result).toBe(false); // Not exceeded, equal to threshold
    });
  });

  describe('addToReviewQueue (REQ-SPAM-005)', () => {
    it('should add item to review queue', async () => {
      (mockPrisma.spamReviewQueue.create as any).mockResolvedValue({ id: 1 });

      await spamFilter.addToReviewQueue(
        1,
        'document',
        1,
        SpamCheckResult.FORBIDDEN_WORD,
        { matchedWord: 'spam' },
      );

      expect(mockPrisma.spamReviewQueue.create).toHaveBeenCalledWith({
        data: {
          siteId: 1,
          type: 'document',
          contentId: 1,
          reason: SpamCheckResult.FORBIDDEN_WORD,
          status: 'pending',
          metadata: { matchedWord: 'spam' },
        },
      });
    });

    it('should handle different types', async () => {
      (mockPrisma.spamReviewQueue.create as any).mockResolvedValue({ id: 1 });

      await spamFilter.addToReviewQueue(
        1,
        'comment',
        1,
        SpamCheckResult.BLACKLIST_URL,
        { matchedDomain: 'spam.com' },
      );

      expect(mockPrisma.spamReviewQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'comment',
          reason: SpamCheckResult.BLACKLIST_URL,
        }),
      });
    });
  });

  describe('Integration: Full spam check', () => {
    it('should pass all checks when content is clean', async () => {
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue([]);
      (mockPrisma.spamUrlBlacklist.findMany as any).mockResolvedValue([]);
      (mockPrisma.document.findFirst as any).mockResolvedValue(null);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'This is clean content with no issues',
        title: 'Clean Title',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(false);
      expect(result.result).toBe(SpamCheckResult.CLEAN);
    });

    it('should stop at first failed check', async () => {
      const mockWords = [{ word: 'spam' }];
      (mockPrisma.spamDeniedWord.findMany as any).mockResolvedValue(mockWords);

      const input: SpamCheckInput = {
        type: 'document',
        content: 'spam content with http://spam.com url',
        authorId: 1,
        authorIp: '127.0.0.1',
        siteId: 1,
      };

      const result = await spamFilter.check(input, defaultConfig);

      expect(result.isSpam).toBe(true);
      expect(result.result).toBe(SpamCheckResult.FORBIDDEN_WORD);
      expect(mockPrisma.spamUrlBlacklist.findMany).not.toHaveBeenCalled(); // Should not check URLs
    });
  });
});
