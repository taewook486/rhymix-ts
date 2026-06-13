/**
 * 비밀번호 재설정 한국어 템플릿 — REQ-MAIL-032
 */

import { MailTemplateError } from '../errors.js';
import { escapeHtml } from './render.js';
import type { TemplateResult } from './render.js';

export function render(vars: Record<string, string>): TemplateResult {
  const { resetUrl, userName, expiresInHours } = vars;
  if (!resetUrl) {
    throw new MailTemplateError('missing required variable: resetUrl');
  }
  if (!userName) {
    throw new MailTemplateError('missing required variable: userName');
  }
  if (!expiresInHours) {
    throw new MailTemplateError('missing required variable: expiresInHours');
  }

  const safeName = escapeHtml(userName);
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');
  const safeExpires = escapeHtml(expiresInHours);

  return {
    subject: `[${siteName}] 비밀번호 재설정 요청`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>안녕하세요, ${safeName}님!</h2>
<p>비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>
<p><a href="${resetUrl}" class="btn">비밀번호 재설정</a></p>
<p>또는 다음 링크를 복사하여 브라우저에 붙여넣으세요:<br>
<a href="${resetUrl}">${resetUrl}</a></p>
<p><strong>유효기간:</strong> ${safeExpires}시간</p>
<p>요청하지 않았다면 이 메일을 무시하세요.</p>
<hr>
<p style="color:#666;font-size:12px">${siteName}에서 발송된 메일입니다.</p>
</body>
</html>`,
    text: `안녕하세요, ${userName}님!

비밀번호 재설정 요청을 받았습니다. 아래 링크를 방문하여 비밀번호를 재설정하세요:

${resetUrl}

유효기간: ${expiresInHours}시간

요청하지 않았다면 이 메일을 무시하세요.

${siteName} 드림`,
  };
}
