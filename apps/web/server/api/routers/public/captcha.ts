/**
 * public.captcha tRPC router — SPEC-CAPTCHA-001 REQ-CAPTCHA-003, REQ-CAPTCHA-005
 *
 * 공개 CAPTCHA 설정 조회:
 * - getConfig: 클라이언트용 CAPTCHA 설정 (secret 제외)
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-003, REQ-CAPTCHA-005
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';

export const publicCaptchaRouter = router({
  getConfig: publicProcedure.query(async ({ ctx }) => {
    // siteId가 없으면 첫 번째 사이트 사용
    const siteId = ctx.siteId ?? undefined;
    let targetSiteId = siteId;
    if (targetSiteId === undefined) {
      const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) {
        // 사이트가 없으면 기본값 반환
        return {
          signupEnabled: false,
          loginEnabled: false,
          siteKey: '',
        };
      }
      targetSiteId = site.id;
    }

    // SiteSetting에서 CAPTCHA 설정 조회
    const signupEnabled = await ctx.prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: targetSiteId, key: 'security.captcha.signup.enabled' } },
    });

    const loginEnabled = await ctx.prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: targetSiteId, key: 'security.captcha.login.enabled' } },
    });

    const turnstileSiteKey = await ctx.prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: targetSiteId, key: 'security.captcha.turnstile.siteKey' } },
    });

    // [SECURITY-CRITICAL] secretKey는 클라이언트에 절대 반환하지 않음
    return {
      signupEnabled: (signupEnabled?.value as boolean) ?? false,
      loginEnabled: (loginEnabled?.value as boolean) ?? false,
      siteKey: (turnstileSiteKey?.value as string) ?? '',
    };
  }),
});

export type PublicCaptchaRouter = typeof publicCaptchaRouter;
