/**
 * Specification tests for admin.trash tRPC router — SPEC-CONTENT-001 Slice D.
 *
 * AT-1: admin.trash.list → trash 목록 반환.
 * AT-2: admin.trash.list 비admin → UNAUTHORIZED/FORBIDDEN.
 * AT-3: admin.trash.restore 정상 → 복원.
 * AT-4: admin.trash.restore trash 없음 → NOT_FOUND.
 * AT-5: admin.trash.restore 만료 → PRECONDITION_FAILED.
 * AT-6: admin.trash.purge → cascade 삭제 확인.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListTrash = vi.fn();
const mockRestoreDocument = vi.fn();
const mockPurgeDocument = vi.fn();

class TrashNotFoundError extends Error {
  readonly code = 'TRASH_NOT_FOUND';
  constructor(documentId: number) {
    super(`No trash entry for document ${documentId}`);
    this.name = 'TrashNotFoundError';
  }
}

class TrashExpiredError extends Error {
  readonly code = 'TRASH_EXPIRED';
  constructor(documentId: number) {
    super(`Trash entry for document ${documentId} has expired`);
    this.name = 'TrashExpiredError';
  }
}

vi.mock('@rhymix-ts/board', () => ({
  listTrash: (...args: unknown[]) => mockListTrash(...args),
  restoreDocument: (...args: unknown[]) => mockRestoreDocument(...args),
  purgeDocument: (...args: unknown[]) => mockPurgeDocument(...args),
  TrashNotFoundError,
  TrashExpiredError,
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

describe('admin.trash tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminLog.create.mockResolvedValue({});
  });

  it('AT-1: trash.list admin → listTrash 호출, 목록 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const fakeTrash = {
      items: [
        { id: 1, documentId: 10, expiresAt: new Date(), document: { id: 10, title: '제목' } },
      ],
      nextCursor: null,
    };
    mockListTrash.mockResolvedValue(fakeTrash);

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.list({});

    expect(mockListTrash).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
  });

  it('AT-2: trash.list 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    const caller = createCallerFactory(adminTrashRouter)(memberCtx as never);

    await expect(caller.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockListTrash).not.toHaveBeenCalled();
  });

  it('AT-3: trash.restore admin → restoreDocument 호출, 복원 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockResolvedValue({ id: 10, deletedAt: null, title: '제목' });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.restore({ documentId: 10 });

    expect(mockRestoreDocument).toHaveBeenCalledOnce();
    expect(result.deletedAt).toBeNull();
  });

  it('AT-4: trash.restore trash 없음 → NOT_FOUND', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockRejectedValue(new TrashNotFoundError(10));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.restore({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('AT-5: trash.restore 만료 → PRECONDITION_FAILED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockRestoreDocument.mockRejectedValue(new TrashExpiredError(10));

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);

    await expect(
      caller.restore({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('AT-6: trash.purge admin → purgeDocument 호출, documentId 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminTrashRouter } = await import('./trash');

    mockPurgeDocument.mockResolvedValue({ documentId: 10 });

    const caller = createCallerFactory(adminTrashRouter)(adminCtx as never);
    const result = await caller.purge({ documentId: 10 });

    expect(mockPurgeDocument).toHaveBeenCalledOnce();
    expect(result.documentId).toBe(10);
  });
});
