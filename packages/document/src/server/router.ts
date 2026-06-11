/**
 * packages/document/src/server/router.ts
 *
 * tRPC 라우터 팩토리 — SPEC-DOCUMENT-001 Slice B (REQ-DOC-100~104).
 *
 * apps/web 에서 사용하는 공통 문서 라우터를 패키지 레벨에서 제공.
 * 순환 의존성 방지를 위해 팩토리 함수 형태로 내보낸다.
 *
 * @MX:NOTE [AUTO]: 팩토리 패턴을 사용하여 apps/web에 대한 의존성 제거.
 * @MX:REASON: packages/document는 apps/web을 직접 import할 수 없음(단방향 의존).
 */
import { z, ZodError } from 'zod';
import { TRPCError } from '@trpc/server';
import type {
  TRPCRouterRecord,
  AnyProcedure,
} from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  ExtraVarsRequiredError,
  ExtraVarsNotConfiguredError,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DeleteDocumentInput,
  type ListDocumentsInput,
} from '../document';

// ---------------------------------------------------------------------------
// 도메인 예외를 TRPCError 로 변환하는 헬퍼
// ---------------------------------------------------------------------------

/**
 * 도메인 계층에서 발생한 에러를 tRPC 에러로 변환한다.
 */
function mapDomainError(err: unknown): never {
  if (err instanceof BoardPermissionDeniedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof DocumentOwnershipError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  // ZodError from domain (extraVars 검증 실패) → BAD_REQUEST
  if (err instanceof ZodError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message, cause: err });
  }
  // Slice F: extraVars 관련 에러 → BAD_REQUEST
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    if (code === 'EXTRA_VARS_REQUIRED' || err instanceof ExtraVarsRequiredError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
    if (code === 'EXTRA_VARS_NOT_CONFIGURED' || err instanceof ExtraVarsNotConfiguredError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Actor 빌더 헬퍼
// ---------------------------------------------------------------------------

/**
 * 세션에서 도메인 함수가 기대하는 actor 형태를 추출한다.
 */
function buildActor(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userGroupSrl: number; isAdmin: boolean } {
  const groupId =
    Array.isArray(session.user.groups) && session.user.groups.length > 0
      ? session.user.groups[0]?.id ?? 1
      : 1;
  return {
    userGroupSrl: groupId,
    isAdmin: session.user.isAdmin,
  };
}

function buildActorWithId(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userId: number; userGroupSrl: number; isAdmin: boolean } {
  const groupId =
    Array.isArray(session.user.groups) && session.user.groups.length > 0
      ? session.user.groups[0]?.id ?? 1
      : 1;
  return {
    userId: session.user.id,
    userGroupSrl: groupId,
    isAdmin: session.user.isAdmin,
  };
}

// ---------------------------------------------------------------------------
// 라우터 팩토리 타입 정의
// ---------------------------------------------------------------------------

/** 공개 프로시저 컨텍스트 타입 */
type PubCtx = { prisma: PrismaClient; session: null | unknown };

/** 인증 필요 프로시저 컨텍스트 타입 */
type ProCtx = {
  prisma: PrismaClient;
  session: { user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number }> } };
};

/**
 * tRPC 라우터 팩토리에 전달되는 빌딩 블록 타입.
 */
export interface TrpcBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: (record: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicProcedure: AnyProcedure | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protectedProcedure: AnyProcedure | any;
}

// ---------------------------------------------------------------------------
// 라우터 팩토리 함수
// ---------------------------------------------------------------------------

/**
 * 문서 라우터를 생성하는 팩토리 함수.
 *
 * @param trpc - tRPC 빌딩 블록 (router, publicProcedure, protectedProcedure)
 * @returns tRPC 라우터 객체
 *
 * 구현된 프로시저:
 * - list({ boardId, categoryId?, tags?, sort?, cursor?, limit? }) - 공개
 * - get({ id }) - 공개
 * - search({ boardId, query, cursor?, limit? }) - 공개
 * - create(input) - 인증 필요
 * - update({ id, ...input }) - 인증 필요
 * - delete({ id }) - 인증 필요
 * - unlockSecret({ documentId, password }) - 공개
 * - publishDraft({ documentId }) - 인증 필요
 */
export function createDocumentRouter<
  TProcedure extends AnyProcedure,
  TProtectedProcedure extends AnyProcedure
>(trpc: {
  router: <T extends TRPCRouterRecord>(record: T) => T;
  publicProcedure: TProcedure;
  protectedProcedure: TProtectedProcedure;
}) {
  const { router, publicProcedure, protectedProcedure } = trpc;

  return router({
    /**
     * 게시판 글 목록 조회 — 누구나 호출 가능.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list: (publicProcedure as any)
      .input(
        z.object({
          boardId: z.number().int().positive(),
          categoryId: z.number().int().positive().optional(),
          tags: z.array(z.string().max(10)).optional(),
          sort: z.enum(['list_order', 'update_order']).default('list_order'),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: PubCtx; input: any }) => {
        return listDocuments(
          {
            moduleInstanceId: input.boardId,
            categoryId: input.categoryId,
            tags: input.tags,
            sort: input.sort,
            cursor: input.cursor,
            limit: input.limit,
          },
          { prisma: ctx.prisma as PrismaClient },
        );
      }),

    /**
     * 단일 글 조회 — 공개.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (publicProcedure as any)
      .input(z.object({ id: z.number().int().positive() }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: PubCtx; input: any }) => {
        const doc = await getDocument(input.id, { prisma: ctx.prisma as PrismaClient });
        // password 필드 제거
        const { password, ...docWithoutPassword } = doc as { password?: string };
        return docWithoutPassword;
      }),

    /**
     * 게시판 글 검색 — 누구나 호출 가능.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    search: (publicProcedure as any)
      .input(
        z.object({
          boardId: z.number().int().positive(),
          query: z.string().min(1),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: PubCtx; input: any }) => {
        return listDocuments(
          {
            moduleInstanceId: input.boardId,
            search: input.query,
            cursor: input.cursor,
            limit: input.limit,
          },
          { prisma: ctx.prisma as PrismaClient },
        );
      }),

    /**
     * 글 작성 — 인증 필수.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (protectedProcedure as any)
      .input(
        z.object({
          boardId: z.number().int().positive(),
          title: z.string().min(1).max(200),
          content: z.string().min(1),
          status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
          categoryId: z.number().int().positive().nullable().optional(),
          tags: z.array(z.string().max(50)).max(20).optional(),
          extraVars: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          return await createDocument(
            {
              moduleInstanceId: input.boardId,
              authorId: ctx.session.user.id,
              title: input.title,
              content: input.content,
              nickName: null,
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
              ...(input.tags !== undefined ? { tags: input.tags } : {}),
              ...(input.extraVars !== undefined ? { extraVars: input.extraVars } : {}),
              actor: buildActor(ctx.session),
            },
            { prisma: ctx.prisma },
          );
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 글 수정 — 인증 필수, 본인 또는 admin.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (protectedProcedure as any)
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(1).max(200).optional(),
          content: z.string().min(1).optional(),
          status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
          extraVars: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          return await updateDocument(
            {
              id: input.id,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.content !== undefined ? { content: input.content } : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.extraVars !== undefined ? { extraVars: input.extraVars } : {}),
              actor: buildActorWithId(ctx.session),
            },
            { prisma: ctx.prisma },
          );
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 글 삭제 — 인증 필수, 본인 또는 admin.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (protectedProcedure as any)
      .input(z.object({ id: z.number().int().positive() }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          return await deleteDocument(
            { id: input.id, actor: buildActorWithId(ctx.session) },
            { prisma: ctx.prisma },
          );
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 비밀글 잠금 해제 — 공개.
     *
     * REQ-DOC-050~055 구현 후 추가 예정.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unlockSecret: (publicProcedure as any)
      .input(
        z.object({
          documentId: z.number().int().positive(),
          password: z.string().min(1),
        }),
      )
      .mutation(() => {
        // TODO: Slice C backend - unlockSecret 구현 필요
        throw new Error('unlockSecret not implemented yet - Slice C');
      }),

    /**
     * 임시글 발행 — 인증 필수.
     *
     * REQ-DOC-060~064 구현 후 추가 예정.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publishDraft: (protectedProcedure as any)
      .input(z.object({ documentId: z.number().int().positive() }))
      .mutation(() => {
        // TODO: Slice C backend - publishDraft 구현 필요
        throw new Error('publishDraft not implemented yet - Slice C');
      }),
  });
}
