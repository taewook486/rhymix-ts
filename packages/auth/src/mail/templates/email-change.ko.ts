/**
 * 이메일 변경 알림 한국어 템플릿 — REQ-MAIL-035 (email-change 템플릿)
 */

import { escapeHtml } from './render.js';
import type { TemplateResult } from './render.js';

export function render(vars: Record<string, string>): TemplateResult {
  const { userName, newEmail } = vars;
  const safeName = escapeHtml(userName ?? '회원');
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');
  const safeNewEmail = escapeHtml(newEmail ?? 'N/A');

  return {
    subject: `[${siteName}] 이메일 주소가 변경되었습니다`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}</style>
</head>
<body>
<h2>안녕하세요, ${safeName}님!</h2>
<p>회원님의 이메일 주소가 성공적으로 변경되었습니다.</p>
<p><strong>새 이메일:</strong> ${safeNewEmail}</p>
<p>변경 요청하지 않았다면 즉시 고객센터에 문의해 주세요.</p>
<hr>
<p style="color:#666;font-size:12px">${siteName}에서 발송된 메일입니다.</p>
</body>
</html>`,
    text: `안녕하세요, ${userName ?? '회원'}님!

회원님의 이메일 주소가 성공적으로 변경되었습니다.

새 이메일: ${newEmail ?? 'N/A'}

변경 요청하지 않았다면 즉시 고객센터에 문의해 주세요.

${siteName} 드림`,
  };
}
