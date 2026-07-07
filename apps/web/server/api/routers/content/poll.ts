/**
 * content.poll tRPC router — SPEC-POLL-001
 *
 * 설문 투표 및 게시물 첨부:
 * - vote: 투표 제출 (REQ-POLL-002)
 * - attachToDocument: 게시물에 설문 첨부 (REQ-POLL-001)
 * - getDocumentPoll: 게시물 첨부 설문 조회
 * - removeFromDocument: 게시물에서 설문 제거
 *
 * @MX:SPEC: SPEC-POLL-001 REQ-POLL-001, REQ-POLL-002
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import {
  castVote,
  getUserPollVote,
  PollNotFoundError,
  PollAlreadyVotedError,
  PollClosedError,
  PollNotStartedError,
} from '@rhymix-ts/poll';

export const contentPollRouter = router({
  // 투표 제출 (REQ-POLL-002)
  vote: protectedProcedure
    .input(
      z.object({
        pollId: z.number().int().positive(),
        pollOptionIds: z.array(z.number().int().positive()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await castVote(
          {
            pollId: input.pollId,
            pollOptionIds: input.pollOptionIds,
            memberId: ctx.session.user.id,
            voterIp: ctx.ip ?? null,
          },
          { prisma: ctx.prisma },
        );
      } catch (error) {
        if (error instanceof PollNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error instanceof PollAlreadyVotedError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        if (error instanceof PollClosedError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        if (error instanceof PollNotStartedError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),

  // 게시물에 설문 첨부 (REQ-POLL-001)
  attachToDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        pollId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 설문 존재 확인
      const poll = await ctx.prisma.poll.findUnique({
        where: { id: input.pollId },
      });

      if (!poll) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      // 게시물 존재 확인
      const document = await ctx.prisma.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '게시물을 찾을 수 없습니다.' });
      }

      // 이미 첨부된 설문 확인
      const existing = await ctx.prisma.documentPoll.findUnique({
        where: {
          documentId_pollId: {
            documentId: input.documentId,
            pollId: input.pollId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '이미 첨부된 설문입니다.',
        });
      }

      // 첨부
      await ctx.prisma.documentPoll.create({
        data: {
          documentId: input.documentId,
          pollId: input.pollId,
        },
      });

      return { success: true };
    }),

  // 게시물 첨부 설문 조회
  getDocumentPoll: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const documentPoll = await ctx.prisma.documentPoll.findUnique({
        where: { documentId_pollId: { documentId: input.documentId, pollId: 0 } },
      });

      if (!documentPoll) {
        return null;
      }

      const poll = await ctx.prisma.poll.findUnique({
        where: { id: documentPoll.pollId },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });

      return poll;
    }),

  // 게시물에서 설문 제거
  removeFromDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        pollId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.documentPoll.delete({
        where: {
          documentId_pollId: {
            documentId: input.documentId,
            pollId: input.pollId,
          },
        },
      });

      return { success: true };
    }),

  // 사용자의 투표 기록 조회
  getUserVote: protectedProcedure
    .input(z.object({ pollId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return getUserPollVote(
        {
          pollId: input.pollId,
          memberId: ctx.session.user.id,
          voterIp: ctx.ip ?? null,
        },
        { prisma: ctx.prisma },
      );
    }),
});
