/**
 * public.terms tRPC router — SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 *
 * 공개 약관 조회:
 * - listActive: 활성화된 약관 목록 조회 (가입 페이지용)
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 */
import { router, publicProcedure } from '../../trpc';

export const publicTermsRouter = router({
  listActive: publicProcedure.query(async ({ ctx }) => {
    // siteId가 없으면 첫 번째 사이트 사용 (resolveSiteId와 동일 패턴)
    const siteId = ctx.siteId ?? undefined;
    let targetSiteId = siteId;
    if (targetSiteId === undefined) {
      const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) {
        return []; // 사이트가 없으면 빈 배열 반환
      }
      targetSiteId = site.id;
    }

    // 활성화된 약관만 반환
    const terms = await ctx.prisma.terms.findMany({
      where: {
        siteId: targetSiteId,
        active: true,
      },
      orderBy: [{ type: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        required: true,
      },
    });

    return terms;
  }),
});

export type PublicTermsRouter = typeof publicTermsRouter;
