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

vi.mock('@rhymix-ts/document', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  ExtraVarsRequiredError: class ExtraVarsRequiredError extends Error {
    readonly code = 'EXTRA_VARS_REQUIRED';
  },
  ExtraVarsNotConfiguredError: class ExtraVarsNotConfiguredError extends Error {
    readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
  },
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

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice F — CT-1 ~ CT-3: extraVars tRPC 통합
// ---------------------------------------------------------------------------

// Slice F 에러 클래스 추가 (vi.mock 은 파일 상단의 mock 블록에서 이미 @rhymix-ts/board 를 mock 함)
class ExtraVarsRequiredError extends Error {
  readonly code = 'EXTRA_VARS_REQUIRED';
}
class ExtraVarsNotConfiguredError extends Error {
  readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
}

// @rhymix-ts/board mock 에 Slice F 에러 클래스도 추가해야 하므로 별도 describe 블록
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
