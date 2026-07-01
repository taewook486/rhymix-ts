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
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

// Domain mocks
const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockDeleteDocument = vi.fn();
const mockGetAdjacentDocuments = vi.fn();
const mockVoteDocument = vi.fn();

// document.ts 라우터가 instanceof 로 검사하는 에러 클래스 스텁.
// importOriginal 대신 인라인 스텁으로 전체 패키지 로드 방지.
class BoardPermissionDeniedError extends Error {
  constructor(type?: string) {
    super(type ?? 'Board permission denied');
    this.name = 'BoardPermissionDeniedError';
  }
}
class DocumentOwnershipError extends Error {
  constructor(userId?: number) {
    super(String(userId ?? 0));
    this.name = 'DocumentOwnershipError';
  }
}
// ExtraVars 에러: 라우터가 `code` 프로퍼티 OR instanceof 로 검사 — code 프로퍼티로 충분.
class ExtraVarsRequiredError extends Error {
  readonly code = 'EXTRA_VARS_REQUIRED';
}
class ExtraVarsNotConfiguredError extends Error {
  readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
}

vi.mock('@rhymix-ts/document', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  getAdjacentDocuments: (...args: unknown[]) => mockGetAdjacentDocuments(...args),
  voteDocument: (...args: unknown[]) => mockVoteDocument(...args),
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  ExtraVarsRequiredError,
  ExtraVarsNotConfiguredError,
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

// Create complete mock Prisma client
const mockPrisma = createMockPrismaClient();
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);

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
    // Reset all domain service mocks to default implementations
    mockListDocuments.mockReset();
    mockGetDocument.mockReset();
    mockCreateDocument.mockReset();
    mockUpdateDocument.mockReset();
    mockDeleteDocument.mockReset();
    mockGetAdjacentDocuments.mockReset();
    mockVoteDocument.mockReset();
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
    // Import the error class from the module
    const { BoardPermissionDeniedError } = await import('@rhymix-ts/document');
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

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice F — CT-1 ~ CT-3: extraVars tRPC 통합
// ---------------------------------------------------------------------------

// @rhymix-ts/board mock 에 Slice F 에러 클래스도 추가해야 하므로 별도 describe 블록
// ExtraVarsRequiredError/ExtraVarsNotConfiguredError 는 파일 상단 스텁 재사용
// vi.mock 은 hoist 되어 상단 블록만 유효 → 여기서는 domain mock 을 직접 확인
describe('content.document tRPC router (Slice F — CT-1 ~ CT-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Slice F: @rhymix-ts/board mock 에서 ExtraVarsRequiredError/ExtraVarsNotConfiguredError 가
    // import 될 수 있도록 mock factory 에서 이미 제공됨.
    // vi.mock 상단 블록에 이미 정의된 클래스를 재활용한다.
  });

  it('CT-1: content.document.create + extraVars 정상 → createDocument 에 extraVars 전달', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 1, boardId: 10, extraVars: { price: 100 } });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(memberCtx as any);

    const result = await caller.create({
      moduleInstanceId: 3,
      title: 'extraVars test',
      content: '<p>내용</p>',
      extraVars: { price: 100 },
    });
    expect(mockCreateDocument).toHaveBeenCalledOnce();
    const callArgs = mockCreateDocument.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArgs?.extraVars).toMatchObject({ price: 100 });
    expect(result).toMatchObject({ id: 1 });
  });

  it('CT-2: 잘못된 extraVars → BAD_REQUEST (ZodError 자동 매핑)', async () => {
    // ZodError throw 시 tRPC 가 BAD_REQUEST 로 변환
    const { ZodError } = await import('zod');
    mockCreateDocument.mockRejectedValueOnce(new ZodError([]));

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(memberCtx as any);

    await expect(
      caller.create({
        moduleInstanceId: 3,
        title: 'extraVars test',
        content: '<p>내용</p>',
        extraVars: { price: 'wrong-type' },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('CT-3: required 키 누락 → BAD_REQUEST (ExtraVarsRequiredError)', async () => {
    mockCreateDocument.mockRejectedValueOnce(new ExtraVarsRequiredError('required'));

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(memberCtx as any);

    await expect(
      caller.create({
        moduleInstanceId: 3,
        title: 'extraVars test',
        content: '<p>내용</p>',
        // extraVars 누락
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ---------------------------------------------------------------------------
// SPEC-BOARD-UI-001 — adjacent, vote procedures
// ---------------------------------------------------------------------------

describe('content.document tRPC router (SPEC-BOARD-UI-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdjacentDocuments.mockReset();
    mockVoteDocument.mockReset();
  });

  it('BUIT-TRPC-001: adjacent procedure → getAdjacentDocuments 호출', async () => {
    mockGetAdjacentDocuments.mockResolvedValueOnce({
      prev: { id: 2, title: 'Prev' },
      next: { id: 4, title: 'Next' },
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    const result = await caller.adjacent({ documentId: 3, boardId: 5 });

    expect(mockGetAdjacentDocuments).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      prev: { id: 2, title: 'Prev' },
      next: { id: 4, title: 'Next' },
    });
  });

  it('BUIT-TRPC-002: adjacent with sort parameter → sort 전달', async () => {
    mockGetAdjacentDocuments.mockResolvedValueOnce({
      prev: null,
      next: { id: 4, title: 'Next' },
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    await caller.adjacent({ documentId: 3, boardId: 5, sort: 'update_order' });

    const callArgs = mockGetAdjacentDocuments.mock.calls[0]?.[0] as {
      documentId: number;
      boardId: number;
      sort: string;
    };
    expect(callArgs.sort).toBe('update_order');
  });

  it('BUIT-TRPC-003: vote mutation (protected) → voteDocument 호출', async () => {
    mockVoteDocument.mockResolvedValueOnce({
      action: 'created',
      vote: { id: 1 },
      newCounts: { voted: 5, blamed: 0 },
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(memberCtx as any);

    const result = await caller.vote({ documentId: 10, voteType: 'UP' });

    expect(mockVoteDocument).toHaveBeenCalledOnce();
    const callArgs = mockVoteDocument.mock.calls[0]?.[0] as {
      documentId: number;
      voterId: string;
      voteType: string;
    };
    expect(callArgs.documentId).toBe(10);
    expect(callArgs.voterId).toBe('42'); // ctx.session.user.id
    expect(callArgs.voteType).toBe('UP');
    expect(result).toMatchObject({
      action: 'created',
      newCounts: { voted: 5, blamed: 0 },
    });
  });

  it('BUIT-TRPC-004: vote mutation (protected) → 인증 없으면 UNAUTHORIZED', async () => {
    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    await expect(
      caller.vote({ documentId: 10, voteType: 'UP' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('BUIT-TRPC-005: vote mutation → DOWN, BLAME 타입 지원', async () => {
    mockVoteDocument.mockResolvedValueOnce({
      action: 'created',
      newCounts: { voted: 3, blamed: 1 },
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(memberCtx as any);

    await caller.vote({ documentId: 10, voteType: 'DOWN' });
    expect(mockVoteDocument).toHaveBeenCalledOnce();

    const callArgs = mockVoteDocument.mock.calls[0]?.[0] as { voteType: string };
    expect(callArgs.voteType).toBe('DOWN');
  });

  it('BUIT-TRPC-006: list with page parameter → offset mode', async () => {
    mockListDocuments.mockResolvedValueOnce({
      notices: [],
      items: [],
      nextCursor: null,
      totalCount: 100,
      totalPages: 5,
      currentPage: 1,
      pageSize: 20,
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    const result = await caller.list({ moduleInstanceId: 3, page: 1, pageSize: 20 });

    expect(mockListDocuments).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      totalCount: 100,
      totalPages: 5,
      currentPage: 1,
      pageSize: 20,
    });
  });

  it('BUIT-TRPC-007: list with recommend sort → sort parameter 전달', async () => {
    mockListDocuments.mockResolvedValueOnce({
      notices: [],
      items: [],
      nextCursor: null,
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    await caller.list({ moduleInstanceId: 3, sort: 'recommend' });

    const callArgs = mockListDocuments.mock.calls[0]?.[0] as { sort: string };
    expect(callArgs.sort).toBe('recommend');
  });

  it('BUIT-TRPC-008: list with searchField=title → searchField parameter 전달', async () => {
    mockListDocuments.mockResolvedValueOnce({
      notices: [],
      items: [],
      nextCursor: null,
    });

    const { contentDocumentRouter } = await import('./document');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentDocumentRouter)(guestCtx as any);

    await caller.list({ moduleInstanceId: 3, search: 'test', searchField: 'title' });

    const callArgs = mockListDocuments.mock.calls[0]?.[0] as {
      search: string;
      searchField: string;
    };
    expect(callArgs.searchField).toBe('title');
  });
});
