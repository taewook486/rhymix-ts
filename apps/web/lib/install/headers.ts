/**
 * 보안 응답 헤더 상수 — REQ-INSTALL-040.
 *
 * @MX:NOTE: HSTS preload 등록을 위한 권장 형식 — 1년 max-age + includeSubDomains + preload.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-040
 */
export const HSTS_HEADER_VALUE = 'max-age=31536000; includeSubDomains; preload';
