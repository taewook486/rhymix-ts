/**
 * document.ts — SPEC-CONTENT-001 Slice B (T-006) + Slice C (T-003) + Slice F
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
 * Slice F 변경사항:
 *   - createDocument / updateDocument: extraVars input 추가 (optional, PUT semantics).
 *   - 트랜잭션 외부에서 keys 조회 + 동적 Zod parse.
 *   - ExtraVarsRequiredError / ExtraVarsNotConfiguredError 신규 에러 클래스.
 *
 * REQ-CONTENT-010, REQ-CONTENT-020, REQ-CONTENT-040, REQ-CONTENT-080, REQ-CONTENT-081,
 * REQ-CONTENT-120, REQ-CONTENT-121.
 */
import { z } from 'zod';
// isomorphic-dompurify is lazy-loaded in sanitizeHtml() to avoid loading jsdom
// during Next.js page collection (module init time). This prevents the Windows
// path issue where Turbopack maps __dirname to D:\ROOT.
// Uses a dynamic import (not require) because Next.js's Turbopack server runtime
// executes this module as ESM, where a bare require() throws ReferenceError.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _DOMPurify: any = null;
import { Prisma } from '@prisma/client';
import type { PrismaClient, Document } from '@prisma/client';
import { canPerformAction } from './permissions';
import { incrementDocumentCount } from './category';
import { softDeleteDocument } from './trash';
import { recordUpdate } from './history';
import { buildExtraVarsSchema } from './extra-vars-schema';
import { emitDocumentDeleted } from './events';
// SPEC-POINT-001 REQ-POINT-041: 포인트 훅 연동
import { pointHooks } from '@rhymix-ts/point';
// SPEC-TAG-001 REQ-TAG-002: 태그 upsert 연동
import { upsertTagsOnDocument } from '@rhymix-ts/tag';

// ---------------------------------------------------------------------------
// Slice F: extraVars 관련 에러 클래스
// ---------------------------------------------------------------------------

/**
 * 게시판에 required extra key 가 있는데 input 에 extraVars 가 없을 때.
 */
export class ExtraVarsRequiredError extends Error {
  readonly code = 'EXTRA_VARS_REQUIRED';
  constructor(public readonly boardId: number) {
    super(`Board ${boardId} has required extra keys but extraVars input is missing`);
    this.name = 'ExtraVarsRequiredError';
  }
}

/**
 * 게시판에 extra key 가 없는데 input 에 extraVars 가 있을 때.
 */
export class ExtraVarsNotConfiguredError extends Error {
  readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
  constructor(public readonly boardId: number) {
    super(`Board ${boardId} has no extra keys defined but extraVars input is non-empty`);
    this.name = 'ExtraVarsNotConfiguredError';
  }
}

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
async function sanitizeHtml(html: string): Promise<string> {
  if (!_DOMPurify) {
    const mod = await import('isomorphic-dompurify');
    _DOMPurify = mod.default ?? mod;
  }
  return _DOMPurify.sanitize(html);
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
  // Slice F 추가
  extraVars: z.record(z.string(), z.unknown()).optional(),
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

  // Slice F: extraVars 검증 (트랜잭션 외부)
  let validatedExtraVars: Record<string, unknown> | undefined;
  {
    const keys = await ctx.prisma.documentExtraKey.findMany({
      where: { boardId: board.id, langCode: 'ko' },
      orderBy: { varIdx: 'asc' },
    });

    if (parsed.extraVars !== undefined) {
      if (keys.length === 0 && Object.keys(parsed.extraVars).length > 0) {
        throw new ExtraVarsNotConfiguredError(board.id);
      }
      if (keys.length > 0) {
        const schema = buildExtraVarsSchema(keys);
        validatedExtraVars = schema.parse(parsed.extraVars) as Record<string, unknown>;
      }
    } else {
      // extraVars 미전달 시 required 키 존재 여부 검사
      const hasRequired = keys.some((k) => k.varIsRequired);
      if (hasRequired) {
        throw new ExtraVarsRequiredError(board.id);
      }
    }
  }

  // XSS sanitize
  const safeContent = await sanitizeHtml(parsed.content);
  const safeContentText = toPlainText(safeContent);

  // 작성자 스냅샷 — 목록 렌더와 작성자 검색이 Document 의 nickName /
  // userIdSnapshot 을 직접 읽는다. 호출자마다 채우면 빠뜨리는 경로가 생기므로
  // (실제로 tRPC 경로 두 곳이 nickName: null 을 그대로 넘겨 작성자가 '-' 로
  // 보였다) 이 단일 관문에서 채운다. 비회원 글은 authorId 가 없으니 넘어온
  // nickName 을 그대로 쓰고 userIdSnapshot 은 비운다.
  let authorNickName = parsed.nickName;
  let userIdSnapshot: string | null = null;
  if (parsed.authorId != null) {
    const author = await ctx.prisma.user.findUnique({
      where: { id: parsed.authorId },
      select: { userId: true, nickName: true },
    });
    if (author) {
      authorNickName = authorNickName ?? author.nickName;
      userIdSnapshot = author.userId;
    }
  }

  // categoryId 있으면 트랜잭션 내에서 생성 + incrementDocumentCount
  if (parsed.categoryId !== null) {
    return ctx.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          boardId: board.id,
          authorId: parsed.authorId,
          nickName: authorNickName,
          userIdSnapshot,
          title: parsed.title,
          content: safeContent,
          contentText: safeContentText,
          status: parsed.status,
          categoryId: parsed.categoryId,
          extraVars: validatedExtraVars as Prisma.InputJsonValue | undefined,
        },
      });

      await incrementDocumentCount(parsed.categoryId!, 1, tx as unknown as PrismaClient);

      // SPEC-TAG-001 REQ-TAG-002: 태그 upsert
      if (parsed.tags.length > 0) {
        await upsertTagsOnDocument(
          { documentId: doc.id, tags: parsed.tags },
          { prisma: tx as unknown as PrismaClient },
        );
      }

      // SPEC-POINT-001 REQ-POINT-041: 게시글 작성 포인트 지급
      if (parsed.authorId != null && board.pointPerDocument !== 0) {
        await pointHooks.onDocumentCreated(ctx.prisma, {
          documentId: doc.id,
          authorId: parsed.authorId,
          boardId: board.id,
          pointPerDocument: board.pointPerDocument ?? 0,
        }, tx as Prisma.TransactionClient);
      }

      return doc;
    });
  }

  // categoryId === null: 트랜잭션 불필요 (documentCount 증가 없음)
  const doc = await ctx.prisma.document.create({
    data: {
      boardId: board.id,
      authorId: parsed.authorId,
      nickName: authorNickName,
      userIdSnapshot,
      title: parsed.title,
      content: safeContent,
      contentText: safeContentText,
      status: parsed.status,
      extraVars: validatedExtraVars as Prisma.InputJsonValue | undefined,
    },
  });

  // SPEC-TAG-001 REQ-TAG-002: 태그 upsert (best-effort)
  if (parsed.tags.length > 0) {
    await upsertTagsOnDocument(
      { documentId: doc.id, tags: parsed.tags },
      { prisma: ctx.prisma },
    );
  }

  // SPEC-POINT-001 REQ-POINT-041: 게시글 작성 포인트 지급 (best-effort, 트랜잭션 외부)
  if (parsed.authorId != null && (board.pointPerDocument ?? 0) !== 0) {
    await pointHooks.onDocumentCreated(ctx.prisma, {
      documentId: doc.id,
      authorId: parsed.authorId,
      boardId: board.id,
      pointPerDocument: board.pointPerDocument ?? 0,
    });
  }

  return doc;
}

// ---------------------------------------------------------------------------
// updateDocument
// ---------------------------------------------------------------------------

const UpdateDocumentSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  actor: AuthorActorSchema,
  // Slice F 추가 (PUT semantics: 전달하면 전체 교체)
  extraVars: z.record(z.string(), z.unknown()).optional(),
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

  // Slice F: extraVars 검증 (PUT semantics, 트랜잭션 외부)
  let validatedExtraVars: Record<string, unknown> | undefined;
  if (parsed.extraVars !== undefined) {
    const keys = await ctx.prisma.documentExtraKey.findMany({
      where: { boardId: doc.boardId, langCode: 'ko' },
      orderBy: { varIdx: 'asc' },
    });

    if (keys.length === 0 && Object.keys(parsed.extraVars).length > 0) {
      throw new ExtraVarsNotConfiguredError(doc.boardId);
    }
    if (keys.length > 0) {
      const schema = buildExtraVarsSchema(keys);
      validatedExtraVars = schema.parse(parsed.extraVars) as Record<string, unknown>;
    }
  }

  // 부분 업데이트 페이로드 구성
  const data: Prisma.DocumentUpdateInput = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.status !== undefined) data.status = parsed.status;
  if (parsed.content !== undefined) {
    const safeContent = await sanitizeHtml(parsed.content);
    data.content = safeContent;
    data.contentText = toPlainText(safeContent);
  }
  if (validatedExtraVars !== undefined) data.extraVars = validatedExtraVars as Prisma.InputJsonValue;

  // @MX:NOTE [AUTO]: recordUpdate 를 반드시 트랜잭션 내에서 호출.
  // @MX:REASON: board.updateLog=true 면 audit 의무 — 트랜잭션 외 호출 금지.
  // @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-110
  const board = doc.board as { updateLog?: boolean };
  const titleChanged = parsed.title !== undefined && parsed.title !== doc.title;
  const contentChanged = parsed.content !== undefined &&
    (await sanitizeHtml(parsed.content)) !== doc.content;
  const shouldLog = board.updateLog === true && (titleChanged || contentChanged);

  if (shouldLog) {
    return ctx.prisma.$transaction(async (tx) => {
      await recordUpdate(
        {
          documentId: doc.id,
          prevTitle: doc.title,
          prevContent: doc.content,
          prevExtraVars: null,
          editorId: parsed.actor.userId,
          editorIp: null,
        },
        tx as unknown as PrismaClient,
      );
      const updated = await (tx as unknown as PrismaClient).document.update({
        where: { id: parsed.id },
        data,
      });

      // SPEC-TAG-001 REQ-TAG-002: 태그 upsert
      if (parsed.tags !== undefined) {
        await upsertTagsOnDocument(
          { documentId: doc.id, tags: parsed.tags },
          { prisma: tx as unknown as PrismaClient },
        );
      }

      return updated;
    });
  }

  const updated = await ctx.prisma.document.update({
    where: { id: parsed.id },
    data,
  });

  // SPEC-TAG-001 REQ-TAG-002: 태그 upsert (best-effort)
  if (parsed.tags !== undefined) {
    await upsertTagsOnDocument(
      { documentId: doc.id, tags: parsed.tags },
      { prisma: ctx.prisma },
    );
  }

  return updated;
}

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

const DeleteDocumentSchema = z.object({
  id: z.number().int().positive(),
  actor: AuthorActorSchema,
});

export type DeleteDocumentInput = z.input<typeof DeleteDocumentSchema>;

/**
 * FTS 로 고른 id 목록을 Prisma 타입 API 로 되읽어 원래 순서대로 돌려준다.
 *
 * 원시 SQL 의 SELECT * 는 tsvector 컬럼까지 반환해 Prisma 가 역직렬화하지 못한다.
 * id 만 원시로 고르고 본문은 타입 있는 경로로 가져오면 그 문제가 사라지고
 * 컬럼 목록을 손으로 나열할 필요도 없다.
 */
async function fetchDocumentsInOrder(
  ids: number[],
  ctx: { prisma: PrismaClient },
): Promise<Document[]> {
  if (ids.length === 0) return [];
  const rows = await ctx.prisma.document.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((d): d is Document => d !== undefined);
}

/**
 * deleteDocument — softDeleteDocument 의 thin wrapper.
 * Slice B/C 의 외부 호출 시그니처/반환 타입을 유지하면서
 * Trash 생성 로직을 trash.ts 로 위임한다 (DD-1~DD-3 회귀 보호).
 */
export async function deleteDocument(
  input: DeleteDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = DeleteDocumentSchema.parse(input);

  const { document } = await softDeleteDocument(
    {
      documentId: parsed.id,
      deletedById: parsed.actor.userId,
      actor: parsed.actor,
    },
    ctx,
  );

  // 이벤트 발행: 파일 cascade delete 트리거
  emitDocumentDeleted({
    documentId: document.id,
    boardId: document.boardId,
    deletedById: parsed.actor.userId,
  });

  return document;
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
  // SPEC-BOARD-UI-001: sort 확장 (latest, recommend, views 추가)
  sort: z.enum(['list_order', 'update_order', 'latest', 'recommend', 'views']).default('list_order'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  // SPEC-BOARD-UI-001: offset pagination (page 모드)
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().refine((val) => val === undefined || [10, 20, 30, 50].includes(val), {
    message: 'pageSize must be one of 10, 20, 30, 50',
  }).optional(),
  // SPEC-BOARD-UI-001: search 필드 구분
  searchField: z.enum(['title', 'content', 'author']).optional(),
});

export type ListDocumentsInput = z.input<typeof ListDocumentsSchema>;

// @MX:NOTE [AUTO]: offset pagination 모드에서는 totalCount, totalPages, currentPage, pageSize 추가
// @MX:REASON: page 파라미터 있으면 offset 모드, 없으면 cursor 모드 (기존 호환성 유지)
export interface DocumentListResult {
  notices: Document[];
  items: Document[];
  nextCursor: string | null;
  // SPEC-BOARD-UI-001: offset pagination 필드 (page 모드 시에만 존재)
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

export async function listDocuments(
  input: ListDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentListResult> {
  const parsed = ListDocumentsSchema.parse(input);

  // page 모드와 cursor 모드 분기
  const isOffsetMode = parsed.page !== undefined;
  const pageSize = parsed.pageSize ?? 20; // page 모드 기본값 20

  const board = await ctx.prisma.board.findUnique({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  if (!board) {
    return { notices: [], items: [], nextCursor: null };
  }

  // @MX:NOTE [AUTO]: searchField 없이 search만 있으면 기본값 'title'
  // @MX:REASON: 기존 FTS 검색(content)은 searchField='content'로 명시해야 유지됨
  const searchField = parsed.searchField ?? (parsed.search ? 'title' : undefined);

  // sort 필드 매핑
  const sortFieldMap: Record<string, 'listOrder' | 'updateOrder' | 'votedCount' | 'readedCount'> = {
    list_order: 'listOrder',
    update_order: 'updateOrder',
    latest: 'listOrder', // latest는 listOrder와 동일
    recommend: 'votedCount',
    views: 'readedCount',
  };
  const sortField = sortFieldMap[parsed.sort] ?? 'listOrder';

  // ---------------------------------------------------------------------------
  // 검색 처리 (searchField에 따라 분기)
  // ---------------------------------------------------------------------------

  if (parsed.search) {
    const searchWhere: Record<string, unknown> = {
      boardId: board.id,
      status: parsed.status,
      deletedAt: null,
      isNotice: false, // 검색 시 공지 제외
    };

    if (parsed.categoryId !== undefined) {
      searchWhere.categoryId = parsed.categoryId;
    }
    if (parsed.tags && parsed.tags.length > 0) {
      searchWhere.tags = { hasEvery: parsed.tags };
    }

    // searchField별 처리
    if (searchField === 'content') {
      // FTS 검색 (기존 방식 유지)
      if (isOffsetMode) {
        // offset pagination with FTS
        const offset = (parsed.page! - 1) * pageSize;
        // 원시 SQL 은 FTS 조건으로 id 만 고른다. SELECT * 로 행을 통째로 가져오면
        // tsvector 컬럼(searchVector)까지 딸려와 Prisma 가 역직렬화에 실패한다
        // ("Failed to deserialize column of type 'tsvector'").
        const matched = await ctx.prisma.$queryRaw<Array<{ id: number }>>`
          SELECT "id" FROM "documents"
          WHERE "boardId" = ${board.id}
            AND "deletedAt" IS NULL
            AND "status" = ${parsed.status}::text::"DocumentStatus"
            AND "isNotice" = false
            AND "searchVector" @@ plainto_tsquery('simple', ${parsed.search})
          ORDER BY "regdate" DESC
          LIMIT ${pageSize}
          OFFSET ${offset}
        `;
        const docs = await fetchDocumentsInOrder(matched.map((r) => r.id), ctx);

        // totalCount 조회 (FTS)
        const countResult = await ctx.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "documents"
          WHERE "boardId" = ${board.id}
            AND "deletedAt" IS NULL
            AND "status" = ${parsed.status}::text::"DocumentStatus"
            AND "isNotice" = false
            AND "searchVector" @@ plainto_tsquery('simple', ${parsed.search})
        `;
        const totalCount = Number(countResult[0]?.count ?? 0);
        const totalPages = Math.ceil(totalCount / pageSize);

        return {
          notices: [],
          items: docs,
          nextCursor: null,
          totalCount,
          totalPages,
          currentPage: parsed.page,
          pageSize,
        };
      } else {
        // cursor mode (기존 동작)
        const limit = parsed.limit ?? (board.listCount ?? 20);
        const matched = await ctx.prisma.$queryRaw<Array<{ id: number }>>`
          SELECT "id" FROM "documents"
          WHERE "boardId" = ${board.id}
            AND "deletedAt" IS NULL
            AND "status" = ${parsed.status}::text::"DocumentStatus"
            AND "isNotice" = false
            AND "searchVector" @@ plainto_tsquery('simple', ${parsed.search})
          ORDER BY "regdate" DESC
          LIMIT ${limit}
        `;
        const docs = await fetchDocumentsInOrder(matched.map((r) => r.id), ctx);
        return { notices: [], items: docs, nextCursor: null };
      }
    } else if (searchField === 'title') {
      // 제목 검색 (contains insensitive)
      searchWhere.title = { contains: parsed.search, mode: 'insensitive' };
    } else if (searchField === 'author') {
      // 작성자 검색 (nickName OR userIdSnapshot)
      searchWhere.OR = [
        { nickName: { contains: parsed.search, mode: 'insensitive' } },
        { userIdSnapshot: { contains: parsed.search, mode: 'insensitive' } },
      ];
    }

    // title/author 검색 실행
    if (isOffsetMode) {
      const offset = (parsed.page! - 1) * pageSize;
      const [items, totalCount] = await Promise.all([
        ctx.prisma.document.findMany({
          where: searchWhere,
          orderBy: [{ [sortField]: 'desc' }, { id: 'desc' }],
          skip: offset,
          take: pageSize,
        }),
        ctx.prisma.document.count({ where: searchWhere }),
      ]);
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        notices: [],
        items,
        nextCursor: null,
        totalCount,
        totalPages,
        currentPage: parsed.page,
        pageSize,
      };
    } else {
      // cursor mode (title/author 검색도 cursor 미지원 시 전체 반환)
      const limit = parsed.limit ?? (board.listCount ?? 20);
      const items = await ctx.prisma.document.findMany({
        where: searchWhere,
        orderBy: [{ [sortField]: 'desc' }, { id: 'desc' }],
        take: limit,
      });
      return { notices: [], items, nextCursor: null };
    }
  }

  // ---------------------------------------------------------------------------
  // 비검색 모드 (공지 + 일반 목록)
  // ---------------------------------------------------------------------------

  // 공지 쿼리 (검색 아닌 경우에만)
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

  // 일반 목록 where 조건
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

  // offset pagination mode
  if (isOffsetMode) {
    const offset = (parsed.page! - 1) * pageSize;

    const [items, totalCount] = await Promise.all([
      ctx.prisma.document.findMany({
        where: baseItemWhere,
        orderBy: [{ [sortField]: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: pageSize,
      }),
      ctx.prisma.document.count({ where: baseItemWhere }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    // @MX:NOTE [AUTO]: notices는 totalCount에 포함되지 않음 (공지는 매 페이지 반복)
    // @MX:REASON: 레거시 Rhymix 동작 — 공지는 목록 상단 고정으로 페이지네이션에서 제외
    return {
      notices,
      items,
      nextCursor: null,
      totalCount,
      totalPages,
      currentPage: parsed.page,
      pageSize,
    };
  }

  // ---------------------------------------------------------------------------
  // cursor pagination mode (기존 동작 유지)
  // ---------------------------------------------------------------------------

  const limit = parsed.limit ?? (board.listCount ?? 20);

  // cursor 디코딩
  let cursorDecoded: { listOrder: bigint; id: number } | null = null;
  if (parsed.cursor) {
    cursorDecoded = decodeCursor(parsed.cursor);
  }

  // cursor 조건
  if (cursorDecoded !== null) {
    const { listOrder, id } = cursorDecoded;
    baseItemWhere.OR = [
      { listOrder: { lt: listOrder } },
      { listOrder: { equals: listOrder }, id: { lt: id } },
    ];
  }

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
): Promise<Document & {
  author: { id: number; userId: string; nickName: string } | null;
  // SPEC-TAG-001 REQ-TAG-003: tags 는 DocumentTag 조인을 통해 매핑된 string[]
  tags: string[];
}> {
  const doc = await ctx.prisma.document.findUniqueOrThrow({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          userId: true,
          nickName: true,
        },
      },
      // SPEC-TAG-001: DocumentTag 조인 테이블을 통해 태그 이름만 select
      documentTags: {
        select: {
          tag: { select: { name: true } },
        },
      },
    },
  }) as Document & {
    author: { id: number; userId: string; nickName: string } | null;
    documentTags: Array<{ tag: { name: string } }>;
  };

  // DocumentTag[] → string[] 매핑 (REQ-TAG-003 게시물 상세 뷰 태그 표시)
  // 위 include 가 documentTags 를 항상 지정하므로 undefined 일 수 없다.
  const tags = doc.documentTags.map((dt) => dt.tag.name);
  return { ...doc, tags };
}
