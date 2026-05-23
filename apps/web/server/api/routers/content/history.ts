/**
 * content.history tRPC 라우터 — SPEC-CONTENT-001 Slice D.
 *
 * content.history.document: 문서 수정 이력 조회 (본인/admin)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { getUpdateHistory, BoardPermissionDeniedError } from '@rhymix-ts/board';

/**
 * session.user 로부터 actor 를 빌드한다.
 */
function buildActorWithId(session: {
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

export const contentHistoryRouter = router({
  /**
   * 문서 수정 이력 조회 — 작성자 본인 또는 admin 만 조회 가능.
   */
  document: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getUpdateHistory(
          {
            documentId: input.documentId,
            actor: buildActorWithId(ctx.session),
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof BoardPermissionDeniedError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
        }
        throw err;
      }
    }),
});
