# SPEC-INSTALL-001 Slice A — Progress

**날짜**: 2026-05-24
**방법론**: DDD (ANALYZE → PRESERVE → IMPROVE)
**베이스라인**: 799 tests passing (feature/install-001-slice-a 브랜치 시작)

---

## ANALYZE Phase

### Baseline (install 관련 테스트만)

```
install 관련 테스트: 104 passed, 3 skipped (107 total)
파일 수: 13개
실행 시간: 2.58s
```

### REQ 매핑 (Slice A 범위)

| REQ | 설명 | 상태 | 파일 |
|-----|------|------|------|
| REQ-INSTALL-001 | 미설치 시 /install 302 리다이렉트 | **누락** | middleware.ts (install gate 없음) |
| REQ-INSTALL-003 | CSRF double-submit cookie | **부분** | wizard-session.ts에 csrfToken 필드 없음 |
| REQ-INSTALL-004 | step 전이 ring buffer 로그 | **구현** | wizard-log.ts |
| REQ-INSTALL-005 | iron-session 암호화 쿠키 60분 | **구현** | wizard-session.ts (maxAge=3600) |
| REQ-INSTALL-010 | Accept-Language → next-intl | **부분** | 감지 함수 없음, i18n 미통합 |
| REQ-INSTALL-011 | licenseAgreed=true 시 세션 설정 | **구현** | actions.ts agreeLicense |
| REQ-INSTALL-012 | env diagnostics 6개 항목 병렬 | **구현** | diagnostics.ts (9개 항목 존재) |
| REQ-INSTALL-020 | installedAt IS NULL 시 모든 경로 302 | **누락** | middleware.ts에 install gate 없음 |
| REQ-INSTALL-021 | licenseAgreed=false 시 check-env 차단 | **구현** | wizard-guards.ts requireWizardStep |
| REQ-INSTALL-050 | 1~3단계 DB 쓰기 없음 | **구현** | wizard-log.ts (ring buffer only) |
| REQ-INSTALL-051 | 로그에서 password 키 redact | **누락** | wizard-log.ts에 redactor 없음 |
| REQ-INSTALL-052 | NEXTAUTH_SECRET >= 32 bytes | **구현** | wizard-session.ts buildSessionOptions |

### 발견된 주요 누락 사항

1. **middleware.ts install-gate**: 미설치 시 /install로 302 리다이렉트 로직 전혀 없음 (R1 위험)
2. **CSRF double-submit**: wizard-session.ts에 csrfToken 필드 없음, agreeLicense에 CSRF 검증 없음
3. **wizard-log.ts password redactor**: logStepTransition에 민감 키 마스킹 없음 (REQ-INSTALL-051)
4. **_rewrite_test/[nonce] 라우트**: diagnostics의 rewriteHeadProbe가 `/api/install/rewrite-test/{nonce}` 호출하지만 라우트 없음

### 기존 구현 중 잘 된 부분

- diagnostics.ts: 9개 항목 완전 구현, withTimeout, Promise.allSettled 정상
- wizard-session.ts: iron-session 어댑터, 60분 maxAge, Secure/HttpOnly/SameSite=Strict
- wizard-guards.ts: requireWizardStep cascade (license → env-check → db → admin)
- actions.ts: agreeLicense, validateDbConfig, performInstall 골격 완성
- 기존 테스트: 104/107 passing (3 skipped)

---

## PRESERVE Phase

### seed-site-installed.ts 헬퍼

- 위치: `apps/web/__tests__/helpers/seed-site-installed.ts`
- 목적: middleware install-gate 추가 시 기존 ADMIN/AUTH/CONTENT 테스트 회귀 방지

### middleware.test.ts 현황

- 기존 7개 테스트: prisma.domain.findFirst 모킹으로 domain 처리
- install-gate 추가 시: prisma.site.findFirst 모킹도 필요 → 기존 테스트에 site mock 추가 필요

---

## IMPROVE Phase

### 완료된 작업

(추적 중)

### 진행 중인 작업

(추적 중)

---

## 수락 기준 (Slice A)

| AC | REQ | 상태 |
|----|-----|------|
| AC-A-1 | 001, 020 | 대기 |
| AC-A-2 | 011 | 구현됨 (agreeLicense) |
| AC-A-3 | 021 | 구현됨 (requireWizardStep) |
| AC-A-4 | 012 | 구현됨 (check-env page) |
| AC-A-5 | US-INSTALL-012 | 부분 (세션 만료 헬퍼 없음) |
| AC-A-6 | 051 | 대기 (redactor 누락) |
| AC-A-7 | 003 | 대기 (CSRF 검증 누락) |
| AC-A-8 | 052 | 구현됨 (buildSessionOptions) |
| AC-A-9 | 회귀 | 대기 (seed-site-installed 헬퍼 필요) |

---

# SPEC-INSTALL-001 Slice B — Progress

**날짜**: 2026-05-24
**방법론**: DDD (ANALYZE → PRESERVE → IMPROVE)
**베이스라인**: 828 tests passing (feature/install-001-slice-a 완료 후 시작)

---

## ANALYZE Phase

### REQ 매핑 (Slice B 범위)

| REQ | 설명 | 상태 | 비고 |
|-----|------|------|------|
| REQ-INSTALL-013 | DB config 폼 검증 (superuser 거부/연결/권한/테이블 충돌) | **이미 구현** | `install-validate.ts` (Slice A에서 미리 구현됨) |
| REQ-INSTALL-022 | dbConfigValidated=false 시 admin-config 접근 차단 | **이미 구현** | `wizard-guards.ts`의 requireWizardStep |
| REQ-INSTALL-053 | pg_advisory_lock 유틸 | **이미 구현** | `packages/db/src/install/lock.ts` |
| REQ-INSTALL-050 | DB 비밀번호 평문 미노출 (iron-session 암호화 의존) | **이미 구현** | wizard-session.ts |

### 발견된 갭

- Slice B 명세 위치(`packages/db/src/install/db-validator.ts`, `advisory-lock.ts`)에 파일 없음
  - 실제 구현은 `install-validate.ts`, `install/lock.ts`에 존재
  - re-export 파일 생성으로 명세 준수

---

## PRESERVE Phase

- 기존 828 테스트 전체 통과 확인
- 관련 테스트 현황:
  - `install-validate.test.ts`: 10 passed, 2 skipped (통합)
  - `install/lock.test.ts`: 3 passed (단위), 1 skipped (통합)
  - `wizard-guards.test.ts`: 8 passed (DV-1~2 해당 케이스 포함)
  - `actions.test.ts`: 21 passed (validateDbConfig 6개 케이스 포함)

---

## IMPROVE Phase

### 완료된 작업

| 파일 | 변경 내용 |
|------|-----------|
| `packages/db/src/install/db-validator.ts` | 신규 — install-validate.ts re-export (Slice B 명세 위치) |
| `packages/db/src/install/advisory-lock.ts` | 신규 — lock.ts re-export (Slice B 명세 위치) |
| `packages/db/src/install/db-validator.test.ts` | 신규 — DB-1~6, CH-1~2 (8 tests) |
| `packages/db/src/install/advisory-lock.test.ts` | 신규 — AL-1~2 + 3번째 (3 tests) |
| `apps/web/app/install/db-config/db-config.test.ts` | 신규 — DV-1~2, CH-1~2 (4 tests) |

---

## 수락 기준 (Slice B)

| AC | REQ | 상태 |
|----|-----|------|
| AC-B-1: DB superuser 거부 | REQ-INSTALL-013.1 | 완료 (DB-1) |
| AC-B-2: 연결 시도 + 권한 검증 | REQ-INSTALL-013.2~3 | 완료 (DB-2, DB-5, DB-6) |
| AC-B-3: 테이블 충돌 409 거부 | REQ-INSTALL-013.4 | 완료 (DB-3) |
| AC-B-4: 성공 시 세션 저장 + redirect | REQ-INSTALL-013.5~6 | 완료 (DB-4, actions.test.ts) |
| AC-B-5: dbConfigValidated=false 시 admin 차단 | REQ-INSTALL-022 | 완료 (DV-1~2) |
| AC-B-6: advisory lock 획득/해제 | REQ-INSTALL-053 | 완료 (AL-1~2) |
| AC-B-7: DB 비밀번호 평문 미노출 | REQ-INSTALL-050 | 완료 (iron-session 암호화 의존) |
| AC-B-8: 회귀 없음 | — | 완료 (828 → 843 passing) |

---

## 테스트 결과 (Slice B 완료)

- **베이스라인**: 828 passing
- **완료 후**: 843 passing (+15), 9 skipped (통합 테스트), 0 failing
- **신규 테스트 파일**: 3개 (db-validator.test.ts, advisory-lock.test.ts, db-config.test.ts)

---

# SPEC-INSTALL-001 Slice C — Progress

**날짜**: 2026-05-25
**방법론**: TDD (RED → GREEN → REFACTOR)
**베이스라인**: 843 tests passing (feature/install-001-slice-b 완료 후 시작)

---

## ANALYZE Phase

### REQ 매핑 (Slice C 범위)

| REQ | 설명 | 상태 | 파일 |
|-----|------|------|------|
| REQ-INSTALL-014 | performInstall Server Action — seed + 세션 → /install/complete | **이미 구현** | `apps/web/app/install/actions.ts` |
| REQ-INSTALL-015 | 트랜잭션 실패 시 전체 롤백 → /install/db-config | **이미 구현** | `packages/db/src/install/seed.ts` (`$transaction`) + actions.ts try/finally |
| REQ-INSTALL-053 | pg_advisory_lock 동시 설치 방지 | **이미 구현** | `packages/db/src/install/lock.ts` (Slice B에서 확인됨) |
| REQ-INSTALL-054 | 일회용 이메일 도메인 차단 (프로덕션) | **이미 구현** | `packages/auth/src/disposable-email.ts` |

### 발견된 갭

- 모든 Slice C 요건이 이전 구현 사이클(`c6f4e3f`: old slice D)에서 미리 구현됨
- 7개 performInstall 단위 테스트, seedInstall 2개 단위 테스트 모두 통과 중
- 신규 추가 사항 없음 — 문서화 및 공식 슬라이스 마킹만 수행

---

## PRESERVE Phase

- 기존 843 테스트 전체 통과 확인 (0 failing, 9 skipped)

### 핵심 테스트 현황 (Slice C 관련)

| 테스트 파일 | 테스트 수 | 상태 |
|-------------|-----------|------|
| `actions.test.ts` (performInstall 7개) | 7 | ✓ 통과 |
| `packages/db/src/install/seed.test.ts` | 2 | ✓ 통과 |
| `packages/db/src/install/lock.test.ts` | 3 | ✓ 통과 |
| `packages/auth/src/disposable-email.test.ts` | (포함) | ✓ 통과 |

---

## IMPROVE Phase

### 완료된 작업 (기존 구현 확인)

| 파일 | 내용 |
|------|------|
| `apps/web/app/install/actions.ts` | `performInstall`: Zod 검증 → 일회용 이메일 차단 → advisory lock → seedInstall → session.step='finish' → redirect('/install/complete') |
| `packages/db/src/install/seed.ts` | `seedInstall`: 8-step `$transaction` (Site → Domain → MemberGroup×2 → User → Site.update → MemberGroupMember → ModuleInstance×3 → SiteSetting×3) |
| `apps/web/app/install/complete/page.tsx` | 설치 완료 환영 페이지 — `session.step==='finish'` 분기 |
| `apps/web/app/install/actions.test.ts` | performInstall 7개 케이스 (happy path, lock fail, seed throw, disposable email ×2, missing DB, step gate) |
| `packages/db/src/install/seed.test.ts` | 트랜잭션 시퀀스 검증 + 롤백 전파 확인 |

---

## 수락 기준 (Slice C)

| AC | REQ | 상태 |
|----|-----|------|
| AC-INSTALL-004: seed 실패 시 롤백 + db-config 리다이렉트 | REQ-INSTALL-014, 015 | 완료 (seed.test.ts + actions.test.ts) |
| AC-INSTALL-007: 동시 설치 → advisory lock → 두 번째 requst 거부 | REQ-INSTALL-053 | 완료 (actions.test.ts: lock not acquired) |
| 일회용 이메일 차단 (production) | REQ-INSTALL-054 | 완료 (actions.test.ts: disposable email) |
| 회귀 없음 | — | 완료 (843 → 843 passing) |

---

## 테스트 결과 (Slice C 완료)

- **베이스라인**: 843 passing
- **완료 후**: 843 passing (+0 신규), 9 skipped (통합 테스트), 0 failing
- **비고**: 모든 Slice C 구현이 이전 커밋에 이미 포함됨. 이 PR은 공식 슬라이스 마킹 및 문서화 커밋.
