/**
 * Specification tests for content.document tRPC router — SPEC-CONTENT-001 Slice B (T-010).
 *
 * B-701: content.document.list (public) → listDocuments 호출, 결과 반환.
 * B-702: content.document.get (public) → getDocument 호출.
 * B-703: content.document.create (protected) → 인증 실패 시 UNAUTHORIZED.
 * B-704: content.document.create (protected) → createDocument 호출 (actor 주입).
 * B-705: content.document.update (protected) → updateDocument 호출 (actor 주입).
 * B-706: content.document.delete (protected) → deleteDocument 호출 (actor 주입).
 * B-707: BoardPermissionDeniedError → FORBIDDEN.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockDeleteDocument = vi.fn();

class BoardPermissionDeniedError extends Error {
  readonly code = 'BOARD_PERMISSION_DENIED';
}
class DocumentOwnershipError extends Error {
  readonly code = 'DOCUMENT_OWNERSHIP';
}

vi.mock('@rhymix-ts/board', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  BoardPermissionDeniedError,
  DocumentOwnershipError,
}));

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
const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('content.document tRPC router (Slice B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B-701: content.document.list (public) → listDocuments 호출, 결과 반환', async () => {
    const docs = [{ id: 1, title: 'a' }];
    mockListDocuments.mockResolvedValueOnce(docs);

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestCtx as any,
    );

    const result = await caller.list({ moduleInstanceId: 3 });
    expect(mockListDocuments).toHaveBeenCalledOnce();
    expect(result).toEqual(docs);
  });

  it('B-702: content.document.get (public) → getDocument 호출', async () => {
    const doc = { id: 10, title: 'hi', author: null };
    mockGetDocument.mockResolvedValueOnce(doc);

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestCtx as any,
    );

    const result = await caller.get({ id: 10 });
    expect(mockGetDocument).toHaveBeenCalledOnce();
    expect(result).toEqual(doc);
  });

  it('B-703: content.document.create (protected) → 인증 실패 시 UNAUTHORIZED', async () => {
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestCtx as any,
    );

    await expect(
      caller.create({
        moduleInstanceId: 3,
        title: 'x',
        content: 'y',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('B-704: content.document.create (protected) → createDocument 호출 + actor 주입', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 1 });
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await caller.create({ moduleInstanceId: 3, title: 'x', content: 'y' });
    expect(mockCreateDocument).toHaveBeenCalledOnce();
    const callArgs = mockCreateDocument.mock.calls[0]?.[0] as {
      moduleInstanceId: number;
      authorId: number;
      title: string;
      actor: { isAdmin: boolean; userGroupSrl: number };
    };
    expect(callArgs.authorId).toBe(42);
    expect(callArgs.actor.isAdmin).toBe(false);
  });

  it('B-705: content.document.update (protected) → updateDocument 호출 + actor 주입', async () => {
    mockUpdateDocument.mockResolvedValueOnce({ id: 1, title: 'new' });
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await caller.update({ id: 1, title: 'new' });
    expect(mockUpdateDocument).toHaveBeenCalledOnce();
    const callArgs = mockUpdateDocument.mock.calls[0]?.[0] as {
      id: number;
      actor: { userId: number };
    };
    expect(callArgs.actor.userId).toBe(42);
  });

  it('B-706: content.document.delete (protected) → deleteDocument 호출 + actor 주입', async () => {
    mockDeleteDocument.mockResolvedValueOnce({ id: 1, deletedAt: new Date() });
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await caller.delete({ id: 1 });
    expect(mockDeleteDocument).toHaveBeenCalledOnce();
  });

  it('B-707: BoardPermissionDeniedError → TRPCError FORBIDDEN', async () => {
    mockCreateDocument.mockRejectedValueOnce(new BoardPermissionDeniedError('write_document'));
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(contentDocumentRouter)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCtx as any,
    );

    await expect(
      caller.create({ moduleInstanceId: 3, title: 'x', content: 'y' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
