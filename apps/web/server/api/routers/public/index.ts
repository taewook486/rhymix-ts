/**
 * public 라우터 조합 — SPEC-CAPTCHA-001, SPEC-SEO-001, SPEC-TAG-001, SPEC-POLL-001
 *
 * public.terms.* — 약관 조회 (가입 페이지용)
 * public.captcha.* — CAPTCHA 설정 조회 (가입/로그인 페이지용)
 * public.seo.* — SEO 설정 조회 (GA 스크립트, Naver verification 메타 태그용)
 * public.tag.* — 태그 조회 (자동완성, 태그 클라우드용)
 * public.poll.* — 설문 조회 (투표 결과, 투표 가능 여부)
 * public.social.* — 소셜 로그인 활성화 여부 조회 (로그인 화면 버튼 노출용)
 */
import { router } from '../../trpc';
import { publicTermsRouter } from './terms';
import { publicCaptchaRouter } from './captcha';
import { publicSeoRouter } from './seo';
import { publicTagRouter } from './tag';
import { publicPollRouter } from './poll';
import { publicSocialRouter } from './social';

export const publicRouter = router({
  terms: publicTermsRouter,
  captcha: publicCaptchaRouter,
  seo: publicSeoRouter,
  tag: publicTagRouter,
  poll: publicPollRouter,
  social: publicSocialRouter,
});
