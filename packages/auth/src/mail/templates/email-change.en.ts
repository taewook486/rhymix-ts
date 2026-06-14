/**
 * Email change notification English template — REQ-MAIL-035 (email-change template)
 */

import { escapeHtml } from './render';
import type { TemplateResult } from './render';

export function render(vars: Record<string, string>): TemplateResult {
  const { userName, newEmail } = vars;
  const safeName = escapeHtml(userName ?? 'Member');
  const siteName = escapeHtml(vars.siteName ?? 'Rhymix');
  const safeNewEmail = escapeHtml(newEmail ?? 'N/A');

  return {
    subject: `[${siteName}] Email address has been changed`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px}</style>
</head>
<body>
<h2>Hello, ${safeName}!</h2>
<p>Your email address has been successfully changed.</p>
<p><strong>New email:</strong> ${safeNewEmail}</p>
<p>If you did not request this change, please contact customer support immediately.</p>
<hr>
<p style="color:#666;font-size:12px">This email was sent from ${siteName}.</p>
</body>
</html>`,
    text: `Hello, ${userName ?? 'Member'}!

Your email address has been successfully changed.

New email: ${newEmail ?? 'N/A'}

If you did not request this change, please contact customer support immediately.

Best regards,
${siteName}`,
  };
}
