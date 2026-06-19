/**
 * spamfilter guard tests — TDD RED phase.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-122
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkSpamGuard, SpamGuardError } from './guard';

describe('spamfilter guard', () => {
  const mockPrisma = {
    site: { findFirst: vi.fn() },
    spamDeniedWord: { findMany: vi.fn() },
    spamDeniedIp: { findMany: vi.fn() },
    spamRule: { findFirst: vi.fn() },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.site.findFirst.mockResolvedValue({ id: 1 });
  });

  it('should pass when no spam rules exist', async () => {
    mockPrisma.spamDeniedWord.findMany.mockResolvedValue([]);
    mockPrisma.spamDeniedIp.findMany.mockResolvedValue([]);
    mockPrisma.spamRule.findFirst.mockResolvedValue(null);

    await expect(
      checkSpamGuard('normal content', '127.0.0.1', 1, 'document.create', mockPrisma),
    ).resolves.toBeUndefined();
  });

  it('should block when content contains denied word', async () => {
    mockPrisma.spamDeniedWord.findMany.mockResolvedValue([
      { word: 'viagra' },
    ]);
    mockPrisma.spamDeniedIp.findMany.mockResolvedValue([]);
    mockPrisma.spamRule.findFirst.mockResolvedValue(null);

    await expect(
      checkSpamGuard('Buy viagra now', '127.0.0.1', 1, 'document.create', mockPrisma),
    ).rejects.toThrow(SpamGuardError);
  });

  it('should block when IP is denied', async () => {
    mockPrisma.spamDeniedWord.findMany.mockResolvedValue([]);
    mockPrisma.spamDeniedIp.findMany.mockResolvedValue([
      { ipPattern: '192.168.1.0/24' },
    ]);
    mockPrisma.spamRule.findFirst.mockResolvedValue(null);

    await expect(
      checkSpamGuard('normal content', '192.168.1.100', 1, 'document.create', mockPrisma),
    ).rejects.toThrow(SpamGuardError);
  });

  it('should block when rate limit exceeded', async () => {
    mockPrisma.spamDeniedWord.findMany.mockResolvedValue([]);
    mockPrisma.spamDeniedIp.findMany.mockResolvedValue([]);
    mockPrisma.spamRule.findFirst.mockResolvedValue({
      enabled: true,
      maxSubmissions: 3,
      windowSeconds: 60,
    });

    // 3회 허용
    for (let i = 0; i < 3; i++) {
      await checkSpamGuard('normal content', '127.0.0.1', 1, 'document.create', mockPrisma);
    }

    // 4번째는 차단
    await expect(
      checkSpamGuard('normal content', '127.0.0.1', 1, 'document.create', mockPrisma),
    ).rejects.toThrow(SpamGuardError);
  });
});
