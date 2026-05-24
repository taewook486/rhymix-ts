/**
 * Postgres advisory lock 공개 인터페이스 — SPEC-INSTALL-001 / REQ-INSTALL-053.
 *
 * 본 파일은 `packages/db/src/install/lock.ts`의 내용을 Slice B 명세 파일명
 * (`advisory-lock.ts`) 기준으로 재노출합니다. 실제 구현은 `lock.ts`에 단일
 * 소스로 유지됩니다.
 *
 * `pg_try_advisory_lock(hashtext('rhymix_ts_install'))` 기반 non-blocking lock.
 * procInstall 단계에서 동시 설치를 방지하는 마지막 안전 게이트입니다.
 *
 * @MX:NOTE: [AUTO] lock.ts의 공개 별칭 — lock.ts 변경 시 이 파일도 함께 확인.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-053
 */
export { acquireInstallLock, type InstallLock } from './lock';
