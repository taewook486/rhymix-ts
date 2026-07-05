/**
 * public 라우터 조합 — SPEC-CAPTCHA-001
 *
 * public.terms.* — 약관 조회 (가입 페이지용)
 * public.captcha.* — CAPTCHA 설정 조회 (가입/로그인 페이지용)
 */
import { router } from '../../trpc';
import { publicTermsRouter } from './terms';
import { publicCaptchaRouter } from './captcha';

export const publicRouter = router({
  terms: publicTermsRouter,
  captcha: publicCaptchaRouter,
});
