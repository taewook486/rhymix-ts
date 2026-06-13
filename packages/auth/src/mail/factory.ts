/**
 * 메일 디스패처 팩토리 함수 — REQ-MAIL-010~017
 *
 * 환경변수를 검증하고 SMTP 설정에 따라 적절한 디스패처(NoopMailDispatcher 또는
 * SmtpMailDispatcher)를 생성하여 반환한다.
 */

import type { MailDispatcher } from '../mail.js';
import { NoopMailDispatcher } from '../mail.js';
import { SmtpMailDispatcher } from './smtp-dispatcher.js';
import { MailConfigError } from './errors.js';

/**
 * 환경변수 파싱 및 디스패터 선택 — REQ-MAIL-010~017
 *
 * 환경변수 검증 규칙:
 * - SMTP_HOST 미설정 시: NoopMailDispatcher 반환 (개발/E2E 폴백)
 * - SMTP_HOST 설정 시:
 *   - SMTP_FROM 필수 (REQ-MAIL-013)
 *   - SMTP_USER 설정 시 SMTP_PASS 필수 (REQ-MAIL-014)
 *   - SMTP_PORT: 1-65535 범위 정수 (기본값 587) (REQ-MAIL-015)
 *   - SMTP_SECURE: 'true' 문자열 시 true, 나머지는 false (기본값 false)
 *
 * @param env 환경변수 객체 (기본값 process.env)
 * @returns MailDispatcher 구현체 인스턴스
 * @throws MailConfigError 필수 환경변수 누락 또는 잘못된 값
 *
 * @MX:ANCHOR: createMailDispatcher — 메일 시스템 진입점, SPEC-MAIL-001
 * @MX:REASON: apps/web/lib/mail/dispatcher.ts 싱글톤 + admin actions에서 참조
 */
export function createMailDispatcher(
  env: NodeJS.ProcessEnv = process.env,
): MailDispatcher {
  const host = env.SMTP_HOST;

  // SMTP_HOST 미설정 시 NoopMailDispatcher 반환 — REQ-MAIL-012
  if (!host) {
    console.warn(
      '[mail] SMTP_HOST not configured — using NoopMailDispatcher. Emails will NOT be sent.'
    );
    return new NoopMailDispatcher();
  }

  // REQ-MAIL-013: SMTP_FROM 필수
  const from = env.SMTP_FROM;
  if (!from) {
    throw new MailConfigError('SMTP_FROM is required when SMTP_HOST is set');
  }

  // REQ-MAIL-014: SMTP_PASS 필수 when SMTP_USER set
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (user && !pass) {
    throw new MailConfigError('SMTP_PASS is required when SMTP_USER is set');
  }

  // REQ-MAIL-015: SMTP_PORT 검증 (1-65535)
  const portStr = env.SMTP_PORT ?? '587';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new MailConfigError(
      `SMTP_PORT must be an integer in [1, 65535], got: ${portStr}`
    );
  }

  // REQ-MAIL-016: SMTP_SECURE 파싱 (기본값 false)
  const secure = env.SMTP_SECURE === 'true';

  return new SmtpMailDispatcher({ host, port, user, pass, from, secure });
}
