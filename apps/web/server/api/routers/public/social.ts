/**
 * public.social tRPC router — SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005, AC-SOCIAL-004
 *
 * 공개 소셜 로그인 활성화 여부 조회:
 * - getConfig: 로그인 화면이 카카오/구글 버튼을 표시할지 판단하기 위한 enabled 플래그
 *   (clientId/clientSecret은 클라이언트에 노출하지 않는다 — NextAuth 서버가 직접 사용)
 *
 * @MX:SPEC: SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005
 */
import { router, publicProcedure } from '../../trpc';

export const publicSocialRouter = router({
  getConfig: publicProcedure.query(async ({ ctx }) => {
    const siteId = ctx.siteId ?? (await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } }))?.id;

    if (siteId === undefined) {
      return { kakao: { enabled: false }, google: { enabled: false } };
    }

    const [kakaoEnabled, googleEnabled] = await Promise.all([
      ctx.prisma.siteSetting.findUnique({
        where: { siteId_key: { siteId, key: 'social.kakao.enabled' } },
      }),
      ctx.prisma.siteSetting.findUnique({
        where: { siteId_key: { siteId, key: 'social.google.enabled' } },
      }),
    ]);

    return {
      kakao: { enabled: (kakaoEnabled?.value as boolean) ?? false },
      google: { enabled: (googleEnabled?.value as boolean) ?? false },
    };
  }),
});

export type PublicSocialRouter = typeof publicSocialRouter;
