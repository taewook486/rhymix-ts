/**
 * 가입 환영 한국어 템플릿 — REQ-MAIL-031 (welcome 템플릿)
 */

import { MailTemplateError } from '../errors';
import { escapeHtml } from './render';
import type { TemplateResult } from './render';

export function render(vars: Record<string, string>): TemplateResult {
  const { userName, siteUrl, loginUrl } = vars;
  if (!userName) {
    throw new MailTemplateError('missing required variable: userName');
  }
  if (!siteUrl) {
    throw new MailTemplateError('missing required variable: siteUrl');
  }
  if (!loginUrl) {
    throw new MailTemplateError('missing required variable: loginUrl');
  }

  const safeName = escapeHtml(userName);
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');

  return {
    subject: `[${siteName}] 가입을 환영합니다!`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#10B981;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>${siteName}에 오신 것을 환영합니다, ${safeName}님!</h2>
<p>회원가입이 완료되었습니다. 이제 다양한 서비스를 이용하실 수 있습니다.</p>
<p><a href="${loginUrl}" class="btn">로그인하기</a></p>
<p>또는 다음 링크를 복사하여 브라우저에 붙여넣으세요:<br>
<a href="${loginUrl}">${loginUrl}</a></p>
<hr>
<p style="color:#666;font-size:12px">${siteName}에서 발송된 메일입니다.</p>
</body>
</html>`,
    text: `${siteName}에 오신 것을 환영합니다, ${userName}님!

회원가입이 완료되었습니다. 아래 링크를 방문하여 로그인하세요:

${loginUrl}

${siteName} 드림`,
  };
}
