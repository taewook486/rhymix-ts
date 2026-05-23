/**
 * document.ts — SPEC-CONTENT-001 Slice B (T-006) + Slice C (T-003)
 *
 * Document 도메인 함수.
 * Slice B 변경사항:
 *   - createDocument: XSS sanitize (isomorphic-dompurify), status 옵션, write_document 권한 검사.
 *   - updateDocument 추가 — 본인 또는 admin 만 수정 가능, content 변경 시 sanitize 재적용.
 *   - deleteDocument 추가 — soft delete (deletedAt 세팅).
 *   - listDocuments: search 옵션 → PostgreSQL FTS 사용 ($queryRaw + plainto_tsquery).
 *
 * Slice C 변경사항:
 *   - listDocuments: cursor pagination + notices 분리 + categoryId/tags 필터 + sort.
 *   - createDocument: categoryId/tags 추가, incrementDocumentCount 호출.
 *   - deleteDocument: categoryId 있으면 incrementDocumentCount(-1) 호출.
 *   - encodeCursor/decodeCursor 유틸 추가.
 *
 * REQ-CONTENT-010, REQ-CONTENT-020, REQ-CONTENT-040, REQ-CONTENT-080, REQ-CONTENT-081.
 */
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { Prisma } from '@prisma/client';
import type { PrismaClient, Document } from '@prisma/client';
import { canPerformAction } from './permissions.js';
import { incrementDocumentCount } from './category.js';

// ---------------------------------------------------------------------------
// 권한 거부 예외 (TRPCError 로 변환하기 위한 sentinel)
// ---------------------------------------------------------------------------

/**
 * 권한 검사 실패 시 발생하는 도메인 예외.
 * tRPC 레이어에서 FORBIDDEN 으로 변환된다.
 */
export class BoardPermissionDeniedError extends Error {
  readonly code = 'BOARD_PERMISSION_DENIED';
  constructor(action: string) {
    super(`Board permission denied for action: ${action}`);
    this.name = 'BoardPermissionDeniedError';
  }
}

/**
 * 본인 외 작성자 권한 위배 (수정/삭제 시).
 */
export class DocumentOwnershipError extends Error {
  readonly code = 'DOCUMENT_OWNERSHIP';
  constructor(documentId: number) {
    super(`Not the owner of document ${documentId}`);
    this.name = 'DocumentOwnershipError';
  }
}

// ---------------------------------------------------------------------------
// cursor 인코딩/디코딩 유틸
//
// @MX:WARN [AUTO]: BigInt 직렬화 시 반드시 String()/BigInt() 변환. 원본 bigint 를
//                 JSON.stringify 에 그대로 넘기면 TypeError.
// @MX:REASON: listOrder 는 Prisma BigInt → JSON 직렬화 불가. String()↔BigInt() 로 왕복.
// @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-080
// ---------------------------------------------------------------------------

/** 와이어 타입 (JSON 직렬화 가능 — BigInt → string) */
interface DocumentCursorWire {
  listOrder: string;
  id: number;
}

/**
 * (listOrder, id) 쌍을 base64url 인코딩된 cursor 토큰으로 변환한다.
 */
export function encodeCursor(listOrder: bigint, id: number): string {
  const wire: DocumentCursorWire = { listOrder: listOrder.toString(), id };
  return Buffer.from(JSON.stringify(wire), 'utf8').toString('base64url');
}

/**
 * base64url cursor 토큰을 (listOrder, id) 쌍으로 디코딩한다.
 */
export function decodeCursor(token: string): { listOrder: bigint; id: number } {
  const wire: DocumentCursorWire = JSON.parse(
    Buffer.from(token, 'base64url').toString('utf8'),
  );
  return { listOrder: BigInt(wire.listOrder), id: wire.id };
}

// ---------------------------------------------------------------------------
// HTML sanitize 유틸리티
// ---------------------------------------------------------------------------

/**
 * 사용자 입력 HTML 을 정화한다 — XSS 방지.
 * SSR/Node 환경에서도 동작하도록 isomorphic-dompurify 사용.
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

/**
 * HTML 에서 텍스트만 추출 (검색 + 발췌용).
 */
function toPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

// ---------------------------------------------------------------------------
// Actor 공통 스키마 (권한 검사용)
// ---------------------------------------------------------------------------

const ActorSchema = z.object({
  userGroupSrl: z.number().int().min(0),
  isAdmin: z.boolean(),
});

const AuthorActorSchema = z.object({
  userId: z.number().int().positive(),
  userGroupSrl: z.number().int().min(0),
  isAdmin: z.boolean(),
});

// ---------------------------------------------------------------------------
// createDocument
// ---------------------------------------------------------------------------

const CreateDocumentSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  authorId: z.number().int().positive().nullable(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  nickName: z.string().min(1).max(80).nullable().default(null),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('TEMP'),
  actor: ActorSchema.default({ userGroupSrl: 1, isAdmin: false }),
  // Slice C 추가
  categoryId: z.number().int().positive().nullable().default(null),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export type CreateDocumentInput = z.input<typeof CreateDocumentSchema>;

export async function createDocument(
  input: CreateDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = CreateDocumentSchema.parse(input);

  const board = await ctx.prisma.board.findUniqueOrThrow({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });

  // 권한 검사 — write_document
  if (!canPerformAction(board, 'write_document', parsed.actor)) {
    throw new BoardPermissionDeniedError('write_document');
  }

  // XSS sanitize
  const safeContent = sanitizeHtml(parsed.content);
  const safeContentText = toPlainText(safeContent);

  // categoryId 있으면 트랜잭션 내에서 생성 + incrementDocumentCount
  if (parsed.categoryId !== null) {
    return ctx.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          boardId: board.id,
          authorId: parsed.authorId,
          nickName: parsed.nickName,
          title: parsed.title,
          content: safeContent,
          contentText: safeContentText,
          status: parsed.status,
          categoryId: parsed.categoryId,
          tags: parsed.tags,
        },
      });

      await incrementDocumentCount(parsed.categoryId!, 1, tx as unknown as PrismaClient);

      return doc;
    });
  }

  return ctx.prisma.document.create({
    data: {
      boardId: board.id,
      authorId: parsed.authorId,
      nickName: parsed.nickName,
      title: parsed.title,
      content: safeContent,
      contentText: safeContentText,
      status: parsed.status,
      tags: parsed.tags,
    },
  });
}

// ---------------------------------------------------------------------------
// updateDocument
// ---------------------------------------------------------------------------

const UpdateDocumentSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
  actor: AuthorActorSchema,
});

export type UpdateDocumentInput = z.input<typeof UpdateDocumentSchema>;

export async function updateDocument(
  input: UpdateDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = UpdateDocumentSchema.parse(input);

  const doc = await ctx.prisma.document.findUniqueOrThrow({
    where: { id: parsed.id },
    include: { board: true },
  });

  // 소유권 검사 — admin 이거나 본인 (authorId === actor.userId)
  if (!parsed.actor.isAdmin && doc.authorId !== parsed.actor.userId) {
    throw new DocumentOwnershipError(parsed.id);
  }

  // 권한 검사 — write_document (소유자도 게시판 권한이 있어야 한다)
  if (!canPerformAction(doc.board, 'write_document', parsed.actor)) {
    throw new BoardPermissionDeniedError('write_document');
  }

  // 부분 업데이트 페이로드 구성
  const data: Prisma.DocumentUpdateInput = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.status !== undefined) data.status = parsed.status;
  if (parsed.content !== undefined) {
    const safeContent = sanitizeHtml(parsed.content);
    data.content = safeContent;
    data.contentText = toPlainText(safeContent);
  }

  return ctx.prisma.document.update({
    where: { id: parsed.id },
    data,
  });
}

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

const DeleteDocumentSchema = z.object({
  id: z.number().int().positive(),
  actor: AuthorActorSchema,
});

export type DeleteDocumentInput = z.input<typeof DeleteDocumentSchema>;

export async function deleteDocument(
  input: DeleteDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = DeleteDocumentSchema.parse(input);

  const doc = await ctx.prisma.document.findUniqueOrThrow({
    where: { id: parsed.id },
    include: { board: true },
  });

  // 소유권 검사 — admin 이거나 본인
  if (!parsed.actor.isAdmin && doc.authorId !== parsed.actor.userId) {
    throw new DocumentOwnershipError(parsed.id);
  }

  // categoryId 있으면 트랜잭션 내에서 soft delete + incrementDocumentCount(-1)
  if (doc.categoryId != null) {
    return ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: parsed.id },
        data: { deletedAt: new Date() },
      });

      await incrementDocumentCount(doc.categoryId!, -1, tx as unknown as PrismaClient);

      return updated;
    });
  }

  return ctx.prisma.document.update({
    where: { id: parsed.id },
    data: { deletedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// listDocuments
//
// @MX:ANCHOR [AUTO]: Board 게시글 목록 조회 — cursor pagination + notices 분리.
// @MX:REASON: fan_in >= 4 (BoardIndexPage, tRPC list, searchDocuments fallback, test).
//             Breaking change: 반환 타입이 Document[] → { notices, items, nextCursor }.
//             Slice B 호출 시그니처({ moduleInstanceId, status }) 도 { notices:[], items:[], nextCursor:null } 로 정상 응답.
// @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-080, REQ-CONTENT-081
// ---------------------------------------------------------------------------

const ListDocumentsSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
  search: z.string().min(1).optional(),
  // Slice C 추가
  categoryId: z.number().int().positive().optional(),
  tags: z.array(z.string()).max(10).optional(),
  sort: z.enum(['list_order', 'update_order']).default('list_order'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ListDocumentsInput = z.input<typeof ListDocumentsSchema>;

export interface DocumentListResult {
  notices: Document[];
  items: Document[];
  nextCursor: string | null;
}

export async function listDocuments(
  input: ListDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentListResult> {
  const parsed = ListDocumentsSchema.parse(input);

  const board = await ctx.prisma.board.findUnique({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  if (!board) {
    return { notices: [], items: [], nextCursor: null };
  }

  const limit = parsed.limit ?? (board.listCount ?? 20);

  // cursor 디코딩
  let cursorDecoded: { listOrder: bigint; id: number } | null = null;
  if (parsed.cursor) {
    cursorDecoded = decodeCursor(parsed.cursor);
  }

  // FTS 검색 분기 — search 가 있으면 notices 쿼리 생략 (검색 결과는 공지 구분 없음)
  if (parsed.search) {
    const docs = await ctx.prisma.$queryRaw<Document[]>`
      SELECT * FROM "documents"
      WHERE "board_id" = ${board.id}
        AND "deleted_at" IS NULL
        AND "status" = ${parsed.status}::text::"DocumentStatus"
        AND "search_vector" @@ plainto_tsquery('simple', ${parsed.search})
      ORDER BY "regdate" DESC
      LIMIT ${limit}
    `;
    return { notices: [], items: docs, nextCursor: null };
  }

  // 공지 쿼리 — exceptNotice=false 일 때만 (FTS 검색이 아닌 경우)
  let notices: Document[] = [];
  if (!board.exceptNotice) {
    const baseNoticeWhere: Record<string, unknown> = {
      boardId: board.id,
      status: parsed.status,
      deletedAt: null,
      isNotice: true,
    };
    if (parsed.categoryId !== undefined) {
      baseNoticeWhere.categoryId = parsed.categoryId;
    }
    if (parsed.tags && parsed.tags.length > 0) {
      baseNoticeWhere.tags = { hasEvery: parsed.tags };
    }

    notices = await ctx.prisma.document.findMany({
      where: baseNoticeWhere,
      orderBy: { listOrder: 'desc' },
    });
  }

  // 일반 목록 쿼리
  const baseItemWhere: Record<string, unknown> = {
    boardId: board.id,
    status: parsed.status,
    deletedAt: null,
    isNotice: false,
  };

  if (parsed.categoryId !== undefined) {
    baseItemWhere.categoryId = parsed.categoryId;
  }

  if (parsed.tags && parsed.tags.length > 0) {
    baseItemWhere.tags = { hasEvery: parsed.tags };
  }

  // cursor 조건
  if (cursorDecoded !== null) {
    const { listOrder, id } = cursorDecoded;
    baseItemWhere.OR = [
      { listOrder: { lt: listOrder } },
      { listOrder: { equals: listOrder }, id: { lt: id } },
    ];
  }

  const sortField = parsed.sort === 'update_order' ? 'updateOrder' : 'listOrder';

  // take limit+1 으로 다음 페이지 존재 여부 확인
  const rawItems = await ctx.prisma.document.findMany({
    where: baseItemWhere,
    orderBy: [{ [sortField]: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = encodeCursor(last.listOrder as bigint, last.id);
  }

  return { notices, items, nextCursor };
}

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------

export async function getDocument(
  id: number,
  ctx: { prisma: PrismaClient },
): Promise<Document & { author: { id: number; userId: string; nickName: string } | null }> {
  return ctx.prisma.document.findUniqueOrThrow({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          userId: true,
          nickName: true,
        },
      },
    },
  });
}
