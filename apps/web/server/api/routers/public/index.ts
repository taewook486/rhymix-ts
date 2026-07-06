/**
 * public 라우터 조합 — SPEC-CAPTCHA-001, SPEC-SEO-001, SPEC-TAG-001
 *
 * public.terms.* — 약관 조회 (가입 페이지용)
 * public.captcha.* — CAPTCHA 설정 조회 (가입/로그인 페이지용)
 * public.seo.* — SEO 설정 조회 (GA 스크립트, Naver verification 메타 태그용)
 * public.tag.* — 태그 조회 (자동완성, 태그 클라우드용)
 */
import { router } from '../../trpc';
import { publicTermsRouter } from './terms';
import { publicCaptchaRouter } from './captcha';
import { publicSeoRouter } from './seo';
import { publicTagRouter } from './tag';

export const publicRouter = router({
  terms: publicTermsRouter,
  captcha: publicCaptchaRouter,
  seo: publicSeoRouter,
  tag: publicTagRouter,
});
