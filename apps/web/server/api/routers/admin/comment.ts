/**
 * admin.comment tRPC 라우터 — SPEC-ADMIN-002 Slice 1E
 *
 * Cross-board comment management:
 * - listAcrossAllBoards: 전체 댓글 목록 조회
 * - bulkDelete: 일괄 삭제 (cascade to replies)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listCommentsAcrossAllBoards,
  bulkDeleteComments,
} from '@rhymix-ts/comment';

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

export const adminCommentRouter = router({
  /**
   * 전체 댓글 목록 조회 (admin 전용).
   */
  listAcrossAllBoards: protectedAdminProcedure
    .input(
      z.object({
        moduleInstanceId: z.number().int().positive().optional(),
        authorId: z.number().int().positive().optional(),
        search: z.string().min(1).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listCommentsAcrossAllBoards(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 댓글 일괄 삭제 (admin 전용, cascade to replies).
   */
  bulkDelete: protectedAdminProcedure
    .input(
      z.object({
        commentIds: z.array(z.number().int().positive()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      bulkDeleteComments(
        { commentIds: input.commentIds, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),
});
