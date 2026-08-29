/**
 * admin.poll tRPC router — SPEC-ADMIN-002 Slice 3A.
 *
 * 설문(Poll) 관리:
 * - list: 설문 목록 (제목/상태/투표수/기간)
 * - get: 단건 조회 (옵션 포함)
 * - create/update/delete: 설문 CRUD
 * - results: 옵션별 투표수/백분율
 * - config.get/config.set: 전역 기본값 (비회원 투표 허용, 중복 투표 방지 방식)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-083~086
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { router, protectedAdminProcedure } from '../../trpc';
import { calculatePollResults, derivePollStatus } from '@rhymix-ts/admin';
import { getPollConfig } from '@rhymix-ts/admin';

async function resolveSiteId(ctx: { prisma: Prisma.TransactionClient; siteId?: number }): Promise<number> {
  if (ctx.siteId !== undefined) {
    return ctx.siteId;
  }
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
  }
  return site.id;
}

const pollOptionInputSchema = z.object({
  label: z.string().min(1).max(200),
});

const pollMutationInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  allowGuestVote: z.boolean().default(false),
  allowMultipleChoice: z.boolean().default(false),
  duplicateVotePolicy: z.enum(['by-member', 'by-ip', 'by-cookie']).default('by-member'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export const adminPollRouter = router({
  // 설문 목록 — REQ-ADMIN2-083
  list: protectedAdminProcedure.query(async ({ ctx }) => {
    const siteId = await resolveSiteId(ctx);
    const now = new Date();

    const polls = await ctx.prisma.poll.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { votes: true } } },
    });

    return polls.map(
      (poll: {
        id: number;
        title: string;
        startAt: Date;
        endAt: Date;
        _count: { votes: number };
      }) => ({
        id: poll.id,
        title: poll.title,
        status: derivePollStatus({ startAt: poll.startAt, endAt: poll.endAt }, now),
        voteCount: poll._count.votes,
        startAt: poll.startAt,
        endAt: poll.endAt,
      }),
    );
  }),

  // 단건 조회 (옵션 포함) — REQ-ADMIN2-084
  get: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const poll = await ctx.prisma.poll.findFirst({
        where: { id: input.id, siteId },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });

      if (!poll) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      return poll;
    }),

  // 설문 생성 — REQ-ADMIN2-084
  create: protectedAdminProcedure
    .input(
      pollMutationInputSchema.extend({
        options: z.array(pollOptionInputSchema).min(2).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      if (input.endAt <= input.startAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '종료 시각은 시작 시각보다 이후여야 합니다.',
        });
      }

      const result = await ctx.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const poll = await tx.poll.create({
          data: {
            siteId,
            title: input.title,
            description: input.description,
            allowGuestVote: input.allowGuestVote,
            allowMultipleChoice: input.allowMultipleChoice,
            duplicateVotePolicy: input.duplicateVotePolicy,
            startAt: input.startAt,
            endAt: input.endAt,
            options: {
              create: input.options.map((option, index) => ({
                label: option.label,
                sortOrder: index,
              })),
            },
          },
        });

        await tx.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `poll:${poll.id}`,
            diff: { before: null, after: { title: input.title } },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return poll;
      });

      return result;
    }),

  // 설문 수정 — REQ-ADMIN2-084
  update: protectedAdminProcedure
    .input(
      pollMutationInputSchema.extend({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      if (input.endAt <= input.startAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '종료 시각은 시작 시각보다 이후여야 합니다.',
        });
      }

      const existing = await ctx.prisma.poll.findFirst({
        where: { id: input.id, siteId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      const result = await ctx.prisma.poll.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          allowGuestVote: input.allowGuestVote,
          allowMultipleChoice: input.allowMultipleChoice,
          duplicateVotePolicy: input.duplicateVotePolicy,
          startAt: input.startAt,
          endAt: input.endAt,
        },
      });

      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'configure',
          target: `poll:${input.id}`,
          diff: { before: null, after: { title: input.title } },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return result;
    }),

  // 설문 삭제
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const existing = await ctx.prisma.poll.findFirst({
        where: { id: input.id, siteId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      await ctx.prisma.poll.delete({ where: { id: input.id } });

      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'configure',
          target: `poll:${input.id}`,
          diff: { before: { title: existing.title }, after: null },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return { success: true };
    }),

  // 설문 결과 — REQ-ADMIN2-085
  results: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const poll = await ctx.prisma.poll.findFirst({
        where: { id: input.id, siteId },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });

      if (!poll) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '설문을 찾을 수 없습니다.' });
      }

      const votes = await ctx.prisma.pollVote.findMany({
        where: { pollId: input.id },
        select: { pollOptionId: true },
      });

      return calculatePollResults(
        poll.options.map((option: { id: number; label: string }) => ({
          id: option.id,
          label: option.label,
        })),
        votes,
      );
    }),

  // 설문 전역 설정 — REQ-ADMIN2-086
  config: router({
    get: protectedAdminProcedure.query(async ({ ctx }) => {
      return getPollConfig({ prisma: ctx.prisma });
    }),

    set: protectedAdminProcedure
      .input(
        z.object({
          allowGuestVote: z.boolean(),
          duplicateVotePolicy: z.enum(['by-member', 'by-ip', 'by-cookie']),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        const result = await ctx.prisma.siteSetting.upsert({
          where: { siteId_key: { siteId, key: 'pollConfig' } },
          create: { siteId, key: 'pollConfig', value: input },
          update: { value: input },
        });

        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: 'poll:config',
            diff: { before: null, after: input },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return result.value as { allowGuestVote: boolean; duplicateVotePolicy: string };
      }),
  }),
});

export type PollRouter = typeof adminPollRouter;
