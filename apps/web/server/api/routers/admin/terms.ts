/**
 * admin.terms tRPC router — SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 *
 * 약관 관리:
 * - list: 사이트 약관 목록 조회
 * - create: 새 약관 생성
 * - update: 기존 약관 수정
 * - delete: 약관 삭제
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { router, protectedAdminProcedure } from '../../trpc';

async function resolveSiteId(ctx: { prisma: Prisma.TransactionClient; siteId?: number }): Promise<number> {
  if (ctx.siteId !== undefined) {
    return ctx.siteId;
  }
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Site not found',
    });
  }
  return site.id;
}

export const adminTermsRouter = router({
  list: protectedAdminProcedure.query(async ({ ctx }) => {
    const siteId = await resolveSiteId(ctx);
    return ctx.prisma.terms.findMany({
      where: { siteId },
      orderBy: [{ type: 'asc' }, { id: 'asc' }],
    });
  }),

  create: protectedAdminProcedure
    .input(
      z.object({
        type: z.enum(['terms', 'privacy', 'custom']),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        required: z.boolean().default(true),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const result = await ctx.prisma.terms.create({
        data: {
          siteId,
          type: input.type,
          title: input.title,
          content: input.content,
          required: input.required,
          active: input.active,
        },
      });

      // AdminLog 기록
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'create',
          target: `terms:${result.id}`,
          diff: { before: null, after: { type: input.type, title: input.title } },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return result;
    }),

  update: protectedAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        type: z.enum(['terms', 'privacy', 'custom']).optional(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        required: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const existing = await ctx.prisma.terms.findFirst({
        where: { id: input.id, siteId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '약관을 찾을 수 없습니다.',
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.type !== undefined) updateData.type = input.type;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.required !== undefined) updateData.required = input.required;
      if (input.active !== undefined) updateData.active = input.active;

      const result = await ctx.prisma.terms.update({
        where: { id: input.id },
        data: updateData,
      });

      // AdminLog 기록
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'update',
          target: `terms:${input.id}`,
          diff: {
            before: { type: existing.type, title: existing.title },
            after: { type: result.type, title: result.title },
          },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return result;
    }),

  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const siteId = await resolveSiteId(ctx);

      const existing = await ctx.prisma.terms.findFirst({
        where: { id: input.id, siteId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '약관을 찾을 수 없습니다.',
        });
      }

      await ctx.prisma.terms.delete({
        where: { id: input.id },
      });

      // AdminLog 기록
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'delete',
          target: `terms:${input.id}`,
          diff: { before: { type: existing.type, title: existing.title }, after: null },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return { success: true };
    }),
});

export type TermsRouter = typeof adminTermsRouter;
