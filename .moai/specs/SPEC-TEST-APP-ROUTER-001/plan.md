# SPEC-TEST-APP-ROUTER-001 — Plan Phase

## A. Context

### A.1 Work Location

- **Project root**: `/mnt/d/project/rhymix-ts`
- **Current branch**: `main`
- **Target SPEC**: `.moai/specs/SPEC-TEST-APP-ROUTER-001/{spec.md, plan.md}`
- **Affected modules**:
  - `packages/test-utils` (helper implementation)
  - `apps/web/middleware.test.ts` (~18 failures)
  - `apps/web/proxy.test.ts` (~14 failures)
  - `apps/web/app/(auth)/login/page.test.tsx` (5 failures)
  - `apps/web/app/admin/layout.test.tsx` (2 failures)

### A.2 Source SPEC Input

- **SPEC-TEST-DEBT-001** (status: evaluated) — Category 2 triage 완료. 본 SPEC은 REQ-TDEBT-012 "공유 헬퍼 도입" 전략을 구현.
- **Root cause (확정, 재조사 불필요)**: vitest jsdom이 App Router request-scope(`headers()`, `cookies()`, `useSearchParams()`)를 제공하지 않음 (SPEC-TEST-DEBT-001 §4.2).

### A.3 Existing Infrastructure (PRESERVE)

- **`packages/test-utils`** — 이미 존재하는 공유 테스트 유틸 패키지. SPEC-TEST-PRISMA-MOCK-001가 `prisma-mock.ts`를 추가하여 선행 사례 존재.
- **Vitest runtime** — 프로젝트는 vitest ^3.0.0 사용. Jest 도입 없이 vitest 환경 내 mock 제공.

### A.4 Technical Approach

**공유 helper 도입 (next/jest 마이그레이션 제거):**

1. **Helper 구현** (`packages/test-utils/src/app-router-mocks.ts`):
   - `setupAppRouterMocks(config?: AppConfig): void` 함수 export
   - `vi.mock()`을 사용하여 `next/headers`, `next/headers`, `next/navigation` mocking
   - TypeScript 타입 정의 export (`HeadersMock`, `CookiesMock`, `SearchParamsMock`)

2. **테스트 파일 적용** (4개 파일):
   - helper import 추가: `import { setupAppRouterMocks } from '@rhymix-ts/test-utils'`
   - setup 호출: `beforeEach(() => setupAppRouterMocks())` 또는 테스트 본문 내 직접 호출
   - 기존 ad-hoc mock 제거 (helper로 대체되는 `vi.mock()` 호출 삭제)

3. **선택적 config 지원** (REQ-AR-004):
   - `setupAppRouterMocks({ headers: { 'x-custom': 'value' }, searchParams: { key: 'val' } })` 형태
   - default: 빈 headers/cookies/searchParams

### A.5 PRESERVE List

수정 금지 경로:
- `apps/web/middleware.ts` — production 코드 변경 없음
- `apps/web/proxy.ts` — production 코드 변경 없음
- `apps/web/app/(auth)/login/page.tsx` — production 코드 변경 없음
- `apps/web/app/admin/layout.test.tsx` — production 코드 변경 없음
- `packages/test-utils/src/prisma-mock.ts` — Prisma mock은 그대로 유지
- `vitest.config.ts` — vitest 설정 변경 없음
- `.moai/specs/SPEC-TEST-DEBT-001/*` — 선행 SPEC 문서 변경 없음

---

## B. Known Issues

### B1. Mock Implementation Complexity

**위험:** `next/headers`, `next/headers`는 Next.js 15+에서 async API일 수 있으나, 본 SPEC은 동기 mock만 제공 (async API는 Out of Scope §4.3).

**완화 조치:**
- helper는 동기 `Headers`/`ResponseCookies` interface만 mock
- async `headers()`가 필요한 테스트는 향후 별도 SPEC에서 확장

### B2. vitest-mock-extended 활용

**위험:** mock implementation이 vitest-mock-extended의 `deepMock` 패턴과 충돌 가능.

**완화 조치:**
- `vi.mock()` + `vi.fn()` 패턴 사용 (deepMock은 필요 시만)
- SPEC-TEST-PRISMA-MOCK-001 패턴 참조

### B3. Circular Dependency Risk

**위험:** helper가 `apps/web`을 import하면 순환 의존 발생 가능 (REQ-AR-020).

**완화 조치:**
- helper는 apps/web 무관하게 app-agnostic 구현
- 테스트 파일에서 helper를 import (방향: test-utils → apps/web, 역방향 없음)

### B4. Test File Location Variations

**위험:** 4개 파일이 서로 다른 디렉터리 (`middleware.test.ts` 루트, `app/(auth)/login/`, `app/admin/).

**완화 조치:**
- import 경로는 상대 경로 `@rhymix-ts/test-utils`로 통일 (모노레포 workspace 설정 활용)

---

## C. Pre-flight Check List

구현 시작 전 실행:

```bash
# 1. 현재 브랜치 + baseline 확인
git branch --show-current
git rev-parse HEAD

# 2. 영향 테스트 파일 현재 실패 상태 확인
npx vitest run apps/web/middleware.test.ts apps/web/proxy.test.ts 2>&1 | grep -E "(FAIL|PASS)" | head -20

# 3. test-utils 패키지 상태 확인
ls packages/test-utils/src/
cat packages/test-utils/package.json

# 4. 타입 체크 baseline (packages/test-utils)
cd packages/test-utils && pnpm typecheck

# 5. 순환 의존 확인 (현재 빈 상태여야 함)
grep -rn 'from "apps/web"' packages/test-utils/src/ || echo "clean: no apps/web imports"
```

---

## D. Constraints (DO NOT VIOLATE)

### D.1 Forbidden Commands

- **`--no-verify` 사용 금지** — pre-commit hook 우회 불가
- **`--amend` 사용 금지** — commit history 변경 불가 (Hybrid Trunk)
- **Jest 설치 금지** — `pnpm add -D @jest/environment jest` 등 vitest 외 러너 추가 금지

### D.2 Required Commands

- **Conventional Commits** — `feat(SPEC-TEST-APP-ROUTER-001): <subject>` 형식
- **Commit trailer** — `🗿 MoAI` 포함
- **TypeScript strict mode** — helper는 `strict: true` 환경에서 타입 체크 통과

### D.3 File Modification Limits

- **production 코드 수정 금지** — `.test.ts` `.test.tsx` 파일만 수정 (본 문서는 제외)
- **vitest 설정 수정 금지** — `vitest.config.ts` 변경 불가
- **Prisma mock 변경 금지** — `prisma-mock.ts`는 그대로 유지

---

## E. Self-Verification Deliverables

### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Expected Output |
|----|--------|---------------------|-----------------|
| AC-AR-001 | TBD | `npx vitest run apps/web/middleware.test.ts apps/web/proxy.test.ts apps/web/app/(auth)/login/page.test.tsx apps/web/app/admin/layout.test.tsx` | `PASS: 39/39` (exit 0) |
| AC-AR-002 | TBD | `npx vitest run apps/web/middleware.test.ts` (single file smoke test) | No `headers() outside scope` errors |
| AC-AR-003 | TBD | 테스트 파일에서 `setupAppRouterMocks({ headers: { 'x-test': 'value' } })` 호출 후 assertion | Custom values correctly returned |
| AC-AR-004 | TBD | `cd packages/test-utils && pnpm typecheck` | `exit 0`, no TS errors |
| AC-AR-005 | TBD | `pnpm test` (monorepo-wide) | Category 2 failure count = 0 |
| AC-AR-010 | TBD | 테스트 파일에서 `import { setupAppRouterMocks }` 입력 시 type 확인 | IDE autocomplete shows function signature |
| AC-AR-011 | TBD | `git diff packages/test-utils/package.json` | No new dependencies |
| AC-AR-012 | TBD | `grep -rn 'from "apps/web"' packages/test-utils/src/app-router-mocks.ts` | Empty output |

### E2. Branch HEAD + Push State

- List of new commit SHAs (implementation 단계에서 기록)
- Result of `git push origin <branch>` (Hybrid Trunk — main-direct push)

### E3. Coverage Measurement

```
$ cd packages/test-utils && pnpm test -- --coverage src/app-router-mocks.ts
```
기대치: 85%+ coverage (helper 자체 테스트 또는 4파일 적용 후 indirect coverage)

### E4. Lint Status

```
$ pnpm lint
```
기대치: exit 0, no new lint errors

### E5. Regression Prevention

```
$ npx vitest run --reporter=dot 2>&1 | grep "FAIL "
```
기대치: Category 2 관련 실패 0건, 다른 카테고리 실패 수 증가 없음

---

## F. Milestones (Tier S — 단일 마일스톤)

### Milestone M1: Helper 구현 + 4파일 적용

**Goal:** `packages/test-utils/src/app-router-mocks.ts` 생성 후 4개 테스트 파일에 helper 적용, 모든 테스트 통과.

**Tasks:**
1. `packages/test-utils/src/app-router-mocks.ts` 생성:
   - `setupAppRouterMocks()` 함수 구현
   - `Headers`, `Cookies`, `SearchParams` mock export
   - TypeScript 타입 정의

2. 4개 테스트 파일 수정:
   - `apps/web/middleware.test.ts`: helper import + setup 호출
   - `apps/web/proxy.test.ts`: helper import + setup 호출
   - `apps/web/app/(auth)/login/page.test.tsx`: helper import + setup 호출
   - `apps/web/app/admin/layout.test.tsx`: helper import + setup 호출

3. Verification:
   - 단일 파일 테스트: `npx vitest run apps/web/middleware.test.ts`
   - 4파일 동시 실행: `npx vitest run <all 4 files>`
   - Monorepo 전체: `pnpm test`
   - Type check: `cd packages/test-utils && pnpm typecheck`

**Success Criteria:**
- AC-AR-001 ~ AC-AR-005, AC-AR-010 ~ AC-AR-012 전체 PASS
- 0개 Category 2 실패

---

## G. Anti-Patterns

### AP-AR-001 — Jest 도입 시도

**잘못된 접근:** helper 구현 중 `pnpm add -D @jest/environment jest-environment-nextjs` 실행하여 러너 이중화.

**올바른 접근:** vitest 환경 유지, `vi.mock()`으로 Next.js internals만 mocking.

### AP-AR-002 — Production 코드 수정

**잘못된 접근:** `middleware.ts` 또는 `proxy.ts` 본체를 수정하여 테스트를 맞춤.

**올바른 접근:** `.test.ts` `.test.tsx` 파일만 수정, production 코드는 PRESERVE.

### AP-AR-003 — Async API 구현 시도

**잘못된 접근:** Next.js 15+ async `headers()` API를 본 SPEC에서 구현하려 시도.

**올바른 접근:** 동기 mock만 제공, async 필요 시 향후 별도 SPEC.

---

## H. Cross-References

- **SPEC-TEST-DEBT-001** — Category 2 triage 원본 (본 SPEC 입력)
- **SPEC-TEST-PRISMA-MOCK-001** — 공유 mock 팩토리 선행 사례 (pattern reference)
- **`.moai/config/sections/quality.yaml`** — development_mode (tdd/ddd) 확인
- **`.claude/rules/moai/development/manager-develop-prompt-template.md`** — run-phase delegation template (Tier S minimal form)
- **`.claude/rules/moai/workflow/spec-workflow.md`** — SPEC Tier 정의 (Tier S = 2 artifacts)

---

Version: 0.1.0
Status: draft
Next Action: manager-develop 위임 (Tier S, minimal delegation prompt)
