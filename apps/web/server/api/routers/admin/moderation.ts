/**
 * admin.moderation tRPC 라우터 — SPEC-CONTENT-001 Slice D.
 *
 * admin.moderation.reports:       신고 목록 조회
 * admin.moderation.resolveReport: 신고 해결 처리
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { listReports, resolveReport } from '@rhymix-ts/board';

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

export const adminModerationRouter = router({
  /**
   * 신고 목록 조회.
   */
  reports: protectedAdminProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        targetType: z.enum(['document', 'comment']).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) =>
      listReports(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 신고 해결 처리.
   */
  resolveReport: protectedAdminProcedure
    .input(z.object({ reportId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      resolveReport(
        { reportId: input.reportId, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),
});
