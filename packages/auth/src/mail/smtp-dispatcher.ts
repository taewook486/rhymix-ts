/**
 * SMTP 메일 발송 디스패처 — REQ-MAIL-020~027
 *
 * nodemailer를 사용하여 SMTP 서버에 연결하고 메일을 발송한다. 재시도 로직과
 * 영구적 에러 처리를 구현하여 신뢰성을 높인다.
 */

import nodemailer from 'nodemailer';
import { z } from 'zod';
import { prisma } from '@rhymix-ts/db';
import type { MailDispatcher, MailMessage } from '../mail';
import { MailValidationError, MailDeliveryError } from './errors';
import { renderTemplate } from './templates/render';
import { writeMailFailureAudit } from './audit';

const EMAIL_RE = z.string().email();

// 재시도 지연 시퀀스: 즉시, 1초, 2초 (총 3회 시도) — REQ-MAIL-040
const RETRY_DELAYS_MS = [0, 1000, 2000];

/**
 * 영구적 에러 판별 — 5xx 서버 에러는 즉시 실패 처리 — REQ-MAIL-041
 */
function isPermanentError(err: unknown): boolean {
  const code = (err as any)?.responseCode;
  return typeof code === 'number' && code >= 500 && code < 600;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SMTP 메일 발송 디스패처 구현체 — MailDispatcher 인터페이스 구현
 * @MX:ANCHOR: SmtpMailDispatcher — MailDispatcher 인터페이스 구현체, SPEC-MAIL-001
 * @MX:REASON: admin UI + callsite 3곳 이상에서 참조 (apps/web singleton, admin settings test, password reset flow)
 */
export class SmtpMailDispatcher implements MailDispatcher {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
    secure: boolean;
  }) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: config.user
        ? { user: config.user, pass: config.pass ?? '' }
        : undefined,
    });
  }

  /**
   * 메일 발송 — 재시도 로직 포함 — REQ-MAIL-040~041
   * @param message 발송할 메일 메시지
   * @throws MailValidationError 수신자 이메일이 유효하지 않음
   * @throws MailDeliveryError 모든 재시도 소진 후 발송 실패
   */
  async dispatch(message: MailMessage): Promise<void> {
    // 수신자 이메일 검증 — REQ-MAIL-025
    const parsed = EMAIL_RE.safeParse(message.to);
    if (!parsed.success) {
      throw new MailValidationError('invalid recipient email address');
    }

    // 템플릿 렌더링
    const { html, text } = renderTemplate(message.template, message.vars);

    let lastError: unknown;
    let attempts = 0;

    // 재시도 루프 — REQ-MAIL-040
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      const delay = RETRY_DELAYS_MS[i]!; // Non-null assertion - i is always within bounds
      if (delay > 0) {
        await sleep(delay);
      }
      attempts++;

      try {
        await this.transporter.sendMail({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html,
          text,
        });
        return; // 성공 — 함수 종료
      } catch (err) {
        lastError = err;
        // 영구적 에러는 즉시 실패 — REQ-MAIL-041
        if (isPermanentError(err)) {
          break;
        }
      }
    }

    // 모든 재시도 소진 — AuditLog 기록 — REQ-MAIL-042
    try {
      await writeMailFailureAudit(prisma, message, lastError, attempts);
    } catch (auditErr) {
      console.error('[mail] AuditLog write failed:', auditErr);
    }

    throw new MailDeliveryError(
      `mail delivery failed after ${attempts} attempts`,
      lastError
    );
  }

  /**
   * SMTP 연결 테스트 — 관리자 UI 연결 테스트 기능 — REQ-MAIL-026
   * @returns 연결 성공 시 true, 실패 시 false
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
