/**
 * admin.layout tRPC 라우터 — SPEC-ADMIN-002 Slice 2A.
 *
 * Layout 관리: list / listInstances / createInstance / updateInstanceVariables.
 *
 * @MX:NOTE: [AUTO] Layout 목록 조회 시 각 Layout별 ThemeAssignment 인스턴스 수를 집계.
 *           layoutName 으로 ThemeAssignment 를 카운트하여 instanceCount 를 계산한다.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-020, REQ-ADMIN2-021, REQ-ADMIN2-022
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminLayoutRouter = router({
  /**
   * 설치된 Layout 목록 반환 (REQ-ADMIN2-020).
   * 각 Layout에 대해 인스턴스 수(ThemeAssignment 수)를 포함한다.
   */
  list: protectedAdminProcedure.query(async ({ ctx }) => {
    const layouts = await ctx.prisma.layout.findMany({
      orderBy: { name: 'asc' },
    });

    // 각 Layout별 인스턴스 수 집계 (REQ-ADMIN2-020)
    const layoutsWithCount = await Promise.all(
      layouts.map(async (layout) => {
        const instanceCount = await ctx.prisma.themeAssignment.count({
          where: { layoutName: layout.name },
        });
        return {
          ...layout,
          instanceCount,
        };
      }),
    );

    return layoutsWithCount;
  }),

  /**
   * Layout 인스턴스(ThemeAssignment) 목록 반환 (REQ-ADMIN2-021).
   * scope=SITE 이고 refType='layout' 인 ThemeAssignment 만 조회한다.
   */
  listInstances: protectedAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.themeAssignment.findMany({
      where: {
        scope: 'SITE',
        refType: 'layout',
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  /**
   * Layout 인스턴스(ThemeAssignment) 단건 조회 (REQ-ADMIN2-022).
   */
  getInstance: protectedAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const instance = await ctx.prisma.themeAssignment.findUnique({
        where: { id: input.id },
      });
      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Layout instance not found' });
      }
      return instance;
    }),

  /**
   * 새 Layout 인스턴스 생성 (REQ-ADMIN2-021).
   * ThemeAssignment 레코드를 생성한다.
   */
  createInstance: protectedAdminProcedure
    .input(
      z.object({
        themeId: z.string().min(1),
        scope: z.enum(['SITE', 'DOMAIN', 'MODULE_INSTANCE']),
        refId: z.string().min(1),
        layoutName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.themeAssignment.create({
        data: {
          themeId: input.themeId,
          scope: input.scope,
          refType: 'layout',
          refId: input.refId,
          layoutName: input.layoutName,
        },
      });
    }),

  /**
   * Layout 인스턴스 변수(토큰) 수정 (REQ-ADMIN2-022).
   * ThemeAssignment.tokensOverride JSON 필드를 갱신한다.
   */
  updateInstanceVariables: protectedAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        tokensOverride: z.unknown(), // JSON: { logo, menuBinding, colors }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tokensOverride } = input;
      return ctx.prisma.themeAssignment.update({
        where: { id },
        data: { tokensOverride: tokensOverride as Prisma.InputJsonValue },
      });
    }),
});
