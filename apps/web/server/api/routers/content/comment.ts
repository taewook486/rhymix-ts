/**
 * content.comment tRPC 라우터 — SPEC-CONTENT-001 Slice B (T-011).
 *
 * Comment 도메인 함수를 tRPC 엔드포인트로 노출.
 *   - list (public)
 *   - create / delete (protected)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import {
  listComments,
  createComment,
  deleteComment,
  BoardPermissionDeniedError,
  DocumentOwnershipError,
} from '@rhymix-ts/board';

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
});
