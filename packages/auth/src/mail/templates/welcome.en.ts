/**
 * Welcome English template — REQ-MAIL-031 (welcome template)
 */

import { MailTemplateError } from '../errors.js';
import { escapeHtml } from './render.js';
import type { TemplateResult } from './render.js';

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
    subject: `[${siteName}] Welcome!`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#10B981;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>Welcome to ${siteName}, ${safeName}!</h2>
<p>Your registration is complete. You can now enjoy all our services.</p>
<p><a href="${loginUrl}" class="btn">Login Now</a></p>
<p>Or copy and paste the following link into your browser:<br>
<a href="${loginUrl}">${loginUrl}</a></p>
<hr>
<p style="color:#666;font-size:12px">This email was sent from ${siteName}.</p>
</body>
</html>`,
    text: `Welcome to ${siteName}, ${userName}!

Your registration is complete. Visit the link below to login:

${loginUrl}

Best regards,
${siteName}`,
  };
}
