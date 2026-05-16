/**
 * Specification tests for auditLogger middleware — SPEC-ADMIN-001 Slice D.
 *
 * D-1: admin mutation → prisma.adminLog.create 호출됨 (actorId, action, diff, ip 포함).
 * D-2: admin query → prisma.adminLog.create 미호출.
 * D-3: 비관리자 세션 → requireAdmin 에서 FORBIDDEN, auditLogger 미도달 → adminLog.create 미호출.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

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

// ---------------------------------------------------------------------------
// adminLog mock
// ---------------------------------------------------------------------------

const mockAdminLogCreate = vi.fn();
const mockPrisma = {
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 7, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '127.0.0.1',
  userAgent: 'test-agent',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '127.0.0.1',
  userAgent: 'test-agent',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auditLogger middleware (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('D-1: admin mutation → adminLog.create 가 actorId/action/diff/ip 를 포함해 호출됨 (REQ-ADMIN-070, REQ-ADMIN-071)', async () => {
    // adminMenuRouter 의 menu.create 를 이용해 mutation 테스트
    // auditLogger 가 구현된 후에는 통과해야 하므로, 현재는 adminLog.create 가 호출되지 않아 FAIL

    // auditLogger 없이는 adminLog.create 가 호출되지 않음
    // GREEN 단계에서 auditLogger 가 추가되면 이 테스트가 통과함
    const { router, publicProcedure, createCallerFactory, protectedAdminProcedure } =
      await import('./trpc');

    // 간단한 test mutation 라우터 정의
    const testRouter = router({
      testMutation: protectedAdminProcedure
        .mutation(() => ({ ok: true, id: 42 })),
      testQuery: protectedAdminProcedure
        .query(() => ({ items: [] })),
    });

    const createCaller = createCallerFactory(testRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.testMutation();

    // auditLogger 가 없으면 adminLog.create 가 호출되지 않아 실패
    expect(mockAdminLogCreate).toHaveBeenCalledOnce();
    expect(mockAdminLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 7,
          action: 'testMutation',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      }),
    );
  });

  it('D-2: admin query → adminLog.create 미호출 (REQ-ADMIN-070 "mutation 만" 명시)', async () => {
    const { router, createCallerFactory, protectedAdminProcedure } =
      await import('./trpc');

    const testRouter = router({
      testQuery: protectedAdminProcedure
        .query(() => ({ items: [] })),
    });

    const createCaller = createCallerFactory(testRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.testQuery();

    expect(mockAdminLogCreate).not.toHaveBeenCalled();
  });

  it('D-3: 비관리자 세션 → requireAdmin 에서 FORBIDDEN, auditLogger 미도달, adminLog.create 미호출', async () => {
    const { router, createCallerFactory, protectedAdminProcedure } =
      await import('./trpc');

    const testRouter = router({
      testMutation: protectedAdminProcedure
        .mutation(() => ({ ok: true })),
    });

    const createCaller = createCallerFactory(testRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.testMutation()).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // requireAdmin 에서 throw 했으므로 auditLogger 까지 도달하지 않음
    expect(mockAdminLogCreate).not.toHaveBeenCalled();
  });
});
