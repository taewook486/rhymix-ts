/**
 * admin.site tRPC 라우터 — SPEC-ADMIN-001 Slice E-4.
 *
 * Site / Domain 설정 CRUD: get / update / domain.list / domain.update.
 *
 * @MX:NOTE: [AUTO] Site 는 싱글턴 레코드 (id=1 기준 findFirst).
 *           여러 Site 레코드가 존재해도 첫 번째만 사용한다 (멀티사이트는 별도 Slice).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-050, REQ-ADMIN-051, REQ-ADMIN-052
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

// Site 수정 입력 스키마 (REQ-ADMIN-051) — 실제 Prisma 스키마 필드 기준
const SiteUpdateInput = z.object({
  defaultLanguage: z.string().optional(),
  timeZone: z.string().optional(),
});

// Domain 수정 입력 스키마 (REQ-ADMIN-052)
const DomainUpdateInput = z.object({
  forceHttps: z.boolean().optional(),
  defaultLanguage: z.string().nullable().optional(),
  defaultTimezone: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const adminSiteRouter = router({
  /**
   * 현재 Site 레코드 반환 (REQ-ADMIN-050).
   */
  get: protectedAdminProcedure.query(({ ctx }) =>
    ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } }),
  ),

  /**
   * Site 기본 설정 갱신 (REQ-ADMIN-051).
   * auditLogger 미들웨어가 자동으로 AdminLog 를 기록한다.
   */
  update: protectedAdminProcedure
    .input(SiteUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'site not found' });
      }
      return ctx.prisma.site.update({ where: { id: site.id }, data: input });
    }),

  domain: router({
    /**
     * Site 에 속한 Domain 목록 반환 (REQ-ADMIN-052).
     */
    list: protectedAdminProcedure.query(async ({ ctx }) => {
      const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) return [];
      return ctx.prisma.domain.findMany({
        where: { siteId: site.id },
        orderBy: { id: 'asc' },
      });
    }),

    /**
     * 특정 Domain 설정 갱신 (REQ-ADMIN-052).
     */
    update: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive(), data: DomainUpdateInput }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.domain.update({ where: { id: input.id }, data: input.data }),
      ),
  }),
});
