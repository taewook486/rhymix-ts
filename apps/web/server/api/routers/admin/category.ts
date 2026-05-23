/**
 * admin.category tRPC 라우터 — SPEC-CONTENT-001 Slice C.
 *
 * DocumentCategory CRUD 를 admin 에게 노출.
 *   - list: boardId 로 트리 조회
 *   - create / update / delete: 카테고리 생성/수정/삭제
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  createCategory,
  listCategoryTree,
  updateCategory,
  deleteCategory,
  CategoryHasChildrenError,
} from '@rhymix-ts/board';

export const adminCategoryRouter = router({
  /**
   * boardId 로 카테고리 트리 조회.
   */
  list: protectedAdminProcedure
    .input(z.object({ boardId: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      listCategoryTree(input.boardId, { prisma: ctx.prisma }),
    ),

  /**
   * 카테고리 생성.
   */
  create: protectedAdminProcedure
    .input(
      z.object({
        boardId: z.number().int().positive(),
        title: z.string().min(1).max(100),
        parentId: z.number().int().positive().nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        listOrder: z.number().int().optional(),
        isDefault: z.boolean().optional(),
        groupIds: z.array(z.number().int()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      createCategory(input, { prisma: ctx.prisma }),
    ),

  /**
   * 카테고리 수정.
   */
  update: protectedAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(100).optional(),
        parentId: z.number().int().positive().nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        listOrder: z.number().int().optional(),
        isDefault: z.boolean().optional(),
        groupIds: z.array(z.number().int()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      updateCategory(input, { prisma: ctx.prisma }),
    ),

  /**
   * 카테고리 삭제.
   * 하위 카테고리가 있으면 CONFLICT.
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteCategory(input.id, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof CategoryHasChildrenError) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: err.message,
          });
        }
        throw err;
      }
    }),
});
