---
id: SPEC-THEME-POLISH-001
title: Theme Polish — Phase 4 Admin Theme UI + Dark Mode
version: 1.0.0
status: completed
created: 2026-05-30
updated: 2026-06-27
author: MoAI manager-spec
priority: P1
phase: 4
parent: MASTER-PLAN-002
depends-on: [SPEC-LAYOUT-001, SPEC-ADMIN-001]
absorbs: [SPEC-THEME-001 Slice E, SPEC-THEME-001 Slice F, REMEDIATION-PLAN-001 THEME Slice E, REMEDIATION-PLAN-001 THEME Slice F]
issue_number: TBD
related-research: SPEC-THEME-POLISH-001/research.md
language: ko
---

# SPEC-THEME-POLISH-001 — Theme Polish (Phase 4 / P1)

## HISTORY

- 2026-05-30 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.11의 직접 흡수. SPEC-LAYOUT-001 (Slice A~D, 완료 상태) 위에 빌드되는 Phase 4 P1 SPEC. SPEC-LAYOUT-001 작성 시 Phase 4로 명시적으로 deferred된 두 슬라이스(Admin UI + Dark Mode)를 본 SPEC이 흡수한다. 또한 REMEDIATION-PLAN-001의 THEME Slice E/F 항목을 본 SPEC이 supersede한다. SPEC-ADMIN-001의 Admin Shell(layout/sidebar/topbar)과 protectedAdminProcedure 패턴을 재사용하며, x-site-id 라우팅(SPEC-ADMIN-001) 위에 per-domain assignment를 결합한다.

---

## 1. Goal & Audience

### 1.1 Goal

**Phase 4 P1 테마 시스템의 운영자 가시성과 사용자 경험 마무리.** 즉:

- 운영자가 admin UI(`/admin/site/design`)를 통해 Theme / Layout / Skin을 선택·할당하고 token 값을 GUI로 편집할 수 있게 한다. DB seed 단계로만 가능했던 작업을 admin 워크플로우로 전환한다.
- 사용자가 다크모드를 토글할 수 있게 하며, 토글 결과가 `<html class="dark">`로 반영되고 새 페이지 진입 시에도 동일 preference가 유지되도록 한다.
- Token 변경이 rebuild 없이 다음 HTTP 응답에 반영되는 hot-reload 메커니즘을 확립한다.

### 1.2 Audience

- expert-frontend agent — Slice A 구현 (3-pane editor, auto-form, dark mode toggle 클라이언트)
- expert-backend agent — Slice A의 Server Actions / tRPC 라우터 구현 (theme/layout/skin assignment, token 저장)
- 운영자 — `/admin/site/design`에서 site/domain/module-instance 범위로 테마를 할당하는 최종 사용자
- 일반 사용자 — 다크모드 토글을 사용하는 최종 사용자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 새 테마 디렉토리 업로드 UI (zip/git submodule 형식) — Open Question 1 참조, 별도 SPEC
- per-user 다크모드 preference DB 저장 — Open Question 2 참조 (Phase 1 본 SPEC은 localStorage만)
- 테마 hot-swap (rebuild 없이 layout 컴포넌트 교체) — 백로그
- 테마 marketplace / 공유 기능 — 백로그
- 모바일 전용 layout 편집 (m.layouts) — SPEC-LAYOUT-001 결정에 따라 responsive-only 유지
- 위젯 스타일 편집 UI — SPEC-WIDGET-001 후속 작업
- xedition 레이아웃 GUI — 백로그
- AI를 통한 token 추천 — 백로그

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Admin UI 진입점 (REQ-THEME-POLISH-001 ~ 009)

**REQ-THEME-POLISH-001 (Ubiquitous)**: The system SHALL expose an admin page at the route `apps/web/app/admin/site/design/page.tsx` that renders a 3-pane editor. The page SHALL be accessible only via SPEC-ADMIN-001의 `AdminLayout` (관리자 권한 + 2FA 게이트 통과 후).

**REQ-THEME-POLISH-002 (Ubiquitous)**: The admin design page SHALL render three panes side-by-side on viewports ≥ 1280px and stack vertically on smaller viewports:

- **Left pane (Selector)**: Theme / Layout / Skin 리스트와 활성 표시
- **Center pane (Preview)**: 현재 사이트/도메인의 라이브 미리보기 iframe
- **Right pane (Token editor)**: Zod schema 기반 auto-form

**REQ-THEME-POLISH-003 (Event-Driven)**: WHEN 관리자가 Left pane에서 Theme/Layout/Skin 항목을 클릭하면, the system SHALL emit a selection event that updates Right pane's auto-form 대상과 Center pane's preview URL parameter 모두를 동기화한다.

**REQ-THEME-POLISH-004 (Ubiquitous)**: The Left pane SHALL display:

- Theme 목록 (DB의 모든 `Theme` row, 활성 default theme에 `data-active="true"` 표시)
- Layout 목록 (선택된 theme의 `Theme.layouts[]`, 도메인 default 표시)
- Skin 목록 (선택된 layout의 `Theme.skins[layoutName]`, module-instance override 표시)

**REQ-THEME-POLISH-005 (Ubiquitous)**: The Center pane SHALL load a preview iframe whose `src` is the current domain root URL with query parameters `?preview-theme={themeName}&preview-tokens={token-cache-key}`. The preview SHALL render the same site with the staged (unsaved) theme/token state.

**REQ-THEME-POLISH-006 (Event-Driven)**: WHEN 관리자가 Right pane의 token 값을 변경하면, the system SHALL stage the change in client-side memory and refresh the Center pane's iframe with a new `preview-tokens` cache key within 500ms (debounced).

**REQ-THEME-POLISH-007 (State-Driven)**: WHILE staged token changes exist (unsaved), the system SHALL display "변경사항 있음" 배지와 "Save" / "Discard" 버튼을 Right pane 상단에 표시한다.

**REQ-THEME-POLISH-008 (Ubiquitous)**: The admin design page SHALL respect SPEC-ADMIN-001의 x-site-id routing. 관리자가 `?site-id={N}` 쿼리 파라미터로 진입하면, 모든 assignment 조회/저장 SHALL be scoped to that site.

**REQ-THEME-POLISH-009 (Unwanted)**: The admin design page SHALL NOT expose any UI for uploading new theme directories. Theme 추가는 disk + seed script로만 가능 (Open Question 1).

### 2.2 Theme/Layout/Skin Assignment (REQ-THEME-POLISH-010 ~ 019)

**REQ-THEME-POLISH-010 (Ubiquitous)**: The system SHALL preserve SPEC-LAYOUT-001 REQ-LAYOUT-010의 resolution priority order (`module_instance → domain → site → fallback`). 본 SPEC의 UI는 동일 우선순위를 시각적으로 표시하고, 동일 순서로 저장 대상 scope를 결정한다.

**REQ-THEME-POLISH-011 (Event-Driven)**: WHEN 관리자가 "Layout 할당" 버튼을 누르면, the system SHALL display an AskScope dialog with 3 options:

1. **Module instance 범위** (현재 선택된 mid에만 적용)
2. **Domain 범위** (현재 선택된 domain에 적용)
3. **Site 범위** (현재 site에 default로 적용)

**REQ-THEME-POLISH-012 (Event-Driven)**: WHEN 관리자가 layout assignment를 저장하면, the system SHALL invoke a Server Action `assignLayout({ scope, refId, layoutId, siteId })` which:

1. Zod schema로 입력 검증 (invalid → 400 응답)
2. SPEC-LAYOUT-001의 `ThemeAssignment` 또는 `Domain.defaultLayoutId` / `ModuleInstance.layoutId` 컬럼 upsert
3. SPEC-ADMIN-001의 admin log에 기록 (action="theme.layout.assign")
4. `revalidatePath("/admin/site/design")` 호출

**REQ-THEME-POLISH-013 (Event-Driven)**: WHEN 관리자가 skin assignment를 저장하면, the system SHALL invoke `assignSkin({ moduleInstanceId, skinName })` which updates `ModuleInstance.skin` 또는 ThemeAssignment(scope=MODULE_INSTANCE)를 upsert한다.

**REQ-THEME-POLISH-014 (Event-Driven)**: WHEN 관리자가 theme activation을 저장하면, the system SHALL invoke `assignTheme({ scope: 'site' | 'domain', refId, themeId })` which sets the active theme for the scope.

**REQ-THEME-POLISH-015 (Unwanted)**: The system SHALL NOT allow assignment of theme/layout/skin without admin authorization. All Server Actions SHALL revalidate the session via SPEC-ADMIN-001의 `isAdminSession(session)` 헬퍼.

**REQ-THEME-POLISH-016 (State-Driven)**: WHILE 어떤 assignment Server Action이 진행 중이면, the system SHALL disable the corresponding UI 버튼과 표시 "저장 중..." 텍스트.

**REQ-THEME-POLISH-017 (Event-Driven)**: WHEN assignment Server Action이 실패하면, the system SHALL display 사용자에게 에러 메시지 토스트 (SPEC-ADMIN-001 `Toaster` 재사용) 및 staged 상태 유지.

### 2.3 Token Editor (Zod → Auto-Form) (REQ-THEME-POLISH-020 ~ 029)

**REQ-THEME-POLISH-020 (Ubiquitous)**: The system SHALL provide a token editor component at `apps/web/components/admin/site-design/TokenEditor.tsx` that reads `themeTokensSchema` (from `packages/core/src/theme/types.ts`) and 자동으로 form fields를 생성한다.

**REQ-THEME-POLISH-021 (Event-Driven)**: WHEN the token editor 마운트되면, the system SHALL introspect the Zod schema and render form fields per Zod type:

- `z.string()` for color values → `<input type="color">` (color picker)
- `z.string()` for font family values → `<input type="text">` (free text)
- `z.number()` → `<input type="number">` (with min/max if defined)
- `z.object()` (e.g., `colors`, `typography`) → grouped fieldset

**REQ-THEME-POLISH-022 (Event-Driven)**: WHEN 관리자가 form field 값을 변경하면, the system SHALL run `safeParse` against the corresponding sub-schema. Invalid values SHALL display inline 에러 메시지 ("must be a valid hex color" 등) 하단에.

**REQ-THEME-POLISH-023 (Ubiquitous)**: The token editor SHALL be implemented with `react-hook-form` (또는 동등 form library) 및 Zod resolver를 통한 통합. Form state는 client-side에 staged된다.

**REQ-THEME-POLISH-024 (Event-Driven)**: WHEN 관리자가 "Save tokens" 버튼을 누르면, the system SHALL invoke Server Action `saveTokens({ scope, refId, tokens, siteId })` which:

1. Zod `themeTokensSchema.safeParse(tokens)` 실행 (invalid → 400 응답)
2. `ThemeAssignment.tokensOverride` JSON 컬럼에 저장 (REQ-LAYOUT-014 우선 충족)
3. SPEC-ADMIN-001 admin log에 기록 (action="theme.tokens.save", before/after diff 포함)
4. `revalidatePath` 호출

**REQ-THEME-POLISH-025 (Event-Driven)**: WHEN 저장 성공 후 다음 HTTP 요청이 들어오면, the system SHALL serve the new token values without requiring a rebuild. CSS variables (`--rx-*`)는 SPEC-LAYOUT-001 `LayoutProvider`가 server-rendered `<style>` 태그에 inject한다 (REQ-LAYOUT-014 의 ThemeAssignment.tokensOverride 활용).

**REQ-THEME-POLISH-026 (Optional)**: WHERE the token editor has a "Reset to theme default" 버튼, the system SHALL clear the `tokensOverride` JSON and let theme manifest의 default 값으로 fall back.

**REQ-THEME-POLISH-027 (Unwanted)**: The system SHALL NOT persist token values that fail Zod validation. Validation 실패 시 staged 상태는 client에 유지되지만 server 저장은 수행하지 않는다.

**REQ-THEME-POLISH-028 (Ubiquitous)**: The token editor SHALL include a "Dark mode tab" 별도로 두어 `themeTokens.dark.colors` 필드 편집을 분리한다. light mode와 dark mode token이 동일 form 안에서 충돌하지 않도록 한다.

### 2.4 Dark Mode (REQ-THEME-POLISH-030 ~ 049)

**REQ-THEME-POLISH-030 (Ubiquitous)**: The system SHALL expose a client component `apps/web/components/theme/DarkModeToggle.tsx` (`'use client'`) that toggles the `dark` class on the `<html>` element.

**REQ-THEME-POLISH-031 (Event-Driven)**: WHEN 사용자가 DarkModeToggle을 누르면, the system SHALL:

1. Toggle `<html>` element's `class` attribute between `dark` and (none) — 무한 토글 가능
2. `localStorage.setItem('rx-color-scheme', 'dark' | 'light')`로 preference 저장
3. 상태를 React Context (`ColorSchemeContext`) 안에서 broadcast

**REQ-THEME-POLISH-032 (Event-Driven)**: WHEN 사용자가 새 페이지에 진입(initial render)하면, the system SHALL read `localStorage.getItem('rx-color-scheme')` 와 `prefers-color-scheme` media query를 조합하여 초기 다크 모드 상태를 결정:

- `localStorage` 값이 있으면 그 값 사용
- 없으면 `prefers-color-scheme: dark` 결과를 사용
- 둘 다 결정되지 않으면 light mode

**REQ-THEME-POLISH-033 (Ubiquitous)**: The system SHALL prevent FOIT (Flash of Incorrect Theme) by injecting an inline script in `apps/web/app/layout.tsx`의 `<head>` 안에 `<script>` 태그로 다음 로직을 SSR에 실행시킨다:

```
(function() {
  try {
    var pref = localStorage.getItem('rx-color-scheme');
    var dark = pref === 'dark' || (pref === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})()
```

이 inline script는 React hydration 전에 실행되어 FOIT를 방지한다.

**REQ-THEME-POLISH-034 (Ubiquitous)**: The system SHALL maintain SSR safety by:

- `<html>` element에 `suppressHydrationWarning` prop 유지 (SPEC-LAYOUT-001과 동일)
- Initial server render는 항상 light mode를 가정하고, inline script가 client에서 `dark` class를 toggle하도록 설계
- React Context 초기값은 `'light'`로 두고, `useEffect`에서 client-side localStorage를 읽어 sync

**REQ-THEME-POLISH-035 (State-Driven)**: WHILE 현재 활성 테마가 `supportsDarkMode === false` (테마 manifest 기준) 이면, the system SHALL disable the DarkModeToggle 버튼 및 hover tooltip ("이 테마는 다크모드를 지원하지 않습니다") 표시.

**REQ-THEME-POLISH-036 (Optional)**: WHERE 운영자가 token editor의 "Dark mode tab"에서 dark token을 정의했으면, the system SHALL generate `.dark { --rx-color-*: ... }` CSS block via `generateDarkCssVariables()` (existing `packages/core/src/theme/token-css.ts`) and inject into `<style>` 태그.

**REQ-THEME-POLISH-037 (Event-Driven)**: WHEN 운영자가 `themes/default/theme.json`의 `supportsDarkMode: true` 으로 변경하고 seed를 재실행하면, the system SHALL enable the DarkModeToggle 전역적으로.

**REQ-THEME-POLISH-038 (Ubiquitous)**: The DarkModeToggle SHALL be rendered in `apps/web/components/layout/GlobalHeader.tsx` (existing component from SPEC-LAYOUT-001). 배치 위치는 헤더 우측, 사용자 메뉴 옆.

**REQ-THEME-POLISH-039 (Unwanted)**: The system SHALL NOT save dark mode preference to the user's DB record in this SPEC. Per-user persistence는 Open Question 2 참조 — 별도 SPEC.

### 2.5 Hot-Reload Mechanism (REQ-THEME-POLISH-050 ~ 059)

**REQ-THEME-POLISH-050 (Ubiquitous)**: The system SHALL implement runtime CSS variable update without rebuild by:

- Token 값은 `ThemeAssignment.tokensOverride` (JSON 컬럼)에 저장
- SPEC-LAYOUT-001의 `renderModuleWithLayout` pipeline이 매 요청마다 ThemeAssignment를 조회하고 override token을 LayoutContext로 전달
- `LayoutProvider`가 server-rendered `<style>` 태그를 page header에 inject하여 `--rx-*` CSS variables를 정의
- 새 요청 시 새 token이 반영됨 (Next.js dynamic rendering)

**REQ-THEME-POLISH-051 (Event-Driven)**: WHEN admin이 token을 저장하고 다음 HTTP 요청이 들어오면, the system SHALL serve the new `--rx-*` CSS variables in the response without requiring `pnpm build` 또는 server restart.

**REQ-THEME-POLISH-052 (Ubiquitous)**: The hot-reload mechanism SHALL respect SPEC-LAYOUT-001 REQ-LAYOUT-014의 ThemeAssignment.tokensOverride 활용 패턴. 본 SPEC은 해당 REQ를 "optional"에서 "active" 로 격상시킨다.

**REQ-THEME-POLISH-053 (Unwanted)**: The system SHALL NOT modify `themes/default/theme.json` (disk file) when admin saves tokens. 모든 token override는 DB에만 저장되며, theme.json은 baseline default로 보호된다.

**REQ-THEME-POLISH-054 (Optional)**: WHERE Next.js의 `dynamic = 'force-dynamic'` 설정이 admin layout에 적용되어 있으면, the system SHALL reuse the existing setting (SPEC-ADMIN-001 admin layout 패턴). 사용자 페이지는 ISR 또는 cache invalidation 전략을 적용한다 (`revalidatePath` 호출 시).

### 2.6 Quality (REQ-THEME-POLISH-060 ~ 069)

**REQ-THEME-POLISH-060 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 85%.

**REQ-THEME-POLISH-061 (Ubiquitous)**: The DarkModeToggle SHALL have a client component test that verifies:

- Click → `<html class="dark">` toggle
- localStorage value 저장 검증
- `supportsDarkMode === false` 일 때 disabled 검증

**REQ-THEME-POLISH-062 (Ubiquitous)**: The token editor SHALL have a component test that verifies:

- Zod schema → form field 자동 생성
- Invalid 값 입력 시 inline 에러 표시
- "Save tokens" 클릭 시 Server Action 호출

**REQ-THEME-POLISH-063 (Ubiquitous)**: The admin design page SHALL have at least one e2e test (Playwright) that performs: admin 로그인 → `/admin/site/design` 진입 → token 변경 → Save → 사용자 페이지에서 새 token 반영 확인.

**REQ-THEME-POLISH-064 (Ubiquitous)**: The dark mode SHALL have at least one e2e test that verifies:

- Initial render에서 light mode
- Toggle 클릭 → `<html class="dark">` 적용
- 새 페이지 navigation 후에도 dark mode 유지
- `localStorage.clear()` 후 새 세션에서 `prefers-color-scheme` follow

**REQ-THEME-POLISH-065 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (apps/web, packages/core, themes/default).

**REQ-THEME-POLISH-066 (Ubiquitous)**: All new code SHALL respect the language settings: code comments in Korean (`.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-THEME-POLISH-067 (Unwanted)**: The system SHALL NOT introduce any global mutable state for dark mode. ColorSchemeContext는 per-request via React Context이며 localStorage 외에 어떠한 cross-request 상태도 갖지 않는다.

---

## 3. Slices

본 SPEC은 2개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Admin Theme UI

종속성: SPEC-LAYOUT-001 완료 (Slice A~D), SPEC-ADMIN-001 완료

작업 항목:

1. `apps/web/app/admin/site/design/page.tsx` 신규 — 3-pane editor entry (Server Component)
2. `apps/web/components/admin/site-design/SelectorPane.tsx` 신규 — Left pane (theme/layout/skin 리스트, client component for selection state)
3. `apps/web/components/admin/site-design/PreviewPane.tsx` 신규 — Center pane (iframe with preview-tokens cache key)
4. `apps/web/components/admin/site-design/TokenEditor.tsx` 신규 — Right pane (Zod schema → react-hook-form auto-form)
5. `apps/web/components/admin/site-design/AssignScopeDialog.tsx` 신규 — Module/Domain/Site scope 선택 dialog
6. `apps/web/app/admin/site/design/actions.ts` 신규 — Server Actions: `assignTheme`, `assignLayout`, `assignSkin`, `saveTokens`
7. `apps/web/lib/theme/admin-helpers.ts` 신규 — theme/layout/skin 조회 헬퍼 (Server)
8. `apps/web/lib/theme/token-form-builder.ts` 신규 — Zod schema → form field list 변환 유틸
9. `apps/web/components/admin/AdminSidebar.tsx` 수정 — `/admin/site/design` 메뉴 항목 추가
10. 단위 테스트: token-form-builder, admin-helpers, actions (각 Server Action) (~14 tests)
11. 컴포넌트 테스트: TokenEditor, AssignScopeDialog, SelectorPane (~6 tests)
12. e2e 테스트 1개: admin → site/design → token 변경 → Save → 사용자 페이지 반영 확인

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test apps/web` 통과
- admin 로그인 후 `/admin/site/design` 진입 → 3-pane editor 표시
- token 변경 → Save → `revalidatePath` 후 사용자 페이지에서 새 token 반영

EARS coverage: REQ-THEME-POLISH-001~029, REQ-THEME-POLISH-050~053

테스트 추정: ~20 tests

### Slice B: Dark Mode

종속성: Slice A의 TokenEditor (Dark mode tab 통합) — 단, dark mode toggle 자체는 Slice A와 병렬 진행 가능.

작업 항목:

1. `apps/web/components/theme/DarkModeToggle.tsx` 신규 — client component (`'use client'`)
2. `apps/web/components/theme/ColorSchemeProvider.tsx` 신규 — React Context provider
3. `apps/web/lib/theme/color-scheme-script.ts` 신규 — FOIT prevention inline script template
4. `apps/web/app/layout.tsx` 수정 — `<head>`에 inline script 주입, `<body>`에 `<ColorSchemeProvider>` 래핑
5. `apps/web/components/layout/GlobalHeader.tsx` 수정 — DarkModeToggle 마운트
6. `themes/default/theme.json` 수정 — `supportsDarkMode: true` 로 변경 + `tokensSchema.dark.colors` 정의
7. `themes/default/install.ts` 수정 — dark token seed
8. 단위 테스트: ColorSchemeProvider, color-scheme-script (~4 tests)
9. 컴포넌트 테스트: DarkModeToggle (~3 tests)
10. e2e 테스트 1개: 다크모드 토글 → navigation → 유지 → localStorage.clear → prefers-color-scheme follow

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test apps/web` 통과
- 사용자 화면에서 toggle → `<html class="dark">` 적용 + localStorage 저장 확인
- 새 페이지 navigation 후에도 dark mode 유지
- `supportsDarkMode: false` 테마에서는 toggle disabled 확인

EARS coverage: REQ-THEME-POLISH-030~039, REQ-THEME-POLISH-060~067

테스트 추정: ~8 tests

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 6개:

1. **AC-THEME-POLISH-A1**: GIVEN 관리자가 로그인하고 `/admin/site/design` 진입, WHEN 페이지가 마운트되면, THEN 3-pane editor가 표시되고 Left pane은 default theme + default layout 목록을 보여준다.
2. **AC-THEME-POLISH-A2**: GIVEN 관리자가 Right pane의 `colors.primary` 값을 `#FF0000`으로 변경하고 Save를 누름, WHEN 사용자가 도메인 홈 `/`을 새 요청으로 방문, THEN HTTP 응답의 `<style>` 태그에 `--rx-color-primary: #FF0000` 가 포함되고 rebuild 없이 반영된다.
3. **AC-THEME-POLISH-A3**: GIVEN 관리자가 token 값에 invalid hex(`"red"`)를 입력, WHEN field에서 blur, THEN 인라인 에러 메시지가 표시되고 Save 버튼은 disabled.
4. **AC-THEME-POLISH-B1**: GIVEN 사용자가 도메인 홈에 진입(초기 진입), WHEN DarkModeToggle 클릭, THEN `<html class="dark">` 가 적용되고 localStorage에 `rx-color-scheme=dark` 저장된다.
5. **AC-THEME-POLISH-B2**: GIVEN 사용자가 다크모드를 활성화한 상태에서 새 페이지 link 클릭, WHEN 새 페이지가 로드되면, THEN inline script가 hydration 전에 실행되어 FOIT 없이 dark mode 유지된다.
6. **AC-THEME-POLISH-B3**: GIVEN 현재 활성 테마의 `supportsDarkMode === false`, WHEN 페이지 로드되면, THEN DarkModeToggle은 disabled 상태로 표시되고 tooltip이 노출된다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 SPEC-LAYOUT-001 위 빌드

본 SPEC은 SPEC-LAYOUT-001의 다음 자산을 재사용한다:

- `packages/core/src/theme/types.ts`의 `themeTokensSchema` (Zod) — TokenEditor의 form schema
- `packages/core/src/theme/token-css.ts`의 `generateCssVariables`, `generateDarkCssVariables` — runtime CSS variable 생성
- `packages/core/src/theme/dark-mode.ts`의 `getDarkModeConfig`, `buildDarkMediaQuery` — supportsDarkMode 판정
- `packages/core/src/theme/layout/context.tsx`의 `LayoutProvider` — token CSS injection 위치
- `packages/core/src/theme/installer.ts` — theme.json 변경 시 seed 재실행
- SPEC-LAYOUT-001 REQ-LAYOUT-014의 `ThemeAssignment.tokensOverride` 활용 패턴 — 본 SPEC에서 active 격상

### 5.2 SPEC-ADMIN-001 위 빌드

다음 자산을 재사용한다:

- `apps/web/app/admin/layout.tsx` — admin 인증 + 2FA 게이트 (자동 통과)
- `apps/web/components/admin/AdminSidebar.tsx` — `/admin/site/design` 메뉴 추가 대상
- `apps/web/components/admin/AdminTopbar.tsx` — preview pane 도메인 selector 위치
- `@rhymix-ts/ui/components` `Toaster` — Save 결과 알림
- `apps/web/lib/auth/admin-middleware.ts`의 `isAdminSession` — Server Action 가드
- x-site-id header routing — admin scope 결정

### 5.3 3-pane Editor 레이아웃

```
+----------------------------+--------------------+--------------------+
| Left: Selector (220px)     | Center: Preview    | Right: Token Edit  |
|                            |                    | (400px)            |
| [Theme]                    | <iframe            |                    |
|   o default ✓              |  src="/?preview-   | [Light mode tab]   |
|   o blue                   |   theme=default&   |                    |
|                            |   preview-tokens=  | colors             |
| [Layout]                   |   abc123"          |   primary [#3B82F6]|
|   o default ✓              | />                 |   background [#FFF]|
|                            |                    |   foreground [#000]|
| [Skin]                     |                    |   accent [#10B981] |
|   (none)                   |                    | typography         |
|                            |                    |   fontFamilyBase[..|
|                            |                    | spacing            |
|                            |                    |   unit [4]         |
|                            |                    | radii              |
|                            |                    |   sm/md/lg         |
|                            |                    |                    |
|                            |                    | [Dark mode tab]    |
|                            |                    | ...                |
+----------------------------+--------------------+--------------------+
                                                    [Save] [Discard]
```

뷰포트 < 1280px일 때 vertical stack으로 fallback. `apps/web/app/admin/site/design/page.tsx`가 CSS Grid 또는 Tailwind `flex` utility로 구성.

### 5.4 Token Editor 자동 폼 생성

`apps/web/lib/theme/token-form-builder.ts` 가 핵심 유틸. 입력은 Zod schema, 출력은 form field descriptor list.

타입 매핑:

- `z.string()` field 이름이 `primary | background | foreground | accent` 와 매치 → color picker (`<input type="color">`)
- `z.string()` 그 외 → text input
- `z.number().min(M).max(N)` → number input with min/max
- `z.object(...)` → grouped fieldset (재귀 호출)

react-hook-form 통합:

- `useForm({ resolver: zodResolver(themeTokensSchema), defaultValues: ... })`
- `register("colors.primary")` 식으로 nested field 접근
- form state는 client-side에 보관 (Save 클릭 전까지 server 무지)

### 5.5 Hot-Reload 메커니즘 상세

SPEC-LAYOUT-001 REQ-LAYOUT-014 가 정의한 `ThemeAssignment.tokensOverride` JSON 컬럼을 본격 활용:

1. 운영자가 token 저장 → `saveTokens` Server Action
2. Action이 `themeTokensSchema.safeParse(tokens)` 검증
3. 통과 시 `ThemeAssignment.tokensOverride = tokens` upsert (scope에 따라 site/domain/module_instance row 선택)
4. `revalidatePath('/')` 또는 `revalidateTag('theme')` 호출 (Next.js 16 cache invalidation)
5. 다음 사용자 요청이 도착하면 `renderModuleWithLayout` pipeline이 ThemeAssignment 조회 → tokensOverride 검출 → LayoutProvider에 전달
6. LayoutProvider 가 `<style>` 태그로 `--rx-*` CSS variables를 inject (server-rendered)
7. 사용자 브라우저는 새 CSS variables를 받아 즉시 반영

핵심 포인트: rebuild 없음. Disk 파일 (`themes/default/theme.json`) 미수정. Runtime CSS variable 동작.

### 5.6 Dark Mode FOIT 방지 전략

문제: SSR이 light mode를 가정하고 렌더 → 브라우저가 HTML 받음 → React hydration 시작 전 짧은 순간 light mode flash → hydration 후 dark mode 토글.

해결책: `<head>` 안에 inline `<script>` 태그를 두어 hydration 전에 `<html>` 클래스를 즉시 변경.

`apps/web/app/layout.tsx`:

```typescript
import { colorSchemeScript } from '@/lib/theme/color-scheme-script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
      </head>
      <body>
        <ColorSchemeProvider>
          {/* ... existing providers + GlobalHeader + main */}
        </ColorSchemeProvider>
      </body>
    </html>
  );
}
```

`apps/web/lib/theme/color-scheme-script.ts`:

```typescript
// IIFE로 즉시 실행 — 동기 실행, defer/async 없음
export const colorSchemeScript = `
(function() {
  try {
    var pref = localStorage.getItem('rx-color-scheme');
    var dark = pref === 'dark' || (pref === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
```

`dangerouslySetInnerHTML` 사용 이유: Next.js가 `<script>` 컨텐츠를 React 자식으로 처리하지 않게 하기 위함. 컨텐츠는 정적이며 사용자 입력을 포함하지 않으므로 XSS 위험 없음.

React Context 통합:

- `<ColorSchemeProvider>`는 client component (`'use client'`)
- 초기 state는 `'light'` (서버 가정)
- `useEffect`로 mount 시 localStorage 읽어 state sync (이미 inline script가 `<html>` class를 설정했으므로 시각적 변화 없음)
- toggle 시 setState + localStorage + `<html>` classList 동시 업데이트

### 5.7 React Hook Form 도입

신규 의존성: `react-hook-form` + `@hookform/resolvers` (Zod resolver).

`apps/web/package.json`에 추가:

```json
{
  "dependencies": {
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x"
  }
}
```

react-hook-form의 장점:

- Zod resolver 공식 지원 → `themeTokensSchema` 직접 활용
- Uncontrolled component 기반 → 성능 우수
- Form state, validation, submission이 한 API에 통합
- Next.js 16 Server Action과 매끄럽게 통합 (`handleSubmit(serverAction)`)

대안 검토: react-form-state (실험), @tanstack/react-form (신생) 도 가능하나 community + Zod ecosystem 성숙도 측면에서 react-hook-form 선택.

### 5.8 Per-Domain 통합 (x-site-id routing)

SPEC-ADMIN-001의 x-site-id header routing 패턴을 그대로 따른다:

- `apps/web/middleware.ts` (existing) 가 `x-site-id` 헤더를 request에 inject
- Admin design page는 `headers().get('x-site-id')` 로 현재 site 결정
- Server Action도 동일 헤더 읽음 → assignment의 `siteId` 필드에 전달
- ThemeAssignment 조회/저장은 모두 `siteId`로 scope됨

이로써 multi-tenant 환경에서 site 1의 admin이 site 2의 theme을 건드릴 수 없음 (SPEC-ADMIN-001 권한 모델 준수).

### 5.9 Token Validation 흐름

**Client-side** (TokenEditor):

1. react-hook-form + zodResolver(themeTokensSchema) 가 field별 onChange 시 validate
2. Invalid 시 inline 에러 즉시 표시
3. Submit 시 form-level validation 통과 후 Server Action 호출

**Server-side** (saveTokens action):

4. Action 진입 시 `themeTokensSchema.safeParse(tokens)` 재실행 (client 우회 방지)
5. Failure → throw `Error('Invalid tokens')` → toast 에러 표시
6. Success → DB upsert + admin log + revalidatePath

이중 검증으로 client 우회 + race condition 방지. Server-side가 최종 권위 (single source of truth).

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `<style>` 태그 inject 시 CSP `style-src` 위반 | Next.js의 nonce 메커니즘 활용. `<style nonce={nonce}>` 적용. CSP 미설정 환경에서는 issue 없음. |
| react-hook-form + Zod resolver 의 nested object handling 복잡도 | `colors`, `typography` 등 grouped fieldset 처리에 명시적 테스트 작성. Zod resolver 공식 문서 참조. |
| Inline FOIT script가 `localStorage` 접근 실패 (private browsing 등) | `try-catch` 로 감싸서 silent fail. light mode가 default fallback이므로 critical 아님. |
| Preview iframe과 메인 페이지의 token 상태 desync | `preview-tokens` cache key를 staged token의 hash로 생성. iframe URL이 변경되면 자동 reload. |
| Token override가 `tokensOverride` JSON 컬럼에 누적되어 DB row 비대화 | Schema validation으로 unknown key 제거. JSON 크기는 < 4KB 예상 (typography + colors + radii + spacing). |
| Server Action이 무권한 호출됨 | `isAdminSession(session)` 가드. SPEC-ADMIN-001의 `protectedAdminProcedure` 패턴 재사용. |
| Dark mode와 운영자가 정의한 `tokensOverride.dark.colors`가 충돌 | Dark mode tab을 분리하여 light/dark token 동시 편집. server는 `themeTokens.dark.colors` 필드를 별도 검증. |
| `revalidatePath` 가 너무 광범위하여 cache miss 폭증 | `revalidateTag('theme:'+siteId)` 로 scope 제한. ThemeAssignment 조회 시 `unstable_cache` 사용 + tag 부착. |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. Slice A 진행 가능 (구현 detail).

1. **Theme 업로드 형식**: zip 업로드 vs git submodule vs CLI 만 가능 — 본 SPEC에서는 "CLI/disk only" 결정 (REQ-THEME-POLISH-009). zip 업로드는 별도 SPEC (예: SPEC-THEME-MARKETPLACE-001). 근거: zip 업로드는 (a) RCE 위험 (b) 의존성 격리 어려움 (c) MVP 범위 외. zip 형식 채택 시 sandboxing 또는 정적 검증 추가 필요.

2. **다크모드 preference 저장 위치**: localStorage만 vs DB User row에 저장 — 본 SPEC에서는 "localStorage only" 결정 (REQ-THEME-POLISH-039). DB 저장은 cross-device sync 가능하지만 (a) 비로그인 사용자 미지원 (b) per-domain preference 복잡도 (c) GDPR/privacy 영향 평가 필요. 별도 SPEC (예: SPEC-USER-PREFERENCES-001).

3. **Custom theme 생성 flow**: in-admin "Create new theme" 버튼 vs file-based only — 본 SPEC에서는 "file-based only" 결정. in-admin 생성은 (a) tokensSchema 정의 UI 복잡도 (b) layout component 의 정적 import 강제 충돌 (SPEC-LAYOUT-001 REQ-LAYOUT-009) (c) version control 통합 필요. 별도 SPEC.

4. **Preview iframe의 데이터 격리**: 운영자가 token 미리보기 중 사용자가 같은 도메인에 접속하면 미리보기 token이 사용자에게 노출되는지 — `preview-tokens` 쿼리 파라미터로 분리되므로 격리됨. Slice A 작업 시 보안 리뷰 권고.

5. **`react-hook-form` 외 대안 평가 결과**: Slice A 진행 전에 final pick. 현재 권고는 react-hook-form (5.7 참조).

위 5개 모두 SPEC 합의 사항이 아닌 구현 detail. expert-frontend/expert-backend가 발견 즉시 코드에 반영.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **Theme zip/tarball 업로드 UI**: 운영자가 admin UI에서 새 테마 디렉토리를 업로드하는 기능 — Open Question 1, 별도 SPEC
2. **In-admin custom theme 생성**: "Create new theme from scratch" 워크플로우 — Open Question 3, 별도 SPEC
3. **다크모드 preference DB persistence**: User row에 color_scheme 컬럼 추가 + per-user sync — Open Question 2, 별도 SPEC
4. **다크모드 per-domain override**: 도메인별로 다른 default color scheme — 백로그
5. **Theme hot-swap UI (rebuild 없이 layout component 변경)**: SPEC-LAYOUT-001 REQ-LAYOUT-009의 정적 import 강제 위반 — 백로그
6. **Theme marketplace / 공유 기능**: 외부 테마 갤러리 또는 P2P 공유 — 백로그
7. **모바일 전용 layout 편집 UI**: SPEC-LAYOUT-001 결정에 따라 responsive-only — 백로그
8. **위젯 스타일 편집 UI**: `Theme.widgetStyles[]` 편집 — SPEC-WIDGET-001 후속
9. **xedition / user_layout 편집 GUI**: SPEC-LAYOUT-001 결정에 따라 default 1개만 — 백로그
10. **AI 기반 token 추천**: brand identity 분석을 통한 자동 token 생성 — 백로그
11. **Token export/import (JSON)**: theme assignment를 JSON으로 백업/복원 — SPEC-ADMIN-EXTRAS-001 (Phase 5)
12. **Skin component 생성 UI**: 운영자가 admin에서 React 컴포넌트를 작성하는 기능 — 보안 + Type safety 충돌, 백로그
13. **시각적 layout editor (drag & drop)**: layout 구조 자체를 drag & drop으로 편집 — 별도 SPEC, 본 SPEC range 밖
14. **A/B 테스트 통합**: 사용자 segment 별로 다른 테마 노출 — 백로그
15. **다국어 displayName**: `Theme.displayName`을 다국어로 — 백로그
16. **운영자별 preview 격리**: 다중 운영자가 동시에 다른 token을 미리보기 (현재는 staged 상태가 client-only이므로 자연스럽게 격리됨, 명시적 격리 메커니즘은 없음)
17. **변경 이력 (revision history)**: token 변경의 audit trail은 SPEC-ADMIN-001 admin log에 의존. token 값의 시계열 diff 뷰는 별도 SPEC.
18. **사용자별 토큰 (user-specific styling)**: 운영자가 아닌 일반 사용자가 token을 커스텀하는 기능 — 백로그

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~28 (Slice A: ~20, Slice B: ~8, including 2 e2e tests)
Estimated Slice Count: 2 (A: Admin UI, B: Dark Mode)
Dependencies (upstream): SPEC-LAYOUT-001 ✅, SPEC-ADMIN-001 ✅, packages/core/src/theme/* (KEEP files including dark-mode.ts, token-css.ts), themes/default/
Blocks (downstream): None (Phase 4 leaf SPEC)
