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

---

# SPEC-INSTALL-001 Slice D — Progress

**날짜**: 2026-05-25
**방법론**: TDD (RED → GREEN → REFACTOR)
**베이스라인**: 843 tests passing (feature/install-001-slice-c 완료 후 시작)

---

## ANALYZE Phase

### REQ 매핑 (Slice D 범위)

| REQ | 설명 | 파일 |
|-----|------|------|
| REQ-INSTALL-023 | INSTALL_LOCK=1 환경변수 → 비설치 경로 410 Gone | middleware.ts |
| REQ-INSTALL-024 | SiteLock 활성 시 비허용 IP → 503 Service Unavailable | middleware.ts, lib/install/sitelock.ts, lib/install/extract-ip.ts |
| REQ-INSTALL-040 | 설치 완료 사이트 HTTPS 스킴 시 HSTS 헤더 부착 | middleware.ts, lib/install/headers.ts |
| REQ-INSTALL-041 | SiteLock 체크박스 → 위험 안내 확인 모달 (이해했습니다/취소) | app/install/admin-config/admin-config-form.tsx |
| REQ-INSTALL-042 | site 테이블 P2021/P2010 오류 시 install_lock SiteSetting 폴백 | lib/install/site-status.ts |

### 발견된 갭

- `sitelock.ts`와 `extract-ip.ts`, `headers.ts` 파일이 이미 구현됨 (`c6f4e3f` 커밋)
- middleware.ts에 Slice D 로직 (410, 503, HSTS) 미통합
- admin-config-form.tsx에 SiteLock 확인 모달 없음 (단순 체크박스만 존재)
- site-status.ts에 cloud DB 폴백 로직 없음
- `sitelock.ts`가 `@rhymix-ts/db`에서 prisma 임포트 → 테스트 모킹 이중화 필요

---

## PRESERVE Phase

- 843 테스트 전체 통과 확인 (0 failing, 9 skipped)
- middleware.test.ts 기존 7개 테스트 회귀 없음 확인
- `@rhymix-ts/db` 모킹 누락으로 17개 테스트 실패 → `vi.mock('@rhymix-ts/db', ...)` 블록 추가로 수정

---

## IMPROVE Phase

### 완료된 작업

| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/middleware.ts` | INSTALL_LOCK 410, SiteLock 503 (getSiteLockStatus + extractClientIp), HSTS 헤더 추가 |
| `apps/web/middleware.test.ts` | ML-1~4 (410 Gone), SL-1~4 (503 SiteLock), HSTS-1~2 + `@rhymix-ts/db` 모킹 추가 |
| `apps/web/app/install/admin-config/admin-config-form.tsx` | SiteLock controlled 체크박스 + 확인 모달 (role="dialog") |
| `apps/web/app/install/admin-config/admin-config-form.test.tsx` | SM-1~3 (SiteLock 확인 모달) — 신규 파일 |
| `apps/web/lib/install/site-status.ts` | REQ-INSTALL-042 cloud DB 폴백 (install_lock SiteSetting, P2021/P2010 오류 처리) |
| `apps/web/lib/install/site-status.test.ts` | SLDB-1~3 (cloud DB 폴백) 추가 |

### 핵심 구현 세부사항

**middleware.ts 실행 순서 (8단계)**:
1. INSTALL_LOCK=1 + 비설치 경로 → 410 Gone
2. `prisma.site.findFirst(...)` 공통 조회
3. 미설치 → 302 /install
4. 도메인 해석
5. forceHttps → 301
6. `getSiteLockStatus()` + `extractClientIp()` → 비허용 IP 503
7. 인증 보호
8. scheme=https → HSTS 헤더

**TDD 사이클 (REQ-INSTALL-041)**:
- RED: SM-1~3 작성 → 실패 확인
- `vi.resetModules()` + `afterEach(cleanup)` 필요 (DOM 누적 방지)
- `expect((checkbox as HTMLInputElement).checked).toBe(true)` — jest-dom 미설정으로 네이티브 단언 사용
- GREEN: admin-config-form.tsx 수정 → 3개 통과

---

## 수락 기준 (Slice D)

| AC | REQ | 상태 |
|----|-----|------|
| INSTALL_LOCK=1 + 비설치 경로 → 410 Gone | REQ-INSTALL-023 | 완료 (ML-1~4) |
| SiteLock 활성 + 비허용 IP → 503 | REQ-INSTALL-024 | 완료 (SL-1~4) |
| HTTPS 사이트 → HSTS 헤더 | REQ-INSTALL-040 | 완료 (HSTS-1~2) |
| SiteLock 체크박스 → 확인 모달 → 활성화 | REQ-INSTALL-041 | 완료 (SM-1~3) |
| cloud DB 폴백 (install_lock SiteSetting) | REQ-INSTALL-042 | 완료 (SLDB-1~3) |
| 회귀 없음 | — | 완료 (843 → 859 passing) |

---

## 테스트 결과 (Slice D 완료)

- **베이스라인**: 843 passing
- **완료 후**: 859 passing (+16 신규), 9 skipped (통합 테스트), 0 failing
- **신규 테스트 파일**: 1개 (admin-config-form.test.tsx)
- **신규 테스트**: ML-1~4, SL-1~4, HSTS-1~2, SM-1~3, SLDB-1~3 (총 16개)

---

## SPEC-INSTALL-001 전체 완료 현황

| Slice | REQ 범위 | 테스트 | 상태 |
|-------|----------|--------|------|
| A | 001, 003, 010, 020, 021, 050, 051 | +29 | 완료 (PR #19) |
| B | 013, 022, 053 | +15 | 완료 (PR #20) |
| C | 014, 015, 054 | +0 (기존 구현) | 완료 (PR #21) |
| D | 023, 024, 040, 041, 042 | +16 | 완료 (PR #22) |
| **전체** | **REQ-INSTALL-001~054** | **859/868** | **완료** |

---

## 구현 갭(Implementation Gap) — 2026-06-21 발견, 2026-06-22 해소 (post-install 부트스트랩)

**상태**: 해소 완료. REQ-INSTALL-016~018은 `packages/db/src/install/seed.ts`에 구현되었고, `seed.test.ts`에 추가된 7개 테스트 모두 통과(`pnpm vitest run packages/db/src/install/seed.test.ts`). 아래는 발견 당시 기록(경위 보존용)이며, "현재 구현 상태"는 더 이상 최신이 아니다 — 실제 코드는 9~12단계(Board/Menu/MenuItem/Domain.update/샘플 Document)까지 포함한다.

### 발견 경위

Playwright로 설치 마법사를 끝까지 실행해 레거시 PHP Rhymix와 비교한 결과, `procInstall`(REQ-INSTALL-014) 완료 후 다음이 전혀 생성되지 않음:

1. 어떤 `ModuleInstance`도 도메인의 인덱스 모듈로 지정되지 않음 → 홈페이지가 "No index module configured for this domain." 만 표시. 스키마에는 `Domain.indexModuleInstanceId` + `IndexModule` 관계가 이미 존재(`packages/db/prisma/schema.prisma:86`, `:95`, `:131`)하나 미채움.
2. `Menu`/`MenuItem` 레코드 0건 → `/admin/menu`에서 "등록된 메뉴가 없습니다". `Menu`/`MenuItem` 모델 존재(`schema.prisma:158`, `:177`), `Domain.defaultMenuId` 필드 존재(`schema.prisma:84`)하나 미설정.
3. 샘플 `Document` 0건. 레거시는 설치 시 환영/공지 메뉴 + 샘플 게시글을 자동 생성.

### 현재 구현 상태 (seed.ts)

`seedInstall()` (`packages/db/src/install/seed.ts:77-197`)는 다음만 수행:
- Site, Domain, MemberGroup×2, admin User, MemberGroupMember (1~6단계)
- `ModuleInstance × 3` (notice/qna/board) — `seed.ts:155-164`
- `SiteSetting × 3` (sitelock_enabled, sitelock_allowlist, install_lock) — `seed.ts:167-188`
- 그리고 즉시 return (`seed.ts:190-195`)

→ 인덱스 모듈 연결 / 메뉴 생성 / 샘플 콘텐츠 생성이 **코드에도 SPEC에도 없었음**.

### 신규 REQ → seed.ts 보완 필요 사항

| REQ | 보완 내용 | 주의점 |
|-----|-----------|--------|
| REQ-INSTALL-016 | `Domain.indexModuleInstanceId` ← board 인스턴스 id | 트랜잭션 내, ModuleInstance 생성 직후 |
| REQ-INSTALL-017 | `Menu` 1개 + `MenuItem` 행 생성, `Domain.defaultMenuId` 설정 | MenuItem이 board 모듈로 연결되도록 (url 또는 모듈 매핑) |
| REQ-INSTALL-018 | board/notice에 샘플 `Document` ≥1건 (`seed_sample_content=true` 기본) | **`Document`는 `boardId`(→`Board`) 필요. 현재 seed는 `Board` 행을 만들지 않음.** 따라서 board/notice(필요시 qna) ModuleInstance에 대한 `Board` 행(`schema.prisma:640`, FK `moduleInstanceId`)을 먼저 생성해야 샘플 문서 삽입 가능 |

### 미해결 결정 사항 → 확정 결과 (2026-06-22, seed.ts 구현 기준)

1. **메뉴/메뉴아이템 명칭·구성**: Board/Notice/Q&A 3개로 확정(`seed.ts` 10단계 `menuItems`). Welcome 별도 메뉴는 만들지 않음 — 대신 board 모듈에 샘플 Document로 환영 글을 넣는 방식(REQ-018) 채택.
2. **MenuItem → 모듈 링크 방식**: `MenuItem.url = '/{mid}'` 문자열 방식으로 확정. 별도 모듈 참조 컬럼은 추가하지 않음(스키마 변경 없음).
3. **`seed_sample_content` 플래그 전달 경로**: `SeedInput.seedSampleContent?: boolean` 필드로 확정, 기본값 `true`(미지정 시). 설치 옵션/env 경로는 채택하지 않음.
4. **`Board` 행 생성 범위**: board/notice/qna 3개 모두 생성하는 것으로 확정(9단계) — qna도 게시판 모듈이라 비어 있어도 Board 행이 필요하다는 판단을 따름. 샘플 Document는 board/notice 2곳에만 삽입.

### 구현 완료 요약 (REQ-INSTALL-016~018)

- `packages/db/src/install/seed.ts`: 9~12단계 추가 — Board×3 생성 → Menu×1 + MenuItem×3 생성 → `Domain.update`(indexModuleInstanceId, defaultMenuId) → 샘플 Document×2(board/notice).
- `packages/db/src/install/seed.test.ts`: 신규 케이스 포함 총 7 tests, 전부 통과.
- 트랜잭션 범위: 9~12단계 모두 기존 `seedInstall` 트랜잭션 내부에 위치 — 부분 시드로 인한 install_lock 불일치 위험 없음.
