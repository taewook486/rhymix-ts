/**
 * 가입 이메일 인증 한국어 템플릿 — REQ-MAIL-031
 */

import { MailTemplateError } from '../errors.js';
import { escapeHtml } from './render.js';
import type { TemplateResult } from './render.js';

export function render(vars: Record<string, string>): TemplateResult {
  const { verifyUrl, userName } = vars;
  if (!verifyUrl) {
    throw new MailTemplateError('missing required variable: verifyUrl');
  }
  if (!userName) {
    throw new MailTemplateError('missing required variable: userName');
  }

  const safeName = escapeHtml(userName);
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');

  return {
    subject: `[${siteName}] 이메일 주소를 인증해 주세요`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>안녕하세요, ${safeName}님!</h2>
<p>아래 버튼을 클릭하여 이메일 주소를 인증해 주세요.</p>
<p><a href="${verifyUrl}" class="btn">이메일 인증하기</a></p>
<p>또는 다음 링크를 복사하여 브라우저에 붙여넣으세요:<br>
<a href="${verifyUrl}">${verifyUrl}</a></p>
<hr>
<p style="color:#666;font-size:12px">${siteName}에서 발송된 메일입니다.</p>
</body>
</html>`,
    text: `안녕하세요, ${userName}님!

이메일 주소를 인증하려면 아래 링크를 방문해 주세요:

${verifyUrl}

${siteName} 드림`,
  };
}
