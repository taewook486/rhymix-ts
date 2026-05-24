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
