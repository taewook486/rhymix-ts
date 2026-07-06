/**
 * public.seo tRPC router — SPEC-SEO-001 REQ-SEO-006
 *
 * 공개 SEO 설정 조회:
 * - getPublicConfig: 클라이언트용 SEO 설정 (GA ID, Naver verification, robots.txt)
 *
 * @MX:SPEC: SPEC-SEO-001 REQ-SEO-006
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';

export const publicSeoRouter = router({
  /**
   * 공개 SEO 설정 조회 (REQ-SEO-006).
   *
   * 프론트엔드에서 스크립트 삽입(GA) 및 메타 태그(Naver verification)에 사용한다.
   * robots.txt 사용자 정의 내용을 포함한다.
   */
  getPublicConfig: publicProcedure.query(async ({ ctx }) => {
    // siteId가 없으면 첫 번째 사이트 사용
    const siteId = ctx.siteId ?? undefined;
    let targetSiteId = siteId;
    if (targetSiteId === undefined) {
      const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) {
        // 사이트가 없으면 빈 값 반환
        return {
          googleAnalyticsId: '',
          naverSiteVerificationCode: '',
          robotsTxtCustomContent: '',
        };
      }
      targetSiteId = site.id;
    }

    // SiteSetting에서 SEO 설정 조회 (단일 'seo' 키에 통합 저장됨)
    const seoSetting = await ctx.prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: targetSiteId, key: 'seo' } },
    });

    if (!seoSetting) {
      return {
        googleAnalyticsId: '',
        naverSiteVerificationCode: '',
        robotsTxtCustomContent: '',
      };
    }

    const value = seoSetting.value as Record<string, unknown>;
    return {
      googleAnalyticsId: (value.googleAnalyticsId as string) || '',
      naverSiteVerificationCode: (value.naverSiteVerificationCode as string) || '',
      robotsTxtCustomContent: (value.robotsTxtCustomContent as string) || '',
    };
  }),
});

export type PublicSeoRouter = typeof publicSeoRouter;
