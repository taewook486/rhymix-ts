---
id: SPEC-ADDON-001
title: Addon System — Phase 4 P1 Declarative Hook Registry + Admin UI
version: 1.0.0
status: completed
created: 2026-05-30
updated: 2026-06-27
author: MoAI manager-spec
priority: P1
phase: 4
parent: MASTER-PLAN-002
depends-on: [SPEC-PAGE-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001, SPEC-ADMIN-001]
absorbs: [신규 — 레거시 modules/addon 재설계]
issue_number: TBD
related-research: SPEC-ADDON-001/research.md
language: ko
---

# SPEC-ADDON-001 — Addon System (Phase 4 / P1)

## HISTORY

- 2026-05-30 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.10의 직접 흡수. 레거시 `modules/addon`(자유로운 PHP 코드 삽입 메커니즘)을 폐기하고, 그 자리를 **선언적 hook 시스템**으로 대체한다. 본 SPEC은 zero-from-scratch이며 `packages/core/src/addons/` 디렉토리도 아직 존재하지 않는다. 4개 hook 타입(`onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`)을 정의하고, in-tree 빌트인 hook 핸들러로 6개 레거시 addon의 역할 중 신규 시스템에 의미가 있는 것들을 후속 SPEC에서 흡수할 수 있는 기반을 제공한다. 본 SPEC 자체는 hook 핸들러 구현체를 새로 만들지 않으며, 레지스트리/타입/실행기/admin UI/AddonConfig DB 모델/통합 지점까지가 범위다.

---

## 1. Goal & Audience

### 1.1 Goal

**확장 가능한 hook 기반의 안전한 plugin 메커니즘을 도입하여, 코어 도메인을 건드리지 않고도 부가 기능을 끼워 넣을 수 있게 한다.** 즉:

- 코드 측이 4개의 정의된 lifecycle 시점(`onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`)에서 등록된 hook 핸들러를 순서대로 호출한다.
- 운영자가 admin/addons 페이지에서 등록된 addon 목록을 보고, 활성/비활성을 토글하고, 실행 순서(priority)를 조정한다.
- 활성화 상태와 순서는 `AddonConfig` Prisma 테이블에 영속화되어 재시작 후에도 유지된다.
- hook 핸들러가 예외를 throw하면 해당 addon을 즉시 자동 비활성화하고 `AdminLog`에 audit 엔트리를 남기며, 다른 hook과 사이트 본체에 영향을 주지 않는다.
- 페이지 렌더러, document/comment 렌더러, middleware 같은 기존 통합 지점에서 hook 실행기를 호출할 수 있는 안정된 API를 제공한다.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (Addon 패키지 신규, registry/types/실행기, `AddonConfig` Prisma 모델, admin UI, 자동 비활성화)
- expert-backend agent — Slice B 구현 (기존 렌더러/middleware에 hook 실행 지점 통합)
- 운영자 — admin/addons 페이지에서 addon 목록을 조회하고 토글/순서 조정을 수행하는 최종 검증자

### 1.3 Non-Goals (본 SPEC 범위 외)

- **6개 레거시 addon(autolink, photoswipe, point_level_icon, counter, member_extra_info, adminlogging)의 실제 hook 핸들러 구현체** → 별도 후속 SPEC. 본 SPEC은 그것들이 등록될 수 있는 **레지스트리/실행기/저장 모델**만 만든다. 본 SPEC 종료 시점에는 등록된 빌트인 hook 핸들러 수는 0개여도 무방하다(통합 지점은 빈 hook 목록을 안전하게 처리해야 함 — REQ-ADDON-026 참조).
- **plugin loader / 외부 addon 다운로드** — addon 코드 배포는 본 SPEC에서 in-tree(코드 저장소 안에 정적으로 등록)만 지원. 외부 zip 설치/마켓플레이스는 백로그.
- **sandboxing / 임의 사용자 코드 실행** — 본 SPEC의 addon은 **신뢰된 in-tree TypeScript 모듈**이다. 운영자가 코드를 작성하거나 disk에 떨어뜨려도 자동 등록되지 않는다. 보안 결정 근거는 §5.5 참조.
- **per-domain addon enablement** — 다중 도메인 운영 시 도메인별로 다른 addon 세트를 켤지 여부는 Open Question 2번. 본 SPEC은 전역 enablement만 다룬다.
- **hook 핸들러의 비동기 background job 트리거** — `onPageView` 핸들러가 큐잉되어 워커에서 실행되는 패턴은 백로그(REQ-ADDON-032 참조). 본 SPEC은 동기/인라인 `await` 실행만 지원.
- **drag-drop 순서 UI** — admin/addons의 순서 조정은 Phase 1에서 단순 priority 숫자 input으로 한다. drag-drop 인터랙션은 Open Question 1번 결과에 따라 후속 SPEC.
- **addon별 권한 매트릭스** (member group별 addon 활성/비활성) — 백로그.
- **hook 실행 결과의 캐시** — 백로그 (SPEC-CACHE-001 후속).
- **Smarty / PHP 코드 실행 메커니즘** — 폐기. 레거시 `addons/*/*.addon.php` 파일은 reference로만 사용하며 런타임 실행하지 않는다.

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Hook Types 계층 (REQ-ADDON-001 ~ 009)

**REQ-ADDON-001 (Ubiquitous)**: The Addon system SHALL define exactly four hook types in `packages/core/src/addons/types.ts`: `onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`. Each hook type SHALL be expressed as a TypeScript interface specifying its input and output signature.

**REQ-ADDON-002 (Ubiquitous)**: The `onContentTransform` hook SHALL have the signature `(html: string, ctx: AddonContext) => Promise<string>`. Handlers receive a rendered HTML fragment (page body, document body, or comment body) and return a transformed fragment. The output replaces the input for the next handler in the chain.

**REQ-ADDON-003 (Ubiquitous)**: The `onUserRender` hook SHALL have the signature `(user: AddonUser, ctx: AddonContext) => Promise<{ icon?: string; badge?: string }>`. Handlers receive a user representation and MAY return optional decorations (icon URL/CSS class, badge text). The renderer merges decorations from all handlers in priority order; later handlers MAY override earlier values.

**REQ-ADDON-004 (Ubiquitous)**: The `onPageView` hook SHALL have the signature `(mid: string, ctx: AddonContext) => Promise<void>`. Handlers are fire-and-forget side effects (counters, audit logging). Return values SHALL be ignored.

**REQ-ADDON-005 (Ubiquitous)**: The `onAdminAction` hook SHALL have the signature `(action: string, payload: unknown, ctx: AddonContext) => Promise<void>`. Handlers receive an action discriminator string (e.g., `"module.create"`, `"site.update"`) and an opaque payload. Like `onPageView`, return values SHALL be ignored.

**REQ-ADDON-006 (Ubiquitous)**: The `AddonContext` SHALL be a typed object containing at least: `prisma: PrismaClient`, `request: { mid?: string; userId?: number; ip?: string; userAgent?: string }`, `domain: { id: number; host: string } | null`. Hook handlers SHALL NOT mutate the context; the context is a read-only snapshot per execution.

**REQ-ADDON-007 (Ubiquitous)**: The `AddonUser` SHALL be a typed snapshot containing at least: `id: number`, `nickname: string`, `email: string | null`, `groupIds: number[]`, `point?: number`. Handlers SHALL NOT mutate the user object.

**REQ-ADDON-008 (Unwanted)**: The Addon system SHALL NOT expose raw `prisma` write transactions (e.g., `prisma.$transaction` with destructive operations) to hook handlers via shortcuts. Hook handlers MAY read freely but writes SHALL go through the same Server Actions / service layer that admin routes use, with the same authorization checks.

**REQ-ADDON-009 (Unwanted)**: The Addon system SHALL NOT define more than the four hook types above in Phase 4. Adding a fifth hook type SHALL require a follow-up SPEC, ensuring the surface remains small and auditable.

### 2.2 Registry 계층 (REQ-ADDON-010 ~ 019)

**REQ-ADDON-010 (Ubiquitous)**: The Addon system SHALL provide a hook registry at `packages/core/src/addons/registry.ts` exposing `registerAddon(addon: AddonDefinition)`, `getAddon(name: string)`, `listAddons()`, and `resetAddonRegistry()` (test-only). The registry SHALL be a module-level `Map<string, AddonDefinition>` with no React import.

**REQ-ADDON-011 (Ubiquitous)**: An `AddonDefinition` SHALL contain at least: `name: string` (unique), `displayName: string`, `description: string`, `defaultPriority: number` (initial sort key, lower runs earlier), `hooks: Partial<Record<HookType, HookHandler>>`. A single addon MAY register handlers for multiple hook types.

**REQ-ADDON-012 (Event-Driven)**: WHEN `registerAddon(addon)` is called with a name already present in the registry, the system SHALL throw a typed `AddonAlreadyRegisteredError`. Registration SHALL be idempotent against repeated imports (HMR) — re-importing the same module SHALL be a no-op rather than an error, achieved by guarding registration on `getAddon(name) === undefined`.

**REQ-ADDON-013 (Event-Driven)**: WHEN `getAddon(name)` is called with an unregistered name, the system SHALL return `undefined` and SHALL NOT throw.

**REQ-ADDON-014 (Ubiquitous)**: The Addon system SHALL provide a barrel `packages/core/src/addons/builtin/index.ts` that imports each builtin addon module exactly once. In Phase 4 the barrel MAY be empty (no in-tree addon yet); REQ-ADDON-005-class behavior MUST still hold for empty arrays.

**REQ-ADDON-015 (Unwanted)**: The Addon system SHALL NOT dynamically `import()` or `require()` addon modules from disk paths supplied by site operators. An addon that is not statically registered through the in-tree barrel SHALL NOT be discoverable by the registry.

**REQ-ADDON-016 (Unwanted)**: The Addon system SHALL NOT execute Smarty templates, `*.addon.php` files, or any legacy Rhymix addon entrypoint at runtime. Legacy files MAY be consulted as reference but are never loaded.

### 2.3 AddonConfig Persistence 계층 (REQ-ADDON-020 ~ 029)

**REQ-ADDON-020 (Ubiquitous)**: The Addon system SHALL define a Prisma `AddonConfig` model in `packages/db/prisma/schema.prisma` with at least: `name String @id` (matches `AddonDefinition.name`), `enabled Boolean @default(true)`, `priority Int @default(0)`, `lastDisabledAt DateTime?`, `lastDisabledReason String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Migration name SHALL be `addon-config`.

**REQ-ADDON-021 (Event-Driven)**: WHEN a hook is about to fire, the system SHALL load the active hook set by joining `listAddons()` (in-memory definitions) with `AddonConfig` rows (DB state), filter to `enabled = true` AND `getAddon(name) !== undefined`, and sort by `priority ASC, name ASC`.

**REQ-ADDON-022 (Event-Driven)**: WHEN a registered addon has no `AddonConfig` row, the system SHALL on first hook execution upsert a row using the addon's `defaultPriority` and `enabled = true`. This first-write SHALL be idempotent and SHALL NOT block hook execution on race.

**REQ-ADDON-023 (Event-Driven)**: WHEN an administrator toggles enable/disable in admin/addons, the system SHALL upsert the corresponding `AddonConfig` row with the new `enabled` value and write an `AdminLog` entry with `action = "addon.toggle"` and `diff = { name, before: <old enabled>, after: <new enabled> }`.

**REQ-ADDON-024 (Event-Driven)**: WHEN an administrator changes the priority of an addon in admin/addons, the system SHALL upsert the `AddonConfig.priority` value and write an `AdminLog` entry with `action = "addon.reorder"` and `diff = { name, before: <old prio>, after: <new prio> }`.

**REQ-ADDON-025 (Optional)**: WHERE the `AddonConfig` table is empty (fresh install), `listEffectiveAddons()` SHALL behave as if all registered addons are enabled at their `defaultPriority`. Empty DB state SHALL NOT mean "all addons disabled".

### 2.4 Hook Executor 계층 (REQ-ADDON-030 ~ 039)

**REQ-ADDON-030 (Ubiquitous)**: The Addon system SHALL expose four executor entry points in `packages/core/src/addons/executor.ts`:

- `runContentTransform(html: string, ctx): Promise<string>`
- `runUserRender(user: AddonUser, ctx): Promise<{ icon?: string; badge?: string }>`
- `runPageView(mid: string, ctx): Promise<void>`
- `runAdminAction(action: string, payload: unknown, ctx): Promise<void>`

Each executor SHALL load the effective addon set (REQ-ADDON-021) and invoke handlers sequentially in priority order.

**REQ-ADDON-031 (Event-Driven)**: WHEN `runContentTransform` is called, each handler in the effective set SHALL be awaited; the return value of handler N is fed as input to handler N+1. The final string is returned to the caller.

**REQ-ADDON-032 (Ubiquitous)**: Handlers SHALL execute sequentially (`for...of` with `await`), not in parallel via `Promise.all`. Sequential execution preserves ordering semantics for `onContentTransform` and `onUserRender` and gives deterministic audit logs for `onAdminAction`.

**REQ-ADDON-033 (Event-Driven)**: WHEN a hook handler throws an exception or rejects its promise, the executor SHALL:

1. Catch the error,
2. Mark the offending addon as `enabled = false` and set `lastDisabledAt = now()` and `lastDisabledReason = <truncated stack trace, ≤ 4 KB>` in `AddonConfig`,
3. Write an `AdminLog` entry with `action = "addon.auto_disable"`, `target = "addon:<name>"`, and `diff = { reason, stack }`,
4. Continue executing the remaining handlers in the chain (the failed handler does NOT abort the pipeline),
5. For `onContentTransform`, treat the failed handler as an identity transformation (its input is forwarded unchanged to the next handler).

**REQ-ADDON-034 (Event-Driven)**: WHEN `runUserRender` runs, the system SHALL merge decoration objects in priority order. Conflicts SHALL be resolved with later-handler-wins (highest priority number that returned a non-undefined value). Empty results (`{}`) from a handler SHALL be a no-op for that handler.

**REQ-ADDON-035 (Ubiquitous)**: Hook executors SHALL accept a `signal?: AbortSignal` parameter on every entry point. WHEN the signal is aborted, the executor SHALL stop after the current handler and return whatever partial result is available. This is REQUIRED for middleware integration where request cancellation must propagate.

**REQ-ADDON-036 (Unwanted)**: A single hook handler failure SHALL NOT produce a 5xx response. `runContentTransform` SHALL always return a string (possibly the input verbatim if every handler failed). `runUserRender` SHALL always return an object (possibly `{}`). `runPageView` and `runAdminAction` SHALL always resolve void.

**REQ-ADDON-037 (Ubiquitous)**: The auto-disable mechanism (REQ-ADDON-033) SHALL be idempotent — repeatedly disabling an already-disabled addon SHALL update `lastDisabledAt` and `lastDisabledReason` but SHALL NOT produce duplicate `AdminLog` entries within the same request lifecycle.

**REQ-ADDON-038 (Unwanted)**: Hook executors SHALL NOT block on shared mutexes or semaphores. Concurrent requests SHALL each run their own hook chains independently against their own request-scoped Prisma client.

**REQ-ADDON-039 (Optional)**: WHERE diagnostic logging is enabled in development, the executor MAY emit `console.debug` with `{ hookType, handlerName, durationMs }` per handler. In production this SHALL be off by default to avoid log volume.

### 2.5 Admin UI 계층 (REQ-ADDON-050 ~ 059)

**REQ-ADDON-050 (Event-Driven)**: WHEN an administrator visits `apps/web/app/admin/addons/page.tsx`, the system SHALL list every registered addon (`listAddons()`) merged with its `AddonConfig` row (or default if none), showing: name, displayName, description, current `enabled` state, current `priority`, `lastDisabledAt`, `lastDisabledReason` (if any).

**REQ-ADDON-051 (Event-Driven)**: WHEN an administrator toggles the enable/disable switch for an addon, the system SHALL invoke a Server Action that upserts `AddonConfig` and writes the `AdminLog` entry per REQ-ADDON-023.

**REQ-ADDON-052 (Event-Driven)**: WHEN an administrator changes a priority number for an addon, the system SHALL upsert per REQ-ADDON-024. Multiple priority changes in one form submit SHALL be applied atomically (single transaction).

**REQ-ADDON-053 (Ubiquitous)**: The admin/addons page SHALL surface a "Re-enable" affordance for addons that were auto-disabled (REQ-ADDON-033). Clicking Re-enable SHALL clear `lastDisabledReason`, set `enabled = true`, and write an `AdminLog` entry with `action = "addon.reenable"`.

**REQ-ADDON-054 (Unwanted)**: The admin/addons routes SHALL NOT be accessible to non-administrators. The system SHALL reuse the existing admin route guard (`apps/web/app/admin` layout / middleware) and SHALL return the standard admin unauthorized response for non-admins.

**REQ-ADDON-055 (Unwanted)**: The admin/addons page SHALL NOT expose an "install from URL" or "upload zip" affordance. Addon code distribution is in-tree only (REQ-ADDON-015).

### 2.6 Integration Points 계층 (REQ-ADDON-060 ~ 069)

**REQ-ADDON-060 (Event-Driven)**: WHEN the page renderer (`apps/web/app/[mid]/page.tsx` flow that materializes a `page` module instance) is about to render the body, it SHALL pass the post-widget body through `runContentTransform(body, ctx)` and use the returned string for the final response.

**REQ-ADDON-061 (Event-Driven)**: WHEN the document renderer (`packages/document` body display) renders a document body, it SHALL pass the body through `runContentTransform(body, ctx)` before sanitization is reapplied at the boundary.

**REQ-ADDON-062 (Event-Driven)**: WHEN the comment renderer (`packages/comment` body display) renders a comment body, it SHALL pass the body through `runContentTransform(body, ctx)`.

**REQ-ADDON-063 (Event-Driven)**: WHEN the page route (`/[mid]`) completes a successful 200 response, the request middleware (or a route-level after-effect) SHALL invoke `runPageView(mid, ctx)`. `runPageView` SHALL NOT block the response (the await MAY be discarded via `void` if the runtime supports it without crashing on rejection — see REQ-ADDON-036).

**REQ-ADDON-064 (Event-Driven)**: WHEN any admin Server Action that already writes to `AdminLog` completes successfully, that action SHALL ALSO invoke `runAdminAction(action, payload, ctx)`. The existing `AdminLog` write is NOT replaced — `runAdminAction` is an extensibility callout for future addons.

**REQ-ADDON-065 (Event-Driven)**: WHEN the user renderer (nickname display in document/comment headers — to be defined more precisely in SPEC-MEMBER post-Phase 1) renders an author/commenter, it SHALL invoke `runUserRender(user, ctx)` and apply the returned `icon`/`badge` decorations to the rendered output.

**REQ-ADDON-066 (Ubiquitous)**: The widget content transformation (SPEC-WIDGET-001 `renderBodyWithWidgets`) and the addon content transformation SHALL run in a fixed order: **widgets first, then content transform**. That is, `runContentTransform` operates on the post-widget body, never on the pre-widget body with `<rx-widget>` tokens still present. This prevents content addons from accidentally rewriting widget tokens.

**REQ-ADDON-067 (Unwanted)**: Hook execution SHALL NOT introduce new global mutable state beyond the existing module-level registry Map and the DB-backed `AddonConfig`. Per-request execution context SHALL be passed explicitly as `AddonContext`, never via globals.

**REQ-ADDON-068 (Unwanted)**: The integration sites (page renderer, document renderer, comment renderer, middleware, admin Server Actions) SHALL NOT branch on individual addon names. They invoke the executor only; addon-specific logic lives inside the addon module itself.

### 2.7 Quality 계층 (REQ-ADDON-070 ~ 079)

**REQ-ADDON-070 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code in `packages/core/src/addons/` SHALL be at least 85%.

**REQ-ADDON-071 (Ubiquitous)**: The registry SHALL have unit tests covering: register/get/list, duplicate registration error, idempotent HMR re-import, empty-builtin barrel safety.

**REQ-ADDON-072 (Ubiquitous)**: The hook executor SHALL have unit tests covering: ordered execution (priority sort), `onContentTransform` chained transformation, exception isolation + auto-disable, `runUserRender` decoration merge with later-handler-wins, `AbortSignal` cancellation, empty effective set (no-op).

**REQ-ADDON-073 (Ubiquitous)**: The `AddonConfig` persistence SHALL have unit tests covering: first-execution upsert, enable/disable toggle, priority reorder, default behavior on empty table.

**REQ-ADDON-074 (Ubiquitous)**: At least one integration test SHALL verify the full pipeline: register two test addons → enable both at different priorities → call `runContentTransform("input")` → assert chained output → throw from one handler → assert that addon's `AddonConfig.enabled` becomes `false` and `AdminLog` row is written.

**REQ-ADDON-075 (Ubiquitous)**: At least one e2e test (Playwright) SHALL verify admin/addons UI: visit page as admin → see addon list → toggle one off → reload → confirm persisted state → see `AdminLog` entry recorded.

**REQ-ADDON-076 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (`core`, `db`, `apps/web`).

**REQ-ADDON-077 (Ubiquitous)**: All new code SHALL respect the language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-ADDON-078 (Unwanted)**: The Addon system SHALL NOT log full stack traces or payloads to `console` in production paths. Stack traces SHALL only be persisted in `AddonConfig.lastDisabledReason` and `AdminLog.diff` (DB-backed), accessible only to administrators.

---

## 3. Slices

본 SPEC은 2개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Addon Registry + AddonConfig 모델 + Hook 실행기 + Admin UI

종속성: 없음 (다른 슬라이스의 선행)

작업 항목:

1. `packages/core/src/addons/types.ts` 신규:
   - 4개 hook 타입 시그니처(`HookType` union, `HookHandler<T>` 제너릭)
   - `AddonContext`, `AddonUser`, `AddonDefinition` 인터페이스
   - `AddonAlreadyRegisteredError` 타입 에러
2. `packages/core/src/addons/registry.ts` 신규:
   - module-level `Map<string, AddonDefinition>`
   - `registerAddon`, `getAddon`, `listAddons`, `resetAddonRegistry`
   - HMR idempotent guard
3. `packages/core/src/addons/builtin/index.ts` 신규:
   - 빈 barrel (Phase 4 시점에 등록할 빌트인 addon 없음). 후속 SPEC이 여기에 register하는 import만 추가.
4. `packages/db/prisma/schema.prisma`에 `AddonConfig` 모델 추가 + migration `addon-config` 생성:
   - 필드: name(PK), enabled, priority, lastDisabledAt, lastDisabledReason, createdAt, updatedAt
5. `packages/core/src/addons/config.ts` 신규:
   - `listEffectiveAddons(ctx)`: registry + AddonConfig 조인 → enabled 정렬 결과
   - `ensureAddonConfig(name, defaultPriority, prisma)`: first-write idempotent upsert
   - `toggleAddon(name, enabled, ctx)`, `setAddonPriority(name, priority, ctx)`, `autoDisableAddon(name, reason, ctx)` — 모두 AdminLog 동시 기록
6. `packages/core/src/addons/executor.ts` 신규:
   - `runContentTransform`, `runUserRender`, `runPageView`, `runAdminAction`
   - 순차 await + exception 격리 + auto-disable 호출
   - `signal?: AbortSignal` 지원
7. `apps/web/app/admin/addons/page.tsx` 신규:
   - addon 목록 (등록된 것 + AddonConfig 머지) 표시
   - 활성/비활성 토글, priority 숫자 입력, 자동 비활성화된 항목의 lastDisabledReason 표시 + Re-enable 버튼
   - 기존 admin 라우트 가드 재사용 (비관리자 차단)
   - Server Actions: toggle, reorder, reenable
8. 단위 테스트:
   - registry (3+ tests): register/get/list, duplicate error, HMR idempotent
   - config (3+ tests): first-write upsert, toggle + AdminLog, reorder + AdminLog
   - executor (5+ tests): 순차 실행, 체인 transform, 예외 격리 + auto-disable, decoration merge, AbortSignal
   - admin UI Server Actions (2+ tests): toggle/reorder action, 비관리자 차단

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm prisma migrate dev --name addon-config` 성공
- `pnpm test packages/core` 통과
- `pnpm test apps/web` 통과 (admin/addons 영역)

EARS coverage: REQ-ADDON-001~016, REQ-ADDON-020~025, REQ-ADDON-030~039, REQ-ADDON-050~055, REQ-ADDON-070~078

예상 테스트: 13+

### Slice B: 기존 렌더러 / Middleware 통합

종속성: Slice A 완료

작업 항목:

1. **page 렌더러 통합**: `apps/web/app/[mid]/page.tsx`(혹은 page 모듈 디스패치 경로)에서 `renderBodyWithWidgets` 호출 직후 결과 문자열을 `runContentTransform`에 통과. 위젯-우선 순서 보장(REQ-ADDON-066).
2. **document 렌더러 통합**: `packages/document` 본문 표시 경로에서 sanitize 직전 `runContentTransform` 호출. document 본문은 사용자 입력이므로 transform 결과 역시 sanitizer를 통과해야 함을 명시.
3. **comment 렌더러 통합**: `packages/comment` 본문 표시 경로에서 동일 패턴.
4. **middleware 통합**: 페이지 응답 성공 후(`/[mid]` 라우트의 after-effect 또는 middleware response post-hook) `runPageView(mid, ctx)` 발사. response를 블록하지 않음(REQ-ADDON-036, REQ-ADDON-063).
5. **admin Server Action 통합**: 기존 AdminLog를 쓰는 admin Server Action에 `runAdminAction(action, payload, ctx)` 발사. AdminLog 쓰기 자체는 그대로 둠.
6. **user render 통합 스텁**: `runUserRender`를 호출하는 wrapper 컴포넌트를 `apps/web/components/user/AddonDecoratedUser.tsx`(혹은 동등)에 두고, document/comment 작성자 닉네임 렌더에서 임포트. 본 SPEC 시점에 실제 decoration handler는 없으므로 빈 객체가 적용되어 시각적 변화는 없음. wrapper만 준비.
7. 통합 테스트:
   - page 렌더 + content transform pipeline (1 test)
   - document 렌더 + content transform (1 test)
   - comment 렌더 + content transform (1 test)
   - `/[mid]` 200 응답 후 onPageView 발사 (1 test, mock executor)
   - admin Server Action 성공 후 onAdminAction 발사 (1 test, mock executor)

검증:

- `pnpm test apps/web` 통과 (통합 영역)
- e2e 1 test (Playwright): admin/addons에서 가짜 onContentTransform handler 활성화 → document 페이지 방문 → transformed 콘텐츠 확인

EARS coverage: REQ-ADDON-060~068, REQ-ADDON-074, REQ-ADDON-075

예상 테스트: 5+ (단위/통합) + 1 e2e

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 4개:

1. **AC-ADDON-A1 (master plan headline 1)**: GIVEN 두 addon이 등록되어 있고 둘 다 `onContentTransform` 핸들러를 갖고 priority 10/20으로 활성화됨, WHEN content가 렌더되기 직전에 `runContentTransform("input", ctx)`가 호출되면, THEN priority 10 핸들러의 출력이 priority 20 핸들러의 입력이 되고, 최종 반환 문자열은 두 변환이 순차로 적용된 결과다.
2. **AC-ADDON-A2 (master plan headline 2)**: GIVEN 한 addon의 `onContentTransform` 핸들러가 예외를 throw하도록 등록됨, WHEN `runContentTransform`이 호출되면, THEN 해당 addon의 `AddonConfig.enabled`는 `false`로 갱신되고 `lastDisabledReason`에 스택 트레이스가 저장되며 `AdminLog`에 `action = "addon.auto_disable"` 엔트리가 1건 기록된다. 다른 addon들의 변환은 정상 적용되고 사이트 응답은 200을 유지한다.
3. **AC-ADDON-A3**: GIVEN 빈 `AddonConfig` 테이블 + registry에 1개 addon 등록(`defaultPriority = 100`), WHEN `listEffectiveAddons`가 호출되면, THEN 그 addon이 enabled + priority 100으로 effective 목록에 포함된다(REQ-ADDON-025). 첫 실행 후 `AddonConfig`에 행이 자동 upsert되어 있다.
4. **AC-ADDON-B1**: GIVEN page 본문 `"<p>Hello</p><rx-widget name=\"login_info\" />"`이 저장되어 있고, WHEN 사용자가 그 page를 방문하면, THEN 응답 본문에는 (1) 위젯이 먼저 치환되고, (2) 그 결과가 `runContentTransform`을 통과한 최종 문자열이 포함된다(REQ-ADDON-066). 두 단계 순서는 위젯이 먼저, content transform이 그 다음이다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

- Addon **정의/등록/실행기/config** (React 의존 없음): `packages/core/src/addons/`
  - `types.ts`, `registry.ts`, `config.ts`, `executor.ts`, `builtin/index.ts` (모두 신규)
- Addon **admin UI**: `apps/web/app/admin/addons/` (신규)
- DB 모델: `packages/db/prisma/schema.prisma`의 `AddonConfig` (신규)
- 통합 호출: 기존 렌더러/middleware (수정만, 신규 파일 거의 없음)

근거: registry/executor는 React 의존이 없는 순수 TS 로직이므로 `packages/core`에 위치. admin UI는 Next.js RSC + Server Action이 필요하므로 `apps/web`. 신규 `@rhymix-ts/addon` 패키지는 만들지 않음(SPEC-WIDGET-001 §5.1 / SPEC-PAGE-001과 동일한 결정 원칙 — 미니멀한 패키지 경계 유지).

### 5.2 RSC vs Client Component

- **Server-side**: 모든 hook 실행기, registry, config, admin/addons RSC page, Server Actions (RSC)
- **Client-side**: admin/addons의 토글 스위치/순서 입력 인터랙션(client island), 폼 제출은 Server Action으로 전달
- Pure functions: registry, types, executor의 핵심 합성 로직 (no React/Next 의존 — 단위 테스트 용이)

### 5.3 Hook 실행 모델

순차(`for...of` + `await`) 실행을 채택한다(REQ-ADDON-032). 병렬(`Promise.all`)을 쓰지 않는 이유:

- `onContentTransform`은 본질적으로 chain(N → N+1 입력) — 병렬 불가.
- `onUserRender`는 decoration merge에 순서가 의미 있음(later wins).
- `onAdminAction` / `onPageView`는 순서가 audit 로그의 일관성을 좌우.

병렬화는 미래 최적화 대상이며, 현재는 코드 단순성과 deterministic 동작을 우선한다.

### 5.4 자동 비활성화 + Audit Log

핵심 안전장치(REQ-ADDON-033):

```
[runContentTransform("input", ctx)]
  ↓
for addon of effectiveAddons:
  try:
    nextInput = await addon.hooks.onContentTransform(currentInput, ctx)
    currentInput = nextInput
  catch (e):
    await autoDisableAddon(addon.name, formatError(e), ctx)
    // currentInput 변경 없음 → 다음 핸들러로 그대로 진행
  ↓
return currentInput
```

핵심 동작:

- 실패한 핸들러의 출력은 **input identity**로 처리(데이터 손실 없음).
- `autoDisableAddon`은 그 자체로 `prisma.addonConfig.upsert` + `prisma.adminLog.create` 한 쌍의 트랜잭션.
- 한 요청 안에서 같은 addon이 여러 hook에서 연달아 실패해도 AdminLog는 1번만(REQ-ADDON-037 idempotency).
- 사이트 본체에 영향 없음 → 항상 200 응답.

### 5.5 보안 결정: 신뢰 모델 = "in-tree 코드만"

본 SPEC의 가장 중요한 비즈니스 결정. 레거시 Rhymix의 "임의의 PHP 파일을 disk에 떨어뜨리면 자동 등록되어 실행" 메커니즘은 **포팅하지 않는다**. 이유:

- 운영자가 disk write 권한이 있는 경우 RCE로 전환된다(이미 레거시 Rhymix의 잘 알려진 취약 표면).
- TypeScript / Next.js 모노레포에서 동적 코드 로딩은 빌드 시점 안전성을 깬다(번들러가 추적 못 함, RSC boundary 깨짐).
- in-tree 등록만 허용하면: (1) 코드 리뷰 게이트 자동 적용, (2) tsc/lint 검사 자동 적용, (3) 의존성 그래프 정적 추적 가능.

따라서 sandboxing은 **하지 않는다**(필요 없음). 모든 addon은 코드 저장소 안에 정적 import되어 등록된 TypeScript 모듈이며, 다른 도메인 코드와 동일한 신뢰 수준을 가정한다. 운영자는 "어떤 addon을 켤지" 선택할 뿐이며, addon 코드 자체는 개발자/리뷰어 승인을 거친다.

이 결정은 NON-Goal 절에 명시되어 있으며 추후 외부 plugin loader 도입 시 별도 sandbox 결정이 필요하다(예: VM2, isolated workers — 본 SPEC 범위 외).

### 5.6 통합 순서 보장 (위젯 → addon transform)

`renderBodyWithWidgets`(SPEC-WIDGET-001)는 토큰을 React 노드 트리로 치환한다. 즉 결과는 ReactNode이며 단순 문자열이 아니다. 본 SPEC의 `onContentTransform`은 문자열을 받는다. 두 가지 통합 패턴:

- **패턴 A (권장)**: page/document/comment 본문은 위젯 토큰이 사용되지 않는 평문 HTML인 경우 → 직접 `runContentTransform(body)` → sanitize → `dangerouslySetInnerHTML`.
- **패턴 B**: 위젯 토큰이 포함된 본문 → `renderBodyWithWidgets`를 거쳐 ReactNode 트리 생성 → 위젯 사이의 정적 HTML 세그먼트 **각각**에 `runContentTransform`을 적용(즉 위젯 출력은 transform 대상이 아님).

Phase 4 시점에 page 본문은 위젯 토큰을 포함할 수 있으므로 패턴 B를 사용한다. document/comment 본문은 위젯 토큰을 포함하지 않으므로 패턴 A. 이 분기를 통합 사이트에서 명시한다.

### 5.7 admin/addons UI 구성 (Phase 4 최소)

```
+------------------------------------------------------+
| Addon 관리                                           |
+------------------------------------------------------+
| [autolink]  활성 [✓]  Priority [10]   [저장]          |
|   콘텐츠 안의 URL을 클릭 가능한 링크로 자동 변환       |
|                                                      |
| [photoswipe]  활성 [ ]  Priority [20]  [저장]         |
|   이미지에 라이트박스 적용                            |
|   ⚠ 자동 비활성화됨 (2026-05-30 12:34:56)             |
|   원인: TypeError: undefined is not a function...    |
|   [Re-enable]                                        |
+------------------------------------------------------+
```

drag-drop UI는 Open Question 1번 결과에 따라 후속 SPEC. 현재는 priority 숫자 input + 저장 버튼.

### 5.8 마이그레이션 안전성

`AddonConfig` 추가 migration은 신규 테이블 생성만 포함하며 기존 데이터를 건드리지 않는다(additive). 기존 운영 인스턴스에 적용해도 무손실. 등록된 addon이 없으면 (Phase 4 현재 상태) 효과적으로 모든 통합 사이트가 빈 hook 목록을 처리한다 → REQ-ADDON-036에 따라 동작이 변경되지 않음 = backward compatible.

### 5.9 의존 SPEC들과의 관계

본 SPEC은 Phase 4 SPEC이며 의존하는 SPEC들이 모두 Phase 1/2 완료를 전제로 한다:

- SPEC-PAGE-001 (Phase 1): page 본문에 `runContentTransform`을 끼워 넣는 자리가 필요. PAGE-001이 안정적이어야 본 SPEC의 Slice B가 가능.
- SPEC-DOCUMENT-001 (Phase 2): document 렌더러 통합 지점.
- SPEC-COMMENT-001 (Phase 2): comment 렌더러 통합 지점.
- SPEC-ADMIN-001: admin 라우트 가드 + `AdminLog` 모델을 본 SPEC이 재사용. 두 가지 모두 ADMIN-001 산출물.

본 SPEC은 위 SPEC들의 시그니처를 변경하지 않는다. 통합 지점에서 함수 호출만 추가한다.

---

## 6. Risks & Mitigations

상세는 research.md 참조. 핵심 5가지:

| Risk | Mitigation |
|---|---|
| hook 핸들러가 무한 루프 / 장시간 블록 → 모든 페이지 응답 지연 | `AbortSignal` 지원(REQ-ADDON-035) + 한 요청 안의 모든 hook 누적 시간 한계는 미들웨어 timeout에 위임. 개별 hook timeout은 Phase 4 범위 외. |
| 자동 비활성화가 silent 실패로 운영자가 인지 못 함 | admin/addons 페이지에서 자동 비활성화 항목을 시각적으로 강조 + lastDisabledReason 표시. AdminLog가 audit 채널. |
| `AddonConfig`와 in-memory registry 불일치 (DB에 있는 이름이 코드에서 unregistered) | `listEffectiveAddons`가 `getAddon(name) !== undefined` 필터링. DB는 orphan 행 허용(코드 롤백 시 데이터 보존). admin UI는 orphan을 `stale` 라벨로 표시(향후). |
| `onContentTransform`이 위젯 출력까지 transform하여 결과를 깨뜨림 | REQ-ADDON-066 명시 + 패턴 B(위젯 사이 세그먼트만 transform) + 단위 테스트로 보장. |
| addon 코드가 secret 정보(API key 등) 노출 | in-tree 코드 = 일반 코드 보안 정책 동일 적용. `.env` / secret 관리는 본 SPEC 범위 외이지만 addon이 process.env 접근 시 동일한 정책 준수. |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. 해결 없이도 Slice A는 진행 가능.

1. **순서 조정 UI: drag-drop vs numeric input** — Phase 4 admin/addons는 numeric input 채택(단순). drag-drop은 admin UX 일관성 점검 후 후속 SPEC. (권고: SPEC-MENU-002 같은 다른 admin DnD 도입 시점에 일괄 채택)
2. **per-domain addon enablement** — 다중 도메인 운영 시 도메인별로 다른 addon 세트가 필요한가? 본 SPEC은 전역 enablement만. `AddonConfig`에 `domainId Int?`를 추가하여 도메인별 row를 두는 확장은 schema 호환(현재 PK는 `name`이므로 변경 필요 → composite PK). 권고: 운영 요구 시 후속 SPEC에서 마이그레이션과 함께 도입.
3. **addon 코드 배포: in-tree only vs plugin loader 도입** — 본 SPEC은 in-tree only를 채택(보안 결정 §5.5). 만약 외부 marketplace 요구가 발생하면 sandboxing 결정(VM2 / isolated worker) + 코드 서명 + 권한 매트릭스가 모두 필요. 권고: 별도 SPEC.
4. **hook 핸들러 timeout** — 개별 hook이 N초 이상 걸리면 자동 비활성화할지. 본 SPEC은 미적용(요청 단위 미들웨어 timeout만). 권고: 운영 중 실측 후 결정.
5. **autolink/photoswipe 등 6개 레거시 addon 흡수 우선순위** — 본 SPEC 후 어느 것부터 hook 핸들러로 포팅할지. autolink/photoswipe(onContentTransform 단순 적용 가능)가 가장 cost-effective. counter(onPageView)는 stats SPEC과 묶기. point_level_icon(onUserRender)은 SPEC-POINT-001 완료 후. member_extra_info는 백로그. adminlogging은 이미 ADMIN-001 AdminLog가 대체. 권고: 후속 단일 SPEC `SPEC-ADDON-BUILTIN-001`에서 일괄 처리.

위 5개 모두 SPEC 합의 사항이 아닌 운영 정책 / 후속 SPEC 사항. 본 SPEC 완료에 영향 없음.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **6개 레거시 addon의 실제 hook 핸들러**: autolink, photoswipe, point_level_icon, counter, member_extra_info, adminlogging — 별도 후속 SPEC. 본 SPEC은 그것들이 들어올 수 있는 **레지스트리/실행기/저장 모델**만 만든다.
2. **plugin loader / 외부 addon 다운로드**: zip 업로드, marketplace, remote URL fetch — 백로그. 본 SPEC은 in-tree 정적 등록만.
3. **sandboxing**: 임의 사용자 코드 실행이 없으므로 sandbox 불필요(§5.5 보안 결정). 외부 plugin loader 도입 시 별도 SPEC.
4. **per-domain addon enablement**: 도메인별 addon 세트 — Open Question 2. 본 SPEC은 전역만.
5. **drag-drop 순서 UI**: numeric input만. drag-drop은 후속 admin UI 통일 시 도입.
6. **hook 핸들러별 timeout / circuit breaker**: 개별 hook 시간 한계 / 실패율 기반 자동 비활성화 — 본 SPEC은 예외 발생 시만 비활성화.
7. **hook 실행 결과의 캐시**: addon 출력 캐싱 — 백로그(SPEC-CACHE-001 후속).
8. **addon별 권한 매트릭스**: member group별 visibility — 백로그.
9. **legacy PHP `.addon.php` 파일의 런타임 실행**: 절대 실행하지 않음. legacy 파일은 reference로만.
10. **legacy `modules/addon`의 admin UI 1:1 포팅**: legacy의 dispAddonAdminList / procAddonAdminToggleActivate 등은 포팅하지 않음. 본 SPEC의 admin/addons는 신규 디자인.
11. **5번째 hook 타입 (e.g., onBeforeLogin, onAfterSignup)**: 본 SPEC은 4개 타입만 정의(REQ-ADDON-009). 새 hook 타입은 별도 SPEC.
12. **i18n 다국어 addon 메타**: displayName/description은 단일 언어. 다국어 표시는 백로그.
13. **addon 실행 통계 / 성능 대시보드**: 핸들러별 실행 시간 / 호출 횟수 표시 — 백로그.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 18+ (Slice A: 13+, Slice B: 5+ 통합 + 1 e2e) — master plan §5.10 추정치 +18 일치
Estimated Slice Count: 2 (A: Registry/Config/Executor/Admin UI, B: 렌더러/Middleware 통합)
Dependencies (upstream): SPEC-PAGE-001 ✅, SPEC-DOCUMENT-001 (Phase 2), SPEC-COMMENT-001 (Phase 2), SPEC-ADMIN-001 (AdminLog, admin 라우트 가드) ✅
Blocks (downstream): 후속 빌트인 addon 흡수 SPEC들 (SPEC-ADDON-BUILTIN-001 등 — 본 SPEC 완료 후 진행)
