/**
 * public.poll tRPC router — SPEC-POLL-001
 *
 * 공개 설문 조회:
 * - get: 단건 설문 조회 (옵션 포함)
 * - results: 설문 투표 결과
 * - canVote: 투표 가능 여부 확인
 *
 * @MX:SPEC: SPEC-POLL-001 REQ-POLL-003, REQ-POLL-004
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../../trpc';
import { getPollResults, canUserVote, PollNotFoundError } from '@rhymix-ts/poll';

export const publicPollRouter = router({
  // 단건 조회 (옵션 포함)
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const poll = await ctx.prisma.poll.findUnique({
        where: { id: input.id },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });

      if (!poll) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      return poll;
    }),

  // 투표 결과 (REQ-POLL-003)
  results: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getPollResults({ pollId: input.id }, { prisma: ctx.prisma });
      } catch (error) {
        if (error instanceof PollNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw error;
      }
    }),

  // 투표 가능 여부 확인 (REQ-POLL-004)
  canVote: publicProcedure
    .input(
      z.object({
        pollId: z.number().int().positive(),
        memberId: z.number().nullable(),
        voterIp: z.string().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await canUserVote(
          { pollId: input.pollId, memberId: input.memberId, voterIp: input.voterIp },
          { prisma: ctx.prisma },
        );
      } catch (error) {
        if (error instanceof PollNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw error;
      }
    }),
});
