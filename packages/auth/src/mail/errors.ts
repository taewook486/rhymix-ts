/**
 * Mail 시스템 전용 에러 클래스 — REQ-MAIL-008
 *
 * 메일 발송 파이프라인에서 발생하는 각 단계별 에러 타입을 명확히 구분하기 위한
 * 에러 클래스 정의. MailConfigError(환경변수 검증), MailValidationError(이메일 주소),
 * MailTemplateError(템플릿 렌더링), MailDeliveryError(SMTP 전송)으로 분류된다.
 */

/**
 * 메일 설정 에러 — SMTP_HOST, SMTP_FROM 등 필수 환경변수 누락 또는 잘못된 값
 */
export class MailConfigError extends Error {
  override readonly name = 'MailConfigError';
  constructor(message: string) {
    super(message);
  }
}

/**
 * 메일 데이터 검증 에러 — 이메일 주소 포맷 불일치 등
 */
export class MailValidationError extends Error {
  override readonly name = 'MailValidationError';
  constructor(message: string) {
    super(message);
  }
}

/**
 * 메일 템플릿 에러 — 템플릿 파일 누락, 필수 변수 누락, URL 스킴 불일치
 */
export class MailTemplateError extends Error {
  override readonly name = 'MailTemplateError';
  constructor(message: string) {
    super(message);
  }
}

/**
 * 메일 발송 에러 — SMTP 서버 연결 실패, 인증 실패, 영구적/일시적 전송 실패
 * cause 프로퍼티에 원인 에러를 포함하여 디버깅을 지원한다
 */
export class MailDeliveryError extends Error {
  override readonly name = 'MailDeliveryError';
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
  }
}
