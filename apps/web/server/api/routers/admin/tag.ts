/**
 * admin.tag tRPC 라우터 — SPEC-TAG-001
 *
 * Admin tag management operations:
 * - list: 태그 목록 조회 (REQ-TAG-006)
 * - merge: 태그 병합 (REQ-TAG-006)
 * - rename: 태그 이름 변경 (REQ-TAG-006)
 * - delete: 태그 삭제 (REQ-TAG-006)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listTags,
  mergeTags,
  renameTag,
  deleteTag,
  TagNotFoundError,
  TagAlreadyExistsError,
} from '@rhymix-ts/tag';

/**
 * 도메인 예외를 TRPCError 로 변환한다.
 */
function mapDomainError(err: unknown): never {
  if (err instanceof TagNotFoundError) {
    throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
  }
  if (err instanceof TagAlreadyExistsError) {
    throw new TRPCError({ code: 'CONFLICT', message: err.message });
  }
  throw err;
}

export const adminTagRouter = router({
  /**
   * 태그 목록 조회 — REQ-TAG-006
   *
   * 페이지네이션된 태그 목록을 반환한다.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        sortBy: z.enum(['name', 'count', 'createdAt']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listTags(
        {
          page: input.page,
          pageSize: input.pageSize,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
        },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 태그 병합 — REQ-TAG-006
   *
   * sourceTag를 targetTag로 병합한다.
   * sourceTag가 붙은 모든 문서가 targetTag로 변경된다.
   */
  merge: protectedAdminProcedure
    .input(
      z.object({
        sourceTagId: z.number().int().positive(),
        targetTagId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await mergeTags(
          {
            sourceTagId: input.sourceTagId,
            targetTagId: input.targetTagId,
          },
          { prisma: ctx.prisma },
        );
        return { success: true };
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * 태그 이름 변경 — REQ-TAG-006
   */
  rename: protectedAdminProcedure
    .input(
      z.object({
        tagId: z.number().int().positive(),
        newName: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await renameTag(
          { tagId: input.tagId, newName: input.newName },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * 태그 삭제 — REQ-TAG-006
   *
   * 연결된 게시물에서 자동 제거된다.
   */
  delete: protectedAdminProcedure
    .input(z.object({ tagId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteTag({ tagId: input.tagId }, { prisma: ctx.prisma });
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
