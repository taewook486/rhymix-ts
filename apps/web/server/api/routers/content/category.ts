/**
 * content.category tRPC 라우터 — SPEC-CONTENT-001 Slice C.
 *
 * 공개 카테고리 트리 조회 엔드포인트.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { listCategoryTree } from '@rhymix-ts/board';

export const contentCategoryRouter = router({
  /**
   * boardId 로 카테고리 트리 조회 — 누구나 호출 가능.
   */
  tree: publicProcedure
    .input(z.object({ boardId: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      listCategoryTree(input.boardId, { prisma: ctx.prisma }),
    ),
});
