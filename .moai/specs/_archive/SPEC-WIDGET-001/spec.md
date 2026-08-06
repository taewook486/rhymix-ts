---
id: SPEC-WIDGET-001
title: Widget System — Phase 1 P0 rx-widget Token Parser + Builtin Widgets
version: 1.0.0
status: completed
created: 2026-05-25
updated: 2026-06-27
author: MoAI manager-spec
priority: P0
phase: 1
parent: MASTER-PLAN-002
absorbs: [SPEC-ADMIN-001 Slice G, REMEDIATION-PLAN-001 ADMIN Slice G]
issue_number: TBD
related-research: SPEC-WIDGET-001/research.md
language: ko
---

# SPEC-WIDGET-001 — Widget System (Phase 1 / P0)

## HISTORY

- 2026-05-25 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.3의 직접 흡수. REMEDIATION-PLAN-001 ADMIN Slice G(위젯 registry + admin UI)를 흡수하고 빌트인 위젯 2개(login_info, content)를 신규로 추가한다. 본 SPEC은 SPEC-LAYOUT-001과 병행하는 Phase 1 사용자 가시성 트리오의 두 번째이며, SPEC-PAGE-001이 본 SPEC의 `<rx-widget>` 토큰 파서를 의존한다. 현재 `packages/core/src/widgets/`에 registry.ts/types.ts/index.ts 골조가 이미 존재하므로(SPEC-ADMIN-001 Slice G), 본 SPEC은 zero-from-scratch가 아니다. `WidgetInstance` Prisma 모델(schema.prisma line 528~538)과 `WidgetStyle` 모델(line 942)도 이미 존재한다.

---

## 1. Goal & Audience

### 1.1 Goal

**Phase 1 P0 사용자 가시성 트리오의 위젯 계층을 구축한다.** 즉:

- page/layout 본문에 박힌 `<rx-widget name="..." />` 토큰을 RSC가 파싱하여 실제 React 위젯 컴포넌트로 치환한다.
- 빌트인 위젯 2개(login_info, content)를 제공하여 클린 설치 직후 메인 페이지에 의미 있는 동적 콘텐츠가 보이도록 한다.
- 운영자가 admin/widgets 페이지에서 위젯 인스턴스(WidgetInstance)를 추가/수정하고, GUI로 구성한 위젯의 `<rx-widget>` 토큰을 자동 생성(코드 제너레이터)할 수 있다.
- 미등록 위젯 또는 잘못된 props로 인한 오류가 사이트 전체를 깨뜨리지 않도록 graceful degradation을 보장한다.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (registry 보강 + 토큰 파서 + props 검증)
- expert-frontend agent — Slice B/C/D 구현 (빌트인 위젯 컴포넌트, admin UI, 코드 제너레이터)
- 운영자 — 클린 설치 후 메인 페이지에서 로그인 위젯과 최근 글 위젯이 보임을 확인하고, admin/widgets에서 위젯을 관리하는 최종 검증자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 레이아웃 시스템 / ThemeResolver / LayoutContext → SPEC-LAYOUT-001 (Phase 1, 본 SPEC의 선행/병행)
- 페이지 모듈 본문 편집 UI + page 모듈 디스패치 → SPEC-PAGE-001 (Phase 1, 본 SPEC을 의존)
- 빌트인 위젯 4개(counter_status, language_select, mcontent, pollWidget) → 백로그 (master plan 결정: Phase 1은 login_info + content 2개만)
- 위젯 스타일(widgetstyle) GUI 편집기 + 컬러셋 데코레이션 → SPEC-THEME-POLISH-001 (Phase 4). 본 SPEC은 `WidgetStyle` 모델을 변경하지 않으며 Tailwind 기본 스타일만 적용
- 위젯 마켓플레이스 / 다운로드 / 외부 위젯 설치 (legacy `dispWidgetAdminDownloadedList`) — 백로그
- 위젯 캐싱 (legacy widget_cache) — 백로그 (master plan §6.7)
- DB에 WidgetDefinition 저장 — 위젯 정의는 정적 등록(registry.ts), DB에는 WidgetInstance(런타임 props 프리셋)만 저장

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Registry 보강 계층 (REQ-WIDGET-001 ~ 009)

**REQ-WIDGET-001 (Ubiquitous)**: The Widget system SHALL reuse the existing widget registry at `packages/core/src/widgets/registry.ts` (`registerWidget`, `getWidget`, `listWidgets`, `resetWidgetRegistry`) without changing its public signatures. The registry SHALL remain a module-level `Map<string, WidgetDefinition>` with no React import.

**REQ-WIDGET-002 (Ubiquitous)**: The Widget system SHALL preserve the existing `WidgetDefinition<P>` interface at `packages/core/src/widgets/types.ts` (`name`, `displayName`, `propsSchema: ZodSchema<P>`, `Component`, `defaultProps?`). The interface MAY be extended with optional fields (`description?: string`, `category?: string`, `adminFields?`) but SHALL NOT break existing required fields.

**REQ-WIDGET-003 (Ubiquitous)**: The Widget system SHALL persist widget instances using the existing Prisma `WidgetInstance` model (`schema.prisma` line 528~538) without schema alteration: `id Int @id`, `widgetName String`, `label String`, `props Json @default("{}")`, `createdAt`, `updatedAt`. The `widgetName` field SHALL be the lookup key against the in-memory registry.

**REQ-WIDGET-004 (Event-Driven)**: WHEN `getWidget(name)` is called with a registered name, the system SHALL return the `WidgetDefinition`; WHEN called with an unregistered name, the system SHALL return `undefined` and SHALL NOT throw.

**REQ-WIDGET-005 (Event-Driven)**: WHEN a builtin widget module is imported (e.g., `packages/core/src/widgets/builtin/index.ts`), the system SHALL register all builtin widgets exactly once via `registerWidget`, idempotently safe against repeated imports (HMR).

**REQ-WIDGET-006 (Ubiquitous)**: The Widget system SHALL expose a `validateWidgetProps(def, rawProps)` helper that runs `def.propsSchema.safeParse(rawProps)` merged over `def.defaultProps`, returning `{ ok: true, props }` or `{ ok: false, error }`. Invalid props SHALL NOT throw.

**REQ-WIDGET-007 (Unwanted)**: The Widget system SHALL NOT execute Smarty templates, PHP widget classes, or any user-supplied code path at runtime. Builtin widgets SHALL be statically imported React components registered explicitly.

**REQ-WIDGET-008 (Unwanted)**: The Widget system SHALL NOT dynamically `import()` or `require()` widget components from disk paths supplied by site operators. A widget that is not statically registered SHALL be treated as unregistered.

**REQ-WIDGET-009 (Optional)**: WHERE a `WidgetInstance` row references a `widgetName` that is no longer registered, `listWidgetInstances()` SHALL return the row with a `registered: false` flag so the admin UI can surface a stale-instance warning.

### 2.2 Token Parser 계층 (REQ-WIDGET-010 ~ 019)

**REQ-WIDGET-010 (Ubiquitous)**: The Widget system SHALL provide a token parser at `apps/web/lib/widgets/render.tsx` exposing `parseWidgetTokens(html: string): WidgetToken[]` that extracts `<rx-widget ... />` custom elements from a raw HTML/markup string.

**REQ-WIDGET-011 (Ubiquitous)**: A `WidgetToken` SHALL have the shape `{ name: string; props: Record<string, string>; raw: string }`, where `name` is the value of the `name` attribute and `props` is the map of all `data-*` attributes with the `data-` prefix stripped and the remaining key converted from `kebab-case` to `camelCase`.

**REQ-WIDGET-012 (Event-Driven)**: WHEN the page/layout body contains `<rx-widget name="login_info" />`, the system SHALL replace the token with the rendered output of the `login_info` builtin widget component.

**REQ-WIDGET-013 (Event-Driven)**: WHEN the body contains `<rx-widget name="content" data-list-count="5" data-target-mid="notice" />`, the system SHALL parse `props = { listCount: "5", targetMid: "notice" }`, validate via `validateWidgetProps`, and render the `content` builtin widget with the coerced props.

**REQ-WIDGET-014 (Event-Driven)**: WHEN a `<rx-widget>` token has a self-closing or paired form (`<rx-widget ... />` or `<rx-widget ...></rx-widget>`), the parser SHALL handle both syntaxes and produce one `WidgetToken` per occurrence.

**REQ-WIDGET-015 (Ubiquitous)**: The Widget system SHALL provide an async server helper `renderBodyWithWidgets(html: string, ctx): Promise<ReactNode>` that splits the body on `<rx-widget>` tokens, renders static HTML segments via a sanitizer (DOMPurify-equivalent at the RSC boundary), and interleaves rendered widget components in document order.

**REQ-WIDGET-016 (Unwanted)**: The Widget system SHALL NOT pass raw widget `props` (attacker-controllable strings) into `dangerouslySetInnerHTML` or any DOM sink without Zod validation and sanitization. All static HTML segments between tokens SHALL be sanitized before injection.

**REQ-WIDGET-017 (Unwanted)**: The token parser SHALL NOT perform network requests (SSRF) based on widget props at parse time. Any data fetching SHALL occur inside the widget component using validated props and the request-scoped Prisma client only.

**REQ-WIDGET-018 (State-Driven)**: WHILE a widget component throws during render, the system SHALL isolate the failure to that single widget (React error boundary or try/catch at the interleave point) and SHALL continue rendering the remaining body and widgets.

### 2.3 Graceful Degradation 계층 (REQ-WIDGET-020 ~ 029)

**REQ-WIDGET-020 (Event-Driven)**: WHEN a `<rx-widget name="X" />` token references an unregistered widget AND the current user is NOT a site administrator, the system SHALL render an empty `<span data-widget-empty="X"></span>` (no visible error).

**REQ-WIDGET-021 (Event-Driven)**: WHEN a `<rx-widget name="X" />` token references an unregistered widget AND the current user IS a site administrator, the system SHALL render `<span data-widget-error="X" title="...">Unknown widget: X</span>` so the admin can diagnose the misconfiguration.

**REQ-WIDGET-022 (Event-Driven)**: WHEN widget props fail Zod validation AND the user is NOT an administrator, the system SHALL render the widget using `defaultProps` if a valid default exists, or fall back to the empty `<span data-widget-empty>` rule (REQ-WIDGET-020) if no valid default is possible.

**REQ-WIDGET-023 (Event-Driven)**: WHEN widget props fail Zod validation AND the user IS an administrator, the system SHALL render `<span data-widget-error="X" data-widget-reason="props">…validation summary…</span>`.

**REQ-WIDGET-024 (Ubiquitous)**: Administrator detection for REQ-WIDGET-020~023 SHALL reuse the existing auth context (session-based admin/group check from `packages/auth`). The widget renderer SHALL receive an `isAdmin: boolean` flag in its `ctx` and SHALL NOT re-query the session itself.

**REQ-WIDGET-025 (Unwanted)**: A single widget failure SHALL NOT produce a 5xx response or crash the page. The render pipeline SHALL always return a 200 with the degraded markup described above.

### 2.4 Builtin Widgets 계층 (REQ-WIDGET-030 ~ 049)

**REQ-WIDGET-030 (Ubiquitous)**: The Widget system SHALL ship exactly two builtin widgets in Phase 1, located under `packages/core/src/widgets/builtin/`: `login-info/` and `content/`. Each SHALL export a `WidgetDefinition` and register itself through the builtin barrel.

**REQ-WIDGET-031 (Ubiquitous)**: The `login_info` widget SHALL define `name: "login_info"`, `displayName: "로그인 정보"`, and a `propsSchema` accepting optional fields: `showProfileImage: boolean` (default false), `redirectAfterLogin: string` (default "/"). It SHALL NOT require any DB-backed props.

**REQ-WIDGET-032 (State-Driven)**: WHILE the current user is authenticated, the `login_info` widget SHALL render the user's login info (nickname + logout link); WHILE the user is anonymous, it SHALL render a login form (or a link to `/login`).

**REQ-WIDGET-033 (Event-Driven)**: WHEN the `login_info` widget renders the login form for an anonymous user, the form SHALL submit to the existing auth login flow and SHALL preserve the existing CSRF/auth conventions used by `apps/web/app/(auth)/login`.

**REQ-WIDGET-034 (Ubiquitous)**: The `content` widget SHALL define `name: "content"`, `displayName: "콘텐츠 (최근 글)"`, and a `propsSchema` accepting: `targetMid: string` (optional), `listCount: number` (default 5, coerced from string, clamped 1~30), `order: 'latest' | 'popular'` (default 'latest').

**REQ-WIDGET-035 (Event-Driven)**: WHEN the `content` widget renders with a valid `targetMid`, the system SHALL query the most recent `listCount` documents from the resolved board/module instance and render them as a titled list (title + link + date).

**REQ-WIDGET-036 (Event-Driven)**: WHEN the `content` widget's `targetMid` resolves to no module instance, the system SHALL render an empty list container (not an error) for non-admin users, and a `data-widget-error` note for admins.

**REQ-WIDGET-037 (Optional)**: WHERE the document domain (SPEC-DOCUMENT-001) is not yet implemented at the time the `content` widget renders, the widget MAY query documents via the existing `packages/board` document accessor and SHALL be refactored to the document package when SPEC-DOCUMENT-001 lands. This dependency boundary is a known temporary coupling (see §6).

**REQ-WIDGET-038 (Ubiquitous)**: Both builtin widgets SHALL be styled exclusively with Tailwind utility classes (no separate CSS file in Phase 1) and SHALL be responsive across viewport widths 320px~1920px.

**REQ-WIDGET-039 (Ubiquitous)**: Both builtin widget components SHALL be async React Server Components and SHALL NOT introduce client-only state except where interactivity strictly requires it (the `login_info` form MAY be a client island).

### 2.5 Admin UI + Code Generator 계층 (REQ-WIDGET-050 ~ 069)

**REQ-WIDGET-050 (Event-Driven)**: WHEN an administrator visits `apps/web/app/admin/widgets`, the system SHALL list all registered widget definitions (`listWidgets()`) with `displayName` and `name`, and all persisted `WidgetInstance` rows with `label` and `widgetName`.

**REQ-WIDGET-051 (Event-Driven)**: WHEN an administrator creates a widget instance, the system SHALL persist a `WidgetInstance` row with the selected `widgetName`, a `label`, and `props` validated against the widget's `propsSchema`.

**REQ-WIDGET-052 (Event-Driven)**: WHEN an administrator edits or deletes a widget instance, the system SHALL update or remove the corresponding `WidgetInstance` row and SHALL re-validate `props` against the current `propsSchema` on update.

**REQ-WIDGET-053 (Event-Driven)**: WHEN an administrator selects a widget and fills its props in the generator form, the system SHALL produce a copyable `<rx-widget name="X" data-key="value" ... />` token string reflecting the entered props (with camelCase keys converted to `data-kebab-case` attributes).

**REQ-WIDGET-054 (Ubiquitous)**: The code generator SHALL derive its form fields from the widget's `propsSchema` (Zod) so that adding a new builtin widget automatically yields a generator form without bespoke admin code per widget.

**REQ-WIDGET-055 (Unwanted)**: The admin widget routes SHALL NOT be accessible to non-administrators. The system SHALL reuse the existing admin route guard (`apps/web/app/admin` layout / middleware) and SHALL return the standard admin unauthorized response for non-admins.

**REQ-WIDGET-056 (Event-Driven)**: WHEN the generator emits a token for a widget whose props fail validation, the system SHALL display an inline form error and SHALL NOT emit an invalid token string.

### 2.6 Quality 계층 (REQ-WIDGET-070 ~ 079)

**REQ-WIDGET-070 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-WIDGET-071 (Ubiquitous)**: The token parser SHALL have unit tests covering: self-closing token, paired token, multiple tokens in one body, kebab-to-camel prop conversion, and tokens interleaved with static HTML.

**REQ-WIDGET-072 (Ubiquitous)**: The graceful degradation rules SHALL have unit tests covering all four combinations of (registered/unregistered) × (admin/non-admin), plus the props-validation-failure branches.

**REQ-WIDGET-073 (Ubiquitous)**: The render pipeline SHALL include at least one integration test: `body string with <rx-widget name="login_info" /> + registered builtin + mocked ctx → renderBodyWithWidgets returns a tree containing the login widget output`.

**REQ-WIDGET-074 (Ubiquitous)**: The builtin widgets SHALL include at least one e2e test (Playwright): seed → page body with `<rx-widget name="login_info" />` → visit page → assert the login widget renders (anonymous: login form; authenticated: nickname).

**REQ-WIDGET-075 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (core, db where touched, apps/web).

**REQ-WIDGET-076 (Ubiquitous)**: All new code SHALL respect the language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-WIDGET-077 (Unwanted)**: The Widget system SHALL NOT introduce new global mutable state beyond the existing module-level registry Map. Per-request widget rendering context SHALL be passed explicitly, never via globals.

---

## 3. Slices

본 SPEC은 4개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Registry 보강 + Props 검증

종속성: 없음 (다른 슬라이스의 선행)

작업 항목:

1. `packages/core/src/widgets/types.ts` 확장:
   - `WidgetDefinition`에 optional `description?`, `category?` 추가 (기존 required 필드 불변)
   - `WidgetRenderContext` 타입 신규 (`isAdmin: boolean`, `user`, `prisma`, `domainId`)
2. `packages/core/src/widgets/validate.ts` 신규:
   - `validateWidgetProps(def, rawProps): { ok: true, props } | { ok: false, error }`
   - `defaultProps` 병합 → `propsSchema.safeParse` 순서
3. `packages/core/src/widgets/instances.ts` 신규:
   - `listWidgetInstances(prisma): Promise<(WidgetInstance & { registered: boolean })[]>`
   - `createWidgetInstance` / `updateWidgetInstance` / `deleteWidgetInstance` (props 검증 포함)
4. 단위 테스트: validate, instances, registry 재확인 (10+ tests)

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test packages/core` 통과 (기존 registry.test.ts 회귀 없음)

EARS coverage: REQ-WIDGET-001~009, REQ-WIDGET-006

### Slice B: rx-widget 토큰 파서 + 렌더 파이프라인 + Graceful Degradation

종속성: Slice A 완료

작업 항목:

1. `apps/web/lib/widgets/render.tsx` 신규:
   - `parseWidgetTokens(html): WidgetToken[]` (self-closing + paired, data-* → camelCase)
   - `renderBodyWithWidgets(html, ctx): Promise<ReactNode>` (segment split + sanitize + interleave)
2. `apps/web/lib/widgets/sanitize.ts` 신규:
   - 정적 HTML 세그먼트용 sanitizer (DOMPurify 또는 동등 서버 sanitizer)
3. Graceful degradation 구현:
   - 미등록 위젯: 비관리자 → `<span data-widget-empty>`, 관리자 → `<span data-widget-error>`
   - props 검증 실패: defaultProps fallback 또는 empty span
   - 위젯 throw: per-widget 격리 (error boundary / try-catch)
4. 단위 테스트: parser (5+ cases), degradation (4 조합 + props 실패), pipeline integration (10+ tests)

검증:

- `pnpm test apps/web` 통과 (widgets 영역)
- 4개 degradation 경로 모두 cover

EARS coverage: REQ-WIDGET-010~018, REQ-WIDGET-020~025

### Slice C: 빌트인 위젯 2개 (login_info + content)

종속성: Slice B 완료

작업 항목:

1. `packages/core/src/widgets/builtin/login-info/index.tsx` 신규:
   - `WidgetDefinition` (name "login_info", propsSchema, Component RSC)
   - 인증 상태 분기: 로그인 폼(익명, client island) vs 로그인 정보(인증)
   - 기존 `apps/web/app/(auth)/login` 흐름/CSRF 규약 재사용
2. `packages/core/src/widgets/builtin/content/index.tsx` 신규:
   - `WidgetDefinition` (name "content", propsSchema: targetMid/listCount/order)
   - `targetMid` resolve → 최근 글 listCount개 조회 (임시: `packages/board` document accessor)
   - 빈 결과 / 미해결 mid → 비관리자 빈 목록, 관리자 data-widget-error
3. `packages/core/src/widgets/builtin/index.ts` 신규:
   - 두 위젯 idempotent 등록 barrel
4. Tailwind 기본 스타일 (별도 CSS 없음, responsive 320~1920px)
5. 단위 테스트: 각 위젯 (인증 분기, props 분기, empty 분기) — 12+ tests
6. e2e 테스트 1개: 페이지 본문 `<rx-widget name="login_info" />` → 익명 로그인 폼 / 인증 닉네임 확인

검증:

- `pnpm test packages/core` 통과
- e2e 테스트 통과
- `pnpm dev` 환경에서 `<rx-widget name="login_info" />`가 실제 로그인 위젯으로 치환되는 것 확인

EARS coverage: REQ-WIDGET-030~039, REQ-WIDGET-073, REQ-WIDGET-074

### Slice D: Admin UI + 코드 제너레이터

종속성: Slice A 완료 (Slice C와 병행 가능 — 등록된 위젯 메타만 의존)

작업 항목:

1. `apps/web/app/admin/widgets/page.tsx` 신규:
   - 등록 위젯 목록(`listWidgets()`) + WidgetInstance 목록(`listWidgetInstances`)
   - 기존 admin 라우트 가드 재사용 (비관리자 차단)
2. WidgetInstance CRUD UI:
   - 생성/수정/삭제 (Server Actions), props는 `propsSchema`로 검증
3. 코드 제너레이터:
   - `propsSchema`(Zod) → 자동 폼 필드 도출 (위젯별 별도 admin 코드 불필요)
   - 입력 props → `<rx-widget name="X" data-key="value" />` 토큰 문자열 생성 (camelCase → data-kebab-case)
   - 검증 실패 시 inline 오류 + 무효 토큰 미생성
4. 단위 테스트: 토큰 생성기 (camelCase↔kebab, 검증 실패), instance CRUD action — 8+ tests

검증:

- 관리자로 admin/widgets 접근 → 위젯 목록 표시
- 제너레이터에서 content 위젯 선택 → props 입력 → 유효한 `<rx-widget>` 토큰 생성 확인
- 비관리자 접근 차단 확인

EARS coverage: REQ-WIDGET-050~056, REQ-WIDGET-070~077

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 4개:

1. **AC-WIDGET-A1**: GIVEN registry에 login_info가 등록됨 + 잘못된 props 객체, WHEN `validateWidgetProps`가 호출되면, THEN `defaultProps`로 병합 후 `{ ok: false, error }`(복구 불가 시) 또는 `{ ok: true, props }`(default로 복구)를 반환하고 throw하지 않는다.
2. **AC-WIDGET-B1 (master plan headline 2)**: GIVEN `<rx-widget name="unknown_x" />` 토큰 + 비관리자 ctx, WHEN `renderBodyWithWidgets`가 호출되면, THEN 출력에 `<span data-widget-empty="unknown_x">`가 포함되고 가시적 오류가 없다. GIVEN 동일 토큰 + 관리자 ctx, THEN 출력에 `<span data-widget-error="unknown_x">`가 포함된다.
3. **AC-WIDGET-C1 (master plan headline 1)**: GIVEN 페이지 본문에 `<rx-widget name="login_info" />` + 익명 사용자, WHEN 사용자가 그 페이지를 방문, THEN HTTP 200 + 로그인 폼(또는 `/login` 링크)이 렌더된다. GIVEN 동일 토큰 + 인증 사용자, THEN 닉네임 + 로그아웃 링크가 렌더된다.
4. **AC-WIDGET-D1**: GIVEN 관리자가 admin/widgets 제너레이터에서 content 위젯 + `listCount=5, targetMid=notice` 입력, WHEN "토큰 생성"을 누르면, THEN `<rx-widget name="content" data-list-count="5" data-target-mid="notice" />` 문자열이 복사 가능 형태로 출력된다. GIVEN 비관리자, WHEN admin/widgets 접근, THEN 표준 admin unauthorized 응답이 반환된다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

- 위젯 **정의/등록/검증** (React 의존 없음 또는 RSC 컴포넌트): `packages/core/src/widgets/`
  - `registry.ts`, `types.ts`, `index.ts` (기존, KEEP)
  - `validate.ts`, `instances.ts`, `builtin/{login-info,content}/`, `builtin/index.ts` (신규)
- 위젯 **토큰 파싱/렌더 파이프라인** (Next.js/headers 의존): `apps/web/lib/widgets/`
  - `render.tsx`, `sanitize.ts` (신규)
- 위젯 **admin UI**: `apps/web/app/admin/widgets/` (신규)

근거: registry는 이미 `packages/core/src/widgets/`에 있고 React/Next 의존이 없다. 토큰 파서는 RSC + sanitizer가 필요하므로 apps/web에 둔다. 신규 `@rhymix-ts/widget` 패키지는 만들지 않는다 (SPEC-LAYOUT-001 §5.1과 동일한 결정 원칙).

### 5.2 RSC vs Client Component

- **Server-side**: parseWidgetTokens, renderBodyWithWidgets, content 위젯, validate, instances, admin page (RSC)
- **Client-side**: login_info 위젯의 로그인 폼(익명 사용자용 client island), 코드 제너레이터 폼(인터랙티브 입력)
- Pure functions: parseWidgetTokens, validateWidgetProps, 토큰 생성기 (no React/Next 의존 — 단위 테스트 용이)

### 5.3 토큰 파싱 전략

`<rx-widget>`는 커스텀 엘리먼트이므로 React가 직접 파싱하지 않는다. 본문은 문자열로 다룬다:

```
[Body string] → parseWidgetTokens → [segment, token, segment, token, ...]
                                          ↓
              segment(static HTML) → sanitize → dangerouslySetInnerHTML (sanitized)
              token → getWidget(name) → validateWidgetProps → <WidgetComponent {...props} /> (격리 렌더)
                                          ↓
              interleave in document order → ReactNode[]
```

레거시 매핑: legacy `<img class="zbxe_widget_output" widget="content" list_count="5" />` → 신규 `<rx-widget name="content" data-list-count="5" />`. `widget=` 속성은 `name=`로, 임의 속성은 `data-*`로 정규화한다. data-* → camelCase 변환은 HTML data attribute 표준 매핑을 따른다.

### 5.4 Props 검증 + 강제 변환

HTML attribute는 항상 문자열이다. `content` 위젯의 `listCount`는 `z.coerce.number().min(1).max(30).default(5)`로 강제 변환 + 클램핑한다. `validateWidgetProps`는 `defaultProps` 병합 → `safeParse` 순서로, 검증 실패 시에도 throw하지 않고 `{ ok: false, error }`를 반환하여 degradation 레이어가 결정한다.

### 5.5 Graceful Degradation 매트릭스 (master plan headline 2 직접 반영)

| 상황 | 비관리자 | 관리자 |
|---|---|---|
| 미등록 위젯 | `<span data-widget-empty="X">` | `<span data-widget-error="X">Unknown widget: X` |
| props 검증 실패 (default 복구 가능) | default로 렌더 | default로 렌더 |
| props 검증 실패 (복구 불가) | `<span data-widget-empty="X">` | `<span data-widget-error="X" data-widget-reason="props">` |
| 위젯 render throw | per-widget 격리, 나머지 본문 계속 | 동일 + 콘솔/admin log 기록 |

`isAdmin`은 ctx로 주입된다 — 위젯 렌더러는 세션을 직접 조회하지 않는다 (REQ-WIDGET-024).

### 5.6 보안 (research §위험요인 + master plan Risk Register)

- **XSS**: 정적 HTML 세그먼트는 sanitize 후에만 `dangerouslySetInnerHTML`. widget props는 절대 raw HTML로 주입하지 않고 Zod 검증 후 React 프로퍼티로만 전달.
- **SSRF**: 토큰 파싱 시점에 네트워크 요청 없음. 데이터 조회는 위젯 컴포넌트 내부에서 검증된 props + request-scoped Prisma로만.
- **RCE**: dynamic import/require 금지. builtin 위젯은 정적 import + 명시적 registerWidget만.

### 5.7 빌트인 위젯 데이터 소스

- `login_info`: `packages/auth` 세션/사용자 컨텍스트. DB props 없음.
- `content`: 최근 글 조회. SPEC-DOCUMENT-001이 아직 없으므로 임시로 `packages/board`의 document accessor 사용. SPEC-DOCUMENT-001 착수 시 document 패키지로 refactor (알려진 임시 결합 — §6 Open Question).

### 5.8 SPEC-LAYOUT-001 / SPEC-PAGE-001 인터페이스

- SPEC-LAYOUT-001의 `LayoutContextValue`(site/domain/user/menu/extraVars)는 위젯 ctx의 상위 소스다. 위젯 ctx는 LayoutContext의 부분집합 + `isAdmin` + `prisma`로 구성한다.
- SPEC-PAGE-001은 page 본문을 `renderBodyWithWidgets(body, ctx)`로 통과시켜 토큰을 치환한다. 즉 본 SPEC은 SPEC-PAGE-001의 의존 대상이며 안정된 `renderBodyWithWidgets` 시그니처를 제공한다.

---

## 6. Risks & Mitigations

상세는 research.md 참조 (구현 시 보강). 핵심 5가지:

| Risk | Mitigation |
|---|---|
| widget token 파싱 시 XSS/SSRF (master plan Risk Register) | sanitizer를 RSC 단에서 강제 + widget props는 Zod strict validation. 파서는 네트워크 미수행. |
| content 위젯의 document 의존 (SPEC-DOCUMENT-001 미완) | Slice C에서 `packages/board` accessor로 임시 구현. SPEC-DOCUMENT-001 착수 시 refactor 의무 명시 (Open Question 1). |
| 미등록/오류 위젯이 페이지 전체를 깨뜨림 | per-widget 격리 + degradation 매트릭스. 항상 200 응답. |
| HTML attribute 문자열 → 타입 강제 변환 오류 | `z.coerce` + safeParse + default fallback. |
| SPEC-LAYOUT-001 / SPEC-PAGE-001과의 ctx 인터페이스 표류 | 위젯 ctx 모양을 본 SPEC에서 확정. LayoutContextValue의 부분집합으로 정의. |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. 해결 없이도 Slice A는 진행 가능.

1. **content 위젯의 document 데이터 소스**: SPEC-DOCUMENT-001이 Phase 2이므로 본 SPEC(Phase 1) 시점에는 독립 document 패키지가 없다. 권고: Slice C는 `packages/board`의 기존 document accessor로 최근 글을 조회하고, SPEC-DOCUMENT-001 착수 시 import 경로만 교체한다. (구현 detail — expert-frontend가 결정)
2. **login_info 폼의 client island 범위**: 로그인 폼 전체를 client component로 할지, form action(server action)만 쓰고 RSC로 둘지. 권고: 기존 `apps/web/app/(auth)/login`의 패턴을 그대로 따른다 (Slice C 작업 시 확인).
3. **sanitizer 라이브러리 선택**: DOMPurify(jsdom 필요) vs sanitize-html vs 기존 프로젝트 의존. 권고: 이미 프로젝트에 sanitizer가 있으면 재사용, 없으면 `sanitize-html`(서버 친화적). Slice B 작업 시 expert-backend가 결정.
4. **WidgetInstance와 본문 토큰의 관계**: WidgetInstance(DB 프리셋)는 admin이 props를 저장하는 용도이고, 실제 페이지 노출은 본문의 `<rx-widget>` 토큰이다. Phase 1에서 WidgetInstance는 "제너레이터의 저장된 프리셋"으로만 사용하고, 토큰이 instance id를 참조하는 형태(`<rx-widget instance-id="3" />`)는 백로그로 둔다. (Slice D 설계 시 확정 — 권고: 프리셋 전용)

위 4개 모두 SPEC 합의 사항이 아닌 구현 detail. 발견 즉시 코드에 반영.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **빌트인 위젯 4개**: counter_status, language_select, mcontent, pollWidget — master plan 결정에 따라 Phase 1은 login_info + content 2개만. 나머지는 백로그.
2. **위젯 스타일(widgetstyle) GUI 편집기**: `WidgetStyle` 모델 기반 컬러셋/제목/more링크 데코레이션 GUI — SPEC-THEME-POLISH-001 (Phase 4). 본 SPEC은 `WidgetStyle` 모델을 변경하지 않음.
3. **위젯 마켓플레이스 / 다운로드 / 외부 설치**: legacy `dispWidgetAdminDownloadedList`, 외부 위젯 zip 설치 — 백로그.
4. **위젯 캐싱**: legacy widget_cache 메커니즘 — 백로그 (master plan §6.7 SPEC-CACHE-001 후속).
5. **DB에 WidgetDefinition 저장**: 위젯 정의는 정적 registry 등록만. DB에는 WidgetInstance(props 프리셋)만 저장.
6. **동적 위젯 컴포넌트 로딩**: 운영자가 disk에 위젯 디렉토리를 떨어뜨려도 자동 등록되지 않음. registry는 정적 import만.
7. **임의 PHP/Smarty 위젯 코드 실행**: legacy `*.class.php` + skin `.html` 템플릿 실행 메커니즘 미지원. legacy 파일은 reference로만.
8. **`<rx-widget instance-id="N" />` 참조 토큰**: 본문 토큰이 WidgetInstance row를 id로 참조하는 형태 — 백로그. Phase 1은 inline props 토큰만.
9. **모바일 전용 위젯 (mcontent)**: master plan responsive-only 결정. 별도 모바일 위젯 미지원.
10. **위젯 권한 매트릭스**: 위젯별 노출 권한(member group별 visibility) — 백로그. Phase 1은 인증/관리자 분기만.
11. **i18n 다국어 위젯 메타**: displayName은 단일 한국어/영어 문자열. 다국어 displayName은 백로그.
12. **위젯 미리보기 (admin live preview)**: 제너레이터에서 실시간 렌더 미리보기 — 백로그. Phase 1은 토큰 문자열 생성까지만.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 30+ (Slice A: 10+, Slice B: 15+ including parser + degradation, Slice C: 12+ including 1 e2e, Slice D: 8+) — ADMIN-G 흡수분 +15 + 빌트인 위젯 +15
Estimated Slice Count: 4 (A: Registry/검증, B: 토큰 파서/파이프라인/degradation, C: 빌트인 위젯 2개, D: Admin UI/제너레이터)
Dependencies (upstream): SPEC-AUTH-001 ✅, SPEC-ADMIN-001 Slice G (registry 골조) ✅, SPEC-LAYOUT-001 (LayoutContextValue — 병행), packages/core/src/widgets/* (registry.ts, types.ts, index.ts)
Blocks (downstream): SPEC-PAGE-001 (Phase 1 — renderBodyWithWidgets 의존), SPEC-THEME-POLISH-001 (Phase 4 — widgetstyle GUI)
