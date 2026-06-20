/**
 * Specification tests for admin.spamfilter tRPC router — SPEC-ADMIN-002 Slice 2E + Slice 3E.
 *
 * SPAM-DENIED-WORD-001: deniedWords.add → 금지어 추가
 * SPAM-DENIED-WORD-002: deniedWords.remove → 금지어 삭제
 * SPAM-DENIED-IP-001: deniedIps.add → 차단 IP 추가
 * SPAM-DENIED-IP-002: deniedIps.remove → 차단 IP 삭제
 * SPAM-RATE-LIMIT-001: rateLimit.update → 속도 제한 규칙 업데이트
 * SPAM-CAPTCHA-001: captcha.get → 캡차 설정 조회
 * SPAM-CAPTCHA-002: captcha.update → 캡차 설정 업데이트
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// NextAuth + DB mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: (session: unknown) =>
    (session as { user?: { isAdmin?: boolean } } | null)?.user?.isAdmin === true,
}));

vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}));

// Prisma mock
const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteSettingUpsert = vi.fn();
const mockSpamDeniedWordFindMany = vi.fn();
const mockSpamDeniedWordFindFirst = vi.fn();
const mockSpamDeniedWordFindUnique = vi.fn();
const mockSpamDeniedWordCreate = vi.fn();
const mockSpamDeniedWordDelete = vi.fn();
const mockSpamDeniedIpFindMany = vi.fn();
const mockSpamDeniedIpFindFirst = vi.fn();
const mockSpamDeniedIpFindUnique = vi.fn();
const mockSpamDeniedIpCreate = vi.fn();
const mockSpamDeniedIpDelete = vi.fn();
const mockSpamRuleFindMany = vi.fn();
const mockSpamRuleFindFirst = vi.fn();
const mockSpamRuleUpsert = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
  },
  spamDeniedWord: {
    findMany: (...args: unknown[]) => mockSpamDeniedWordFindMany(...args),
    findFirst: (...args: unknown[]) => mockSpamDeniedWordFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSpamDeniedWordFindUnique(...args),
    create: (...args: unknown[]) => mockSpamDeniedWordCreate(...args),
    delete: (...args: unknown[]) => mockSpamDeniedWordDelete(...args),
  },
  spamDeniedIp: {
    findMany: (...args: unknown[]) => mockSpamDeniedIpFindMany(...args),
    findFirst: (...args: unknown[]) => mockSpamDeniedIpFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSpamDeniedIpFindUnique(...args),
    create: (...args: unknown[]) => mockSpamDeniedIpCreate(...args),
    delete: (...args: unknown[]) => mockSpamDeniedIpDelete(...args),
  },
  spamRule: {
    findMany: (...args: unknown[]) => mockSpamRuleFindMany(...args),
    findFirst: (...args: unknown[]) => mockSpamRuleFindFirst(...args),
    upsert: (...args: unknown[]) => mockSpamRuleUpsert(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.spamfilter tRPC router (Slice 2E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  // ==========================================================================
  // Denied Words Management (REQ-ADMIN2-121)
  // ==========================================================================

  it('SPAM-DENIED-WORD-001: deniedWords.add → 금지어 추가', async () => {
    mockSpamDeniedWordFindUnique.mockResolvedValue(null);
    mockSpamDeniedWordCreate.mockResolvedValue({
      id: 1,
      siteId: 1,
      word: 'test-spam',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedWords.add({ word: 'test-spam' });

    expect(result).toEqual({
      id: 1,
      siteId: 1,
      word: 'test-spam',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(mockSpamDeniedWordCreate).toHaveBeenCalledWith({
      data: { siteId: 1, word: 'test-spam' },
    });
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });

  it('SPAM-DENIED-WORD-002: deniedWords.remove → 금지어 삭제', async () => {
    mockSpamDeniedWordFindFirst.mockResolvedValue(
      { id: 1, siteId: 1, word: 'to-remove' },
    );
    mockSpamDeniedWordDelete.mockResolvedValue({});

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedWords.remove({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(mockSpamDeniedWordDelete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  // ==========================================================================
  // Denied IPs Management (REQ-ADMIN2-120)
  // ==========================================================================

  it('SPAM-DENIED-IP-001: deniedIps.add → 차단 IP 추가', async () => {
    mockSpamDeniedIpFindUnique.mockResolvedValue(null);
    mockSpamDeniedIpCreate.mockResolvedValue({
      id: 1,
      siteId: 1,
      ipPattern: '192.168.1.100',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedIps.add({ ipPattern: '192.168.1.100' });

    expect(result).toEqual({
      id: 1,
      siteId: 1,
      ipPattern: '192.168.1.100',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(mockSpamDeniedIpCreate).toHaveBeenCalledWith({
      data: { siteId: 1, ipPattern: '192.168.1.100' },
    });
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });

  it('SPAM-DENIED-IP-002: deniedIps.remove → 차단 IP 삭제', async () => {
    mockSpamDeniedIpFindFirst.mockResolvedValue(
      { id: 1, siteId: 1, ipPattern: '10.0.0.1' },
    );
    mockSpamDeniedIpDelete.mockResolvedValue({});

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedIps.remove({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(mockSpamDeniedIpDelete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  // ==========================================================================
  // Rate Limit Management (REQ-ADMIN2-123)
  // ==========================================================================

  it('SPAM-RATE-LIMIT-001: rateLimit.update → 속도 제한 규칙 업데이트', async () => {
    mockSpamRuleUpsert.mockResolvedValue({
      id: 1,
      siteId: 1,
      actionType: 'document.create',
      maxSubmissions: 3,
      windowSeconds: 60,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.rateLimit.update({
      actionType: 'document.create',
      maxSubmissions: 3,
      windowSeconds: 60,
    });

    expect(result).toEqual({
      id: 1,
      siteId: 1,
      actionType: 'document.create',
      maxSubmissions: 3,
      windowSeconds: 60,
      enabled: true,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(mockSpamRuleUpsert).toHaveBeenCalledWith({
      where: { siteId_actionType: { siteId: 1, actionType: 'document.create' } },
      create: {
        siteId: 1,
        actionType: 'document.create',
        maxSubmissions: 3,
        windowSeconds: 60,
        enabled: true,
      },
      update: {
        maxSubmissions: 3,
        windowSeconds: 60,
        enabled: true,
      },
    });
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });

  // ==========================================================================
  // Captcha Settings Management (REQ-ADMIN2-124)
  // ==========================================================================

  it('SPAM-CAPTCHA-001: captcha.get → 캡차 설정 조회', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'captcha',
      value: {
        provider: 'recaptcha',
        triggers: ['document.create', 'comment.create'],
        siteKey: 'test-site-key',
        secret: 'test-secret',
        threshold: 0.5,
      },
      updatedAt: new Date(),
    });

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.captcha.get();

    expect(result).toEqual({
      provider: 'recaptcha',
      triggers: ['document.create', 'comment.create'],
      siteKey: 'test-site-key',
      secret: 'test-secret',
      threshold: 0.5,
    });
  });

  it('SPAM-CAPTCHA-002: captcha.update → 캡차 설정 업데이트', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'captcha',
      value: {
        provider: 'turnstile',
        triggers: ['document.create'],
        siteKey: 'new-site-key',
        secret: 'new-secret',
        threshold: 0.3,
      },
      updatedAt: new Date(),
    });

    const { adminSpamfilterRouter } = await import('./spamfilter');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSpamfilterRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.captcha.update({
      provider: 'turnstile',
      triggers: ['document.create'],
      siteKey: 'new-site-key',
      secret: 'new-secret',
      threshold: 0.3,
    });

    expect(mockSiteSettingUpsert).toHaveBeenCalledWith({
      where: { siteId_key: { siteId: 1, key: 'captcha' } },
      create: {
        siteId: 1,
        key: 'captcha',
        value: {
          provider: 'turnstile',
          triggers: ['document.create'],
          siteKey: 'new-site-key',
          secret: 'new-secret',
          threshold: 0.3,
        },
      },
      update: {
        value: {
          provider: 'turnstile',
          triggers: ['document.create'],
          siteKey: 'new-site-key',
          secret: 'new-secret',
          threshold: 0.3,
        },
      },
    });
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });
});
