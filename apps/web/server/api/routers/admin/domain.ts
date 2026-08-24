/**
 * admin.domain tRPC 라우터 — SPEC-ADMIN-002 REQ-ADMIN2-125.
 *
 * Domain management procedures:
 * - REQ-ADMIN2-125: /admin/domains page listing Domain model with isDefault flag and per-domain default module
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-125
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedAdminProcedure } from '../../trpc'

export const adminDomainRouter = router({
  /**
   * List all domains for current site (REQ-ADMIN2-125).
   *
   * Returns domains with isDefault flag and default module instance.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const domains = await ctx.prisma.domain.findMany({
        where: { siteId: input.siteId },
        include: {
          // Include default module instance details
          indexModuleInstance: {
            select: {
              id: true,
              name: true,
              moduleCode: true,
              mid: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
      })

      return domains.map((domain) => ({
        id: domain.id,
        hostname: domain.hostname,
        isDefault: domain.isDefault,
        forceHttps: domain.forceHttps,
        defaultLanguage: domain.defaultLanguage,
        defaultTimezone: domain.defaultTimezone,
        defaultLayoutId: domain.defaultLayoutId,
        defaultMobileLayoutId: domain.defaultMobileLayoutId,
        defaultMenuId: domain.defaultMenuId,
        indexModuleInstanceId: domain.indexModuleInstanceId,
        indexModule: domain.indexModuleInstance
          ? {
              id: domain.indexModuleInstance.id,
              title: domain.indexModuleInstance.name,
              moduleCode: domain.indexModuleInstance.moduleCode,
              mid: domain.indexModuleInstance.mid,
            }
          : null,
        createdAt: domain.createdAt,
      }))
    }),

  /**
   * Get a single domain by ID.
   */
  getById: protectedAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const domain = await ctx.prisma.domain.findUnique({
        where: { id: input.id },
        include: {
          indexModuleInstance: {
            select: {
              id: true,
              name: true,
              moduleCode: true,
              mid: true,
            },
          },
        },
      })

      if (!domain) {
        throw new Error('Domain not found')
      }

      return {
        id: domain.id,
        hostname: domain.hostname,
        isDefault: domain.isDefault,
        forceHttps: domain.forceHttps,
        defaultLanguage: domain.defaultLanguage,
        defaultTimezone: domain.defaultTimezone,
        defaultLayoutId: domain.defaultLayoutId,
        defaultMobileLayoutId: domain.defaultMobileLayoutId,
        defaultMenuId: domain.defaultMenuId,
        indexModuleInstanceId: domain.indexModuleInstanceId,
        indexModule: domain.indexModuleInstance
          ? {
              id: domain.indexModuleInstance.id,
              title: domain.indexModuleInstance.name,
              moduleCode: domain.indexModuleInstance.moduleCode,
              mid: domain.indexModuleInstance.mid,
            }
          : null,
        createdAt: domain.createdAt,
      }
    }),

  /**
   * 도메인의 인덱스(홈) 모듈을 지정하거나 해제한다.
   *
   * 지정된 모듈 인스턴스가 방문자 홈(`/`)에 렌더된다 — app/page.tsx 가
   * Domain.indexModuleInstanceId 를 읽어 라우팅한다. 이 값이 null 이면
   * 홈은 "No index module configured for this domain." placeholder 를 낸다.
   *
   * 사이트 경계: 도메인과 모듈 인스턴스가 같은 siteId 에 속할 때만 허용한다.
   * 다른 사이트의 모듈을 남의 도메인 홈으로 걸 수 있으면 사이트 격리가 깨진다.
   */
  setIndexModule: protectedAdminProcedure
    .input(
      z.object({
        domainId: z.number().int().positive(),
        moduleInstanceId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.prisma.domain.findUnique({
        where: { id: input.domainId },
        select: { id: true, siteId: true },
      })
      if (!domain) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '도메인을 찾을 수 없습니다.' })
      }
      if (ctx.siteId != null && domain.siteId !== ctx.siteId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '다른 사이트의 도메인은 수정할 수 없습니다.' })
      }

      if (input.moduleInstanceId != null) {
        const instance = await ctx.prisma.moduleInstance.findUnique({
          where: { id: input.moduleInstanceId },
          select: { id: true, siteId: true },
        })
        if (!instance) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '모듈 인스턴스를 찾을 수 없습니다.' })
        }
        if (instance.siteId !== domain.siteId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '다른 사이트의 모듈 인스턴스는 인덱스로 지정할 수 없습니다.',
          })
        }
      }

      const updated = await ctx.prisma.domain.update({
        where: { id: domain.id },
        data: { indexModuleInstanceId: input.moduleInstanceId },
      })

      return {
        id: updated.id,
        indexModuleInstanceId: updated.indexModuleInstanceId,
      }
    }),
})
