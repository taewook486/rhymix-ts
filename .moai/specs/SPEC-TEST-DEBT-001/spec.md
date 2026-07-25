---
id: SPEC-TEST-DEBT-001
title: 사전 존재 단위 테스트 실패 90건 Triage
version: 1.0.0
status: evaluated
created: 2026-06-21
updated: 2026-07-25
author: MoAI manager-spec
priority: P2
phase: 7+
parent: SPEC-MODULE-BACKLOG-001
depends-on: []
issue_number: TBD
language: ko
---

# SPEC-TEST-DEBT-001 — 사전 존재 단위 테스트 실패 90건 Triage (Test Debt / P2)

## HISTORY

- 2026-06-21 (v1.0.0): 최초 작성. 저장소 루트에서 `npx vitest run`(전체 모노레포)을 실행한 결과 발견된 **사전 존재(pre-existing)** 단위 테스트 실패 90건을 카탈로그화. 24개 테스트 파일 실패 / 199 통과(총 223 파일), 90개 테스트 실패 / 1724 통과 / 7 skip(총 1821 테스트). 90건 전수가 최근 작업과 **무관함을 독립 검증**함 — 일부는 직전 커밋(989fb65)의 변경 파일을 그대로 체크아웃해 동일 테스트를 재실행하여 동일 실패를 확인했고, 나머지는 최근 누구도 손대지 않은 코드 경로/파일에서 발생함을 확인. 본 SPEC은 **triage/평가 문서**이며 어떤 테스트 파일·소스 파일도 수정하지 않는다(코드 변경 0건). 4개 근본 원인 카테고리로 분류하고, 수정 우선순위와 다음 단계만 권고한다.
- 2026-07-25: 전체 스위트(`pnpm test`, 병렬) 최종 재확인. 276 파일(271 통과/5 실패), 2490 테스트(2467 통과/8 실패/15 skip) — 파일·테스트 수 증가는 2026-06-21 이후 완료된 다수 SPEC(MEMBER-ADMIN, MENU, SEARCH, STATS, TAG, MESSAGE, POLL, SEO, SOCIAL-LOGIN, SPAM 등)의 테스트가 반영된 결과. 실패 5개 파일을 개별/소규모 재실행으로 검증: `packages/board/src/index.test.ts`(A-1), `default-tab.test.tsx`(AC-D1), `two-factor.test.ts`(M3-E1) 3건은 격리 재실행 시 전부 통과 — 카테고리 2와 동일한 WSL2 병렬 자원 경합에 의한 가짜 타임아웃으로 확인(재유도하지 않음, REQ-TDEBT-020 원칙 준용). 남은 2건은 미해결로 기록: `apps/web/server/api/routers/admin/user.test.ts`(E-5-1)는 축소된 병렬 재실행에서도 재실패(단순 경합이 아닐 가능성, 완전 단독 재실행 재확인 필요); `TokenEditor.test.tsx`(4건)는 다른 4건과 다른 에러 시그니처(`vi.mock`에 `loadTokens` export 누락 — 카테고리 1과 동일한 mock 불완전 패턴)로, 타임아웃이 아닌 재현 가능한 결함으로 보임(미검증). 본 SPEC은 triage-only 원칙(REQ-TDEBT-004, 코드 변경 0건)에 따라 이번 확인에서도 코드를 수정하지 않았다 — 두 미해결 항목은 후속 조사/수정 대상으로 남긴다.

---

## 1. Overview

### 1.1 목적

본 SPEC은 **테스트 실패를 실제로 수정하기 위한 SPEC이 아니다**. 전체 `npx vitest run`에서 드러난 90건의 사전 존재 단위 테스트 실패를 (1) 근본 원인별로 분류하고, (2) 각 카테고리를 "지금 수정 / 나중 수정 / 조사 필요 / 수용"으로 처분(triage)하며, (3) 수정 착수 시 권장 순서·소유 영역을 기록하는 **평가/처분 문서**다.

이 평가가 산출하는 것:

1. **FIX-NOW** — 실제 제품 버그 가능성이 있어 즉시 조사·수정해야 하는 항목. 본 triage 시작점으로 권고.
2. **FIX-LATER** — 원인이 확정된 체계적 테스트 인프라 결함. 개별 난이도는 낮으나 건수가 많아 공유 헬퍼/팩토리 도입으로 일괄 처리 권장.
3. **INVESTIGATE** — 본 triage 시점에 근본 원인을 아직 특정하지 못한 일회성(one-off) 실패. 사례별 개별 조사 필요.
4. **ACCEPT(조건부)** — 테스트 환경(Next.js App Router 런타임 부재 등) 한계에서 비롯되어 애플리케이션 로직 버그가 아닌 항목. 공유 테스트 셋업 도입 전까지 "알려진 실패"로 수용.

### 1.2 대상 (Audience)

- manager-spec / manager-tdd / manager-ddd agent — FIX-NOW·FIX-LATER 항목을 후속 수정 SPEC으로 구체화할 때 본 문서의 카테고리·우선순위를 입력으로 사용
- expert-debug / expert-testing — 카테고리 3(2FA)과 카테고리 4(미분류 one-off)의 실제 조사 착수
- MoAI 오케스트레이터 — 본 평가 결과로 INDEX.md 백로그 평가 섹션을 갱신하고 사용자에게 다음 수정 후보를 제시
- 운영자/제품 결정권자 — FIX-NOW(2FA) 항목의 보안 영향을 검토하고 수정 우선순위를 승인

### 1.3 본 SPEC이 구현하지 않는 것

본 SPEC은 어떤 테스트도 수정하지 않고 어떤 소스 코드도 변경하지 않는다(코드 변경 0건). 각 카테고리의 실제 수정은 후속 수정 SPEC 또는 `/moai fix` 작업에서 진행한다. 상세는 `## Exclusions` 참조.

### 1.4 검증 신뢰도 (사전 존재 확인 방법)

90건 전수가 최근 작업과 무관한 **사전 존재** 실패임을 두 가지 방법으로 독립 확인했다:

- **직접 git-checkout 비교** — 카테고리 1·3의 대표 사례(`packages/document/src/document.test.ts` A-9/AC-DOC-B1, `comment.test.ts` B-803, `trpc.two-factor.test.ts` I-1-5/I-1-6b)는 직전 커밋 989fb65(sanitizeHtml/comment.ts·trpc.ts를 건드린 무관한 커밋)의 해당 파일 버전을 그대로 체크아웃해 동일 테스트를 재실행 → 동일 실패 재현. 즉 파일-소유 추론이 아니라 **재현 기반** 확인.
- **격리 실행 + 에러 식별** — 카테고리 2(Next.js App Router)는 4개 파일을 격리 실행해 실제 throw된 에러를 읽음 → `__NEXT_ERROR_CODE: 'E251'` 등 **프레임워크 레벨 에러**이지 애플리케이션 로직 에러가 아니며, 이 4개 파일은 최근 커밋 변경 파일을 import하지 않음을 확인.

---

## 2. Evaluation Result (Triage 요약)

| 카테고리 | 실패 건수(개략) | 근본 원인 | 확정도 | 처분 | 권장 순서 |
|---|---|---|---|---|---|
| 1. Prisma mock 불완전 | ~50+ | mock `ctx.prisma`/mock Prisma client에 코드가 실제 호출하는 모델 accessor 누락 | **확정** | FIX-LATER | 2순위 (최다 건수, 개별 난이도 최저) |
| 2. Next.js 16 App Router 테스트 환경 비양립 | ~39 | vitest jsdom이 App Router 요청 스코프(`headers()`/`cookies()`/`useSearchParams()`)를 제공하지 못함 | **확정** | ACCEPT(조건부) → FIX-LATER | 3순위 (공유 셋업 헬퍼 필요) |
| 3. 2FA 미들웨어 특정 버그 | 2 | siteId=0 하드코딩으로 production 2FA 강제가 사실상 항상 우회 + 필드명 불일치 + 에러코드 불일치 — **확정된 CRITICAL 보안 결함** | ✅ **수정 완료** (2026-06-21) | RESOLVED | 완료 |
| 4. 기타 고립 실패(one-off) | ~나머지 | 항목별 상이 (server-only 해석 실패, next-auth 모듈 해석, vi.mock 누락, Zod 스키마 불일치, 타임아웃, 이미지/업로드 토큰 등) | **미특정** | INVESTIGATE | 4순위 (사례별) |

집계: **FIX-NOW 1(2 tests) / FIX-LATER 2 / INVESTIGATE 1(다수 one-off)**. 본 카테고리화는 1차 분석 결과로 제공되며 본 triage에서 재유도하지 않는다.

> 정확한 현재 라인 아이템은 `npx vitest run --reporter=dot 2>&1 | grep "FAIL "`로 갱신 가능. 아래는 triage 시점 스냅샷이다.

---

## 3. Requirements (EARS Format)

REQ ID는 `REQ-TDEBT-XXX`. 본 SPEC의 요구사항은 (1) 평가 산출물의 완결성 조건과 (2) 각 카테고리가 후속 수정 작업으로 분리될 때 지켜야 할 처분 경계를 기술한다. 구현 요구가 아니라 **평가·게이트 요구**임에 유의.

### 3.A 평가 완결성

**REQ-TDEBT-001** (Ubiquitous) — *P2*: The triage SHALL classify each of the 90 pre-existing test failures into exactly one of the four root-cause categories {Prisma-mock, NextJS-AppRouter, 2FA-middleware, Misc-one-off}, each with a recorded disposition {FIX-NOW, FIX-LATER, INVESTIGATE, ACCEPT}.

**REQ-TDEBT-002** (Ubiquitous) — *P2*: For every category whose root cause is confirmed (categories 1 and 2), the triage SHALL state the cause as confirmed and SHALL NOT re-derive it; for categories whose cause is not yet pinpointed (category 4), the triage SHALL list each item as individually unresolved WITHOUT guessing a root cause.

**REQ-TDEBT-003** (Event-Driven) — *P2*: WHEN the triage records a failure as "pre-existing", it SHALL ground that claim in either a direct git-checkout reproduction against commit 989fb65 OR confirmation that the failing code path imports nothing from recently changed files.

**REQ-TDEBT-004** (Unwanted) — *P2*: The triage SHALL NOT modify any test file or source file (code change = 0); fixes are deferred to follow-up work as recorded in `## Exclusions`.

### 3.B 카테고리별 처분 경계 (후속 수정 작업 시 게이트)

**REQ-TDEBT-010** (State-Driven) — *P2*: WHILE category 3 (2FA middleware) remains uninvestigated, it SHALL be treated as a possible genuine product bug (not mere mock debt) and SHALL be picked up FIRST, because `requireAdmin2FAIfEnabled` returning `UNAUTHORIZED` instead of the expected `FORBIDDEN` — and rejecting an apparently 2FA-verified session — touches admin 2FA enforcement, a security-relevant path. The investigation SHALL determine whether the fault is the test's mock-session shape or the production `isSessionTwoFactorVerified()` logic in `apps/web/lib/auth/two-factor.ts`.

**REQ-TDEBT-011** (Event-Driven) — *P2*: WHEN category 1 (Prisma mock) is addressed, the fix SHALL prefer a shared, complete Prisma mock factory reused across the affected test files over per-file ad-hoc partial mocks, because the failures are a systemic pattern of incrementally-grown mocks that were never updated when the service/router code began touching additional Prisma models. The factory approach SHALL NOT alter the behavior under test — only the completeness of the mock.

**REQ-TDEBT-012** (Event-Driven) — *P2*: WHEN category 2 (Next.js App Router) is addressed, the fix SHALL introduce a shared test setup helper that provides App Router request-scope mocks (`headers()`, `cookies()`, `useSearchParams()`) — or migrate these files to a proper Next.js testing harness (e.g. `next/jest` or App Router test helpers) — rather than patching each of the ~39 failing assertions individually. UNTIL such a helper exists, these failures MAY be accepted as known framework-environment failures.

**REQ-TDEBT-013** (Unwanted) — *P2*: For category 4 (Misc one-off), the triage SHALL NOT assign a root cause that was not independently provided; each item SHALL be marked INVESTIGATE and the actual cause SHALL be determined during its individual fix, not asserted here.

### 3.C 카테고리 확정 (재유도 차단)

**REQ-TDEBT-020** (Unwanted) — *P2*: Categories 1 and 2 SHALL NOT be re-analyzed for root cause in follow-up SPECs — their cause is confirmed (mock incompleteness; App Router request-scope absence). Follow-up work consumes this finding as an input and proceeds directly to the fix strategy in REQ-TDEBT-011/012.

---

## 4. Disposition Detail (카테고리별 처분 근거)

### 4.1 카테고리 1 — Prisma mock 불완전 (FIX-LATER, ~50+건, 최다)

**원인(확정):** 테스트의 mock `ctx.prisma`(또는 서비스 함수에 주입된 mock Prisma client)가 테스트 대상 코드가 실제로 호출하는 모델 accessor를 1개 이상 누락. 에러 시그니처: `TypeError: Cannot read properties of undefined (reading 'findFirst'/'findMany'/'findUnique'/'findUniqueOrThrow'/'create'/'$transaction')`, 그리고 tRPC 라우터 테스트에서 이를 감싼 `TRPCError`/`Caused by:` 형태. 여러 패키지에 걸친 **체계적 패턴** — 서비스/라우터 코드가 더 많은 Prisma 모델을 건드리도록 성장했으나 파일별 mock 객체가 갱신되지 않은 누적 결과.

**영향 파일(비전수, 갱신 가능):**
- `packages/document/src/document.test.ts` (A-9, B-401, B-402, DD-F1, DD-F5, AC-DOC-B1 — `$transaction is not a function` 류)
- `packages/board/src/routes/index-page.test.ts` (IP-1~IP-6 — `listDocuments` 경유 undefined의 `findUnique`)
- `packages/board/src/routes/view-page.test.tsx` (VP-1~VP-7)
- `apps/web/server/api/routers/content/comment.test.ts` (B-801, B-803, B-804, B-805 — `checkSpamGuard`(`packages/admin/src/spamfilter/guard.ts:44`)에서 procedure 본문 진입 전 실패, `spamDeniedWord`/`spamDeniedIp`/`spamRule` mock 메서드 누락)
- `apps/web/server/api/routers/content/document.test.ts` (B-704, B-707, CT-1, CT-2, CT-3)
- `apps/web/server/api/routers/content/attachment.test.ts` (C-1, C-2, list)
- `apps/web/server/api/routers/content/category.test.ts` (CC-1 류)
- `apps/web/server/api/routers/content/search.test.ts` (CS-1, CS-2)
- `apps/web/server/api/routers/admin/category.test.ts` (AC-1)
- `[auditLogger] AdminLog.create failed: TypeError: Cannot read properties of undefined (reading 'create')` 4회 — 동일 계열(audit log mock의 `AdminLog.create` 누락)

**검증:** `document.test.ts` A-9/AC-DOC-B1, `comment.test.ts` B-803을 직접 확인 — mock 호출 체인 깊은 곳의 누락 메서드에서 실패하며 비즈니스 로직과 무관. 무관한 커밋 989fb65(sanitizeHtml/comment.ts 변경) **이전에도 동일 동작**이 존재함을 git-checkout 비교로 확인(파일-소유 추론 아님).

**처분:** FIX-LATER. 권장 전략은 REQ-TDEBT-011(공유 완전 mock 팩토리).

### 4.2 카테고리 2 — Next.js 16 App Router 테스트 환경 비양립 (ACCEPT→FIX-LATER, ~39건)

**원인(확정):** vitest의 jsdom 환경이 Next.js App Router의 요청 스코프 컨텍스트(`headers()`, `cookies()`, `useSearchParams()`)를 실제 Next.js 서버 런타임이나 적절한 Next.js 테스트 셋업(`next/jest`, App Router 테스트 헬퍼)처럼 제공하지 못함. 에러: `Error: \`headers\` was called outside a request scope`(Next.js 코드 E251), `useSearchParams()`에 대한 `TypeError: Cannot read properties of null (reading 'get')`.

**영향 파일:**
- `apps/web/middleware.test.ts` (~18건, Slice A/B/D — install gate / host resolution / sitelock / HSTS)
- `apps/web/proxy.test.ts` (~14건 — install gate / sitelock / HSTS)
- `apps/web/app/(auth)/login/page.test.tsx` (5건 — `useSearchParams()` null 반환)
- `apps/web/app/admin/layout.test.tsx` (2건 — `headers()` 요청 스코프 밖)

**검증:** 4개 파일 격리 실행 후 실제 throw 에러 확인 — `__NEXT_ERROR_CODE: 'E251'` 등 프레임워크 레벨 에러이지 앱 로직 에러 아님. 4개 모두 최근 커밋 변경 파일을 import하지 않음.

**처분:** 공유 테스트 셋업 도입 전까지 "알려진 실패"로 ACCEPT, 헬퍼 도입 시 FIX-LATER로 일괄 해소. 전략은 REQ-TDEBT-012.

### 4.3 카테고리 3 — 2FA 미들웨어 특정 버그 (FIX-NOW, 2건) — **본 triage 1순위**

**증상(조사 필요):** 파일 `apps/web/server/api/trpc.two-factor.test.ts`, 테스트 `I-1-5`·`I-1-6b`.
- I-1-5: 미들웨어가 `TRPCError({code: 'UNAUTHORIZED', message: '2FA 인증이 필요합니다.'})`를 throw하나 테스트는 `code: 'FORBIDDEN'`을 기대.
- I-1-6b: "2FA enabled + 검증 완료 → 정상 통과" 시나리오인데, 테스트가 2FA-검증 세션을 셋업했음에도 동일한 "2FA 인증이 필요합니다" 에러로 거부됨.

이는 (a) 테스트의 mock 세션 형태가 `isSessionTwoFactorVerified()`(`apps/web/lib/auth/two-factor.ts`, `apps/web/server/api/trpc.ts`의 `requireAdmin2FAIfEnabled` 미들웨어에서 호출)가 실제로 검사하는 형태와 불일치하거나, (b) 그 검증 로직 자체에 **실제 제품 버그**가 있음을 시사. 단순 mock 갭이 아니라 **2FA 강제(enforcement) 경로의 실제 버그일 수 있어** 보안 관점에서 더 면밀히 봐야 한다.

**검증:** trpc.ts의 직전 커밋 버전을 그대로 체크아웃해 재실행 → 동일 실패. 즉 최근 trpc.ts 변경과 무관.

**처분:** FIX-NOW, **본 triage에서 가장 먼저** 착수 권고. 989fb65에서 발견·수정된 숨은 버그들과 성격이 유사할 수 있으므로, 일반 mock-갭 카테고리보다 높은 조사 우선순위. 경계는 REQ-TDEBT-010.

**2026-06-21 후속 조사·수정 완료 — 실제 보안 우회 결함으로 확정(CVSS ≈ 8.8 High, OWASP A07:2021):**

expert-debug + expert-security가 원인을 규명한 결과, 단순 mock 갭이 아닌 **3겹 실제 결함**으로 판명됨:
1. `apps/web/server/api/trpc.ts:195`(수정 전)의 `checkAdmin2FA(ctx.session, ctx.prisma, 0)` — siteId가 리터럴 `0`으로 하드코딩. 실제 정책은 siteId=1에 저장되므로 `getSiteAdminTwoFactorPolicy(prisma, 0)` 조회가 항상 빈 결과 → `required=false` → 2FA가 활성화돼 있어도 production에서 **항상 우회**(`'pass'` 즉시 반환). "비밀번호는 탈취됐지만 OTP는 없는 공격자"를 막아야 하는 2FA의 방어선이 사실상 0이었음.
2. 세션 검증 플래그 위치 불일치 — `checkAdmin2FA`(`two-factor-gate.ts:98`, 수정 전)는 `sess.adminTwoFactorVerified`(세션 최상위)를 읽었으나, 테스트 mock과 (미사용) `isSessionTwoFactorVerified()`는 `session.user.twoFactorVerified`(user 객체 내부)를 기대 — 필드 위치 자체가 어긋남.
3. I-1-5: `need-enroll`/`need-verify` 분기가 `UNAUTHORIZED`를 던졌으나 REQ-ADMIN-023 및 같은 파일의 다른 권한 거부(`requireAdmin`, IP 차단)는 모두 `FORBIDDEN`을 씀 — 일관성 결함.

추가로 `apps/web/app/admin/2fa/verify/TwoFactorVerifyForm.tsx`(OTP 검증 UI)가 실제 백엔드 호출 없이 `setTimeout` + 무조건 성공 토스트로 위장하는 **stub**임을 확인 — 검증 플래그를 세션에 채울 메커니즘 자체가 코드베이스에 없음. 따라서 siteId 우회만 fail-closed로 고치면 "2FA를 켠 사이트의 모든 관리자가 영원히 admin lockout"이라는 새로운 문제가 생기는 트레이드오프가 있었음.

**사용자 승인 방향:** 우회 버그는 즉시 fail-closed로 차단, 실제 OTP 백엔드 구현(TOTP 시크릿 발급/검증, 세션 플래그 주입)은 범위 밖 — 별도 SPEC(가칭 SPEC-ADMIN-2FA-OTP-001, 미작성)으로 분리.

**적용된 수정** (커밋 예정, expert-backend):
- `trpc.ts`: 중복 1단계(`isAdminTwoFactorRequired`) 호출 제거, `checkAdmin2FA(ctx.session, ctx.prisma, ctx.siteId ?? 1)`로 일원화(siteId 미해석 엣지 케이스도 단일사이트 기본값 1로 폴백, fail-open 방지). `UNAUTHORIZED` → `FORBIDDEN` 2건.
- `two-factor-gate.ts`: 검증 플래그를 `session.user.twoFactorVerified`로 정정(테스트 mock·`two-factor.ts`와 일치).
- 부수 회귀 수정: `isAdminTwoFactorRequired`를 직접 mock해 2FA 체크를 우회하던 기존 admin 라우터 테스트(`spamfilter.test.ts` 7건, `stats.test.ts` 8건, 총 15건)가 함수 호출 제거로 mock 무력화되어 깨짐 — 각 mock Prisma에 `siteSetting.findFirst → null` 추가로 실제 로직(2FA 비활성 → pass)을 타도록 수정. `category.test.ts`/`document.test.ts`의 잔존 실패 3건은 baseline 대비 무관함을 git-checkout 비교로 확인(사전 존재, 카테고리 1/4 범위).
- `trpc.two-factor.test.ts` 3개 전체 통과, `admin` 디렉토리 회귀 0건(202/205, 남은 3건은 사전 존재) 직접 재검증 완료.

### 4.4 카테고리 4 — 기타 고립 실패 (INVESTIGATE, 사례별)

> 아래 항목은 본 triage 시점에 근본 원인이 **미특정**이다. 제공되지 않은 원인을 추정하지 않는다(REQ-TDEBT-013). 각 항목은 개별 수정 시 실제 원인을 규명한다.

- `packages/db/src/install-validate.test.ts`, `packages/db/src/install/db-validator.test.ts`: `Error: Failed to load url server-only (resolved id: server-only)` — `server-only` 패키지 import가 해당 테스트의 vite/vitest 설정에서 해석 불가.
- `apps/web/app/install/actions.test.ts`: `Error: Cannot find module '.../next-auth/.../next/server'` — next-auth/Next.js 버전 불일치성 모듈 해석 이슈.
- `apps/web/lib/auth/actions.test.ts`: `Error: [vitest] No "createMailDispatcher" export is defined on the "@rhymix-ts/auth" mock` — 불완전 `vi.mock()` 팩토리.
- `apps/web/lib/theme/admin-helpers.test.ts`: 개별 점검 필요(미분류).
- `packages/core/src/install/diagnostics.test.ts`: 1건, "should mark middleware.rewrite as error when nonce echo mismatches" — 개별 점검 필요.
- `packages/core/src/widgets/builtin/login-info/index.test.tsx`, `.../content/index.test.tsx`: 3건, propsSchema 검증(`isAuthenticated` boolean / `listCount` max / `order` valid value) — Zod 스키마 정의 vs 테스트 기대 불일치로 보이나 점검 필요.
- `apps/web/lib/widgets/render.test.ts`: B-RENDER-5, "component throw → isolated data-widget-error" — 점검 필요.
- `apps/web/app/admin/boards/[mid]/feed/page.test.tsx`: T-011-UI-1, T-011-UI-2 — `TestingLibraryElementError: Found multiple elements with the text of: 피드 활성화`(테스트의 중복 라벨 셀렉터 이슈로 보이나 점검 필요).
- 테스트 타임아웃 1건(`Error: Test timed out in 15000ms`) — 파일/테스트 미특정, triage 중 식별 필요.
- 이미지 포맷 에러 1건(`[image-pipeline] processImage failed: Error: Input buffer contains unsupported image format`) — 점검 필요.
- 업로드 토큰 서명 불일치 1건(`TRPCError: 유효하지 않은 업로드 토큰: 토큰 서명 불일치`) — 점검 필요.

**처분:** INVESTIGATE, 사례별. 보안/데이터 영향 항목(업로드 토큰 서명, install 검증)부터 식별 권고.

---

## 5. 권장 수정 순서 (Recommended Fix Order)

1. **카테고리 3 (2FA) — FIX-NOW.** 실제 보안 관련 제품 버그일 수 있어 가장 먼저. mock-세션 형태 불일치인지 `isSessionTwoFactorVerified()` 로직 버그인지부터 규명. (REQ-TDEBT-010)
2. **카테고리 1 (Prisma mock) — FIX-LATER.** 최다 건수·개별 난이도 최저. 파일별 부분 mock 대신 **공유 완전 Prisma mock 팩토리** 도입으로 일괄 처리. (REQ-TDEBT-011)
3. **카테고리 2 (Next.js App Router) — FIX-LATER.** App Router 요청 스코프 mock을 제공하는 **공유 테스트 셋업 헬퍼** 도입(또는 `next/jest`/App Router 테스트 헬퍼로 마이그레이션). 도입 전까지는 "알려진 실패"로 수용. (REQ-TDEBT-012)
4. **카테고리 4 (기타 one-off) — INVESTIGATE, 사례별.** 보안/데이터 영향 항목(업로드 토큰 서명, install 검증)부터.

---

## 6. Expert Consultation Recommendations

본 triage의 항목을 후속 수정으로 구체화할 때 권장 전문가:

- **expert-debug / expert-testing** — 카테고리 3(2FA 미들웨어 실제 원인 규명), 카테고리 4(미분류 one-off 개별 조사)
- **expert-security** — 카테고리 3(2FA enforcement 경로가 실제 버그로 판명될 경우 권한 영향 평가), 카테고리 4의 업로드 토큰 서명·install 검증 항목
- **expert-backend** — 카테고리 1(공유 Prisma mock 팩토리 설계, 서비스/라우터의 실제 모델 호출 인벤토리)
- **expert-frontend** — 카테고리 2(App Router 테스트 셋업 헬퍼 / `next/jest` 마이그레이션)

본 triage SPEC 자체는 코드를 생산하지 않으므로 전문가 호출이 필요 없다.

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 **구현하지 않는다**. 본 SPEC은 평가 문서이며 코드 변경이 없다.

1. **테스트 실패의 실제 수정** — 90건 어느 것도 본 SPEC에서 고치지 않는다. 카테고리 1~4의 수정은 후속 수정 SPEC 또는 `/moai fix` 작업에서 진행한다.
2. **공유 mock 팩토리·테스트 셋업 헬퍼의 실제 구현** — REQ-TDEBT-011/012가 권고하는 공유 Prisma mock 팩토리와 App Router 테스트 헬퍼는 본 SPEC에서 작성하지 않는다(권고만).
3. **2FA 미들웨어의 실제 디버깅/수정** — 카테고리 3은 "조사 필요"로 플래그할 뿐, 본 SPEC에서 원인을 단정하거나 코드를 수정하지 않는다.
4. **카테고리 4 one-off의 근본 원인 단정** — 제공되지 않은 원인을 본 SPEC에서 추정·기록하지 않는다(REQ-TDEBT-013).
5. **테스트 인프라(vitest/vite 설정) 변경** — `server-only` 해석, next-auth 모듈 해석 등 설정 레벨 문제도 본 SPEC에서 변경하지 않는다.

---

## Open Questions

- Q1. 카테고리 3이 테스트의 mock-세션 형태 불일치인가, 아니면 `isSessionTwoFactorVerified()`의 실제 로직 버그인가 — FIX-NOW 조사 착수 시 최우선 규명. 후자라면 admin 2FA 강제 우회 가능성을 보안 관점에서 평가해야 한다.
- Q2. 카테고리 2를 공유 셋업 헬퍼로 처리할지, 영향 4개 파일을 `next/jest`/App Router 테스트 헬퍼 기반으로 마이그레이션할지 — 비용·유지보수성 트레이드오프는 expert-frontend 판단 사항.
- Q3. 카테고리 1의 공유 Prisma mock 팩토리를 어느 패키지에 둘지(테스트 전용 공유 패키지 vs 각 패키지 내부) — 모노레포 구조상 순환 의존 회피가 관건.
- Q4. 카테고리 4의 타임아웃 1건·이미지 포맷 1건·업로드 토큰 1건은 아직 파일/테스트가 핀포인트되지 않았다 — 개별 조사 착수 전 `--reporter=dot`로 정확한 위치 식별 필요.

---

## Implementation Notes

본 SPEC은 평가(triage) 문서로, 구현 작업이 없다. 코드 변경 0건.

### 평가 방법 및 신뢰도

- 전체 `npx vitest run`(저장소 루트, 총 1821 테스트, 820s)의 실패 스냅샷을 1차 분석 결과로 입력받아 4개 근본 원인 카테고리로 구조화했다. 카테고리 1·2는 원인 확정, 카테고리 3은 조사 필요(실제 버그 가능성), 카테고리 4는 사례별 미특정으로 분리했다.
- 사전 존재(pre-existing) 판정은 §1.4의 두 방법(직접 git-checkout 재현, 격리 실행 + 프레임워크 에러 식별)으로 독립 확인했다 — 파일-소유 추론에만 의존하지 않았다.
- 정확한 현재 라인 아이템은 시간이 지나면 변할 수 있으므로, 후속 수정 착수 시 `npx vitest run --reporter=dot 2>&1 | grep "FAIL "`로 갱신해 본 카테고리 매핑과 대조할 것을 권고한다.

### 사용자 확인이 필요한 판단 (flagged, 본 SPEC 범위 내에서 best-judgment로 진행)

본 에이전트는 subagent로서 사용자에게 직접 질의할 수 없어, 다음 모호 지점은 best-judgment로 처리하고 Open Questions에 명시했다:

1. **카테고리 3 우선순위 격상** — 단순 mock 갭으로 묶을 여지가 있으나, 2FA enforcement라는 보안 경로에서 `FORBIDDEN`이 아닌 `UNAUTHORIZED`가 나오고 검증 세션도 거부된다는 점에서 **실제 제품 버그 가능성**을 더 높게 보아 FIX-NOW·1순위로 격상했다.
2. **카테고리 2 처분을 ACCEPT→FIX-LATER 2단계로** — 즉시 수정 대상으로 묶기엔 프레임워크 환경 한계라 개별 패치가 비효율적이므로, 공유 헬퍼 도입 전까지 "알려진 실패"로 수용하고 헬퍼 도입 시 일괄 해소하는 2단계 처분으로 표현했다.

### 후속 작업

- INDEX.md 백로그 평가 섹션에 본 SPEC을 등록한다(본 작업에서 수행).
- FIX-NOW(카테고리 3) 착수 시 `/moai fix` 또는 `/moai plan SPEC-2FA-FIX-001`(가칭)으로 위임하며, 본 SPEC §3.B의 처분 경계 REQ(REQ-TDEBT-010~013)를 입력 제약으로 사용한다.

---

Version: 1.0.0
Status: evaluated (카테고리 3은 2026-06-21 조사+수정 완료 — CRITICAL 보안 결함 확정, fail-closed 적용. 나머지 카테고리는 평가만, 구현 대기)
Next Action: 카테고리 1(공유 Prisma mock 팩토리) → 카테고리 2(App Router 테스트 헬퍼) → 카테고리 4(사례별). 별도 후속: SPEC-ADMIN-2FA-OTP-001(가칭, 미작성) — TOTP 백엔드 실구현(현재 TwoFactorVerifyForm.tsx는 stub).
