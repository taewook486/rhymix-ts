/**
 * Specification tests for admin.board tRPC router — SPEC-CONTENT-001 Slice B (T-009).
 *
 * B-601: admin 세션 + board.list → prisma.board.findMany 호출, 결과 반환.
 * B-602: 비관리자 세션 + board.list → FORBIDDEN.
 * B-603: admin 세션 + board.get → prisma.board.findUnique({ where: { id }, include: { moduleInstance: true } }).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// NextAuth + DB mock (trpc.ts 가 의존)
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
const mockBoardFindMany = vi.fn();
const mockBoardFindUnique = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  board: {
    findMany: (...args: unknown[]) => mockBoardFindMany(...args),
    findUnique: (...args: unknown[]) => mockBoardFindUnique(...args),
  },
};

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

describe('admin.board tRPC router (Slice B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('B-601: admin 세션 + board.list → prisma.board.findMany 결과 반환 (moduleInstance include)', async () => {
    const rows = [
      { id: 1, moduleInstanceId: 10, name: '공지', moduleInstance: { id: 10, mid: 'notice' } },
    ];
    mockBoardFindMany.mockResolvedValueOnce(rows);

    const { adminBoardRouter } = await import('./board');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminBoardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list();

    expect(mockBoardFindMany).toHaveBeenCalledOnce();
    const callArg = mockBoardFindMany.mock.calls[0]?.[0] as { include: unknown };
    expect(callArg?.include).toMatchObject({ moduleInstance: true });
    expect(result).toEqual(rows);
  });

  it('B-602: 비관리자 세션 + board.list → FORBIDDEN', async () => {
    const { adminBoardRouter } = await import('./board');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminBoardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('B-603: admin 세션 + board.get → prisma.board.findUnique 호출 + moduleInstance include', async () => {
    const board = { id: 7, name: 'free', moduleInstance: { id: 3, mid: 'free' } };
    mockBoardFindUnique.mockResolvedValueOnce(board);

    const { adminBoardRouter } = await import('./board');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminBoardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.get({ id: 7 });

    expect(mockBoardFindUnique).toHaveBeenCalledOnce();
    const callArg = mockBoardFindUnique.mock.calls[0]?.[0] as {
      where: { id: number };
      include: { moduleInstance: boolean };
    };
    expect(callArg.where).toMatchObject({ id: 7 });
    expect(callArg.include).toMatchObject({ moduleInstance: true });
    expect(result).toEqual(board);
  });
});
