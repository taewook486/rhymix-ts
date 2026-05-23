/**
 * admin.trash tRPC 라우터 — SPEC-CONTENT-001 Slice D.
 *
 * admin.trash.list:    휴지통 목록 조회
 * admin.trash.restore: 복원
 * admin.trash.purge:   영구 삭제
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listTrash,
  restoreDocument,
  purgeDocument,
  TrashNotFoundError,
  TrashExpiredError,
} from '@rhymix-ts/board';

function buildAdminActor(session: {
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

export const adminTrashRouter = router({
  /**
   * 휴지통 목록 조회.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        boardId: z.number().int().positive().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listTrash(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 문서 복원.
   */
  restore: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await restoreDocument(
          { documentId: input.documentId, actor: buildAdminActor(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof TrashNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        }
        if (err instanceof TrashExpiredError) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: err.message });
        }
        throw err;
      }
    }),

  /**
   * 문서 영구 삭제 (cascade).
   */
  purge: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      purgeDocument(
        { documentId: input.documentId, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),
});
