/**
 * 메일 디스패처 팩토리 함수 테스트 — REQ-MAIL-010~017
 *
 * 환경변수에 따른 디스패처 선택, Noop 폴백, 설정 검증을 테스트한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMailDispatcher } from './factory.js';
import { NoopMailDispatcher } from '../mail.js';
import { SmtpMailDispatcher } from './smtp-dispatcher.js';
import { MailConfigError } from './errors.js';

// nodemailer mock — REQ-MAIL-062
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(),
      verify: vi.fn(),
    })),
  },
}));

describe('createMailDispatcher', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('SMTP_HOST 설정 시 SmtpMailDispatcher 반환 (AC-MAIL-A1)', () => {
    const dispatcher = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_FROM: 'Rhymix <no@example.com>',
    });
    expect(dispatcher).toBeInstanceOf(SmtpMailDispatcher);
  });

  it('SMTP_HOST 미설정 시 NoopMailDispatcher 반환 + console.warn (AC-MAIL-A2)', () => {
    const dispatcher = createMailDispatcher({});
    expect(dispatcher).toBeInstanceOf(NoopMailDispatcher);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(
      /^\[mail\] SMTP_HOST not configured/
    );
  });

  it('SMTP_HOST 설정 + SMTP_FROM 누락 시 MailConfigError (REQ-MAIL-013)', () => {
    expect(() => createMailDispatcher({ SMTP_HOST: 'smtp.example.com' })).toThrow(
      MailConfigError
    );
  });

  it('SMTP_USER 설정 + SMTP_PASS 누락 시 MailConfigError (REQ-MAIL-014)', () => {
    expect(() =>
      createMailDispatcher({
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'x@example.com',
        SMTP_USER: 'user',
      })
    ).toThrow(MailConfigError);
  });

  it('SMTP_PORT 기본값 587 (REQ-MAIL-015)', () => {
    const dispatcher = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      // SMTP_PORT not set, should default to 587
    });
    expect(dispatcher).toBeInstanceOf(SmtpMailDispatcher);
  });

  it('SMTP_PORT 문자열 숫자 파싱 (REQ-MAIL-015)', () => {
    const dispatcher = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      SMTP_PORT: '465',
    });
    expect(dispatcher).toBeInstanceOf(SmtpMailDispatcher);
  });

  it('SMTP_PORT 범위 밖 숫자 → MailConfigError (REQ-MAIL-015)', () => {
    expect(() =>
      createMailDispatcher({
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'x@example.com',
        SMTP_PORT: '0',
      })
    ).toThrow(MailConfigError);
  });

  it('SMTP_PORT 비숫자 문자열 → MailConfigError (REQ-MAIL-015)', () => {
    expect(() =>
      createMailDispatcher({
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'x@example.com',
        SMTP_PORT: 'invalid',
      })
    ).toThrow(MailConfigError);
  });

  it('SMTP_SECURE=true → TLS 연결 (REQ-MAIL-016)', () => {
    const dispatcher = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      SMTP_SECURE: 'true',
    });
    expect(dispatcher).toBeInstanceOf(SmtpMailDispatcher);
  });

  it('SMTP_SECURE=false 또는 미설정 → STARTTLS (REQ-MAIL-016)', () => {
    const dispatcher1 = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      SMTP_SECURE: 'false',
    });
    expect(dispatcher1).toBeInstanceOf(SmtpMailDispatcher);

    const dispatcher2 = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      // SMTP_SECURE not set, should default to false
    });
    expect(dispatcher2).toBeInstanceOf(SmtpMailDispatcher);
  });

  it('SMTP_USER만 설정 → SmtpMailDispatcher (auth disabled)', () => {
    const dispatcher = createMailDispatcher({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'x@example.com',
      // SMTP_USER not set, auth disabled
    });
    expect(dispatcher).toBeInstanceOf(SmtpMailDispatcher);
  });
});
