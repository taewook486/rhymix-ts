/**
 * Specification tests for admin.module tRPC router — SPEC-ADMIN-001 Slice B.
 *
 * B-7:  admin 세션 + module.create → createModuleInstance 호출, 결과 반환.
 * B-8:  비관리자 세션 + module.create → FORBIDDEN.
 * B-9:  admin 세션 + module.create 내부에서 MidConflictError → CONFLICT.
 * B-10: admin 세션 + module.list → prisma.moduleInstance.findMany 결과 반환.
 * B-11: admin 세션 + module.delete 내부에서 IndexModuleProtectedError → CONFLICT.
 * B-12: admin 세션 + module.delete 정상 → { ok: true, deletedId }.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

// ---------------------------------------------------------------------------
// Service mock
// ---------------------------------------------------------------------------

const mockCreateModuleInstance = vi.fn();
const mockDeleteModuleInstance = vi.fn();
const mockGetModuleInstanceByMid = vi.fn();

vi.mock('@rhymix-ts/core/modules', () => ({
  createModuleInstance: (...args: unknown[]) => mockCreateModuleInstance(...args),
  deleteModuleInstance: (...args: unknown[]) => mockDeleteModuleInstance(...args),
  getModuleInstanceByMid: (...args: unknown[]) => mockGetModuleInstanceByMid(...args),
  MidConflictError: class MidConflictError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'mid conflict');
      this.name = 'MidConflictError';
    }
  },
  MidReservedError: class MidReservedError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'mid reserved');
      this.name = 'MidReservedError';
    }
  },
  MidInvalidError: class MidInvalidError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'mid invalid');
      this.name = 'MidInvalidError';
    }
  },
  MidLengthError: class MidLengthError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'mid length');
      this.name = 'MidLengthError';
    }
  },
  IndexModuleProtectedError: class IndexModuleProtectedError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'index module protected');
      this.name = 'IndexModuleProtectedError';
    }
  },
  ModuleNotRegisteredError: class ModuleNotRegisteredError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'module not registered');
      this.name = 'ModuleNotRegisteredError';
    }
  },
}));

// NextAuth + authConfig mock (trpc.ts 가 의존)
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

// @MX:NOTE: Shared Prisma mock factory from @rhymix-ts/test-utils (SPEC-TEST-PRISMA-MOCK-001)
const mockPrisma = createMockPrismaClient();

// Set up defaults for audit logger and 2FA check (REQ-PMOCK-004, REQ-PMOCK-021)
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);
mockPrisma.adminLog.create.mockResolvedValue({ id: BigInt(1) });

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

describe('admin.module tRPC router (Slice B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B-7: admin 세션 + module.create → createModuleInstance 호출 및 결과 반환 (REQ-ADMIN-020)', async () => {
    const instanceResult = { id: 1, siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice' };
    mockCreateModuleInstance.mockResolvedValueOnce(instanceResult);

    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.create({
      siteId: 1,
      moduleCode: 'board',
      mid: 'notice',
      name: 'Notice',
    });

    expect(mockCreateModuleInstance).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 1, mid: 'notice' });
  });

  it('B-8: 비관리자 세션 + module.create → TRPCError FORBIDDEN (REQ-ADMIN-021)', async () => {
    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(
      caller.create({ siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('B-9: admin 세션 + module.create, 내부 MidConflictError → TRPCError CONFLICT', async () => {
    const { MidConflictError } = await import('@rhymix-ts/core/modules');
    mockCreateModuleInstance.mockRejectedValueOnce(new MidConflictError(1, 'notice'));

    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.create({ siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('B-10: admin 세션 + module.list → prisma.moduleInstance.findMany 결과 반환', async () => {
    const rows = [{ id: 1, siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice' }];
    mockPrisma.moduleInstance.findMany.mockResolvedValueOnce(rows);

    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.list({ siteId: 1 });

    expect(mockPrisma.moduleInstance.findMany).toHaveBeenCalledOnce();
    expect(result).toEqual(rows);
  });

  it('B-11: admin 세션 + module.delete, IndexModuleProtectedError → TRPCError CONFLICT', async () => {
    const { IndexModuleProtectedError } = await import('@rhymix-ts/core/modules');
    mockDeleteModuleInstance.mockRejectedValueOnce(new IndexModuleProtectedError(1));

    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(caller.delete({ instanceId: 1 })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('B-12: admin 세션 + module.delete 정상 → { ok: true, deletedId } 반환', async () => {
    mockDeleteModuleInstance.mockResolvedValueOnce({ ok: true, deletedId: 1 });

    const { adminModuleRouter } = await import('./module');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.delete({ instanceId: 1 });

    expect(mockDeleteModuleInstance).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, deletedId: 1 });
  });
});
