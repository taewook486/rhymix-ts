/**
 * packages/board/src/trash.test.ts — SPEC-CONTENT-001 Slice D
 *
 * T-1 ~ T-10: softDeleteDocument, restoreDocument, purgeDocument, listTrash 검증.
 *
 * REQ-CONTENT-100: soft delete + Trash row 생성 (board.trashUse=true).
 * REQ-CONTENT-101: purge (수동).
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

function makeBoard(trashUse: boolean, hasCategory = false) {
  return {
    id: 1,
    moduleInstanceId: 1,
    trashUse,
    useCategory: hasCategory,
  };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    boardId: 1,
    authorId: 42,
    categoryId: null,
    deletedAt: null,
    ...overrides,
  };
}

function makeTrashTx(opts: {
  docOverrides?: Record<string, unknown>;
  board?: Record<string, unknown>;
  trashRow?: Record<string, unknown> | null;
  categoryId?: number | null;
}) {
  const doc = makeDoc({ ...opts.docOverrides, categoryId: opts.categoryId ?? null });
  const board = opts.board ?? makeBoard(true);

  const txDocFindUniqueOrThrow = vi.fn().mockResolvedValue({ ...doc, board });
  const txDocUpdate = vi.fn().mockResolvedValue({ ...doc, deletedAt: new Date() });
  const txTrashUpsert = vi.fn().mockResolvedValue({ id: 1, documentId: doc.id });
  const txTrashDelete = vi.fn().mockResolvedValue({ id: 1 });
  const txCategoryUpdate = vi.fn().mockResolvedValue({});

  return {
    txDocFindUniqueOrThrow,
    txDocUpdate,
    txTrashUpsert,
    txTrashDelete,
    txCategoryUpdate,
    tx: {
      document: { findUniqueOrThrow: txDocFindUniqueOrThrow, update: txDocUpdate, delete: vi.fn() },
      trash: { upsert: txTrashUpsert, delete: txTrashDelete, findUnique: vi.fn() },
      documentCategory: { update: txCategoryUpdate },
    },
  };
}

// ---------------------------------------------------------------------------
// softDeleteDocument
// ---------------------------------------------------------------------------

describe('softDeleteDocument', () => {
  it('T-1: trashUse=true → deletedAt set + Trash row 생성 + expiresAt = deletedAt + 30days', async () => {
    const { softDeleteDocument } = await import('./trash.js');

    const { txDocFindUniqueOrThrow, txDocUpdate, txTrashUpsert, tx } = makeTrashTx({ board: makeBoard(true) });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    const actor = { userId: 42, userGroupSrl: 1, isAdmin: false };
    const result = await softDeleteDocument(
      { documentId: 10, deletedById: 42, actor },
      { prisma: mockPrisma as never },
    );

    expect(txDocFindUniqueOrThrow).toHaveBeenCalledOnce();
    expect(txDocUpdate).toHaveBeenCalledOnce();

    // deletedAt 세팅 확인
    const updateData = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateData?.data?.deletedAt).toBeInstanceOf(Date);

    // Trash row 생성 확인
    expect(txTrashUpsert).toHaveBeenCalledOnce();
    const trashCreateData = txTrashUpsert.mock.calls[0]?.[0] as { create: Record<string, unknown> };
    expect(trashCreateData?.create?.expiresAt).toBeInstanceOf(Date);

    // expiresAt ≈ deletedAt + 30일
    const deletedAt = updateData?.data?.deletedAt as Date;
    const expiresAt = trashCreateData?.create?.expiresAt as Date;
    const diffMs = expiresAt.getTime() - deletedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);

    expect(result.trash).toBeTruthy();
  });

  it('T-2: trashUse=false → deletedAt set, Trash row 미생성', async () => {
    const { softDeleteDocument } = await import('./trash.js');

    const { txDocFindUniqueOrThrow, txDocUpdate, txTrashUpsert, tx } = makeTrashTx({ board: makeBoard(false) });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    const actor = { userId: 42, userGroupSrl: 1, isAdmin: false };
    const result = await softDeleteDocument(
      { documentId: 10, deletedById: 42, actor },
      { prisma: mockPrisma as never },
    );

    expect(txDocUpdate).toHaveBeenCalledOnce();
    expect(txTrashUpsert).not.toHaveBeenCalled();
    expect(result.trash).toBeNull();
  });

  it('T-3: categoryId 있으면 documentCount -1', async () => {
    const { softDeleteDocument } = await import('./trash.js');

    const txDocFindUniqueOrThrow = vi.fn().mockResolvedValue({
      ...makeDoc({ categoryId: 5 }),
      board: makeBoard(true),
    });
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, deletedAt: new Date(), categoryId: 5 });
    const txTrashUpsert = vi.fn().mockResolvedValue({ id: 1 });
    const txCategoryUpdate = vi.fn().mockResolvedValue({});

    const tx = {
      document: { findUniqueOrThrow: txDocFindUniqueOrThrow, update: txDocUpdate },
      trash: { upsert: txTrashUpsert },
      documentCategory: { update: txCategoryUpdate },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    await softDeleteDocument(
      { documentId: 10, deletedById: 42, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
      { prisma: mockPrisma as never },
    );

    expect(txCategoryUpdate).toHaveBeenCalledOnce();
    const catCall = txCategoryUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(catCall?.data?.documentCount).toEqual({ decrement: 1 });
  });

  it('T-4: 비소유자 비admin → DocumentOwnershipError', async () => {
    const { softDeleteDocument } = await import('./trash.js');
    const { DocumentOwnershipError } = await import('./document.js');

    const txDocFindUniqueOrThrow = vi.fn().mockResolvedValue({
      ...makeDoc({ authorId: 99 }), // 문서 소유자 99
      board: makeBoard(true),
    });

    const tx = {
      document: { findUniqueOrThrow: txDocFindUniqueOrThrow, update: vi.fn() },
      trash: { upsert: vi.fn() },
      documentCategory: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    // actor.userId = 42 ≠ doc.authorId = 99, isAdmin = false
    await expect(
      softDeleteDocument(
        { documentId: 10, deletedById: 42, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(DocumentOwnershipError);
  });
});

// ---------------------------------------------------------------------------
// restoreDocument
// ---------------------------------------------------------------------------

describe('restoreDocument', () => {
  it('T-5: admin + 유효 Trash → deletedAt = null + Trash 삭제 + 카운트 +1', async () => {
    const { restoreDocument } = await import('./trash.js');

    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10일 후

    const txTrashFindUnique = vi.fn().mockResolvedValue({
      id: 1,
      documentId: 10,
      expiresAt: futureExpiry,
      document: { ...makeDoc({ categoryId: 5 }) },
    });
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, deletedAt: null, categoryId: 5 });
    const txTrashDelete = vi.fn().mockResolvedValue({ id: 1 });
    const txCategoryUpdate = vi.fn().mockResolvedValue({});

    const tx = {
      trash: { findUnique: txTrashFindUnique, delete: txTrashDelete },
      document: { update: txDocUpdate },
      documentCategory: { update: txCategoryUpdate },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    const result = await restoreDocument(
      { documentId: 10, actor: { userId: 100, userGroupSrl: 1, isAdmin: true } },
      { prisma: mockPrisma as never },
    );

    expect(txTrashFindUnique).toHaveBeenCalledOnce();
    expect(txTrashDelete).toHaveBeenCalledOnce();
    expect(txDocUpdate).toHaveBeenCalledOnce();

    // deletedAt = null 확인
    const updateData = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateData?.data?.deletedAt).toBeNull();

    // 카운트 +1 확인
    expect(txCategoryUpdate).toHaveBeenCalledOnce();
    const catCall = txCategoryUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(catCall?.data?.documentCount).toEqual({ increment: 1 });
  });

  it('T-6: non-admin → 권한 거부', async () => {
    const { restoreDocument } = await import('./trash.js');

    const mockPrisma = {
      $transaction: vi.fn(),
    };

    await expect(
      restoreDocument(
        { documentId: 10, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('T-7: Trash 없음 → TrashNotFoundError', async () => {
    const { restoreDocument, TrashNotFoundError } = await import('./trash.js');

    const txTrashFindUnique = vi.fn().mockResolvedValue(null);

    const tx = {
      trash: { findUnique: txTrashFindUnique },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    await expect(
      restoreDocument(
        { documentId: 10, actor: { userId: 100, userGroupSrl: 1, isAdmin: true } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(TrashNotFoundError);
  });

  it('T-8: expiresAt 만료 → TrashExpiredError', async () => {
    const { restoreDocument, TrashExpiredError } = await import('./trash.js');

    const pastExpiry = new Date(Date.now() - 1000); // 이미 만료

    const txTrashFindUnique = vi.fn().mockResolvedValue({
      id: 1,
      documentId: 10,
      expiresAt: pastExpiry,
      document: makeDoc(),
    });

    const tx = {
      trash: { findUnique: txTrashFindUnique },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    await expect(
      restoreDocument(
        { documentId: 10, actor: { userId: 100, userGroupSrl: 1, isAdmin: true } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(TrashExpiredError);
  });
});

// ---------------------------------------------------------------------------
// purgeDocument
// ---------------------------------------------------------------------------

describe('purgeDocument', () => {
  it('T-9: admin → Document cascade 삭제 (Trash, Vote, Report, Comment 포함)', async () => {
    const { purgeDocument } = await import('./trash.js');

    const txDocDelete = vi.fn().mockResolvedValue({ id: 10 });

    const tx = {
      document: { delete: txDocDelete },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx)),
    };

    const result = await purgeDocument(
      { documentId: 10, actor: { userId: 100, userGroupSrl: 1, isAdmin: true } },
      { prisma: mockPrisma as never },
    );

    expect(txDocDelete).toHaveBeenCalledOnce();
    const deleteCall = txDocDelete.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(deleteCall?.where?.id).toBe(10);
    expect(result.documentId).toBe(10);
  });

  it('T-9b: non-admin → 권한 거부', async () => {
    const { purgeDocument } = await import('./trash.js');

    const mockPrisma = { $transaction: vi.fn() };

    await expect(
      purgeDocument(
        { documentId: 10, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// listTrash
// ---------------------------------------------------------------------------

describe('listTrash', () => {
  it('T-10: admin → expiresAt asc 정렬, document include', async () => {
    const { listTrash } = await import('./trash.js');

    const fakeTrash = [
      { id: 1, documentId: 10, expiresAt: new Date(), document: makeDoc() },
      { id: 2, documentId: 20, expiresAt: new Date(Date.now() + 86400000), document: makeDoc({ id: 20 }) },
    ];

    const mockPrisma = {
      trash: {
        findMany: vi.fn().mockResolvedValue(fakeTrash),
      },
    };

    const result = await listTrash(
      { actor: { userId: 100, userGroupSrl: 1, isAdmin: true } },
      { prisma: mockPrisma as never },
    );

    expect(result.items).toHaveLength(2);
    const findCall = mockPrisma.trash.findMany.mock.calls[0]?.[0] as {
      orderBy: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    expect(findCall?.orderBy?.expiresAt).toBe('asc');
    expect(findCall?.include?.document).toBe(true);
  });
});
