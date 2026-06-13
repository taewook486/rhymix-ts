/**
 * Signup email verification English template — REQ-MAIL-031
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
    subject: `[${siteName}] Please verify your email address`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>Hello, ${safeName}!</h2>
<p>Please click the button below to verify your email address.</p>
<p><a href="${verifyUrl}" class="btn">Verify Email</a></p>
<p>Or copy and paste the following link into your browser:<br>
<a href="${verifyUrl}">${verifyUrl}</a></p>
<hr>
<p style="color:#666;font-size:12px">This email was sent from ${siteName}.</p>
</body>
</html>`,
    text: `Hello, ${userName}!

Please visit the link below to verify your email address:

${verifyUrl}

Best regards,
${siteName}`,
  };
}
