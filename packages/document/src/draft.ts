/**
 * packages/document/src/draft.ts
 *
 * 임시글(Draft) 관리 — SPEC-DOCUMENT-001 Slice C (REQ-DOC-060~064).
 *
 * listDrafts: 작성자별 임시글 목록 조회
 * publishDraft: 임시글 → 공개글 전환 (status: TEMP → PUBLIC, Board.documentCount++)
 *
 * @MX:NOTE [AUTO]: publishDraft는 트랜잭션 내에서 status 변경과 documentCount 증가를 원자적으로 수행.
 * @MX:REASON: 목록 카운트와 실제 문서 수의 불일치 방지 (AC-DOC-C2).
 */
import type { PrismaClient, Document } from '@prisma/client';
import { incrementDocumentCount } from './category';

// ---------------------------------------------------------------------------
// listDrafts
// ---------------------------------------------------------------------------

/**
 * listDrafts 입력 스키마.
 */
export interface ListDraftsInput {
  authorId: number;
  limit?: number;
  cursor?: number;
}

/**
 * listDrafts 결과 스키마.
 */
export interface DraftListResult {
  items: Document[];
  nextCursor?: number;
}

/**
 * 작성자별 임시글 목록을 조회한다.
 *
 * @param input - authorId, pagination options
 * @param ctx - Prisma 클라이언트
 * @returns 임시글 목록 + 다음 커서
 */
export async function listDrafts(
  input: ListDraftsInput,
  ctx: { prisma: PrismaClient },
): Promise<DraftListResult> {
  const { authorId, limit = 20, cursor } = input;

  const where: {
    authorId: number;
    status: 'TEMP';
    deletedAt: null;
    id?: { gt: number };
  } = {
    authorId,
    status: 'TEMP',
    deletedAt: null,
  };

  if (cursor !== undefined) {
    where.id = { gt: cursor };
  }

  const items = await ctx.prisma.document.findMany({
    where,
    orderBy: [{ id: 'asc' }],
    take: limit + 1, // 다음 페이지 존재 여부 확인
  });

  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const nextCursor = hasMore && resultItems.length > 0
    ? resultItems[resultItems.length - 1]!.id
    : undefined;

  return { items: resultItems, nextCursor };
}

// ---------------------------------------------------------------------------
// publishDraft
// ---------------------------------------------------------------------------

/**
 * publishDraft 입력 스키마.
 */
export interface PublishDraftInput {
  documentId: number;
  actor: { userId: number; isAdmin: boolean };
}

/**
 * 임시글을 공개글로 전환한다.
 *
 * 동작 (트랜잭션 내 원자적 실행):
 * 1. Document.status: TEMP → PUBLIC
 * 2. Document.categoryId가 있으면 Board.documentCount++
 *
 * @param input - documentId, actor
 * @param ctx - Prisma 클라이언트
 * @returns 공개된 문서
 *
 * @throws {Error} 문서를 찾을 수 없거나 권한이 없는 경우
 */
export async function publishDraft(
  input: PublishDraftInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const { documentId, actor } = input;

  // 문서 조회
  const doc = await ctx.prisma.document.findUnique({
    where: { id: documentId },
    include: { board: true },
  });

  if (!doc) {
    throw new Error(`Document ${documentId} not found`);
  }

  // 소유권 검사
  if (!actor.isAdmin && doc.authorId !== actor.userId) {
    throw new Error(`Not the owner of document ${documentId}`);
  }

  // 이미 공개된 문서인 경우
  if (doc.status !== 'TEMP') {
    throw new Error(`Document ${documentId} is not a draft (status: ${doc.status})`);
  }

  // categoryId가 있으면 트랜잭션 내에서 status 변경 + count 증가
  if (doc.categoryId !== null) {
    return ctx.prisma.$transaction(async (tx) => {
      // status: TEMP → PUBLIC
      const updated = await (tx as unknown as PrismaClient).document.update({
        where: { id: documentId },
        data: { status: 'PUBLIC' },
      });

      // Board.documentCount++
      await incrementDocumentCount(doc.categoryId!, 1, tx as unknown as PrismaClient);

      return updated;
    });
  }

  // categoryId가 없으면 단순 status 변경
  return ctx.prisma.document.update({
    where: { id: documentId },
    data: { status: 'PUBLIC' },
  });
}
