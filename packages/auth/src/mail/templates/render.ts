/**
 * 메일 템플릿 렌더링 시스템 — REQ-MAIL-030~037
 *
 * 템플릿 종류별로 한글/영문 렌더러를 분리하고, HTML 이스케이프와 URL 검증을
 * 중앙에서 처리하여 XSS 와 URL 인젝션을 방지한다.
 */

import type { MailTemplate } from '../../mail.js';
import { MailTemplateError } from '../errors.js';
import { render as signupVerifyKo } from './signup-verify.ko.js';
import { render as signupVerifyEn } from './signup-verify.en.js';
import { render as passwordResetKo } from './password-reset.ko.js';
import { render as passwordResetEn } from './password-reset.en.js';
import { render as welcomeKo } from './welcome.ko.js';
import { render as welcomeEn } from './welcome.en.js';
import { render as emailChangeKo } from './email-change.ko.js';
import { render as emailChangeEn } from './email-change.en.js';
import { render as securityAlertKo } from './security-alert.ko.js';
import { render as securityAlertEn } from './security-alert.en.js';

export interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

type Renderer = (vars: Record<string, string>) => TemplateResult;

// 템플릿 레지스트리 — 정적 import 사용
const templates: Record<MailTemplate, { ko: Renderer; en: Renderer }> = {
  'signup-verify': { ko: signupVerifyKo, en: signupVerifyEn },
  'password-reset': { ko: passwordResetKo, en: passwordResetEn },
  'welcome': { ko: welcomeKo, en: welcomeEn },
  'email-change': { ko: emailChangeKo, en: emailChangeEn },
  'security-alert': { ko: securityAlertKo, en: securityAlertEn },
};

// HTML 특수문자 이스케이프 — REQ-MAIL-033
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL 안전성 검사 — REQ-MAIL-033 (http/https 스킴만 허용)
function assertSafeUrl(url: string, varName: string): void {
  if (!/^https?:\/\//i.test(url)) {
    throw new MailTemplateError(
      `invalid URL scheme for ${varName}: only http/https allowed, got: ${url}`
    );
  }
}

/**
 * 템플릿 렌더링 함수 — 지역(locale) 설정에 따라 ko/en 템플릿 선택
 * @param template 렌더링할 템플릿 종류
 * @param vars 템플릿 변수 (사용자 제공 입력)
 * @returns 렌더링된 제목, HTML 본문, 텍스트 본문
 */
export function renderTemplate(
  template: MailTemplate,
  vars: Record<string, string>,
): TemplateResult {
  const locale = vars.locale === 'en' ? 'en' : 'ko';
  const tmpl = templates[template];
  if (!tmpl) {
    throw new MailTemplateError(`unknown template: ${template}`);
  }

  // URL 필드 사전 검증 — XSS 방지 (href 속성에 직접 삽입될 URL)
  for (const [k, v] of Object.entries(vars)) {
    if (k.toLowerCase().includes('url') || k.toLowerCase().endsWith('url')) {
      assertSafeUrl(v, k);
    }
  }

  return tmpl[locale](vars);
}
