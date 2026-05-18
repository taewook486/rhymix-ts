/**
 * document.ts — SPEC-CONTENT-001 Slice B (T-006)
 *
 * Document 도메인 함수.
 * Slice B 변경사항:
 *   - createDocument: XSS sanitize (isomorphic-dompurify), status 옵션, write_document 권한 검사.
 *   - updateDocument 추가 — 본인 또는 admin 만 수정 가능, content 변경 시 sanitize 재적용.
 *   - deleteDocument 추가 — soft delete (deletedAt 세팅).
 *   - listDocuments: search 옵션 → PostgreSQL FTS 사용 ($queryRaw + plainto_tsquery).
 *
 * REQ-CONTENT-010, REQ-CONTENT-020, REQ-CONTENT-030, REQ-CONTENT-040.
 */
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { Prisma } from '@prisma/client';
import type { PrismaClient, Document } from '@prisma/client';
import { canPerformAction } from './permissions.js';

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
 * Slice B 에서는 매우 단순한 tag-strip — Slice C+ 에서 명세에 따라 정련.
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

  return ctx.prisma.document.create({
    data: {
      boardId: board.id,
      authorId: parsed.authorId,
      nickName: parsed.nickName,
      title: parsed.title,
      content: safeContent,
      contentText: safeContentText,
      status: parsed.status,
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

  // soft delete — deletedAt 세팅 (trash row 는 Slice C+ 에서 별도 처리)
  return ctx.prisma.document.update({
    where: { id: parsed.id },
    data: { deletedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// listDocuments
// ---------------------------------------------------------------------------

const ListDocumentsSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
  search: z.string().min(1).optional(),
});

export type ListDocumentsInput = z.input<typeof ListDocumentsSchema>;

export async function listDocuments(
  input: ListDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<Document[]> {
  const parsed = ListDocumentsSchema.parse(input);

  const board = await ctx.prisma.board.findUnique({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  if (!board) return [];

  // search 가 있으면 PostgreSQL FTS 사용 — Slice B FTS 구현 (REQ-CONTENT-050)
  if (parsed.search) {
    const docs = await ctx.prisma.$queryRaw<Document[]>`
      SELECT * FROM "documents"
      WHERE "board_id" = ${board.id}
        AND "deleted_at" IS NULL
        AND "status" = ${parsed.status}::text::"DocumentStatus"
        AND "search_vector" @@ plainto_tsquery('simple', ${parsed.search})
      ORDER BY "regdate" DESC
      LIMIT 20
    `;
    return docs;
  }

  return ctx.prisma.document.findMany({
    where: {
      boardId: board.id,
      status: parsed.status,
      deletedAt: null,
    },
    orderBy: { regdate: 'desc' },
    take: 20,
  });
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
