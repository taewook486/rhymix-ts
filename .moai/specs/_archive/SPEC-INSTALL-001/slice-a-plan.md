# SPEC-INSTALL-001 Slice A Plan

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = f939e80 (CONTENT-001 Slice E 완료, 799 tests passing)
**Depends on**: 없음 (SPEC-INSTALL-001 의 첫 슬라이스)
**Scope**: License agreement + Env diagnostics + Wizard session 인프라
**Spec source**: `.moai/specs/SPEC-INSTALL-001/spec.md` REQ-INSTALL-001~005, 010~012, 020~021, 050~052

> **Heads-up (기존 코드 발견)**: `apps/web/lib/install/`, `apps/web/app/install/{check-env,db-config,admin-config,complete}/`,
> `packages/core/src/install/`, `packages/db/src/install/` 에 **부분 구현이 이미 존재**한다 (커밋 전 작업).
> 이 슬라이스는 해당 코드를 **재구성·완성·SPEC 와 정렬**하는 작업이며, "처음부터 새로 짜는" 슬라이스가 아니다.
> 기존 산출물 분류:
> - `apps/web/lib/install/wizard-session.ts` → Slice A 본 슬라이스 대상 (보강/테스트 확정)
> - `apps/web/lib/install/wizard-guards.ts`, `wizard-log.ts`, `extract-ip.ts`, `headers.ts` → Slice A 본 슬라이스 대상
> - `apps/web/lib/install/site-status.ts`, `sitelock.ts` → Slice D 로 이월
> - `apps/web/lib/install/action-state.ts` → Slice A (form 결과 type 공통)
> - `apps/web/app/install/page.tsx`, `license-form.tsx` → Slice A 대상
> - `apps/web/app/install/check-env/*` → Slice A 대상 (env diagnostics)
> - `apps/web/app/install/db-config/*` → Slice B 이월
> - `apps/web/app/install/admin-config/*`, `complete/*` → Slice C 이월
> - `packages/core/src/install/diagnostics.ts`, `schemas.ts` → Slice A 가 diagnostics, schemas 의 license/env 부분만 사용
> - `packages/db/src/install/*` (lock, seed) → Slice C/D 로 이월
> - `packages/db/src/install-validate.ts` → Slice B 로 이월

---

## 1. 전체 Slice 로드맵

| Slice | 범위 | 주요 REQ | 예상 테스트 수 | 의존성 |
|---|---|---|---|---|
| **A** (본 슬라이스) | License + Env Diagnostics + Wizard Session + Middleware install gate | REQ-INSTALL-001, 003, 004, 005, 010, 011, 012, 020, 021, 050, 051, 052 | ~15 | 없음 |
| B | DB Config 검증 + 시크릿 redaction + advisory-lock 사전 점검 | REQ-INSTALL-013, 022, 053 | ~12 | Slice A |
| C | Admin Config + `procInstall` (Prisma migrate + 첫 관리자 seed + Auth.js 세션 발행) | REQ-INSTALL-014, 015, 054 | ~15 | Slice B |
| D | SiteLock + INSTALL_LOCK 영구화 + post-install lock-down (HTTP 410/503) | REQ-INSTALL-002, 023, 024, 040, 041, 042 | ~10 | Slice C |

**총 예상 테스트 증가**: 799 → 약 851 (52개 증분, Slice 분할 효과로 회귀 격리)

**누계 의존 그래프**:
```
A (license/env/session/middleware-gate)
  └─ B (db-config validation)
       └─ C (procInstall + admin seed)
            └─ D (sitelock + INSTALL_LOCK + 410)
```

---

## 2. Slice A 범위

### 2.1 포함 (IN-SCOPE)

| 영역 | 산출물 | REQ |
|---|---|---|
| **App Router 라우트** | `/install` (license), `/install/check-env` (diagnostics), `/install/_rewrite_test/[nonce]` (middleware ping) | REQ-INSTALL-010, 011 |
| **Middleware install gate** | `apps/web/middleware.ts` 에 install-redirect 분기 추가 (`installedAt IS NULL` 감지 → /install 302) | REQ-INSTALL-001, 020 |
| **License agreement** | GPL v2 동의 페이지 + `agreeLicense` server action + 세션 `licenseAgreed=true` 셋업 | REQ-INSTALL-011, 021 |
| **Wizard session 인프라** | `iron-session` 어댑터, `WizardSession` 타입, 만료 60분, AES-GCM seal, 쿠키 옵션 (Secure/HttpOnly/SameSite=Strict, path=/install) | REQ-INSTALL-003, 004, 005, 050 |
| **Env diagnostics** | 6개 항목 병렬 실행기 + 결과 렌더링 + 5초 p95 가드 | REQ-INSTALL-012 |
| **Wizard step guards** | `requireLicenseAgreed`, `requireWizardSession` (Slice B/C 가 재사용할 게이트) | REQ-INSTALL-021 |
| **i18n 진입점** | `Accept-Language` 감지 → `next-intl` locale 결정, 미지원이면 `en` fallback | REQ-INSTALL-010 |
| **CSRF (1차)** | Next.js Server Actions origin 검증을 1차 방어선으로 채택 + double-submit cookie pattern 의 wizard 토큰 발급 hook | REQ-INSTALL-003 |
| **로깅 hygiene** | step-transition ring buffer (메모리 only, 패스워드 키 redactor) | REQ-INSTALL-004, 051 |
| **NEXTAUTH_SECRET 길이 가드** | 길이 < 32 시 install 전체 차단 | REQ-INSTALL-052 |

### 2.2 제외 (OUT-OF-SCOPE → 다른 슬라이스)

| 제외 항목 | 이월 슬라이스 | 사유 |
|---|---|---|
| `/install/db-config` 페이지 + `validateDbConfig` server action | **Slice B** | DB 자격증명 처리는 별도 보안 표면 — 독립 슬라이스에서 다룬다 |
| Postgres 권한/스키마 충돌 검사 | **Slice B** | pg 클라이언트·Prisma 의존 |
| `/install/admin-config` + `performInstall` (Prisma migrate + seed + Auth.js cookie) | **Slice C** | 마이그레이션 트랜잭션은 별도 트랜잭션 격리가 필요 |
| `Site`, `MemberGroup`, `User` 도메인 시드 | **Slice C** | Prisma migrate 의존, 첫 관리자 생성은 AUTH-001 의존 |
| `pg_advisory_lock` | **Slice C** | `performInstall` 안에서만 의미 있음 |
| `INSTALL_LOCK=1` 영구화 (`.env.local` write 또는 DB row) | **Slice D** | 설치 완료 직후의 후처리 |
| HTTP 410 Gone (`INSTALL_LOCK=1` 상태) | **Slice D** | 본 슬라이스는 middleware 에 분기 **자리(hook)**만 두고 활성화는 D 에서 |
| SiteLock IP allowlist + 503 | **Slice D** | install 완료 후의 운영 모드 |
| `Site.use_ssl` 의 HSTS 헤더 emit | **Slice D** | install 완료 후 middleware 동작 |
| 디스포저블 이메일 차단 | **Slice C** | admin-config 폼 검증 시점 |

### 2.3 기존 코드와의 정합 결정

기존 산출물이 이미 일부 존재하기 때문에 본 슬라이스의 RED phase 는 **두 가지 종류의 테스트**를 다룬다:
- **신규 RED 테스트**: 아직 구현 없는 동작 (middleware install-redirect, env-diagnostics 6 항목 통합 등) → 일반 TDD
- **Characterization 테스트**: 기존 `wizard-session.ts`, `wizard-guards.ts`, `wizard-log.ts`, `extract-ip.ts`, `headers.ts` 의 **현재 동작을 잠그는 테스트** → 기존 테스트 파일이 있으면 그대로 활용, 없으면 추가. RED 가 즉시 GREEN 되는 경우가 발생할 수 있으며, 그 경우 "behavior captured" 로 명시한다.

> **TDD 모드 ↔ Brownfield 처리**: `quality.yaml development_mode: tdd` 이지만 기존 코드 영역은 workflow-modes.md 의 **Brownfield Enhancement** 절에 따라 "Pre-RED 코드 이해 → RED 작성" 흐름을 적용한다. 이는 TDD 의 RED-GREEN-REFACTOR 형식을 유지하면서 기존 동작을 보존한다.

---

## 3. Pre-flight 질문 (Q1-Q6, 답변 포함)

> 본 슬라이스의 결정 사항을 미리 노출. 사용자가 후속 라운드에서 조정 가능.

### Q1 — `iron-session` 어댑터: `iron-session` 직접 사용 vs 자체 추상화

**답변 (확정)**: **`iron-session` 8.x 를 직접 사용**.

**근거**:
- `apps/web/package.json` 에 `iron-session: ^8.0.4` 가 이미 의존성으로 등록되어 있고 `apps/web/lib/install/wizard-session.ts` 가 이를 사용 중.
- iron-session 의 `getIronSession(cookies(), options)` API 는 Next.js 16 App Router / Server Actions / route handler 모두에서 동일 패턴으로 동작.
- 자체 추상화는 KMS/HKDF 분리 시점에만 가치가 있으며, 본 슬라이스 단계에서는 over-engineering.

**위험 완화**: `WIZARD_COOKIE_NAME` (`rhymix-ts-install`) + path `/install` 로 스코프 제한 → 다른 도메인 쿠키와 충돌 없음.

### Q2 — Middleware 위치: 단일 `apps/web/middleware.ts` 보강 vs 별도 install middleware

**답변 (확정)**: **기존 `apps/web/middleware.ts` 에 install gate 분기를 추가**.

**근거**:
- Next.js 는 프로젝트당 단일 `middleware.ts` 만 인식. 별도 파일은 매개체 분리가 안 됨.
- 현재 middleware 는 forceHttps → Domain 해석 → AUTH 인증 보호 의 3 단계. install gate 는 **forceHttps 이후, Domain 해석 이전** 에 삽입 — 미설치 인스턴스에서는 Domain row 조차 없을 수 있기 때문.
- 분기 분리는 `apps/web/lib/install/middleware-gate.ts` (신규) 의 순수 함수로 추출 → 단위 테스트 가능.

**삽입 위치 (의사 코드 — 본 슬라이스에서 실제 구현)**:
```
1. forceHttps check (기존)
2. INSTALL gate (NEW, Slice A):
   - if path matches /_next/, /favicon.ico, /api/install/*, /install/* → pass
   - else if (await isInstalled()) === false → redirect /install
   - else → continue
3. Host → Domain (기존)
4. AUTH protection (기존)
```

**`isInstalled()` 의 구현**: Slice A 에서는 **간략 버전** — `prisma.site.findFirst({ where: { installedAt: { not: null } } })` 가 1 row 라도 있으면 installed. Slice D 에서 `INSTALL_LOCK` env var 와 결합한 강한 판정으로 보강.

**캐시 전략**: per-request 캐시 (`cache()` from `react`) — middleware 는 Edge runtime 후보지만 본 프로젝트는 `runtime = 'nodejs'` 이므로 Prisma 직접 호출 가능. 매 요청당 1 회 가벼운 인덱스 검색 (Site PK 단일 row).

### Q3 — Env diagnostics: Server Action vs tRPC publicProcedure

**답변 (확정)**: **Server Action (`runEnvDiagnostics`)**.

**근거**:
- spec.md API Surface 가 명시적으로 `'use server'; export async function runEnvDiagnostics(): Promise<EnvCheckReport>` 로 server action 형태를 정의.
- tRPC publicProcedure 는 install 전에는 사용 불가 — 미설치 상태에서 DB context 가 없을 수 있고, tRPC router 는 일반적으로 인증/세션과 묶여있다.
- Server Action 은 Next.js 의 origin 검증 (REQ-INSTALL-003) 1차 방어선 자동 제공.
- 결과는 `<DiagnosticsTable>` Server Component 가 `await runEnvDiagnostics()` 로 직접 호출 (RSC 패턴) — 클라이언트 페치 라운드트립 0회.

**구현 위치**: `apps/web/app/install/check-env/page.tsx` 는 Server Component 로 `runEnvDiagnostics()` 호출 → `DiagnosticsTable` 에 결과 props 전달. 재진단 버튼은 `useActionState` 기반.

### Q4 — 다국어 fallback 우선순위

**답변 (확정)**: **`Accept-Language` → 지원 locale 매칭 → `en` (fallback)**.

매칭 알고리즘:
1. `Accept-Language` 헤더에서 quality factor 순으로 정렬된 BCP-47 태그 목록 추출.
2. 각 태그를 `(primary, region)` 으로 분해 (`ko-KR` → `ko`).
3. spec.md `13-language wizard` 목록 (`ko, en, ja, zh-CN, zh-TW, de, es, fr, mn, ru, tr, vi, id`) 과 primary 우선 매칭.
4. 매칭 실패 시 `en`.

**Slice A 구현 범위**: 매칭 함수 (`detectWizardLocale`) 와 `ko`/`en` **2 개 locale** 만 메시지 카탈로그 제공. 나머지 11 개 locale 은 `next-intl` namespace 만 생성하고 키는 `en` 으로 폴백 — Slice 분리 후 i18n 작업으로 점진 확장 (Slice E 또는 별도 SPEC-INSTALL-I18N-001 후보).

**`next-intl` 통합**: `apps/web/i18n.ts` (또는 기존 i18n 설정) 의 locale 목록에 `ko`, `en` 만 등록. 위저드 메시지는 `messages/{locale}/install.json` (또는 기존 메시지 구조와 일치).

### Q5 — CSRF: Auth.js 기존 토큰 재사용 vs 별도 wizard 토큰

**답변 (확정)**: **별도 wizard 토큰 (`wizardCsrfToken`) + Server Actions origin 검증을 1차 방어선**.

**근거**:
- Auth.js 의 CSRF 토큰은 `next-auth.csrf-token` 쿠키이며 install 미완료 시 NextAuth session table 이 없어 사용 불가.
- Server Actions (Next.js 14+) 는 자동으로 origin 헤더 검증을 수행 — fetch 가 cross-origin 이면 403.
- 보강 측면에서 double-submit cookie 패턴 적용: `wizardCsrfToken` 을 쿠키 + form hidden field 양쪽에 두고 서버에서 비교. 토큰은 `WizardSession.csrfToken` 으로 iron-session 에 저장 (이미 봉인됨).

**구현**:
- `getWizardCsrfToken()` 헬퍼 — 세션에 없으면 `crypto.randomBytes(32).toString('hex')` 생성 후 저장.
- `verifyCsrfToken(formData)` — `formData.get('csrfToken')` 와 세션 토큰 비교.

### Q6 — `/install` 라우트: App Router vs Pages Router 호환

**답변 (확정)**: **App Router only (`apps/web/app/install/`)**.

**근거**:
- 본 프로젝트는 Next.js 16 + App Router 단일 스택 (Pages Router 사용 없음). `apps/web/app/install/` 디렉터리가 이미 존재.
- Server Actions, RSC, `useActionState` 등 본 슬라이스가 의존하는 기능은 모두 App Router 전용.

### Q7 (추가) — `INSTALL_LOCK` env var 부재 시 기본값

**답변 (확정)**: **단일 진실 원천은 `Site.installedAt`, `INSTALL_LOCK` 은 Slice D 에서 추가 안전망**.

**근거 + 회귀 위험 완화**:
- spec.md REQ-INSTALL-002 는 "presence of `Site` row with `installedAt IS NOT NULL` AND env `INSTALL_LOCK=1`" 로 AND 조건이지만, **본 슬라이스에서는 OR 조건의 **약화 형** 으로 시작** — `Site.installedAt IS NOT NULL` 만으로 "installed" 판정. 이렇게 해야 Slice A 만 머지된 상태에서 db 가 비어있어도 (`installedAt IS NULL`) 정상 동작하고, 기존 ADMIN/AUTH/CONTENT 테스트가 회귀하지 않음.
- Slice D 에서 `INSTALL_LOCK` 영구화가 추가되면 AND 조건으로 강화 (REQ-INSTALL-002 완전 충족).
- 회귀 차단: 기존 ADMIN/AUTH/CONTENT 테스트는 testcontainers / mock DB 에 `Site` row + `installedAt = NOW()` 를 시드해야 함. **본 슬라이스의 한 가지 책임**: 기존 테스트의 시드 헬퍼 (`apps/web/__tests__/helpers/seed-site.ts` 또는 등가) 가 모든 통합 테스트 setup 에 포함되어 있는지 확인 + 누락된 부분 보강.

---

## 4. 테스트 목록 (TDD RED 시작점)

> 총 예상 ≈ 15 신규 + 기존 characterization 보강. 각 테스트는 단일 책임으로 분할.
> Vitest (단위/통합) + Playwright (E2E) 혼합.

### LA — License Agreement (3 tests, Vitest)

| ID | 위치 | 시나리오 | REQ |
|---|---|---|---|
| LA-1 | `apps/web/app/install/actions.test.ts` | `agreeLicense(formData)` 가 `agreed=true` 일 때 세션의 `licenseAgreed` 를 true 로 설정하고 `/install/check-env` 로 redirect | REQ-INSTALL-011 |
| LA-2 | `apps/web/app/install/actions.test.ts` | `agreeLicense` 가 `agreed=false` 또는 누락이면 세션을 변경하지 않고 `/install` 에 머무름 (form error 반환) | REQ-INSTALL-011 |
| LA-3 | `apps/web/app/install/actions.test.ts` | `agreeLicense` 가 CSRF 토큰 불일치 시 401 + 세션 변경 없음 | REQ-INSTALL-003 |

### EC — Env Check (5 tests, Vitest)

| ID | 위치 | 시나리오 | REQ |
|---|---|---|---|
| EC-1 | `packages/core/src/install/diagnostics.test.ts` (또는 `apps/web/server/install/env-diagnostics.test.ts`) | Node 버전 < 22 → result.status='error', remediation key 포함 | REQ-INSTALL-012 |
| EC-2 | 동일 | 필수 env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) 누락 시 각 키별 error 결과 | REQ-INSTALL-012, 052 |
| EC-3 | 동일 | `NEXTAUTH_SECRET` 길이 < 32 → error (REQ-INSTALL-052) | REQ-INSTALL-052 |
| EC-4 | 동일 | `public/uploads` write 권한 실패 시 error (mock fs.access) | REQ-INSTALL-012 |
| EC-5 | `apps/web/app/install/check-env/page.test.tsx` (RSC 통합) | 6개 항목 모두 정상이면 overall='ok', 5초 안에 반환 (timeout 가드) | REQ-INSTALL-012 |

### WS — Wizard Session (4 tests, Vitest)

| ID | 위치 | 시나리오 | REQ |
|---|---|---|---|
| WS-1 | `apps/web/lib/install/wizard-session.test.ts` | iron-session 으로 봉인 → 다른 프로세스에서 동일 secret 으로 unseal 가능 (round-trip) | REQ-INSTALL-005 |
| WS-2 | 동일 | `startedAt + 60min < now` 인 세션은 자동 폐기 — `getWizardSession()` 이 새로운 빈 세션 반환 | REQ-INSTALL-012 (US-INSTALL-012) |
| WS-3 | 동일 | step 전환 헬퍼 (`requireLicenseAgreed`) — `licenseAgreed=false` 일 때 redirect 발동 (Next.js redirect throw) | REQ-INSTALL-021 |
| WS-4 | 동일 | 쿠키 옵션 검증: `path=/install`, `httpOnly=true`, `sameSite=strict`, prod 에서 `secure=true` | REQ-INSTALL-005 |

### MW — Middleware Install Gate (3 tests, Vitest)

| ID | 위치 | 시나리오 | REQ |
|---|---|---|---|
| MW-1 | `apps/web/middleware.test.ts` (확장) | `Site.installedAt IS NULL` 상태에서 `/` 접근 시 302 → `/install` | REQ-INSTALL-001, 020 |
| MW-2 | 동일 | `Site.installedAt IS NOT NULL` 상태에서 `/` 접근 시 기존 동작 (AUTH 보호 등) 유지 (회귀 방어) | REQ-INSTALL-020 |
| MW-3 | 동일 | 미설치 상태에서도 `/_next/static/...`, `/favicon.ico`, `/api/install/*` 는 redirect 제외 | REQ-INSTALL-001 |

### Characterization (기존 코드 잠금, 4-6 tests)

| ID | 위치 | 시나리오 | 비고 |
|---|---|---|---|
| CH-1 | `apps/web/lib/install/wizard-guards.test.ts` (기존) | 기존 동작 그대로 잠금 | 변경 없으면 PASS |
| CH-2 | `apps/web/lib/install/wizard-log.test.ts` (기존) | ring buffer 가 password 키 redact | REQ-INSTALL-051 — 누락된 redactor 가 있으면 추가 |
| CH-3 | `apps/web/lib/install/extract-ip.test.ts` (기존) | x-forwarded-for 파싱 | 변경 없으면 PASS |
| CH-4 | `apps/web/lib/install/headers.test.ts` (기존) | wizard header 주입 | 변경 없으면 PASS |
| CH-5 | `packages/core/src/install/schemas.test.ts` (기존) | License/env 스키마 Zod 검증 (admin/db config 부분은 Slice B/C 가 검증) | Slice A 는 license/env schema 만 추가 검증 |
| CH-6 | `packages/core/src/install/diagnostics.test.ts` (기존) | 기존 diagnostics 동작 잠금 + 부족한 케이스 EC-1~EC-5 로 보강 | |

### E2E (1 test, Playwright — Slice A 의 통합 검증)

| ID | 위치 | 시나리오 | REQ |
|---|---|---|---|
| E2E-A1 | `apps/web/e2e/install-slice-a.spec.ts` (신규) | 빈 DB 환경 → 브라우저로 `/` 접속 → `/install` 302 → 라이선스 동의 → `/install/check-env` 진입 → 6 항목 진단 표시 | REQ-INSTALL-001, 010, 011, 012, 020, 021 |

**예상 신규 테스트 수**: LA(3) + EC(5) + WS(4) + MW(3) + Characterization 보강(0~2) + E2E(1) = **15~17개**.

---

## 5. 파일 변경 계획

### 5.1 신규 파일

| 경로 | 책임 |
|---|---|
| `apps/web/lib/install/middleware-gate.ts` | `shouldRedirectToInstall(request)` 순수 함수 + `INSTALL_BYPASS_PATHS` (정적 리소스/api/install 화이트리스트). middleware 가 import. |
| `apps/web/lib/install/middleware-gate.test.ts` | MW-1~MW-3 단위 테스트 (request mock) |
| `apps/web/server/install/env-diagnostics.ts` | `runEnvDiagnostics(): Promise<EnvCheckReport>` server action. 6개 항목 병렬 실행 (Promise.allSettled), 각 항목별 timeout 가드. |
| `apps/web/server/install/env-diagnostics.test.ts` | EC-1~EC-4 단위 테스트 (fs/process mock) |
| `apps/web/app/install/check-env/page.test.tsx` | EC-5 RSC 통합 테스트 (또는 vitest jsdom 환경) |
| `apps/web/app/install/_rewrite_test/[nonce]/route.ts` | middleware rewrite ping 엔드포인트. HEAD 요청에 200 + `X-Rhymix-Rewrite-Nonce: {nonce}` 헤더 반환. |
| `apps/web/e2e/install-slice-a.spec.ts` | E2E-A1 Playwright 시나리오 |
| `apps/web/__tests__/helpers/seed-site-installed.ts` | 기존 ADMIN/AUTH/CONTENT 테스트가 사용할 "installed Site" 시드 헬퍼. middleware install-gate 가 기존 테스트를 차단하지 않도록 가드. |

### 5.2 수정 파일

| 경로 | 변경 내용 |
|---|---|
| `apps/web/middleware.ts` | forceHttps 이후, Domain 해석 이전에 install gate 분기 추가. `shouldRedirectToInstall` 호출. 단일 prisma.site.findFirst (`installedAt: { not: null }`) 캐시. |
| `apps/web/middleware.test.ts` | MW-1~MW-3 케이스 추가. 기존 테스트는 setup 에 `seedInstalledSite()` 추가하여 회귀 방지. |
| `apps/web/app/install/page.tsx` | 기존 `LicenseForm` 유지. CSRF hidden field 추가. server-side `detectWizardLocale()` 호출 후 `next-intl` 메시지 적용. |
| `apps/web/app/install/license-form.tsx` | CSRF 토큰 hidden field + `useActionState` 기반 에러 표시 |
| `apps/web/app/install/actions.ts` | `agreeLicense` 함수: CSRF 검증, 세션 셋업, redirect. 기존 구현 보강 (CSRF 부분이 미완이라면) |
| `apps/web/app/install/actions.test.ts` | LA-1, LA-2, LA-3 추가 |
| `apps/web/app/install/check-env/page.tsx` | 기존 `DiagnosticsTable` 사용. `await runEnvDiagnostics()` 호출, RSC 결과 props 전달, `useActionState` 기반 재진단 버튼. |
| `apps/web/app/install/check-env/diagnostics-table.tsx` | client component. 결과 props 받아 표 렌더. 재진단 버튼 (form action). |
| `apps/web/lib/install/wizard-session.ts` | 60분 만료 검증 헬퍼 (`isWizardSessionExpired`) 추가. `csrfToken` 필드 보강. |
| `apps/web/lib/install/wizard-session.test.ts` | WS-1~WS-4 추가 |
| `apps/web/lib/install/wizard-guards.ts` | `requireLicenseAgreed`, `requireFreshWizardSession` 헬퍼 보강 |
| `apps/web/lib/install/wizard-log.ts` | password/secret 키 redactor 검증 (CH-2). 누락 시 추가. |
| `packages/core/src/install/diagnostics.ts` | EC-1~EC-4 케이스에 누락된 진단 항목 보강. 각 항목의 timeout 가드 (`Promise.race`). |
| `packages/core/src/install/schemas.ts` | `licenseAgreementSchema` 만 본 슬라이스에서 검증. `dbConfigSchema` / `adminConfigSchema` 는 정의는 유지하되 본 슬라이스 테스트 범위 밖. |
| `apps/web/i18n.ts` (또는 `next-intl.config.ts`) | `ko`, `en` locale + install namespace 등록. `detectWizardLocale` 헬퍼 export. |
| `apps/web/messages/ko/install.json` (신규/보강) | 1단계 라이선스 + 2단계 진단 라벨 |
| `apps/web/messages/en/install.json` (신규/보강) | 동일 |

### 5.3 미변경 (Slice B/C/D 가 다룸)

- `apps/web/app/install/db-config/*`
- `apps/web/app/install/admin-config/*`
- `apps/web/app/install/complete/*`
- `packages/db/src/install/lock.ts`
- `packages/db/src/install/seed.ts`
- `packages/db/src/install-validate.ts`
- `apps/web/lib/install/site-status.ts`, `sitelock.ts`

### 5.4 DB / 패키지 변경

- **Prisma schema**: 변경 없음. `Site` 모델은 SPEC-ADMIN-001 에서 이미 존재 (`installedAt` 컬럼 포함 여부 점검 필요 — 없다면 Slice A 의 마이그레이션으로 1 컬럼 추가).
- **패키지 추가**: 신규 의존성 없음. `iron-session`, `next-intl`, `zod` 모두 이미 설치됨.
- **잠재적 마이그레이션 1건**: `Site.installedAt DateTime?` 컬럼이 SPEC-ADMIN-001 에 없다면 본 슬라이스에서 추가 (Slice C 가 NULL 에서 NOW() 로 셋업). 점검은 manager-ddd/tdd 가 schema.prisma 확인 후 결정.

---

## 6. 위험 요소

### R1 — 기존 테스트 회귀: middleware install-gate 가 기존 ADMIN/AUTH/CONTENT 테스트를 `/install` 로 redirect 시킬 수 있음

**심각도**: 🔴 Critical
**완화**:
- `apps/web/__tests__/helpers/seed-site-installed.ts` 헬퍼를 추가 + 기존 통합 테스트의 setup 에 호출 누락이 없는지 일괄 grep.
- middleware.test.ts 의 모든 기존 케이스에 `seedInstalledSite()` 호출이 setup 에 들어가 있는지 검증.
- Slice A 첫 PR 의 CI 가 全 799 tests + 신규 ~15 tests 모두 PASS 임을 머지 조건.

### R2 — `INSTALL_LOCK` 환경변수 부재 시 회귀: 기설치 상태 판정이 매번 install 페이지로 리다이렉트되는 회귀 위험

**심각도**: 🟡 Medium
**완화**: Q7 의 결정 — Slice A 는 `Site.installedAt` 단일 기준. `INSTALL_LOCK` 은 Slice D 에서 AND 조건으로 강화. 본 슬라이스 범위에서 회귀 없음.

### R3 — iron-session 쿠키 크기 한도 (4KB) 초과: DB password + admin password 평문이 쿠키에 들어가면 한도 근접

**심각도**: 🟡 Medium (Slice A 자체 범위에서는 license + env 정보만 저장하므로 한도 여유)
**완화**: Slice A 는 `licenseAgreed: boolean` + `csrfToken: string` + `startedAt/expiresAt` 만 저장 → 1KB 이내 안전. **Slice B 가 dbConfig 를 추가하기 전에 쿠키 크기 측정 테스트 추가** 를 Slice B 계획에 명시. iron-session 의 seal 은 base64 + AES-GCM IV/TAG 오버헤드로 약 30~40% 팽창.

### R4 — Server Actions origin 검증의 한계: same-origin 가정이 깨지면 CSRF 위험

**심각도**: 🟢 Low
**완화**: 이중 방어 — Next.js Server Actions 원본 검증 (1차) + wizard CSRF double-submit cookie (2차). LA-3 테스트로 검증.

### R5 — Env diagnostics 5초 p95 타임아웃: 외부 SMTP 도달성 검사 등이 5초 초과 가능

**심각도**: 🟡 Medium
**완화**:
- 각 항목당 1초 timeout (`Promise.race([check(), timeout(1000)])`), 전체는 `Promise.allSettled`.
- SMTP 검사는 spec.md 명시 "optional, soft-fail" — 결과는 `warn` 상태, overall 에 영향 없음.
- middleware rewrite ping 은 self-loop fetch — `localhost:port` 직접 호출, 200ms 이내.

### R6 — 13개 locale 미완성 상태에서 production deploy 시 한국어/영어 외 사용자 혼란

**심각도**: 🟢 Low
**완화**: Q4 의 결정 — `en` 으로 자동 폴백. SPEC 의 `Out of Scope` 에 i18n 점진 확장을 추가 제안 (manager-spec 이 후속 SPEC 으로 분리).

### R7 — `_rewrite_test/[nonce]` 라우트가 middleware 의 install-gate 화이트리스트에 누락

**심각도**: 🟡 Medium
**완화**: `INSTALL_BYPASS_PATHS` 에 `/install/_rewrite_test/*` 명시. MW-3 테스트로 검증.

---

## 7. Acceptance Criteria

### AC-A-1 (REQ-INSTALL-001, 020)

- **Given** 빈 DB 상태 (`Site` row 없음 또는 `installedAt IS NULL`)
- **When** 사용자가 `https://example.com/` 에 접속
- **Then** 응답이 HTTP 302 + `Location: /install` 이고, follow 시 `/install` 페이지가 렌더링된다

### AC-A-2 (REQ-INSTALL-011)

- **Given** 빈 wizard session (또는 만료된 세션)
- **When** 사용자가 `/install` 에 GET 접근
- **Then** GPL v2 라이선스 본문 + 동의 체크박스 + CSRF hidden field 가 렌더링된다

### AC-A-3 (REQ-INSTALL-021)

- **Given** `licenseAgreed=false` 인 wizard session
- **When** 사용자가 `/install/check-env` 에 GET 접근
- **Then** 응답이 HTTP 302 + `Location: /install` (또는 Next.js redirect throw)

### AC-A-4 (REQ-INSTALL-012)

- **Given** 빈 DB + `licenseAgreed=true` 인 wizard session
- **When** 사용자가 `/install/check-env` 에 GET 접근
- **Then** 6개 진단 항목 (Node 버전, 필수 env, write 권한, prisma 가용성, mail 도달성, middleware rewrite ping) 결과가 모두 표시되며, 전체 응답이 5초 이내 (p95)

### AC-A-5 (REQ-INSTALL-004, US-INSTALL-012)

- **Given** wizard session 이 `startedAt = now - 61min` 인 상태
- **When** 임의의 wizard server action 호출
- **Then** 세션이 자동 폐기되고 새 빈 세션이 발급된다 (`licenseAgreed=false` 로 초기화)

### AC-A-6 (REQ-INSTALL-051)

- **Given** wizard 진행 중 `wizard-log` 가 step transition 을 ring buffer 에 기록
- **When** transition payload 가 `password: "Secret123!"` 키를 포함
- **Then** ring buffer 의 해당 값은 `[REDACTED]` 로 마스킹되어 저장된다 (어떤 sink (stdout/file/telemetry) 에도 평문이 노출되지 않음)

### AC-A-7 (REQ-INSTALL-003)

- **Given** `/install` 에 GET 요청 후 form 제출
- **When** form 의 `csrfToken` 필드가 세션의 토큰과 일치하지 않음
- **Then** server action 이 401 + `licenseAgreed` 변경 없음

### AC-A-8 (REQ-INSTALL-052)

- **Given** 환경에 `NEXTAUTH_SECRET` 이 32 byte 미만으로 설정됨
- **When** `runEnvDiagnostics` 호출
- **Then** 해당 항목이 `status='error'` + remediation key 포함, overall='error'

### AC-A-9 (회귀 방지)

- **Given** 기존 SPEC-ADMIN-001, SPEC-AUTH-001, SPEC-CONTENT-001 의 모든 통합 테스트가 `seedInstalledSite()` 헬퍼를 setup 에 포함
- **When** 전체 테스트 스위트 실행
- **Then** 799 기존 + 신규 ~15 = 약 814~816 tests 모두 PASS, 0 failing

---

## 8. 다음 Slice 예고

### Slice B — DB Config 검증

- `/install/db-config` 페이지 + `validateDbConfig` server action 활성화
- Postgres 자격증명/권한/스키마 충돌 검사
- 시크릿 redaction 강화 (DB password 도 ring buffer 에서 masking 검증)
- iron-session 쿠키 크기 가드 (dbConfig 추가 후 4KB 한도 측정 테스트)
- 의존: Slice A 의 wizard-session, wizard-guards, license/env 진입 가드 재사용

### Slice C — Admin Config + procInstall

- `/install/admin-config` 페이지 + `performInstall` server action
- `pg_advisory_lock(hashtext('rhymix_ts_install'))` 획득
- `prisma migrate deploy` 단일 트랜잭션 + `Site`/`MemberGroup`/`User` 시드
- Auth.js session cookie 발행 + `/admin/welcome` redirect
- 디스포저블 이메일 차단
- 의존: Slice B 의 dbConfig 세션 데이터

### Slice D — SiteLock + INSTALL_LOCK + Lock-down

- `INSTALL_LOCK=1` 영구화 (`.env.local` write 또는 `SiteSetting._install_lock` 폴백)
- `/install/*` 에 HTTP 410 Gone (`installedAt IS NOT NULL` AND `INSTALL_LOCK=1`)
- SiteLock IP allowlist + HTTP 503 Site Locked 페이지
- `use_ssl=always` 시 HSTS 헤더 emit
- 의존: Slice C 의 setup 완료 상태

---

## Appendix — manager-spec 추가 확인 사항

manager-spec 이 본 계획을 검토할 때 다음을 확인:

1. **`Site.installedAt` 컬럼 존재 여부**: `packages/db/prisma/schema.prisma` 에 `Site` 모델이 있고 `installedAt DateTime?` 가 정의되어 있는지. 없으면 본 슬라이스에서 마이그레이션 1건 추가 (REQ-INSTALL-002 의 단일 진실 원천).
2. **기존 `apps/web/app/install/` 산출물의 head commit 출처**: 본 계획은 "부분 구현 보강" 가정인데, 만약 해당 코드가 별도 branch 의 미반영 상태라면 시작 베이스가 달라짐. main = f939e80 기준으로 워크트리에서 실제 존재하는지 재확인 필요.
3. **`next-intl` 버전과 App Router 통합 방식**: `next-intl@^3.26` 의 App Router 통합은 `i18n.ts` (routing config) + `middleware.ts` integration 이 필요할 수 있음. 본 슬라이스의 middleware 변경과 next-intl middleware 가 충돌하지 않도록 통합 순서 점검.
4. **Playwright 환경**: E2E-A1 이 의존하는 빈 DB 환경 — testcontainers 또는 `pnpm db:reset` 같은 fixture 가 이미 존재하는지 점검 후 활용. 없으면 본 슬라이스의 E2E 테스트는 in-memory mocking 으로 대체 가능.
5. **`NEXTAUTH_SECRET` 환경**: 본 슬라이스 테스트 실행 시 32-byte secret 이 fixture 로 주입되는지 점검. 누락 시 `vitest.setup.ts` 에 환경 변수 가드 추가.

---

**계획 작성일**: 2026-05-24
**작성자**: manager-spec subagent
**상태**: ready (다음 단계: `/moai run SPEC-INSTALL-001 --slice a` 또는 동등 명령)
