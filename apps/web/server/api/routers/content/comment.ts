/**
 * content.comment tRPC 라우터 — SPEC-COMMENT-001 Slice C.
 *
 * Comment 도메인 함수를 tRPC 엔드포인트로 노출.
 *   - list (public)
 *   - create / delete / vote / report (protected)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import {
  listComments,
  createComment,
  deleteComment,
  voteComment,
  reportComment,
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  CommentDepthExceededError,
  SelfVoteNotAllowedError,
  CommentAlreadyReportedError,
} from '@rhymix-ts/comment';

function buildActor(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userGroupSrl: number; isAdmin: boolean } {
  const groupId =
    Array.isArray(session.user.groups) && session.user.groups.length > 0
      ? session.user.groups[0]?.id ?? 1
      : 1;
  return { userGroupSrl: groupId, isAdmin: session.user.isAdmin };
}

function buildActorWithId(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userId: number; userGroupSrl: number; isAdmin: boolean } {
  const { userGroupSrl, isAdmin } = buildActor(session);
  return { userId: session.user.id, userGroupSrl, isAdmin };
}

function mapDomainError(err: unknown): never {
  if (err instanceof BoardPermissionDeniedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof DocumentOwnershipError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof CommentDepthExceededError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof SelfVoteNotAllowedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof CommentAlreadyReportedError) {
    throw new TRPCError({ code: 'CONFLICT', message: err.message });
  }
  throw err;
}

export const contentCommentRouter = router({
  list: publicProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => listComments(input, { prisma: ctx.prisma })),

  create: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().optional(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createComment(
          {
            documentId: input.documentId,
            parentId: input.parentId ?? null,
            content: input.content,
            authorId: ctx.session.user.id,
            nickName: null,
            actor: buildActor(ctx.session),
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteComment(
          { id: input.id, actor: buildActorWithId(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  vote: protectedProcedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        voteType: z.number().int().refine((v) => v === 1 || v === -1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await voteComment(
          {
            commentId: input.commentId,
            memberId: ctx.session.user.id,
            voteType: input.voteType,
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  report: protectedProcedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        reason: z.string().min(1).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await reportComment(
          {
            commentId: input.commentId,
            reporterId: ctx.session.user.id,
            reporterIp: null, // TODO: extract from request headers
            reason: input.reason,
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
