/**
 * Specification tests for admin.cache tRPC router — SPEC-ADMIN-001 Slice F.
 *
 * F-2-2: cache.purge({ scope:'all' }) → 4개 prefix 태그 revalidate
 * F-2-3: cache.purge({ scope:'module', id:'X' }) → 'module:X' 만 revalidate
 * F-2-4: cache.purge({ scope:'menu', id:'1' }) → 'menu:1' 만 revalidate
 * F-2-5: 비관리자 purge → FORBIDDEN
 * F-2-6: cache.purge({ scope:'all' }) → { invalidated: ['module','menu','widget','domain'] }
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// CacheAdapter mock
// ---------------------------------------------------------------------------

const mockCacheRevalidate = vi.fn();
vi.mock('@/lib/cache/adapter', () => ({
  cacheAdapter: {
    revalidate: (...args: unknown[]) => mockCacheRevalidate(...args),
  },
}));

// NextAuth + authConfig mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockAdminLogCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
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

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.cache tRPC router (Slice F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: 1 });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('F-2-2: purge({ scope:\'all\' }) → 4개 prefix 태그 revalidate (REQ-ADMIN-062)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'all' });

    // module, menu, widget, domain 4개 prefix 호출 확인
    expect(mockCacheRevalidate).toHaveBeenCalledTimes(4);
    expect(mockCacheRevalidate).toHaveBeenCalledWith('module');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('menu');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('widget');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('domain');
  });

  it('F-2-3: purge({ scope:\'module\', id:\'X\' }) → \'module:X\' 만 revalidate (REQ-ADMIN-061)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'module', id: 'X' });

    expect(mockCacheRevalidate).toHaveBeenCalledOnce();
    expect(mockCacheRevalidate).toHaveBeenCalledWith('module:X');
  });

  it('F-2-4: purge({ scope:\'menu\', id:\'1\' }) → \'menu:1\' 만 revalidate (REQ-ADMIN-061)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'menu', id: '1' });

    expect(mockCacheRevalidate).toHaveBeenCalledOnce();
    expect(mockCacheRevalidate).toHaveBeenCalledWith('menu:1');
  });

  it('F-2-5: 비관리자 purge → TRPCError FORBIDDEN (REQ-ADMIN-021)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.purge({ scope: 'all' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('F-2-6: purge({ scope:\'all\' }) → { invalidated: [\'module\',\'menu\',\'widget\',\'domain\'] } (REQ-ADMIN-063)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.purge({ scope: 'all' });

    expect(result.invalidated).toEqual(['module', 'menu', 'widget', 'domain']);
  });
});
