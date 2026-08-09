/**
 * admin.trash tRPC 라우터 — SPEC-CONTENT-001 Slice D + SPEC-CONTENT-PARITY-001 M2.
 *
 * admin.trash.list:           문서 휴지통 목록 조회
 * admin.trash.restore:        문서 복원
 * admin.trash.purge:          문서 영구 삭제
 * admin.trash.listComments:   댓글 휴지통(가상 뷰) 목록 조회 (M2, REQ-CPAR-003~004)
 * admin.trash.restoreComment: 댓글 복원 (M2, REQ-CPAR-005)
 * admin.trash.purgeComment:   댓글 영구 삭제 (M2, REQ-CPAR-006)
 * admin.trash.empty:          범위별(all/document/comment) 휴지통 비우기 (M2, REQ-CPAR-007)
 *
 * design.md D-3: 댓글은 `Trash` 모델을 확장하지 않고 `Comment.deletedAt` 기반 가상 뷰로
 * 통합한다. 화면은 두 데이터 소스를 타입 필터로 오간다.
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
import {
  listDeletedComments,
  restoreComment as restoreCommentDomain,
  purgeComment as purgeCommentDomain,
  CommentNotFoundError,
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

  // ---------------------------------------------------------------------
  // M2 (REQ-CPAR-003~008, design.md D-3) — 댓글 휴지통(가상 뷰)
  // ---------------------------------------------------------------------

  /**
   * 댓글 휴지통(가상 뷰) 목록 조회 — Comment.deletedAt IS NOT NULL.
   */
  listComments: protectedAdminProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listDeletedComments(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 댓글 복원.
   */
  restoreComment: protectedAdminProcedure
    .input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await restoreCommentDomain(
          { commentId: input.commentId, actor: buildAdminActor(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof CommentNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        }
        throw err;
      }
    }),

  /**
   * 댓글 영구 삭제 (자식 답글 포함 cascade).
   */
  purgeComment: protectedAdminProcedure
    .input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await purgeCommentDomain(
          { commentId: input.commentId, actor: buildAdminActor(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof CommentNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        }
        throw err;
      }
    }),

  /**
   * 휴지통 비우기 — 범위(전체/문서만/댓글만) 선택 후 일괄 영구 삭제.
   *
   * @MX:WARN [AUTO]: 범위 내 전체 항목을 영구 삭제한다. 복구 불가.
   * @MX:REASON: 댓글은 부모 purge 시 자식이 cascade로 함께 삭제되므로, 이미 삭제된
   *             자식 항목을 순회 중 만나면(CommentNotFoundError) 건너뛴다 — 실패로
   *             집계하지 않는다.
   */
  empty: protectedAdminProcedure
    .input(z.object({ scope: z.enum(['all', 'document', 'comment']) }))
    .mutation(async ({ ctx, input }) => {
      const actor = buildAdminActor(ctx.session);
      let documentsPurged = 0;
      let commentsPurged = 0;

      if (input.scope === 'all' || input.scope === 'document') {
        const trashRows = await ctx.prisma.trash.findMany({
          select: { documentId: true },
        });
        for (const row of trashRows) {
          await purgeDocument({ documentId: row.documentId, actor }, { prisma: ctx.prisma });
          documentsPurged += 1;
        }
      }

      if (input.scope === 'all' || input.scope === 'comment') {
        const deletedComments = await ctx.prisma.comment.findMany({
          where: { deletedAt: { not: null } },
          select: { id: true },
        });
        for (const row of deletedComments) {
          try {
            await purgeCommentDomain({ commentId: row.id, actor }, { prisma: ctx.prisma });
            commentsPurged += 1;
          } catch (err) {
            if (err instanceof CommentNotFoundError) {
              // 부모 comment의 purge cascade로 이미 삭제됨 — 건너뜀.
              continue;
            }
            throw err;
          }
        }
      }

      return { documentsPurged, commentsPurged };
    }),
});
