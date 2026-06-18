/**
 * admin.document tRPC 라우터 — SPEC-ADMIN-002 Slice 1E
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-153)
 *
 * Cross-board document management:
 * - listAcrossAllBoards: 전체 문서 목록 조회
 * - bulkUpdate: 일괄 처리 (삭제/휴지통 이동/이동/상태 변경)
 * - recoverTemp: 임시 문서 복구
 * - deleteTemp: 임시 문서 영구 삭제
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listDocumentsAcrossAllBoards,
  bulkUpdateDocuments,
  BulkOperationFailedError,
  restoreDocument,
  purgeDocument,
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

  /**
   * 임시 문서 복구 (REQ-ADMIN2-153).
   *
   * TEMP 상태의 문서를 PUBLIC 상태로 복구한다.
   */
  recoverTemp: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const actor = buildAdminActor(ctx.session);

        // 먼저 문서가 TEMP 상태인지 확인
        const doc = await ctx.prisma.document.findUnique({
          where: { id: input.documentId },
          select: { id: true, status: true },
        });

        if (!doc) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '문서를 찾을 수 없습니다.',
          });
        }

        if (doc.status !== 'TEMP') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '임시 문서만 복구할 수 있습니다.',
          });
        }

        // 문서 상태를 PUBLIC로 변경
        const updated = await ctx.prisma.document.update({
          where: { id: input.documentId },
          data: { status: 'PUBLIC' },
        });

        return { success: true, document: updated };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '문서 복구 중 오류가 발생했습니다.',
          cause: err,
        });
      }
    }),

  /**
   * 임시 문서 영구 삭제 (REQ-ADMIN2-153).
   *
   * TEMP 상태의 문서를 영구 삭제한다.
   */
  deleteTemp: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const actor = buildAdminActor(ctx.session);

        // 먼저 문서가 TEMP 상태인지 확인
        const doc = await ctx.prisma.document.findUnique({
          where: { id: input.documentId },
          select: { id: true, status: true },
        });

        if (!doc) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '문서를 찾을 수 없습니다.',
          });
        }

        if (doc.status !== 'TEMP') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '임시 문서만 영구 삭제할 수 있습니다.',
          });
        }

        // purgeDocument 사용 (영구 삭제)
        await purgeDocument({ documentId: input.documentId, actor }, { prisma: ctx.prisma });

        return { success: true, documentId: input.documentId };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '문서 삭제 중 오류가 발생했습니다.',
          cause: err,
        });
      }
    }),
});
