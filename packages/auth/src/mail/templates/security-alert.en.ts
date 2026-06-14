/**
 * Security alert English template — REQ-MAIL-036 (security-alert template)
 */

import { escapeHtml } from './render';
import type { TemplateResult } from './render';

export function render(vars: Record<string, string>): TemplateResult {
  const { userName, alertType, details } = vars;
  const safeName = escapeHtml(userName ?? 'Member');
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');
  const safeAlert = escapeHtml(alertType ?? 'Security Issue');
  const safeDetails = escapeHtml(details ?? 'Check the logs for details.');

  return {
    subject: `[${siteName}] Security Alert: ${safeAlert}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.alert{background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;margin:16px 0}</style>
</head>
<body>
<h2>Security Alert</h2>
<div class="alert">
<p><strong>Type:</strong> ${safeAlert}</p>
<p><strong>Details:</strong> ${safeDetails}</p>
</div>
<p>If this was not your activity, please change your password immediately and contact customer support.</p>
<hr>
<p style="color:#666;font-size:12px">This email was sent from ${siteName}.</p>
</body>
</html>`,
    text: `Security Alert

Type: ${alertType}
Details: ${details}

If this was not your activity, please change your password immediately and contact customer support.

Best regards,
${siteName}`,
  };
}
