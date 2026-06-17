/**
 * admin.document tRPC 라우터 — SPEC-ADMIN-002 Slice 1E
 *
 * Cross-board document management:
 * - listAcrossAllBoards: 전체 문서 목록 조회
 * - bulkUpdate: 일괄 처리 (삭제/휴지통 이동/이동/상태 변경)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listDocumentsAcrossAllBoards,
  bulkUpdateDocuments,
  BulkOperationFailedError,
} from '@rhymix-ts/document';

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

export const adminDocumentRouter = router({
  /**
   * 전체 문서 목록 조회 (admin 전용).
   */
  listAcrossAllBoards: protectedAdminProcedure
    .input(
      z.object({
        moduleInstanceId: z.number().int().positive().optional(),
        authorId: z.number().int().positive().optional(),
        status: z.enum(['PUBLIC', 'SECRET', 'TEMP', 'DECLARED']).optional(),
        search: z.string().min(1).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listDocumentsAcrossAllBoards(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 문서 일괄 처리 (admin 전용).
   */
  bulkUpdate: protectedAdminProcedure
    .input(
      z.object({
        documentIds: z.array(z.number().int().positive()).min(1).max(100),
        action: z.enum(['delete', 'trash', 'move', 'status']),
        targetBoardId: z.number().int().positive().optional(),
        targetStatus: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkUpdateDocuments(
          {
            documentIds: input.documentIds,
            action: input.action,
            targetBoardId: input.targetBoardId,
            targetStatus: input.targetStatus,
            actor: buildAdminActor(ctx.session),
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof BulkOperationFailedError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message,
            cause: err,
          });
        }
        throw err;
      }
    }),
});
