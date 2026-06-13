import { createMailDispatcher } from '@rhymix-ts/auth';

/**
 * 메일 디스패처 싱글톤 — REQ-MAIL-071
 *
 * @MX:ANCHOR: mailDispatcher — apps/web 전역 싱글톤
 * @MX:REASON: actions.ts 2곳 + admin actions에서 참조
 *
 * 이 모듈은 createMailDispatcher()를 통해 환경변수에 따라
 * SmtpMailDispatcher 또는 NoopMailDispatcher를 선택한다.
 * - SMTP_HOST 설정 시: SmtpMailDispatcher (실제 메일 발송)
 * - SMTP_HOST 미설정 시: NoopMailDispatcher (개발용, 콘솔 경고)
 */
export const mailDispatcher = createMailDispatcher(process.env);
