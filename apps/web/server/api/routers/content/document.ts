/**
 * content.document tRPC 라우터 — SPEC-CONTENT-001 Slice B (T-010) + Slice C.
 *
 * Document 도메인 함수를 tRPC 엔드포인트로 노출.
 *   - list (public) / get (public)
 *   - create / update / delete (protected — 로그인 필요)
 *
 * Slice C 변경:
 *   - list: categoryId, tags, sort, cursor, limit 파라미터 추가
 *   - create: categoryId, tags 파라미터 추가
 *
 * actor 는 session.user 에서 추출해 도메인 함수로 주입한다 — 클라이언트가
 * 임의로 isAdmin 을 넘길 수 없도록 안전한 채널 확보.
 */
import { z, ZodError } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
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
} from '@rhymix-ts/document';

/**
 * session.user 로부터 도메인 함수가 기대하는 actor 형태를 만든다.
 * groups 배열의 첫 번째 그룹을 default userGroupSrl 로 사용 — Slice C+ 에서 정련.
 */
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

function buildActor(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userGroupSrl: number; isAdmin: boolean } {
  const { userGroupSrl, isAdmin } = buildActorWithId(session);
  return { userGroupSrl, isAdmin };
}

/**
 * 도메인 예외를 TRPCError 로 변환한다.
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
  // Slice F: extraVars 관련 에러 → BAD_REQUEST (code 프로퍼티로 비교하여 mock 호환성 확보)
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

export const contentDocumentRouter = router({
  /**
   * 게시판 글 목록 조회 — 누구나 호출 가능 (게시판 권한은 도메인에서 처리).
   * Slice C: cursor pagination, categoryId, tags, sort 파라미터 추가.
   */
  list: publicProcedure
    .input(
      z.object({
        moduleInstanceId: z.number().int().positive(),
        status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
        search: z.string().min(1).optional(),
        categoryId: z.number().int().positive().optional(),
        tags: z.array(z.string()).max(10).optional(),
        sort: z.enum(['list_order', 'update_order']).default('list_order'),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => listDocuments(input, { prisma: ctx.prisma })),

  /**
   * 단일 글 조회 — public.
   */
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => getDocument(input.id, { prisma: ctx.prisma })),

  /**
   * 글 작성 — 인증 필수.
   * Slice C: categoryId, tags 파라미터 추가.
   */
  create: protectedProcedure
    .input(
      z.object({
        moduleInstanceId: z.number().int().positive(),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
        categoryId: z.number().int().positive().nullable().optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
        // Slice F 추가
        extraVars: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // REQ-ADMIN2-122: 스팸 필터 가드 (Prisma 생성 이전에 실행)
        const { checkSpamGuard } = await import('@rhymix-ts/admin/spamfilter');
        await checkSpamGuard(
          input.title + ' ' + input.content,
          ctx.ip ?? '127.0.0.1',
          ctx.session.user.id,
          'document.create',
          ctx.prisma,
        );

        return await createDocument(
          {
            moduleInstanceId: input.moduleInstanceId,
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
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
        // Slice F 추가 (PUT semantics: 전달하면 전체 교체)
        extraVars: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
   * 글 삭제 — 인증 필수, 본인 또는 admin. soft delete.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteDocument(
          { id: input.id, actor: buildActorWithId(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
