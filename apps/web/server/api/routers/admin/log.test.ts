/**
 * Specification tests for admin.log tRPC router — SPEC-ADMIN-001 Slice D.
 *
 * D-11: log.list({}) → adminLog.findMany + adminLog.count 둘 다 where:{} 로 호출됨.
 *       반환 형태 { total, items, page, pageSize } 검증.
 * D-12: log.list({ action, from, to, page, pageSize }) → where/skip/take 검증.
 *       (REQ-ADMIN-072 필터 + 페이지네이션)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

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

const mockAdminLogFindMany = vi.fn();
const mockAdminLogCount = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  adminLog: {
    findMany: (...args: unknown[]) => mockAdminLogFindMany(...args),
    count: (...args: unknown[]) => mockAdminLogCount(...args),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.log tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('D-11: log.list({}) → adminLog.findMany + count 를 where:{} 로 호출, { total, items, page, pageSize } 반환 (REQ-ADMIN-072)', async () => {
    const items = [
      { id: BigInt(1), actorId: 1, action: 'admin.module.create', target: '', diff: {}, ip: null, userAgent: null, createdAt: new Date() },
    ];
    mockAdminLogFindMany.mockResolvedValueOnce(items);
    mockAdminLogCount.mockResolvedValueOnce(1);

    const { adminLogRouter } = await import('./log');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLogRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list({});

    // findMany 와 count 둘 다 호출됨
    expect(mockAdminLogFindMany).toHaveBeenCalledOnce();
    expect(mockAdminLogCount).toHaveBeenCalledOnce();

    // 기본 페이지네이션: skip=0, take=50
    expect(mockAdminLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
    );

    // 반환 형태 검증
    expect(result).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 50,
    });
    expect(result.items).toHaveLength(1);
  });

  it('D-12: log.list({ action, from, to, page, pageSize }) → where/skip/take 올바르게 구성됨 (REQ-ADMIN-072 필터 + 페이지네이션)', async () => {
    mockAdminLogFindMany.mockResolvedValueOnce([]);
    mockAdminLogCount.mockResolvedValueOnce(0);

    const { adminLogRouter } = await import('./log');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLogRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const fromDate = new Date('2026-01-01');
    const toDate = new Date('2026-12-31');

    const result = await caller.list({
      action: 'admin.module.create',
      from: fromDate,
      to: toDate,
      page: 2,
      pageSize: 100,
    });

    // where 에 action contains 와 createdAt gte/lte 포함
    expect(mockAdminLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: expect.objectContaining({ contains: 'admin.module.create' }),
          createdAt: expect.objectContaining({
            gte: fromDate,
            lte: toDate,
          }),
        }),
        skip: 100,  // (page-1) * pageSize = 1 * 100
        take: 100,
      }),
    );

    expect(result).toMatchObject({
      total: 0,
      page: 2,
      pageSize: 100,
    });
  });
});
