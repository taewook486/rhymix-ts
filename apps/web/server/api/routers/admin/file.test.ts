/**
 * Specification tests for admin.file tRPC router — SPEC-CONTENT-PARITY-001 M4.
 *
 * FILE-LIST-001: list → search/fileType/sortBy/sortOrder 파라미터를 listFiles로 전달한다 (REQ-CPAR-021~022)
 * FILE-BULK-001: bulkDelete → bulkDeleteFiles로 위임한다 (REQ-CPAR-023)
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

vi.mock('@rhymix-ts/file', () => ({
  listFiles: vi.fn(),
  listOrphans: vi.fn(),
  purgeOrphans: vi.fn(),
  bulkDeleteFiles: vi.fn(),
  InMemoryStorage: class {},
}));

vi.mock('@rhymix-ts/admin', () => ({
  getFileUploadSettings: vi.fn(),
  updateFileUploadSettings: vi.fn(),
  getFileDownloadSettings: vi.fn(),
  updateFileDownloadSettings: vi.fn(),
  getFileOtherSettings: vi.fn(),
  updateFileOtherSettings: vi.fn(),
}));

const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

const mockStorage = {};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  storage: mockStorage,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.file tRPC router (SPEC-CONTENT-PARITY-001 M4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA disabled
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('FILE-LIST-001: list → search/fileType/sortBy/sortOrder를 listFiles로 전달한다 (REQ-CPAR-021~022)', async () => {
    const { adminFileRouter } = await import('./file');
    const { createCallerFactory } = await import('../../trpc');
    const { listFiles } = await import('@rhymix-ts/file');
    (listFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: null,
      totalCount: 0,
    });

    const createCaller = createCallerFactory(adminFileRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.list({
      limit: 20,
      search: 'photo',
      fileType: 'image',
      sortBy: 'size',
      sortOrder: 'asc',
    });

    expect(listFiles).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'size', sortOrder: 'asc' }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
  });

  it('FILE-BULK-001: bulkDelete → bulkDeleteFiles로 위임한다 (REQ-CPAR-023)', async () => {
    const { adminFileRouter } = await import('./file');
    const { createCallerFactory } = await import('../../trpc');
    const { bulkDeleteFiles } = await import('@rhymix-ts/file');
    (bulkDeleteFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: 2,
      failed: 0,
      failedIds: [],
      adminLogIds: [BigInt(1), BigInt(2)],
    });

    const createCaller = createCallerFactory(adminFileRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.bulkDelete({ fileIds: [1, 2] });

    expect(result.success).toBe(2);
    expect(bulkDeleteFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        fileIds: [1, 2],
        actor: expect.objectContaining({ userId: 1, isAdmin: true }),
      }),
      expect.objectContaining({ prisma: mockPrisma, storage: mockStorage }),
    );
  });
});
