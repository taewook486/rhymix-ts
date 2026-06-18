/**
 * Specification tests for admin.document tRPC router — SPEC-ADMIN-002 Slice 2C.
 *
 * DOCUMENT-CONFIG-001: getConfig → returns defaults when SiteSetting rows do not exist.
 * DOCUMENT-CONFIG-002: getConfig → returns stored values when rows exist.
 * DOCUMENT-CONFIG-003: updateConfig → persists all 3 keys via siteSetting.upsert inside transaction.
 * DOCUMENT-CONFIG-004: updateConfig → writes AdminLog entries.
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

// Prisma mock
const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteSettingUpsert = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (callback: (tx: any) => Promise<any>) => {
    const tx = {
      site: {
        findFirst: mockSiteFindFirst,
      },
      siteSetting: {
        findFirst: mockSiteSettingFindFirst,
        findUnique: mockSiteSettingFindUnique,
        upsert: mockSiteSettingUpsert,
      },
      adminLog: {
        create: mockAdminLogCreate,
      },
    };
    return callback(tx);
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.document tRPC router (Slice 2C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA disabled
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  // ==========================================================================
  // Document Configuration (REQ-ADMIN2-074)
  // ==========================================================================

  it('DOCUMENT-CONFIG-001: getConfig → returns defaults when SiteSetting rows do not exist', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDocumentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getConfig();

    expect(result).toEqual({
      sortOrder: 'latest',
      pageSize: 20,
      allowGuestWrite: false,
    });
  });

  it('DOCUMENT-CONFIG-002: getConfig → returns stored values when rows exist', async () => {
    mockSiteSettingFindUnique
      .mockResolvedValueOnce({ value: 'popular' }) // sortOrder
      .mockResolvedValueOnce({ value: 50 }) // pageSize
      .mockResolvedValueOnce({ value: true }); // allowGuestWrite

    const { adminDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDocumentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getConfig();

    expect(result).toEqual({
      sortOrder: 'popular',
      pageSize: 50,
      allowGuestWrite: true,
    });
  });

  it('DOCUMENT-CONFIG-003: updateConfig → persists all 3 keys via siteSetting.upsert inside transaction', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDocumentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.updateConfig({
      sortOrder: 'comment_count',
      pageSize: 30,
      allowGuestWrite: true,
    });

    expect(mockSiteSettingUpsert).toHaveBeenCalledTimes(3);
    expect(mockSiteSettingUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        siteId_key: { siteId: 1, key: 'document.config.sortOrder' },
      },
      create: {
        siteId: 1,
        key: 'document.config.sortOrder',
        value: 'comment_count',
      },
      update: { value: 'comment_count' },
    });
    expect(mockSiteSettingUpsert).toHaveBeenNthCalledWith(2, {
      where: {
        siteId_key: { siteId: 1, key: 'document.config.pageSize' },
      },
      create: {
        siteId: 1,
        key: 'document.config.pageSize',
        value: 30,
      },
      update: { value: 30 },
    });
    expect(mockSiteSettingUpsert).toHaveBeenNthCalledWith(3, {
      where: {
        siteId_key: { siteId: 1, key: 'document.config.allowGuestWrite' },
      },
      create: {
        siteId: 1,
        key: 'document.config.allowGuestWrite',
        value: true,
      },
      update: { value: true },
    });
  });

  it('DOCUMENT-CONFIG-004: updateConfig → writes AdminLog entries', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });

    const { adminDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDocumentRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.updateConfig({
      sortOrder: 'latest',
      pageSize: 20,
      allowGuestWrite: false,
    });

    // Each of the 3 keys creates 1 AdminLog entry (possibly plus initial log calls)
    expect(mockAdminLogCreate.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockAdminLogCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        actorId: 1,
        action: 'configure',
        target: 'site_setting:document.config.sortOrder',
        diff: expect.objectContaining({
          before: null,
          after: 'latest',
        }),
      }),
    });
  });
});
