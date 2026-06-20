/**
 * admin.spamfilter tRPC router — SPEC-ADMIN-002 Slice 2E + Slice 3E.
 *
 * 스팸 필터 관리:
 * - deniedWords: 금지어 CRUD
 * - deniedIps: 차단 IP CRUD
 * - rateLimit: 속도 제한 규칙 관리
 * - captcha: 캡차 설정 관리
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-120~123, REQ-ADMIN2-124
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

async function resolveSiteId(ctx: { prisma: any; siteId?: number }): Promise<number> {
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

export const adminSpamfilterRouter = router({
  // 캡차 설정 관리
  captcha: router({
    get: protectedAdminProcedure
      .query(async ({ ctx }) => {
        const siteId = await resolveSiteId(ctx);
        const setting = await ctx.prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'captcha' } },
        });

        // 기본값 반환
        const value = setting?.value as Record<string, unknown> ?? {};
        return {
          provider: (value.provider as string) ?? 'none',
          triggers: (value.triggers as string[]) ?? [],
          siteKey: (value.siteKey as string | null) ?? null,
          secret: (value.secret as string | null) ?? null,
          threshold: (value.threshold as number | null) ?? 0.5,
        };
      }),

    update: protectedAdminProcedure
      .input(
        z.object({
          provider: z.enum(['none', 'recaptcha', 'turnstile', 'simple_math']),
          triggers: z.array(z.string()).default([]),
          siteKey: z.string().optional(),
          secret: z.string().optional(),
          threshold: z.number().min(0).max(1).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        // 기존 설정 조회
        const existing = await ctx.prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'captcha' } },
        });

        const value = {
          provider: input.provider,
          triggers: input.triggers,
          siteKey: input.provider !== 'none' && input.provider !== 'simple_math' ? input.siteKey ?? null : null,
          secret: input.provider !== 'none' && input.provider !== 'simple_math' ? input.secret ?? null : null,
          threshold: input.provider === 'recaptcha' || input.provider === 'turnstile' ? input.threshold ?? 0.5 : null,
        };

        const result = await ctx.prisma.siteSetting.upsert({
          where: { siteId_key: { siteId, key: 'captcha' } },
          create: {
            siteId,
            key: 'captcha',
            value,
          },
          update: {
            value,
          },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:captcha`,
            diff: {
              before: existing?.value ?? null,
              after: value,
            },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return result;
      }),
  }),

  // 금지어 관리
  deniedWords: router({
    list: protectedAdminProcedure
      .query(async ({ ctx }) => {
        const siteId = await resolveSiteId(ctx);
        return ctx.prisma.spamDeniedWord.findMany({
          where: { siteId },
          orderBy: { createdAt: 'desc' },
        });
      }),

    add: protectedAdminProcedure
      .input(z.object({ word: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        // 중복 체크
        const existing = await ctx.prisma.spamDeniedWord.findUnique({
          where: { siteId_word: { siteId, word: input.word } },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '이미 존재하는 금지어입니다.',
          });
        }

        const result = await ctx.prisma.spamDeniedWord.create({
          data: {
            siteId,
            word: input.word,
          },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:denied-word:${result.id}`,
            diff: { before: null, after: { word: input.word } },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return result;
      }),

    remove: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        const existing = await ctx.prisma.spamDeniedWord.findFirst({
          where: { id: input.id, siteId },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '금지어를 찾을 수 없습니다.',
          });
        }

        await ctx.prisma.spamDeniedWord.delete({
          where: { id: input.id },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:denied-word:${input.id}`,
            diff: { before: { word: existing.word }, after: null },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return { success: true };
      }),
  }),

  // 차단 IP 관리
  deniedIps: router({
    list: protectedAdminProcedure
      .query(async ({ ctx }) => {
        const siteId = await resolveSiteId(ctx);
        return ctx.prisma.spamDeniedIp.findMany({
          where: { siteId },
          orderBy: { createdAt: 'desc' },
        });
      }),

    add: protectedAdminProcedure
      .input(z.object({ ipPattern: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        // IP 형식 검증 (ip-filter.ts 활용)
        const { parseIpFilter } = await import('@rhymix-ts/admin/logs');
        const parsed = parseIpFilter(input.ipPattern);
        if ('error' in parsed) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `잘못된 IP 형식입니다: ${parsed.error}`,
          });
        }

        // 중복 체크
        const existing = await ctx.prisma.spamDeniedIp.findUnique({
          where: { siteId_ipPattern: { siteId, ipPattern: input.ipPattern } },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '이미 존재하는 차단 IP입니다.',
          });
        }

        const result = await ctx.prisma.spamDeniedIp.create({
          data: {
            siteId,
            ipPattern: input.ipPattern,
          },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:denied-ip:${result.id}`,
            diff: { before: null, after: { ipPattern: input.ipPattern } },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return result;
      }),

    remove: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        const existing = await ctx.prisma.spamDeniedIp.findFirst({
          where: { id: input.id, siteId },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '차단 IP를 찾을 수 없습니다.',
          });
        }

        await ctx.prisma.spamDeniedIp.delete({
          where: { id: input.id },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:denied-ip:${input.id}`,
            diff: { before: { ipPattern: existing.ipPattern }, after: null },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return { success: true };
      }),
  }),

  // 속도 제한 규칙 관리
  rateLimit: router({
    list: protectedAdminProcedure
      .query(async ({ ctx }) => {
        const siteId = await resolveSiteId(ctx);
        return ctx.prisma.spamRule.findMany({
          where: { siteId },
          orderBy: { actionType: 'asc' },
        });
      }),

    update: protectedAdminProcedure
      .input(
        z.object({
          actionType: z.string().min(1),
          maxSubmissions: z.number().int().min(1).default(5),
          windowSeconds: z.number().int().min(1).default(60),
          enabled: z.boolean().default(true),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const siteId = await resolveSiteId(ctx);

        const result = await ctx.prisma.spamRule.upsert({
          where: { siteId_actionType: { siteId, actionType: input.actionType } },
          create: {
            siteId,
            actionType: input.actionType,
            maxSubmissions: input.maxSubmissions,
            windowSeconds: input.windowSeconds,
            enabled: input.enabled,
          },
          update: {
            maxSubmissions: input.maxSubmissions,
            windowSeconds: input.windowSeconds,
            enabled: input.enabled,
          },
        });

        // AdminLog 기록
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'configure',
            target: `spamfilter:rate-limit:${input.actionType}`,
            diff: {
              before: null,
              after: {
                maxSubmissions: input.maxSubmissions,
                windowSeconds: input.windowSeconds,
                enabled: input.enabled,
              },
            },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });

        return result;
      }),
  }),
});

export type SpamFilterRouter = typeof adminSpamfilterRouter;
