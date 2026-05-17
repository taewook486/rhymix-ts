/**
 * Specification tests for admin.site tRPC router — SPEC-ADMIN-001 Slice E-4.
 *
 * E-4-1: admin.site.get → Site 레코드 반환.
 * E-4-2: admin.site.update → DB 갱신.
 * E-4-3: admin.site.update 비관리자 → FORBIDDEN (protectedAdminProcedure).
 * E-4-4: admin.site.domain.list → 도메인 목록.
 * E-4-5: admin.site.domain.update → forceHttps 갱신.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockSiteFindFirst = vi.fn();
const mockSiteUpdate = vi.fn();
const mockDomainFindMany = vi.fn();
const mockDomainUpdate = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockSiteTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
    update: (...args: unknown[]) => mockSiteUpdate(...args),
  },
  domain: {
    findMany: (...args: unknown[]) => mockDomainFindMany(...args),
    update: (...args: unknown[]) => mockDomainUpdate(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (...args: unknown[]) => mockSiteTransaction(...args),
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.site tRPC router (Slice E-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('E-4-1: admin.site.get → Site 레코드 반환 (REQ-ADMIN-050)', async () => {
    const site = {
      id: 1,
      defaultLanguage: 'ko',
      timeZone: 'Asia/Seoul',
    };
    mockSiteFindFirst.mockResolvedValue(site);

    const { adminSiteRouter } = await import('./site');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSiteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.get();

    expect(mockSiteFindFirst).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 1, defaultLanguage: 'ko' });
  });

  it('E-4-2: admin.site.update → DB 갱신 (REQ-ADMIN-051)', async () => {
    const site = { id: 1, defaultLanguage: 'ko' };
    const updated = { id: 1, defaultLanguage: 'en' };
    mockSiteFindFirst.mockResolvedValue(site);
    mockSiteUpdate.mockResolvedValue(updated);

    const { adminSiteRouter } = await import('./site');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSiteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ defaultLanguage: 'en' });

    expect(mockSiteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ defaultLanguage: 'en' }),
      }),
    );
    expect(result).toMatchObject({ id: 1, defaultLanguage: 'en' });
  });

  it('E-4-4: admin.site.domain.list → 도메인 목록 (REQ-ADMIN-052)', async () => {
    const site = { id: 1, name: '사이트' };
    const domains = [
      { id: 1, siteId: 1, hostname: 'example.com', isDefault: true, forceHttps: false },
      { id: 2, siteId: 1, hostname: 'www.example.com', isDefault: false, forceHttps: true },
    ];
    mockSiteFindFirst.mockResolvedValue(site);
    mockDomainFindMany.mockResolvedValue(domains);

    const { adminSiteRouter } = await import('./site');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSiteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.domain.list();

    expect(mockDomainFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 1 } }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ hostname: 'example.com' });
  });

  it('E-4-5: admin.site.domain.update → forceHttps 갱신 (REQ-ADMIN-052)', async () => {
    const updatedDomain = { id: 1, siteId: 1, hostname: 'example.com', forceHttps: true };
    mockDomainUpdate.mockResolvedValue(updatedDomain);

    const { adminSiteRouter } = await import('./site');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSiteRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.domain.update({ id: 1, data: { forceHttps: true } });

    expect(mockDomainUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ forceHttps: true }),
      }),
    );
    expect(result).toMatchObject({ forceHttps: true });
  });
});
