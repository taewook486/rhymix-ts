/**
 * 일회용 이메일 도메인 감지 — SPEC-INSTALL-001 / REQ-INSTALL-054.
 *
 * 운영 환경(`NODE_ENV === 'production'`)에서 관리자 계정 등록 시 임시 메일
 * 사용을 차단하기 위한 도메인 블록리스트입니다. 본 함수는 호출 위치에
 * 무관하게 항상 동기적으로 동작하며, 입력이 비정상이면 false를 반환합니다.
 *
 * 향후 도메인 추가는 `DISPOSABLE_EMAIL_DOMAINS` 배열에만 반영하면 됩니다.
 *
 * @MX:NOTE: 도메인 일치는 정확 일치 + 서브도메인(`.<domain>` suffix)을 모두 차단한다.
 */

/** 일회용 메일 도메인 목록 (소문자, 단일 진실 원천). */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  'mailinator.com',
  'tempmail.com',
  'tempmail.org',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'throwaway.email',
  'mailnesia.com',
  'getnada.com',
  'temp-mail.org',
  'mohmal.com',
  'dispostable.com',
] as const;

/**
 * 입력 이메일이 일회용 도메인에 속하는지 판정.
 *
 * 비문자열·빈문자열·`@` 누락 등 비정상 입력에 대해서는 `false`를 반환합니다
 * (방어적 기본값 — Zod 단계에서 형식이 별도로 검증됨).
 */
export function isDisposableEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length === 0) return false;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  if (domain.length === 0) return false;
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain === blocked) return true;
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}
