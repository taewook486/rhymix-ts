---
id: SPEC-PAGE-001
title: Page Module — Phase 1 P0 Static Page Rendering
version: 1.0.0
status: completed
created: 2026-05-25
updated: 2026-06-27
author: MoAI manager-spec
priority: P0
phase: 1
parent: MASTER-PLAN-002
issue_number: TBD
related-research: SPEC-PAGE-001/research.md
language: ko
---

# SPEC-PAGE-001 — Page Module (Phase 1 / P0)

## HISTORY

- 2026-05-25 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.2의 직접 흡수. 레거시 `modules/page` 포팅. SPEC-LAYOUT-001(컨테이너)과 SPEC-WIDGET-001(토큰 렌더러) 사이에 위치하는 본문(content) 계층. 본 SPEC은 page 모듈의 본문 저장 + 모듈 등록 + 렌더 디스패치 + 편집 UI를 다루며, 본문에 포함된 `<rx-widget>` 토큰의 실제 치환은 SPEC-WIDGET-001에 위임한다(본 SPEC은 content를 그대로 통과시킨다).

---

## 1. Goal & Audience

### 1.1 Goal

**도메인 인덱스(홈) 또는 임의 mid에 정적 페이지 콘텐츠를 표시할 수 있게 한다.** 즉:

- 운영자가 page 타입 모듈 인스턴스를 만들고 본문(HTML/마크업)을 저장할 수 있다.
- 도메인의 `indexModuleInstanceId`가 page 인스턴스를 가리키면, 그 본문이 SPEC-LAYOUT-001의 default 레이아웃 안에서 렌더된다.
- page 본문 안의 `<rx-widget name="X" />` 토큰은 변형되지 않은 채 그대로 통과되어, SPEC-WIDGET-001의 파서가 이를 치환할 수 있는 안정된 출력 계약을 제공한다.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (Prisma 모델/필드 + page service)
- expert-backend agent — Slice B 구현 (page 모듈 등록 + 렌더 디스패치)
- expert-frontend agent — Slice C 구현 (본문 편집 UI + 렌더 컴포넌트)
- 운영자 — page 인스턴스를 만들고 도메인 인덱스로 지정한 뒤 홈에서 본문이 보임을 확인하는 최종 검증자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 위젯 토큰 파싱/치환 → SPEC-WIDGET-001 (본 SPEC은 content를 raw로 통과)
- 레이아웃 resolve/wrap → SPEC-LAYOUT-001 (본 SPEC은 `renderModuleWithLayout`의 소비자)
- 리치 WYSIWYG 에디터 (TinyMCE/CKEditor 통합) → 후속 SPEC. Phase 1은 textarea + raw HTML 저장만.
- 페이지 버전 관리 / 수정 이력 → 백로그
- 다국어 페이지 본문 (mcontent per language) → 백로그
- 외부 위젯 페이지 / mobile page skin → 백로그
- page 모듈 권한 매트릭스 (grant: modify) 풀 통합 → SPEC-ADMIN-EXTRAS-001 (Phase 5). Phase 1은 관리자 단순 판별만.

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Data Model 계층 (REQ-PAGE-001 ~ 009)

**REQ-PAGE-001 (Ubiquitous)**: The Page system SHALL persist page body content in a Prisma field `ModuleInstance.mcontent` of type `String?` (`@db.Text`), added via migration `page-mcontent`. The migration SHALL set all existing rows' `mcontent` to null (additive, non-destructive).

**REQ-PAGE-002 (Ubiquitous)**: The Page system SHALL store page-specific options in the existing `ModuleConfig.config Json` field under a namespaced key `page`, validated by a Zod schema `pageConfigSchema`. Phase 1 fields: `pageType: 'ARTICLE' | 'WIDGET' | 'CONTENT'` (default `'CONTENT'`), `mcontentFormat: 'HTML'` (Phase 1 fixed).

**REQ-PAGE-003 (Ubiquitous)**: The Page system SHALL NOT introduce a separate `Page` Prisma model in Phase 1. The page body lives on `ModuleInstance.mcontent`; page options live on `ModuleConfig.config.page`. (Master plan offered `Page` model OR `mcontent` field; this SPEC chooses `mcontent` for minimal schema surface.)

**REQ-PAGE-004 (Ubiquitous)**: The Page system SHALL expose a TypeScript interface `PageContent` at `packages/page/src/types.ts` containing: `instanceId: number`, `mcontent: string | null`, `pageType: PageType`, `mcontentFormat: 'HTML'`.

**REQ-PAGE-005 (Event-Driven)**: WHEN `loadPageContent(instanceId: number, prisma)` is called, the system SHALL return `PageContent` if the module instance exists and its `moduleCode === 'page'`, or `null` otherwise. The function SHALL NOT throw on missing rows.

**REQ-PAGE-006 (Event-Driven)**: WHEN `savePageContent({ instanceId, mcontent, pageType }, prisma)` is called by an authorized actor, the system SHALL upsert `ModuleInstance.mcontent` and `ModuleConfig.config.page` within a single transaction.

**REQ-PAGE-007 (Unwanted)**: The Page system SHALL NOT execute, compile, or interpret the page body as code. The body is stored as opaque markup and passed through to the render layer unchanged.

**REQ-PAGE-008 (Unwanted)**: The Page system SHALL NOT parse, resolve, or replace `<rx-widget>` tokens. Widget token handling is the exclusive responsibility of SPEC-WIDGET-001. The page body containing such tokens SHALL be returned verbatim.

**REQ-PAGE-009 (Ubiquitous)**: The `packages/page/` package SHALL declare a dependency on `@rhymix-ts/core` (module registry, layout pipeline types) and SHALL NOT import `@prisma/client` directly except via injected `prisma` props (consistent with `packages/board` convention).

### 2.2 Module Registration 계층 (REQ-PAGE-010 ~ 019)

**REQ-PAGE-010 (Ubiquitous)**: The Page system SHALL register a `ModuleDefinition` with `moduleCode = 'page'` in `packages/page/src/module.ts`, using the existing `registerModule` registry API in `packages/core/src/modules/registry.ts`.

**REQ-PAGE-011 (Ubiquitous)**: The page `ModuleDefinition.routes.index` handler SHALL be an async Server Component-compatible function matching the `ModuleRouteIndex` signature (`(props: ModuleRoutePageProps) => Promise<ReactNode>`).

**REQ-PAGE-012 (Event-Driven)**: WHEN the page `routes.index` handler is invoked, the system SHALL call `loadPageContent(instance.id, prisma)` and return a `<PageBody>` React node containing the raw `mcontent`. If `mcontent` is null, the handler SHALL return an empty-state node (`<PageBody>` with no content) and SHALL NOT throw.

**REQ-PAGE-013 (Ubiquitous)**: The page `ModuleDefinition` SHALL declare a config Zod schema (`pageConfigSchema`) so that admin instance creation/edit can validate page options through the existing module config plumbing.

### 2.3 Render Integration 계층 (REQ-PAGE-020 ~ 029)

**REQ-PAGE-020 (Event-Driven)**: WHEN a request reaches `apps/web/app/[mid]/page.tsx` and the resolved `ModuleInstance.moduleCode === 'page'`, the system SHALL invoke the page module's `routes.index`, obtain `moduleOutput`, and pass it to SPEC-LAYOUT-001's `renderModuleWithLayout({ instance, moduleOutput, prisma, request })`.

**REQ-PAGE-021 (Event-Driven)**: WHEN a request reaches the root path `/` and the current `Domain.indexModuleInstanceId` references a page-type module instance, the system SHALL render that page body inside the resolved layout using the same pipeline as `[mid]/page.tsx`.

**REQ-PAGE-022 (State-Driven)**: WHILE `Domain.indexModuleInstanceId` is null, the system SHALL preserve SPEC-LAYOUT-001's existing placeholder behavior ("No index module configured"). The Page system SHALL NOT alter that fallback.

**REQ-PAGE-023 (Ubiquitous)**: The `<PageBody>` component (`packages/page/src/components/PageBody.tsx`) SHALL render `mcontent` as raw HTML. To prevent XSS, the raw HTML SHALL be sanitized server-side before insertion (e.g. via a sanitizer such as DOMPurify/`sanitize-html` applied in the page service), preserving `<rx-widget ... />` tokens as inert custom-element markup for downstream widget processing.

**REQ-PAGE-024 (Ubiquitous)**: The sanitization allow-list SHALL preserve the `rx-widget` custom element and its `name` / attribute set so that SPEC-WIDGET-001 can later locate and replace them. Standard HTML formatting tags (headings, paragraphs, lists, links, images, tables, code) SHALL be permitted; script/style/event-handler attributes SHALL be stripped.

### 2.4 Editing UI 계층 (REQ-PAGE-030 ~ 039)

**REQ-PAGE-030 (Ubiquitous)**: The Page system SHALL provide an admin edit surface at `apps/web/app/(admin)/admin/pages/[instanceId]/edit/page.tsx` containing a `<textarea>` for raw HTML body editing and a save action wired to `savePageContent`.

**REQ-PAGE-031 (Event-Driven)**: WHEN an authorized administrator submits the page edit form, the system SHALL call `savePageContent` and, on success, redirect back to the edit view with a success indicator.

**REQ-PAGE-032 (Unwanted)**: The Page system SHALL NOT allow a non-administrator to invoke `savePageContent`. IF a non-administrator submits the form, THEN the system SHALL reject the request with a 403-equivalent error and SHALL NOT mutate `mcontent`.

**REQ-PAGE-033 (Optional)**: WHERE a WYSIWYG editor integration is later added, the textarea SHALL remain available as a fallback raw-HTML mode. Phase 1 ships only the textarea.

### 2.5 Quality 계층 (REQ-PAGE-050 ~ 059)

**REQ-PAGE-050 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-PAGE-051 (Ubiquitous)**: The render integration SHALL include at least one integration test: `mocked page ModuleInstance + mcontent containing an <rx-widget> token → page routes.index returns a node whose serialized HTML still contains the verbatim token` (proving pass-through per REQ-PAGE-008).

**REQ-PAGE-052 (Ubiquitous)**: The system SHALL include at least one e2e test (Playwright): install → seed default theme (SPEC-LAYOUT-001) → create page instance with body → assign as domain index → visit `/` → assert HTTP 200 + page body text appears inside `[data-rhymix-layout="default"]`.

**REQ-PAGE-053 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (page, core, db, apps/web).

**REQ-PAGE-054 (Ubiquitous)**: All new code SHALL respect language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-PAGE-055 (Unwanted)**: The Page system SHALL NOT introduce new global mutable state. Page content is loaded per-request; the module definition is registered once at module-load time (idempotent).

---

## 3. Slices

본 SPEC은 3개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Prisma 모델 + page service

종속성: SPEC-LAYOUT-001 Slice A (Prisma 마이그레이션 베이스라인) 권장 선행. 단, mcontent 추가는 독립적이므로 병행 가능.

작업 항목:

1. Prisma migration `page-mcontent`:
   - `ModuleInstance.mcontent String? @db.Text` 추가 (additive, 기존 row는 null)
2. `packages/page/` 신규 패키지 골조 (package.json, tsconfig, src/index.ts)
3. `packages/page/src/types.ts` 신규:
   - `PageContent` interface, `PageType` 타입
4. `packages/page/src/config.ts` 신규:
   - `pageConfigSchema` (Zod) + `parsePageConfig(raw): PageConfig`
5. `packages/page/src/service.ts` 신규:
   - `loadPageContent(instanceId, prisma): Promise<PageContent | null>`
   - `savePageContent(input, prisma): Promise<PageContent>` (트랜잭션 upsert)
   - `sanitizePageBody(raw: string): string` (rx-widget 보존 allow-list)
6. 단위 테스트: config, service(load/save/sanitize) (10+ tests)

검증:

- `pnpm prisma migrate dev --name page-mcontent` 성공
- `pnpm tsc --noEmit` 0 error
- `pnpm test packages/page` 통과

EARS coverage: REQ-PAGE-001~009, REQ-PAGE-023, REQ-PAGE-024

### Slice B: page 모듈 등록 + 렌더 디스패치

종속성: Slice A 완료 + SPEC-LAYOUT-001 Slice B (renderModuleWithLayout 존재)

작업 항목:

1. `packages/page/src/components/PageBody.tsx` 신규 (RSC, sanitized raw HTML 렌더)
2. `packages/page/src/module.ts` 신규:
   - `pageModuleDefinition: ModuleDefinition` (`moduleCode='page'`, `routes.index`, `configSchema=pageConfigSchema`)
   - `registerModule(pageModuleDefinition)` 호출 (idempotent)
3. `apps/web` 모듈 부트스트랩에 page 모듈 등록 import 추가 (board와 동일 패턴)
4. `apps/web/app/[mid]/page.tsx` 검증/보강:
   - 기존 디스패치 로직이 moduleCode='page'를 자연스럽게 처리하는지 확인. renderModuleWithLayout 경유 확인.
5. `apps/web/app/page.tsx`(`/`) 검증/보강:
   - indexModuleInstanceId가 page 인스턴스를 가리킬 때 본문 렌더 확인
6. integration test: mocked page instance + rx-widget 토큰 포함 본문 → index가 verbatim 토큰 포함 노드 반환 (8+ tests)

검증:

- `pnpm test packages/page` 통과
- pass-through 계약(REQ-PAGE-008/051) 테스트 cover

EARS coverage: REQ-PAGE-010~013, REQ-PAGE-020~022, REQ-PAGE-055

### Slice C: 본문 편집 UI + e2e

종속성: Slice B 완료

작업 항목:

1. `apps/web/app/(admin)/admin/pages/[instanceId]/edit/page.tsx` 신규 (textarea 편집 폼)
2. 저장 액션 (Server Action 또는 route handler) → `savePageContent` 호출 + 관리자 권한 가드
3. 비관리자 거부 경로 (403-equivalent) 구현
4. e2e 테스트 1개 (Playwright): 설치 → 시드 default theme → page 인스턴스 생성 + 본문 저장 → 도메인 인덱스 지정 → `/` 방문 → 본문 텍스트가 default 레이아웃 안에 존재 확인
5. 7+ 추가 단위 테스트 (편집 폼 렌더, 권한 가드, 저장 후 redirect)

검증:

- `pnpm dev` 환경에서 admin/pages/{id}/edit 접근 → 본문 저장 → `/` 에서 반영 확인
- e2e 테스트 통과
- 전체 `pnpm test` 통과

EARS coverage: REQ-PAGE-030~033, REQ-PAGE-050~054

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 4개:

1. **AC-PAGE-A1**: GIVEN 빈 DB + Slice A 적용 완료, WHEN `pnpm prisma migrate dev` 실행, THEN `module_instances` 테이블에 `mcontent` 컬럼(text, nullable)이 추가되고 기존 row의 mcontent는 null이다.
2. **AC-PAGE-B1**: GIVEN 모의 page ModuleInstance + `mcontent = '<h1>Hi</h1><rx-widget name="login_info" />'`, WHEN page 모듈의 `routes.index`가 호출되면, THEN 반환 노드의 직렬화 HTML에 `<rx-widget name="login_info" />` 토큰이 변형되지 않은 채 그대로 포함된다 (pass-through 계약).
3. **AC-PAGE-C1**: GIVEN 클린 DB + 시드 default theme + page 인스턴스(본문 저장됨)가 도메인 인덱스로 지정됨, WHEN 사용자가 `/`를 방문, THEN HTTP 200 + `[data-rhymix-layout="default"]` 안에 page 본문 텍스트가 렌더된다.
4. **AC-PAGE-C2**: GIVEN 비관리자 세션, WHEN `savePageContent`를 트리거하는 편집 폼을 제출, THEN 403-equivalent 오류가 반환되고 `mcontent`는 변경되지 않는다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/page/`** 독립 패키지에 둔다 (MASTER-PLAN-002 Section 1 + 9.1-4 결정: `packages/page` 신규 추가 승인). 패키지는 `@rhymix-ts/core`(모듈 레지스트리 + layout pipeline 타입)에 의존하며, `packages/board`와 동일하게 `prisma`를 props로 주입받는다(직접 import 금지).

### 5.2 데이터 모델 결정 (mcontent vs Page 모델)

MASTER-PLAN-002는 `Page` 모델 또는 `ModuleInstance.mcontent` 둘 중 하나를 제시했다. 본 SPEC은 **`ModuleInstance.mcontent`** 를 채택한다. 근거:

- 레거시 `modules/page`는 `mcontent` (모바일 콘텐츠)와 `content`를 ModuleInfo(=모듈 인스턴스 설정)에 직접 보관했다 — 별도 테이블이 아님.
- page 인스턴스는 1:1로 본문 1개를 가지므로 별도 테이블의 정규화 이득이 없다.
- 최소 스키마 변경(컬럼 1개 추가)으로 충돌 위험 최소화.

(WIDGET/CONTENT/ARTICLE 세 pageType 중 ARTICLE은 레거시에서 document를 본문으로 쓰는 모드인데, document 도메인은 Phase 2이므로 Phase 1은 CONTENT/WIDGET — 즉 mcontent 직접 본문 — 만 구현한다.)

### 5.3 RSC vs Client Component

- **Server-side**: service.ts, module.ts, PageBody(RSC), routes.index, apps/web 라우트, 편집 폼의 저장 액션
- **Client-side**: 편집 textarea 폼 (`'use client'`) — 입력 상태 관리 필요
- Pure functions: config.ts(zod), sanitizePageBody (no React 의존)

### 5.4 위젯 토큰 Pass-Through 계약 (SPEC-WIDGET-001 경계)

본 SPEC의 핵심 경계 규칙: **page는 `<rx-widget>` 토큰을 절대 해석하지 않는다.** sanitizePageBody는 `rx-widget` 커스텀 엘리먼트를 allow-list에 포함시켜 살려두기만 한다. 실제 토큰 → React 컴포넌트 치환은 SPEC-WIDGET-001의 파서가 layout/page 출력의 후처리 단계에서 수행한다.

Phase 1 동작(SPEC-WIDGET-001 미완 시): 토큰은 inert 커스텀 엘리먼트로 DOM에 남아 시각적으로는 아무것도 렌더하지 않는다. SPEC-WIDGET-001 완료 후 동일 본문이 자동으로 위젯으로 치환된다 — page 본문 저장 데이터는 불변.

### 5.5 XSS Sanitization

page 본문은 운영자가 입력하는 raw HTML이다. 신뢰 경계가 "관리자"이긴 하나, 다중 관리자 / 권한 위임 시나리오를 대비해 서버 측 sanitize를 강제한다(REQ-PAGE-023/024). sanitizer는 script/style/이벤트 핸들러 속성을 제거하되 `rx-widget`은 보존한다. (구현 라이브러리 선택 — `sanitize-html` 또는 isomorphic-dompurify — 은 Slice A 구현 시 expert-backend 결정; research.md 후속 확인.)

### 5.6 모듈 등록 메커니즘

page 모듈은 `packages/core/src/modules/registry.ts`의 `registerModule(definition)`를 통해 등록된다 (board와 동일 패턴). `apps/web`의 모듈 부트스트랩 지점(board를 import하는 곳)에 `@rhymix-ts/page`의 `registerPageModule()` 호출을 추가한다.

### 5.7 ID 타입 주의

`ModuleInstance.id`는 현재 schema.prisma에서 `Int @default(autoincrement())`이다(cuid 아님). 따라서 `loadPageContent(instanceId: number, ...)`는 number를 받는다. (SPEC-LAYOUT-001은 Layout.id가 cuid string인 별개 모델을 다룬다 — 혼동 주의.)

---

## 6. Risks & Mitigations

상세는 research.md(구현 시 작성) 참조. 핵심 5가지:

| Risk | Mitigation |
|---|---|
| rx-widget 토큰이 sanitize 과정에서 제거됨 | sanitizer allow-list에 `rx-widget` 명시. REQ-PAGE-024 + 통합 테스트(REQ-PAGE-051)로 가드. |
| raw HTML XSS | 서버 측 sanitize 강제(REQ-PAGE-023). script/이벤트 핸들러 strip. |
| SPEC-WIDGET-001 미완 시 토큰이 빈 화면 | Phase 1 동작 정의: inert 엘리먼트로 남김. 본문 데이터 불변이므로 widget 완료 시 자동 동작. |
| ModuleInstance.id Int vs Layout cuid 혼동 | service 시그니처에 number 명시. SPEC-LAYOUT-001과 경계 분리 문서화. |
| ARTICLE pageType(document 의존) 구현 압박 | Phase 1은 CONTENT/WIDGET만. ARTICLE은 SPEC-DOCUMENT-001(Phase 2) 이후 후속 SPEC. |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. 해결 없이도 Slice A는 진행 가능.

1. **Sanitizer 라이브러리 선택**: `sanitize-html` (node 전용) vs `isomorphic-dompurify` (RSC 호환). Slice A 구현 시 expert-backend 결정. 권고: RSC 환경에서 검증된 `isomorphic-dompurify`.
2. **편집 권한 판별 기준**: SPEC-AUTH-001 RBAC의 어떤 권한(admin group vs page grant `modify`)을 쓸지. Phase 1 권고: admin group 단순 판별(REQ-PAGE-032). 세분화는 Phase 5 SPEC-ADMIN-EXTRAS-001.
3. **page 인스턴스 생성 진입점**: 기존 admin/modules 인스턴스 생성 UI(ADMIN-001)가 moduleCode='page'를 지원하는지. Slice C 구현 시 확인 — 미지원이면 최소 생성 경로 추가.

위 3개 모두 SPEC 합의 사항이 아닌 구현 detail. expert-backend/frontend가 발견 즉시 코드에 반영.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **위젯 토큰 파서/치환**: `<rx-widget name="X" />` → React 컴포넌트 치환 — SPEC-WIDGET-001 (Phase 1 병행). 본 SPEC은 토큰을 raw로 통과만 한다.
2. **레이아웃 resolve/wrap**: layout 결정 + LayoutProvider 래핑 — SPEC-LAYOUT-001. 본 SPEC은 `renderModuleWithLayout`의 소비자.
3. **리치 WYSIWYG 에디터**: TinyMCE/CKEditor/ProseMirror 통합 — 후속 SPEC. Phase 1은 textarea raw HTML만.
4. **ARTICLE pageType (document 본문 모드)**: page가 document를 본문으로 참조하는 레거시 모드 — SPEC-DOCUMENT-001(Phase 2) 이후 후속 SPEC.
5. **페이지 버전 관리 / 수정 이력**: mcontent 변경 이력 추적 — 백로그.
6. **다국어 페이지 본문**: 언어별 mcontent — 백로그.
7. **모바일 전용 page skin (m.skins)**: 레거시 modules/page/m.skins — responsive-only 정책(master plan)에 따라 미지원.
8. **page grant 권한 매트릭스 풀 통합**: grant `modify` × member group 매트릭스 — Phase 1은 admin group 단순 판별. 풀 통합은 SPEC-ADMIN-EXTRAS-001(Phase 5).
9. **별도 Page Prisma 모델**: 본 SPEC은 `ModuleInstance.mcontent`만 사용. 별도 테이블 미생성.
10. **page export/import**: 페이지 JSON export/import — SPEC-ADMIN-EXTRAS-001(Phase 5).
11. **위젯 캐시 / widget_cache 무효화**: 레거시 procPageAdminRemoveWidgetCache — 캐싱은 백로그(SPEC-INFRA-CACHE-001).
12. **page 스킨 시스템**: 레거시 page skins(tpl) — Phase 1 default 레이아웃 안에 직접 렌더. 별도 skin은 백로그.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 25+ (Slice A: 10+, Slice B: 8+, Slice C: 7+ including 1 e2e)
Estimated Slice Count: 3 (A: Prisma/service, B: 모듈 등록/렌더 디스패치, C: 편집 UI + e2e)
Dependencies (upstream): SPEC-LAYOUT-001 (renderModuleWithLayout + default theme), SPEC-ADMIN-001 Slice A ✅ (module registry), SPEC-AUTH-001 ✅ (admin 권한 판별)
Soft dependency: SPEC-WIDGET-001 (Phase 1, 병행 — 토큰 치환은 widget 완료 후 자동 동작)
Blocks (downstream): 없음 (Phase 1 사용자 가시성 트리오의 본문 계층)
