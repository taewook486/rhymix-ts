---
id: SPEC-TEST-APP-ROUTER-001
title: "Next.js App Router 테스트 환경 Request-Scope Mock Helper"
version: "0.1.0"
status: completed
created: 2026-08-07
updated: 2026-08-07
author: MoAI manager-spec
priority: P2
phase: "7+"
module: "apps/web, packages/test-utils"
lifecycle: spec-anchored
tags: "testing, app-router, test-infrastructure, next.js"
depends_on: []
---

# SPEC-TEST-APP-ROUTER-001 — Next.js App Router 테스트 환경 Request-Scope Mock Helper (Test Infrastructure / P2)

## HISTORY

- 2026-08-07 (v0.1.0): 최초 작성. SPEC-TEST-DEBT-001 Category 2 (Next.js 16 App Router 테스트 환경 비양립, ~39 실패) 후속 작업. vitest jsdom 환경이 제공하지 않는 App Router request-scope context (`headers()`, `cookies()`, `useSearchParams()`)를 mock하는 공유 테스트 setup helper 도입 결정 (next/jest 마이그레이션 대비 저비용). packages/test-utils/src/app-router-mocks.ts 헬퍼 생성 후 4개 영향 테스트 파일에 적용.

---

## 1. Overview

### 1.1 목적

본 SPEC은 Next.js 16 App Router 런타임에 의존하는 테스트들이 vitest jsdom 환경에서 실패하는 문제를 해소하기 위한 **공유 테스트 setup helper**를 도입한다.

**문제 정의 (SPEC-TEST-DEBT-001 §4.2에서 확정):**
- vitest의 jsdom 환경은 Next.js App Router의 request-scope context를 제공하지 않음
- `headers()`, `cookies()`, `useSearchParams()` 호출 시 `Error: \`headers\` was called outside a request scope` (Next.js E251) 또는 `TypeError: Cannot read properties of null (reading 'get')`
- 영향 범위: ~39개 실패 테스트, 4개 파일 (`middleware.test.ts`, `proxy.test.ts`, `login/page.test.tsx`, `admin/layout.test.tsx`)

**해결 방침:**
- `next/jest` 또는 App Router test helpers로의 마이그레이션 **아닌**, vitest 환경 내에서 작동하는 **공유 mock helper** 도입
- `packages/test-utils/src/app-router-mocks.ts`에 request-scope mock 함수들을 정의
- 4개 영향 테스트 파일에서 helper를 import하여 setup 함수 호출

**범위:**
- **포함**: mock helper 구현, 4개 테스트 파일 적용, 테스트 통과 검증
- **제외**: vitest 환경 자체 변경, Next.js 런타임 수정, 테스트 외 코드 변경

### 1.2 대상 (Audience)

- manager-develop — mock helper 구현 및 테스트 파일 적용
- 모노레포 테스트 작성자 — 향후 App Router 테스트 작성 시 helper 사용 패턴

### 1.3 비용·유지보수성 트레이드오프 (REQ-TDEBT-012 Q2 해결)

**본 SPEC은 공유 helper를 권장하며 next/jest 마이그레이션을 권장하지 않는다.**

**공유 helper (본 SPEC 방향):**
- **비용:** ~200 LOC mock helper + 4파일 minimal import/setup 호출
- **유지보수성:** vitest 환경 유지, 기존 test-utils 패키지 활용 (SPEC-TEST-PRISMA-MOCK-001 선행 사례)
- **위험:** 낮음 — mock만 제공, 실제 Next.js 런타임 동일성 불필요 (테스트 격리 목적)

**next/jest 마이그레이션 (거부된 방향):**
- **비용:** Jest 의존성 추가, 4개 파일 전면 Jest 문법 재작성, CI 설정 변경, 테스트 러너 이중화 (vitest + Jest)
- **유지보수성:** 낮음 — 테스트 러너 분리, 설정 복잡도 증가
- **위험:** 중간 — 다른 vitest 테스트와 환경 불일치 가능성

**결정 근거:**
- 영향 파일이 4개로 제한적 — 전면 마이그레이션의 이득보다 비용이 큼
- 프로젝트는 이미 vitest 기반 — test-utils 패키지도 vitest 사용 (SPEC-TEST-PRISMA-MOCK-001 패턴)
- **마이그레이션 시점:** 향후 App Router 테스트가 20개 이상으로 확장되거나 Next.js 공식 vitest integration이 안정화되면 재평가

### 1.4 본 SPEC이 구현하지 않는 것

1. **vitest jsdom 환경 자체의 교체** — jsdom → happy-dom 또는 node 환경 변경은 범위 밖
2. **next/jest 러너 도입** — 본 SPEC은 vitest 유지를 전제로 함
3. **실제 Next.js 서버 런타임 테스트** — integration/E2E 범위, 본 SPEC은 unit 테스트 mock만
4. **테스트가 아닌 소스 코드 수정** — production 코드 변경 없음

---

## 2. Requirements (EARS Format)

REQ ID는 `REQ-AR-XXX` (App Router).

### 2.A 필수 기능 (Functional)

**REQ-AR-001** (Ubiquitous) — *P2*: The test helper SHALL provide a `setupAppRouterMocks()` function that, when called in a vitest test file, replaces Next.js App Router request-scope imports (`headers()`, `cookies()`, `useSearchParams()`) with mock implementations.

**REQ-AR-002** (Event-Driven) — *P2*: WHEN a test file calls `setupAppRouterMocks()`, the helper SHALL:
  a) Mock `next/headers` to return a `Headers` instance with predefined test values
  b) Mock `next/headers` to return a `ResponseCookies` mock with `get()`, `set()`, `delete()` methods
  c) Mock `next/navigation` `useSearchParams()` to return a `URLSearchParams` instance with predefined test values

**REQ-AR-003** (Event-Driven) — *P2*: WHEN `setupAppRouterMocks()` is called without custom test values, the helper SHALL provide sensible defaults (empty headers, empty cookies, empty search params) without requiring explicit configuration.

**REQ-AR-004** (Event-Driven) — *P2*: WHEN a test requires specific header/cookie/search-param values for assertions, the helper SHALL accept an optional `config` parameter to override defaults.

**REQ-AR-005** (Unwanted) — *P2*: The helper SHALL NOT modify global state outside the vitest test context (no process.env mutations, no filesystem writes).

### 2.B 비기능 (Non-Functional)

**REQ-AR-010** (Ubiquitous) — *P2*: The helper SHALL be type-safe (TypeScript) and export type definitions for all mock shapes.

**REQ-AR-011** (Ubiquitous) — *P2*: The helper SHALL integrate with existing `vi.mock()` patterns used elsewhere in the monorepo (follow `packages/test-utils/src/prisma-mock.ts` precedent).

**REQ-AR-012** (Ubiquitous) — *P2*: The helper SHALL NOT introduce new external dependencies beyond what `packages/test-utils` already has (vitest, vitest-mock-extended, TypeScript).

### 2.C 제약 조건 (Constraints)

**REQ-AR-020** (State-Driven) — *P2*: WHILE the helper is under `packages/test-utils`, it SHALL NOT import from `apps/web` (avoid circular dependency; helper must be app-agnostic).

**REQ-AR-021** (Unwanted) — *P2*: The helper implementation SHALL NOT use `@testing-library/react` render patterns (those belong in test files, not the mock helper itself).

**REQ-AR-022** (State-Driven) — *P2*: WHILE applying this helper to test files, modifications SHALL be limited to:
  a) Adding `import { setupAppRouterMocks } from '@rhymix-ts/test-utils'`
  b) Calling `setupAppRouterMocks()` in test file setup (beforeEach or test body)
  c) Removing any ad-hoc `vi.mock()` calls that the helper replaces
  Changes beyond these three categories are out of scope.

---

## 3. Acceptance Criteria (EARS 형식, Tier S — inline in spec.md)

### 3.A 기능 AC (Functional)

**AC-AR-001** (Given-When-Then) — *P2*:
**Given** the 4 affected test files (`middleware.test.ts`, `proxy.test.ts`, `login/page.test.tsx`, `admin/layout.test.tsx`) exist in their current failing state,
**When** the test runner executes `npx vitest run apps/web/middleware.test.ts apps/web/proxy.test.ts apps/web/app/(auth)/login/page.test.tsx apps/web/app/admin/layout.test.tsx`,
**Then** all ~39 previously failing tests SHALL pass with exit code 0.

**AC-AR-002** (Given-When-Then) — *P2*:
**Given** a new test file imports `setupAppRouterMocks` from `@rhymix-ts/test-utils`,
**When** the test calls a function that uses `headers()`, `cookies()`, or `useSearchParams()`,
**Then** the calls SHALL succeed without throwing `headers() was called outside a request scope` or null-reference errors.

**AC-AR-003** (Given-When-Then) — *P2*:
**Given** `setupAppRouterMocks()` is called with custom config `{ headers: { 'x-test': 'value' }, searchParams: { key: 'val' } }`,
**When** the test reads `headers.get('x-test')` or `searchParams.get('key')`,
**Then** the configured values SHALL be returned correctly.

**AC-AR-004** (Given-When-Then) — *P2*:
**Given** the helper is implemented in `packages/test-utils/src/app-router-mocks.ts`,
**When** `pnpm typecheck` is executed in the `packages/test-utils` directory,
**Then** type checking SHALL pass with exit code 0 (no TS errors).

**AC-AR-005** (Given-When-Then) — *P2*:
**Given** the full test suite is executed with `pnpm test` (monorepo-wide),
**When** the test run completes,
**Then** the Category 2 failure count SHALL be 0 (no new failures introduced).

### 3.B 비기능 AC (Non-Functional)

**AC-AR-010** (Given-When-Then) — *P2*:
**Given** the helper is published to `packages/test-utils`,
**When** a consumer test file auto-completes imports from `@rhymix-ts/test-utils`,
**Then** `setupAppRouterMocks` SHALL appear in type definitions with correct parameter types.

**AC-AR-011** (Given-When-Then) — *P2*:
**Given** `packages/test-utils/package.json` dependencies,
**When** theSPEC implementation is complete,
**Then** no new dependencies SHALL be added beyond the existing set (vitest, vitest-mock-extended, TypeScript, Prisma).

**AC-AR-012** (Given-When-Then) — *P2*:
**Given** the helper implementation,
**When** `grep -rn 'from "apps/web"' packages/test-utils/src/app-router-mocks.ts` is executed,
**Then** the output SHALL be empty (no apps/web imports, avoiding circular dependency).

---

## 4. Out of Scope

[HARD] 본 SPEC은 다음을 **구현하지 않는다**.

### 4.1 Out of Scope — 테스트 러너 마이그레이션

- **Jest/next/jest 도입** — vitest 환경 유지, Jest는 별도 SPEC 없이 도입 금지
- **jsdom → happy-dom 교체** — vitest 설정 영역, 본 SPEC은 mock만 제공
- **playwright/cypress E2E 설정** — unit 테스트 범위, E2E 도구 범위 밖

### 4.2 Out of Scope — 프로덕션 코드 변경

- **middleware.ts 본체 수정** — 미들웨어 구현 변경 없음
- **proxy.ts 본체 수정** — 프록시 핸들러 변경 없음
- **login/page.tsx 본체 수정** — 페이지 컴포넌트 변경 없음
- **admin/layout.tsx 본체 수정** — 레이아웃 변경 없음
- **next.config.js 수정** — Next.js 설정 변경 없음

### 4.3 Out of Scope — 고급 기능

- **async headers() 구현** — Next.js 15+ async headers API는 본 SPEC 범위 밖 (동기 mock만 제공)
- **middleware.js Edge Runtime 테스트** — Edge 환경은 별도 integration 범위
- **route segment config 테스트** — layout/page config 테스트는 별도 범위

---

## 5. Dependencies & References

### 5.1 선행 SPEC (Predecessor)

- **SPEC-TEST-DEBT-001** — Category 2 triage 결과 본 SPEC 입력 제공. 본 SPEC은 REQ-TDEBT-012 "공유 헬퍼 도입" 전략을 구현하며, 카테고리 1(Prisma mock) 해결 사례인 SPEC-TEST-PRISMA-MOCK-001 패턴을 따름.

### 5.2 관련 문서 (References)

- Next.js App Router Testing: https://nextjs.org/docs/app/building-your-application/testing
- vitest Environment: https://vitest.dev/guide/environment.html
- SPEC-TEST-PRISMA-MOCK-001 — 공유 mock 팩토리 패턴 선행 사례 (`packages/test-utils/src/prisma-mock.ts`)

---

## 6. Open Questions

해당 없음. REQ-TDEBT-012 Q2(공유 헬퍼 vs 마이그레이션)는 본 SPEC §1.3에서 해결됨.

---

Version: 0.1.0
Status: draft
Next Action: plan.md 실행 계획 수립 → manager-develop 위임 (Tier S, cycle_type=tdd)
