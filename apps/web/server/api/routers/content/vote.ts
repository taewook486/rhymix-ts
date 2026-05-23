/**
 * content.vote tRPC 라우터 — SPEC-CONTENT-001 Slice D.
 *
 * content.vote.toggle: 투표 토글 (인증 필요)
 * content.vote.count: 투표 카운트 조회 (공개)
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { voteDocument, getVoteCount } from '@rhymix-ts/board';

export const contentVoteRouter = router({
  /**
   * 투표 토글 — 동일 type 재호출 시 toggle off.
   */
  toggle: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        voteType: z.enum(['UP', 'DOWN', 'BLAME']),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      voteDocument(
        {
          documentId: input.documentId,
          voterId: String(ctx.session.user.id),
          voteType: input.voteType,
        },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 투표 카운트 조회 — 공개.
   */
  count: publicProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      getVoteCount(input.documentId, { prisma: ctx.prisma }),
    ),
});
