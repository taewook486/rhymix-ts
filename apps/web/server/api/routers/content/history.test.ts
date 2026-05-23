/**
 * Specification tests for content.history tRPC router — SPEC-CONTENT-001 Slice D.
 *
 * CH-1: content.history.document 본인 → 목록 반환.
 * CH-2: content.history.document admin → 타인 문서 history 반환.
 * CH-3: content.history.document 비본인 비admin → FORBIDDEN.
 * CH-4: content.history.document 미인증 → UNAUTHORIZED.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockGetUpdateHistory = vi.fn();

class BoardPermissionDeniedError extends Error {
  readonly code = 'BOARD_PERMISSION_DENIED';
  constructor(action: string) {
    super(`Board permission denied for action: ${action}`);
    this.name = 'BoardPermissionDeniedError';
  }
}

vi.mock('@rhymix-ts/board', () => ({
  getUpdateHistory: (...args: unknown[]) => mockGetUpdateHistory(...args),
  BoardPermissionDeniedError,
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};
const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [{ id: 1, isAdmin: true }] } },
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

describe('content.history tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CH-1: history.document 본인 → getUpdateHistory 호출, 목록 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentHistoryRouter } = await import('./history');

    const fakeLogs = [
      { id: 2, documentId: 10, prevTitle: '제목2', regdate: new Date() },
      { id: 1, documentId: 10, prevTitle: '제목1', regdate: new Date() },
    ];
    mockGetUpdateHistory.mockResolvedValue(fakeLogs);

    const caller = createCallerFactory(contentHistoryRouter)(memberCtx as never);
    const result = await caller.document({ documentId: 10 });

    expect(mockGetUpdateHistory).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
  });

  it('CH-2: history.document admin → 타인 문서 history 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentHistoryRouter } = await import('./history');

    mockGetUpdateHistory.mockResolvedValue([{ id: 1, documentId: 10 }]);

    const caller = createCallerFactory(contentHistoryRouter)(adminCtx as never);
    const result = await caller.document({ documentId: 10 });

    expect(result).toHaveLength(1);
  });

  it('CH-3: history.document 비본인 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentHistoryRouter } = await import('./history');

    mockGetUpdateHistory.mockRejectedValue(new BoardPermissionDeniedError('update_view'));

    const caller = createCallerFactory(contentHistoryRouter)(memberCtx as never);

    await expect(
      caller.document({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('CH-4: history.document 미인증 → UNAUTHORIZED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentHistoryRouter } = await import('./history');

    const caller = createCallerFactory(contentHistoryRouter)(guestCtx as never);

    await expect(
      caller.document({ documentId: 10 }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockGetUpdateHistory).not.toHaveBeenCalled();
  });
});
