/**
 * Disposable email detection — REQ-INSTALL-054 specification tests.
 *
 * 일회용/임시 이메일 도메인 차단을 검증합니다. 운영 환경에서 관리자 계정
 * 생성 시 이 검사가 적용되며, 개발 환경에서는 호출 자체가 우회됩니다
 * (호출 측 책임).
 */
import { describe, expect, it } from 'vitest';

import { DISPOSABLE_EMAIL_DOMAINS, isDisposableEmail } from './disposable-email';

describe('isDisposableEmail', () => {
  it('the system shall return true for a known disposable domain', () => {
    expect(isDisposableEmail('attacker@mailinator.com')).toBe(true);
  });

  it('the system shall return false for a regular email', () => {
    expect(isDisposableEmail('admin@example.com')).toBe(false);
  });

  it('the system shall match disposable domains case-insensitively', () => {
    expect(isDisposableEmail('A@MailINator.COM')).toBe(true);
    expect(isDisposableEmail('B@TempMail.Org')).toBe(true);
  });

  it('the system shall flag a subdomain of a disposable domain', () => {
    // foo.mailinator.com 같은 서브도메인도 mailinator.com 도메인 family로 차단.
    expect(isDisposableEmail('user@foo.mailinator.com')).toBe(true);
  });

  it('the system shall return false for non-string, empty, or malformed input', () => {
    // @ts-expect-error 의도적인 비문자열 입력
    expect(isDisposableEmail(undefined)).toBe(false);
    // @ts-expect-error 의도적인 비문자열 입력
    expect(isDisposableEmail(null)).toBe(false);
    expect(isDisposableEmail('')).toBe(false);
    expect(isDisposableEmail('no-at-sign')).toBe(false);
    expect(isDisposableEmail('user@')).toBe(false);
  });

  it('the system shall expose DISPOSABLE_EMAIL_DOMAINS as the source of truth', () => {
    expect(DISPOSABLE_EMAIL_DOMAINS).toContain('mailinator.com');
    expect(DISPOSABLE_EMAIL_DOMAINS).toContain('yopmail.com');
    expect(DISPOSABLE_EMAIL_DOMAINS.length).toBeGreaterThanOrEqual(10);
  });
});
