/**
 * Password reset English template — REQ-MAIL-032
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
    subject: `[${siteName}] Password reset request`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}
.btn{display:inline-block;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px}</style>
</head>
<body>
<h2>Hello, ${safeName}!</h2>
<p>We received a request to reset your password. Click the button below to reset it.</p>
<p><a href="${resetUrl}" class="btn">Reset Password</a></p>
<p>Or copy and paste the following link into your browser:<br>
<a href="${resetUrl}">${resetUrl}</a></p>
<p><strong>Valid for:</strong> ${safeExpires} hours</p>
<p>If you did not request this, please ignore this email.</p>
<hr>
<p style="color:#666;font-size:12px">This email was sent from ${siteName}.</p>
</body>
</html>`,
    text: `Hello, ${userName}!

We received a request to reset your password. Visit the link below to reset it:

${resetUrl}

Valid for: ${expiresInHours} hours

If you did not request this, please ignore this email.

Best regards,
${siteName}`,
  };
}
