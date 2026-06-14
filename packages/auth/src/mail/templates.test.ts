/**
 * 메일 템플릿 렌더링 시스템 테스트 — REQ-MAIL-031~035
 *
 * 템플릿 렌더링의 i18n, HTML 이스케이프, URL 검증, 필수 변수 검증을 테스트한다.
 */
import { describe, expect, it } from 'vitest';
import { renderTemplate } from './templates/render';
import { MailTemplateError } from './errors';

describe('renderTemplate', () => {
  it('signup-verify en locale: subject in English, HTML escapes userName, URL preserved (AC-MAIL-A4)', () => {
    const result = renderTemplate('signup-verify', {
      verifyUrl: 'https://x.com/v/abc',
      userName: '<script>X</script>',
      locale: 'en',
    });

    // subject is English
    expect(result.subject).toMatch(/verify|confirm|email/i);
    expect(result.subject).not.toMatch(/인증/); // not Korean

    // HTML escapes userName
    expect(result.html).toContain('&lt;script&gt;X&lt;/script&gt;');
    expect(result.html).not.toContain('<script>X</script>');

    // URL is in href
    expect(result.html).toContain('href="https://x.com/v/abc"');

    // text is plain (no HTML escape)
    expect(result.text).toContain('<script>X</script>');
    expect(result.text).not.toContain('&lt;script&gt;');
  });

  it('signup-verify ko locale: subject in Korean (AC-MAIL-A4)', () => {
    const result = renderTemplate('signup-verify', {
      verifyUrl: 'https://x.com/v/abc',
      userName: 'Alice',
      locale: 'ko',
    });
    // Korean subject contains Korean characters
    expect(result.subject).toMatch(/[가-힣]/);
  });

  it('missing required variable throws MailTemplateError (REQ-MAIL-035)', () => {
    expect(() =>
      renderTemplate('signup-verify', {
        verifyUrl: 'https://x.com/v/abc',
        // userName is missing
      })
    ).toThrow(MailTemplateError);
  });

  it('javascript: URL is rejected — MailTemplateError (REQ-MAIL-033)', () => {
    expect(() =>
      renderTemplate('signup-verify', {
        verifyUrl: 'javascript:alert(1)',
        userName: 'Alice',
      })
    ).toThrow(MailTemplateError);
  });

  it('http: URL is allowed (REQ-MAIL-033)', () => {
    const result = renderTemplate('signup-verify', {
      verifyUrl: 'http://example.com/verify',
      userName: 'Alice',
    });
    expect(result.html).toContain('href="http://example.com/verify"');
  });

  it('data: URL is rejected — MailTemplateError (REQ-MAIL-033)', () => {
    expect(() =>
      renderTemplate('signup-verify', {
        verifyUrl: 'data:text/html,<script>alert(1)</script>',
        userName: 'Alice',
      })
    ).toThrow(MailTemplateError);
  });
});
