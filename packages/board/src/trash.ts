/**
 * trash.ts — SPEC-CONTENT-001 Slice D
 *
 * Document 소프트 삭제/복원/영구삭제 + 휴지통 목록.
 *
 * @MX:ANCHOR [AUTO]: Document 삭제의 단일 진입점.
 * @MX:REASON: $transaction 내 Document.update + Trash.upsert + incrementDocumentCount 원자성 —
 *             셋 중 하나라도 실패 시 모두 롤백되어야 한다. fan_in >= 2 (deleteDocument wrapper, admin tRPC).
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-100
 */
import type { PrismaClient, Document, Trash } from '@prisma/client';
import { DocumentOwnershipError, BoardPermissionDeniedError } from './document.js';

// ---------------------------------------------------------------------------
// 에러
// ---------------------------------------------------------------------------

export class TrashNotFoundError extends Error {
  readonly code = 'TRASH_NOT_FOUND';
  constructor(documentId: number) {
    super(`No trash entry for document ${documentId}`);
    this.name = 'TrashNotFoundError';
  }
}

export class TrashExpiredError extends Error {
  readonly code = 'TRASH_EXPIRED';
  constructor(documentId: number) {
    super(`Trash entry for document ${documentId} has expired`);
    this.name = 'TrashExpiredError';
  }
}

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const TRASH_RETENTION_DAYS = 30;

// ---------------------------------------------------------------------------
// Actor 타입
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// softDeleteDocument
// ---------------------------------------------------------------------------

export interface SoftDeleteResult {
  document: Document;
  trash: Trash | null;
}

/**
 * 문서를 소프트 삭제한다.
 *
 * - board.trashUse=true: deletedAt 세팅 + Trash row 생성 (단일 트랜잭션)
 * - board.trashUse=false: deletedAt 세팅만 (Trash 생략)
 * - categoryId 있으면 incrementDocumentCount(-1)
 */
export async function softDeleteDocument(
  input: { documentId: number; deletedById: number | null; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<SoftDeleteResult> {
  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;

    // 문서 + 게시판 조회
    const doc = await txClient.document.findUniqueOrThrow({
      where: { id: input.documentId },
      include: { board: true },
    });

    // 소유권 검사
    if (!input.actor.isAdmin && doc.authorId !== input.actor.userId) {
      throw new DocumentOwnershipError(input.documentId);
    }

    const now = new Date();

    // 문서 soft delete
    const updatedDoc = await txClient.document.update({
      where: { id: input.documentId },
      data: { deletedAt: now },
    });

    // Trash row 생성 (trashUse=true 일 때만)
    let trash: Trash | null = null;
    const board = doc.board as { trashUse: boolean };
    if (board.trashUse) {
      const expiresAt = new Date(now.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      trash = await txClient.trash.upsert({
        where: { documentId: input.documentId },
        create: {
          documentId: input.documentId,
          deletedById: input.deletedById,
          deletedAt: now,
          expiresAt,
        },
        update: {
          deletedById: input.deletedById,
          deletedAt: now,
          expiresAt,
        },
      });
    }

    // categoryId 있으면 카운트 -1
    if (doc.categoryId != null) {
      await txClient.documentCategory.update({
        where: { id: doc.categoryId },
        data: { documentCount: { decrement: 1 } },
      });
    }

    return { document: updatedDoc, trash };
  });
}

// ---------------------------------------------------------------------------
// restoreDocument
// ---------------------------------------------------------------------------

/**
 * 휴지통에서 문서를 복원한다 (admin 전용).
 *
 * @MX:WARN [AUTO]: 만료된 Trash 복원 거부 — TrashExpiredError.
 * @MX:REASON: expiresAt 검사 없이 복원하면 만료 정책이 무력화된다.
 */
export async function restoreDocument(
  input: { documentId: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('restore_document');
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;

    const trashEntry = await txClient.trash.findUnique({
      where: { documentId: input.documentId },
      include: { document: true },
    });

    if (!trashEntry) {
      throw new TrashNotFoundError(input.documentId);
    }

    if (trashEntry.expiresAt < new Date()) {
      throw new TrashExpiredError(input.documentId);
    }

    // deletedAt = null
    const restoredDoc = await txClient.document.update({
      where: { id: input.documentId },
      data: { deletedAt: null },
    });

    // Trash row 삭제
    await txClient.trash.delete({
      where: { documentId: input.documentId },
    });

    // categoryId 있으면 카운트 +1
    const doc = trashEntry.document as Document & { categoryId?: number | null };
    if (doc.categoryId != null) {
      await txClient.documentCategory.update({
        where: { id: doc.categoryId },
        data: { documentCount: { increment: 1 } },
      });
    }

    return restoredDoc;
  });
}

// ---------------------------------------------------------------------------
// purgeDocument
//
// @MX:WARN [AUTO]: 하드 삭제 — cascade 로 모든 관련 데이터 즉시 삭제. 복구 불가.
// @MX:REASON: Document.delete cascade 의 부수효과.
//             S3 storage object 삭제는 별도 hook (Slice E).
// @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-101
// ---------------------------------------------------------------------------

/**
 * 문서를 영구 삭제한다 (admin 전용, cascade).
 */
export async function purgeDocument(
  input: { documentId: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<{ documentId: number }> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('purge_document');
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;

    await txClient.document.delete({
      where: { id: input.documentId },
    });

    return { documentId: input.documentId };
  });
}

// ---------------------------------------------------------------------------
// listTrash
// ---------------------------------------------------------------------------

export interface TrashWithDocument extends Trash {
  document: Document;
}

export interface ListTrashResult {
  items: TrashWithDocument[];
  nextCursor: string | null;
}

/**
 * 휴지통 목록을 조회한다 (admin 전용).
 */
export async function listTrash(
  input: {
    boardId?: number;
    cursor?: string;
    limit?: number;
    actor: Actor;
  },
  ctx: { prisma: PrismaClient },
): Promise<ListTrashResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('list_trash');
  }

  const limit = input.limit ?? 20;
  const where: Record<string, unknown> = {};

  if (input.boardId !== undefined) {
    where.document = { boardId: input.boardId };
  }

  const items = await ctx.prisma.trash.findMany({
    where,
    include: { document: true },
    orderBy: { expiresAt: 'asc' },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(result[result.length - 1]!.id) : null;

  return { items: result as TrashWithDocument[], nextCursor };
}
