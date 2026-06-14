/**
 * 보안 경고 한국어 템플릿 — REQ-MAIL-036 (security-alert 템플릿)
 */

import { escapeHtml } from './render';
import type { TemplateResult } from './render';

export function render(vars: Record<string, string>): TemplateResult {
  const { userName, alertType, details } = vars;
  const safeName = escapeHtml(userName ?? '회원');
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');
  const safeAlert = escapeHtml(alertType ?? '보안 이슈');
  const safeDetails = escapeHtml(details ?? '자세한 내용은 로그를 확인하세요.');

  return {
    subject: `[${siteName}] 보안 경고: ${safeAlert}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.alert{background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;margin:16px 0}</style>
</head>
<body>
<h2>보안 경고</h2>
<div class="alert">
<p><strong>유형:</strong> ${safeAlert}</p>
<p><strong>내용:</strong> ${safeDetails}</p>
</div>
<p>본인 활동이 아니라면 즉시 비밀번호를 변경하고 고객센터에 문의해 주세요.</p>
<hr>
<p style="color:#666;font-size:12px">${siteName}에서 발송된 메일입니다.</p>
</body>
</html>`,
    text: `보안 경고

유형: ${alertType}
내용: ${details}

본인 활동이 아니라면 즉시 비밀번호를 변경하고 고객센터에 문의해 주세요.

${siteName} 드림`,
  };
}
