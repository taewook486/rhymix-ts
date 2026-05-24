/**
 * DB 접속/권한/스키마 충돌 검증 — SPEC-INSTALL-001 / REQ-INSTALL-013.
 *
 * 본 파일은 `packages/db/src/install-validate.ts`의 내용을 Slice B 명세
 * 위치(`packages/db/src/install/`) 기준으로 재노출합니다. 실제 검증 로직은
 * `install-validate.ts`에 단일 소스로 유지되어 중복을 방지합니다.
 *
 * @MX:ANCHOR: [AUTO] Slice B 검증 게이트 공개 인터페이스 (fan_in: actions.ts, index.ts, test).
 * @MX:REASON: validateDbConnection은 위저드 3단계의 유일한 DB 검증 진입점이다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-013, REQ-INSTALL-050
 */
export {
  validateDbConnection,
  type DbValidationCode,
  type DbValidationIssue,
  type DbValidationResult,
  type ValidateOptions,
} from '../install-validate';
