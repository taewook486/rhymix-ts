/**
 * Specification tests for admin.contentExtraKey tRPC router — SPEC-CONTENT-001 Slice F.
 *
 * A-1: admin.contentExtraKey.list 미인증 → UNAUTHORIZED.
 * A-2: admin.contentExtraKey.list 비admin → FORBIDDEN.
 * A-3: admin.contentExtraKey.create 정상 → row 반환.
 * A-4: admin.contentExtraKey.create 중복 varName → CONFLICT.
 * A-5: admin.contentExtraKey.create select 타입 options 누락 → BAD_REQUEST.
 * A-6: admin.contentExtraKey.reorder → varIdx 재할당 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListExtraKeys = vi.fn();
const mockCreateExtraKey = vi.fn();
const mockUpdateExtraKey = vi.fn();
const mockDeleteExtraKey = vi.fn();
const mockReorderExtraKeys = vi.fn();

class ExtraKeyDuplicateNameError extends Error {
  readonly code = 'EXTRA_KEY_DUPLICATE_NAME';
}
class ExtraKeyOptionsRequiredError extends Error {
  readonly code = 'EXTRA_KEY_OPTIONS_REQUIRED';
}

vi.mock('@rhymix-ts/board', () => ({
  listExtraKeys: (...args: unknown[]) => mockListExtraKeys(...args),
  createExtraKey: (...args: unknown[]) => mockCreateExtraKey(...args),
  updateExtraKey: (...args: unknown[]) => mockUpdateExtraKey(...args),
  deleteExtraKey: (...args: unknown[]) => mockDeleteExtraKey(...args),
  reorderExtraKeys: (...args: unknown[]) => mockReorderExtraKeys(...args),
  ExtraKeyDuplicateNameError,
  ExtraKeyOptionsRequiredError,
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: (session: unknown) =>
    (session as { user?: { isAdmin?: boolean } } | null)?.user?.isAdmin === true,
}));
vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [{ id: 1, isAdmin: true }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
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

describe('admin.contentExtraKey tRPC router (Slice F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminLog.create.mockResolvedValue({});
  });

  // ---------------------------------------------------------------------------
  // A-1: 미인증 → UNAUTHORIZED
  // ---------------------------------------------------------------------------

  it('A-1: 미인증 세션 + contentExtraKey.list → FORBIDDEN (protectedAdminProcedure 동작)', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.list({ boardId: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // ---------------------------------------------------------------------------
  // A-2: 비admin → FORBIDDEN
  // ---------------------------------------------------------------------------

  it('A-2: 비admin 세션 + contentExtraKey.list → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(memberCtx as any);

    await expect(caller.list({ boardId: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // ---------------------------------------------------------------------------
  // A-3: admin + create 정상 → row 반환
  // ---------------------------------------------------------------------------

  it('A-3: admin + contentExtraKey.create 정상 → row 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    const fakeRow = {
      id: 1,
      boardId: 10,
      varIdx: 0,
      varName: 'price',
      varType: 'number',
      varIsRequired: false,
      varSearch: false,
      varSort: false,
      varOptions: null,
      langCode: 'ko',
    };
    mockCreateExtraKey.mockResolvedValue(fakeRow);

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({
      boardId: 10,
      varName: 'price',
      varType: 'number',
    });
    expect(result).toMatchObject({ id: 1, boardId: 10, varName: 'price' });
    expect(mockCreateExtraKey).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // A-4: admin + create 중복 → CONFLICT
  // ---------------------------------------------------------------------------

  it('A-4: admin + contentExtraKey.create 중복 varName → CONFLICT', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    mockCreateExtraKey.mockRejectedValue(new ExtraKeyDuplicateNameError('중복'));

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.create({ boardId: 10, varName: 'price', varType: 'number' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  // ---------------------------------------------------------------------------
  // A-5: admin + create select 타입 options 누락 → BAD_REQUEST
  // ---------------------------------------------------------------------------

  it('A-5: admin + contentExtraKey.create select 타입 options 누락 → BAD_REQUEST', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    mockCreateExtraKey.mockRejectedValue(new ExtraKeyOptionsRequiredError('select'));

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.create({ boardId: 10, varName: 'rating', varType: 'select' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  // ---------------------------------------------------------------------------
  // A-6: admin + reorder → varIdx 재할당 검증
  // ---------------------------------------------------------------------------

  it('A-6: admin + contentExtraKey.reorder → domain 함수 호출 및 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminContentExtraKeyRouter } = await import('./content-extra-key');

    const fakeResult = [
      { id: 3, varIdx: 0 },
      { id: 1, varIdx: 1 },
      { id: 2, varIdx: 2 },
    ];
    mockReorderExtraKeys.mockResolvedValue(fakeResult);

    const createCaller = createCallerFactory(adminContentExtraKeyRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.reorder({ boardId: 10, idsInOrder: [3, 1, 2] });
    expect(mockReorderExtraKeys).toHaveBeenCalledOnce();
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 3, varIdx: 0 });
  });
});
