/**
 * content.report tRPC 라우터 — SPEC-CONTENT-001 Slice D.
 *
 * content.report.create: 신고 생성 (인증 필요)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { reportDocument, DuplicateReportError } from '@rhymix-ts/board';

export const contentReportRouter = router({
  /**
   * 신고 생성 — 중복 신고 시 CONFLICT.
   */
  create: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive().optional(),
        commentId: z.number().int().positive().optional(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reportDocument(
          {
            ...input,
            reporterId: String(ctx.session.user.id),
            reporterIp: null,
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof DuplicateReportError) {
          throw new TRPCError({ code: 'CONFLICT', message: err.message });
        }
        throw err;
      }
    }),
});
