/**
 * admin.domain tRPC 라우터 — SPEC-ADMIN-002 REQ-ADMIN2-125.
 *
 * Domain management procedures:
 * - REQ-ADMIN2-125: /admin/domains page listing Domain model with isDefault flag and per-domain default module
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-125
 */

import { z } from 'zod'
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
})
