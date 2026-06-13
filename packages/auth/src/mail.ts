/**
 * Mail dispatcher abstraction — SPEC-AUTH-001 Slice B.
 *
 * 본 모듈은 인증 흐름(가입 인증, 비밀번호 재설정 등)에서 메일을 보내는 사이드
 * 이펙트를 분리하기 위한 인터페이스만 제공한다. 실제 SMTP/Resend/SES 구현은
 * SPEC-INFRA-001에서 별도로 다룬다.
 *
 * - {@link InMemoryMailDispatcher}: 테스트 더블. 보낸 메시지를 배열에 저장한다.
 * - {@link NoopMailDispatcher}: 기본 구현. 아무것도 하지 않는다 (개발/E2E 폴백).
 *
 * 두 구현 모두 logger를 사용하지 않는다 (REQ-AUTH-055 — 평문 메일 본문 또는
 * 인증 토큰을 로그에 남기지 않기 위함).
 *
 * @MX:NOTE: 실제 메일 인프라는 SPEC-INFRA-001에서 추가 — 본 인터페이스는 그때 까지의 어댑터 경계.
 */

export type MailTemplate =
  | 'signup-verify'
  | 'password-reset'
  | 'email-change'
  | 'security-alert'
  | 'welcome';

export interface MailMessage {
  to: string;
  subject: string;
  template: MailTemplate;
  /** Template variables (e.g., verifyUrl, userName). String-only by contract. */
  vars: Record<string, string>;
}

export interface MailDispatcher {
  dispatch(message: MailMessage): Promise<void>;
}

/**
 * Default no-op dispatcher. Used when no real mail infra is wired.
 *
 * Returning a resolved promise without side effects keeps the signup flow
 * functional in development environments where SMTP is intentionally absent.
 */
export class NoopMailDispatcher implements MailDispatcher {
  async dispatch(_message: MailMessage): Promise<void> {
    // Intentionally empty — see class JSDoc.
  }
}

/**
 * In-memory dispatcher for tests. Records every dispatched message.
 *
 * Defensive copies are stored so that mutations to the recorded entry cannot
 * affect the caller's original message object (and vice versa).
 */
export class InMemoryMailDispatcher implements MailDispatcher {
  readonly sent: MailMessage[] = [];

  async dispatch(message: MailMessage): Promise<void> {
    this.sent.push({
      to: message.to,
      subject: message.subject,
      template: message.template,
      vars: { ...message.vars },
    });
  }

  reset(): void {
    this.sent.length = 0;
  }
}
