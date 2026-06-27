---
id: SPEC-LAYOUT-001
title: Layout System — Phase 1 P0 Visible UI Foundation
version: 1.0.0
status: completed
created: 2026-05-25
updated: 2026-06-27
author: MoAI manager-spec
priority: P0
phase: 1
parent: MASTER-PLAN-002
absorbs: [SPEC-THEME-001 Slice A~D, REMEDIATION-PLAN-001 THEME Slice A~D]
issue_number: TBD
related-research: SPEC-LAYOUT-001/research.md
language: ko
---

# SPEC-LAYOUT-001 — Layout System (Phase 1 / P0)

## HISTORY

- 2026-05-25 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.1의 직접 흡수. research.md(700+ lines)에 검증된 레거시 사실에 기반. SPEC-THEME-001 spec.md의 Slice A~D 부분만 흡수하고 (Slice E~F는 SPEC-THEME-POLISH-001로 분리). REMEDIATION-PLAN-001 THEME 부분을 본 SPEC이 superseded. 본 SPEC은 의존성 그래프상 Phase 1의 최선두로, 사용자 가시성 트리오(layout + page + widget) 중 첫 번째이며, page와 widget이 의미를 가지기 위해 먼저 필요한 컨테이너다.

---

## 1. Goal & Audience

### 1.1 Goal

**Phase 1 P0 사용자 가시성의 컨테이너 계층을 구축한다.** 즉:

- 도메인의 인덱스 모듈 인스턴스가 결정되면, 그 모듈의 출력이 default 레이아웃 안에서 사용자에게 보이도록 한다.
- 운영자가 (admin UI 없이도) DB seed를 통해 default 레이아웃을 설치하고 도메인에 할당할 수 있다.
- 후속 SPEC(SPEC-WIDGET-001, SPEC-PAGE-001)이 본 SPEC의 LayoutContext 위에 빌드할 수 있는 안정된 API를 제공한다.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (Prisma + 도메인 헬퍼)
- expert-frontend agent — Slice B/C 구현 (LayoutContext, default theme, apps/web 통합)
- 운영자 — 클린 설치 후 도메인 홈에서 의미 있는 페이지가 보임을 확인하는 최종 검증자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 관리자 레이아웃 편집 UI (admin/site/design 3-pane editor) → SPEC-THEME-POLISH-001 (Phase 4)
- 다크모드 토글 → SPEC-THEME-POLISH-001 (Phase 4)
- 위젯 토큰 파서 → SPEC-WIDGET-001 (Phase 1, 본 SPEC과 병행)
- 페이지 모듈 본문 편집 UI → SPEC-PAGE-001 (Phase 1, 본 SPEC 이후)
- m.layouts 모바일 전용 레이아웃 (master plan 결정: responsive-only)
- xedition / user_layout 포팅 (master plan 결정: default 1개만)
- Smarty 템플릿 실행 또는 마이그레이션 (legacy `.html` 파일은 reference로만 사용)
- 테마 hot-swap / 미리보기 (Phase 4)

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Domain Model 계층 (REQ-LAYOUT-001 ~ 009)

**REQ-LAYOUT-001 (Ubiquitous)**: The Layout system SHALL persist layout instances in the existing Prisma `Layout` model (`packages/db/prisma/schema.prisma`), using the following fields without alteration: `id` (cuid String), `themeId`, `name`, `title`, `layoutPath`, `layoutType` (enum LayoutType), `siteSrl Int?`, `extraVars Json?`.

**REQ-LAYOUT-002 (Ubiquitous)**: The Layout system SHALL store ThemeAssignment records using the existing Prisma `ThemeAssignment` model with `mlayoutMode = RESPONSIVE` constant for all rows created by this SPEC. `mobileLayoutName` SHALL remain null.

**REQ-LAYOUT-003 (Ubiquitous)**: The Prisma `Domain.defaultLayoutId`, `Domain.defaultMobileLayoutId`, `ModuleInstance.layoutId`, `ModuleInstance.mobileLayoutId` columns SHALL be type `String?` (cuid reference to Layout.id), not `Int?`. A migration `layout-id-string` SHALL convert the existing Int? columns to String? by setting all values to null during conversion.

**REQ-LAYOUT-004 (Ubiquitous)**: The Layout system SHALL expose a TypeScript interface `LayoutConfig` at `packages/core/src/theme/layout/types.ts` with the following shape:

```
interface LayoutConfig {
  id: string;            // Layout.id (cuid)
  themeId: string;       // Theme.id
  name: string;          // Layout.name (e.g., "default")
  title: string;         // user-visible name
  layoutPath: string;    // disk path / registry key
  layoutType: 'DESKTOP'; // mobile excluded in Phase 1
  siteSrl: number | null;
  extraVars: unknown;    // raw JSON, validated by extra-vars.ts
}
```

**REQ-LAYOUT-005 (Ubiquitous)**: The Layout system SHALL expose a TypeScript interface `LayoutContextValue` at `packages/core/src/theme/layout/types.ts` containing site title, current user (nullable), current domain id, default menu items, and the parsed `extraVars` for the active layout.

**REQ-LAYOUT-006 (Event-Driven)**: WHEN `loadLayoutById(layoutId: string, prisma)` is called with a valid cuid, the system SHALL return `LayoutConfig` if the row exists, or `null` if not. The function SHALL NOT throw on missing rows.

**REQ-LAYOUT-007 (Event-Driven)**: WHEN `parseLayoutExtraVars(raw: unknown)` is called, the system SHALL validate the input against a Zod schema accepting these optional fields: `siteTitle: string`, `logoImageUrl: string`, `logoText: string`, `footerText: string`, `layoutType: 'MAIN_PAGE' | 'SUB_PAGE'`. Invalid fields SHALL be dropped with `safeParse` and a warning logged. Default `layoutType` SHALL be `'MAIN_PAGE'`.

**REQ-LAYOUT-008 (Unwanted)**: The Layout system SHALL NOT execute Smarty templates or any other PHP-derived templating engine. Legacy `.html` files in `D:\project\rhymix\layouts\*` SHALL be treated as reference documents only.

**REQ-LAYOUT-009 (Unwanted)**: The Layout system SHALL NOT dynamically import or require user-supplied component paths at runtime. All layout components SHALL be registered statically in `packages/core/src/theme/layout/registry.ts` via explicit import statements.

### 2.2 Resolution Chain 계층 (REQ-LAYOUT-010 ~ 019)

**REQ-LAYOUT-010 (Ubiquitous)**: The Layout system SHALL preserve the existing `resolveLayout(opts)` pure function in `packages/core/src/theme/resolver.ts` and reuse it without semantic change. The resolution priority order SHALL be: module_instance override → domain assignment → site default → fallback.

**REQ-LAYOUT-011 (Event-Driven)**: WHEN `resolveLayoutFromInstance(instance, prisma, { site, domain })` is called, the system SHALL:

1. Query `ModuleInstance.layoutId` for module-instance override
2. Query `Domain.defaultLayoutId` (or ThemeAssignment with scope=DOMAIN) for domain assignment
3. Query Site default (or ThemeAssignment with scope=SITE) for site default
4. Return `{ type: 'component', config: LayoutConfig, source: ... }` or `{ type: 'fallback' }`

**REQ-LAYOUT-012 (Event-Driven)**: WHEN no layout can be resolved (fallback case), the system SHALL emit `console.warn('[Layout] no layout resolved; rendering module output without wrapper')` and the render pipeline SHALL return the module output unwrapped.

**REQ-LAYOUT-013 (State-Driven)**: WHILE `layoutType === 'MOBILE'`, the system SHALL ignore the row and continue with desktop resolution. (No mobile-specific layouts are returned in Phase 1.)

**REQ-LAYOUT-014 (Optional)**: WHERE a ThemeAssignment row exists with a non-null `tokensOverride` for the resolved scope, the system SHALL apply the override tokens to the LayoutContext (merge over theme defaults). Phase 1 implementation MAY return tokens as-is without merging if the merge logic is not yet present in the theme package — the override field is stored but not consumed.

### 2.3 Render Pipeline 계층 (REQ-LAYOUT-020 ~ 029)

**REQ-LAYOUT-020 (Ubiquitous)**: The Layout system SHALL expose a render helper `renderModuleWithLayout({ instance, moduleOutput, prisma, request })` at `packages/core/src/theme/layout/pipeline.ts` that returns a `Promise<ReactNode>`.

**REQ-LAYOUT-021 (Event-Driven)**: WHEN `renderModuleWithLayout` is called, the system SHALL:

1. Call `resolveLayoutFromInstance` to determine the active layout
2. Look up the layout component in `registry.ts` by `LayoutConfig.name`
3. Parse `extraVars` via `parseLayoutExtraVars`
4. Wrap `moduleOutput` inside `<LayoutProvider value={contextValue}><LayoutComponent extraVars={...}>{moduleOutput}</LayoutComponent></LayoutProvider>`
5. Return the JSX tree

**REQ-LAYOUT-022 (Event-Driven)**: WHEN a layout's `LayoutConfig.name` is not present in `registry.ts`, the system SHALL log `console.error('[Layout] registry missing entry for: <name>')` and return `moduleOutput` directly (fallback to unwrapped).

**REQ-LAYOUT-023 (Ubiquitous)**: The `LayoutContext` SHALL be exported from `packages/core/src/theme/layout/context.tsx` as a React Context whose value type is `LayoutContextValue`. The `LayoutProvider` SHALL accept `value: LayoutContextValue` and `children: ReactNode`.

**REQ-LAYOUT-024 (Ubiquitous)**: The Layout system SHALL provide a `useLayoutContext()` hook that throws if called outside `LayoutProvider`, and a `useLayoutContextOptional()` hook that returns null outside the provider.

**REQ-LAYOUT-025 (Ubiquitous)**: The Layout system SHALL provide a `<LayoutSlot name="content">{children}</LayoutSlot>` component as a thin pass-through wrapper. Slot names defined by Phase 1: `"content"`. Additional slot names (`"header"`, `"footer"`, `"sidebar"`) MAY be defined but are not required to be consumed by the default layout in Phase 1.

### 2.4 Default Theme 계층 (REQ-LAYOUT-030 ~ 039)

**REQ-LAYOUT-030 (Ubiquitous)**: The Layout system SHALL ship one default theme at `themes/default/` containing:

- `themes/default/theme.json` — ThemeManifest (validated by `manifest-validator.ts`)
- `themes/default/layouts/default.tsx` — DefaultLayout React Server Component
- `themes/default/install.ts` — seed script that calls the existing `installer.ts` to upsert the Theme + Layout rows

**REQ-LAYOUT-031 (Ubiquitous)**: The DefaultLayout component SHALL:

- Be an async function component (RSC)
- Accept props `{ children: ReactNode; extraVars: ParsedExtraVars }`
- Use Tailwind utility classes for all styling (no separate CSS file in Phase 1)
- Render the following DOM structure:

```
<div data-rhymix-layout="default" data-layout-type={extraVars.layoutType}>
  <main className="...">
    {children}
  </main>
  <footer className="...">{extraVars.footerText ?? 'Powered by Rhymix-TS'}</footer>
</div>
```

**REQ-LAYOUT-032 (Ubiquitous)**: The DefaultLayout SHALL NOT render its own header. The GlobalHeader in `apps/web/components/layout/GlobalHeader.tsx` is rendered by the Next.js root layout (`apps/web/app/layout.tsx`) and is OUTSIDE the Rhymix layout boundary in Phase 1. Phase 4 (SPEC-THEME-POLISH-001) MAY revisit this and integrate GlobalHeader into the Rhymix layout.

**REQ-LAYOUT-033 (Ubiquitous)**: The DefaultLayout SHALL be responsive using Tailwind breakpoints (`sm:`, `md:`, `lg:`). It SHALL render correctly at viewport widths from 320px to 1920px without a separate mobile layout file.

**REQ-LAYOUT-034 (Ubiquitous)**: The `themes/default/theme.json` ThemeManifest SHALL declare:

- `name: "default"`
- `version: "1.0.0"`
- `displayName: "Default Theme"`
- `layouts: ["default"]`
- `skins: {}` (Phase 1 has no skins)
- `widgetStyles: []`
- `supportsDarkMode: false`
- `tokensSchema`: minimal token schema using `themeTokensSchema` from `types.ts`

**REQ-LAYOUT-035 (Event-Driven)**: WHEN `pnpm seed:default-theme` is invoked (or `themes/default/install.ts` is run directly), the system SHALL upsert a Theme row (`name="default"`) and a Layout row (`name="default", layoutType=DESKTOP, themeId=<default theme>`).

**REQ-LAYOUT-036 (Event-Driven)**: WHEN the seed script encounters an existing `Theme(name="default")`, the system SHALL update its `manifest` field with the current content and SHALL NOT delete or replace existing assignment rows.

### 2.5 apps/web Integration 계층 (REQ-LAYOUT-040 ~ 049)

**REQ-LAYOUT-040 (Event-Driven)**: WHEN a request reaches `apps/web/app/[mid]/page.tsx`, the system SHALL:

1. Resolve the module instance (existing logic, unchanged)
2. Invoke `def.routes.index(...)` to obtain `moduleOutput`
3. Pass `{ instance, moduleOutput, prisma, request: headers() }` to `renderModuleWithLayout`
4. Return the wrapped JSX

**REQ-LAYOUT-041 (Event-Driven)**: WHEN a request reaches the root path `/`, the system SHALL resolve the current Domain's `indexModuleInstanceId`, fetch that module instance, and apply the same render pipeline as `[mid]/page.tsx`. If `indexModuleInstanceId` is null, the system SHALL render a placeholder page indicating that no index module has been configured.

**REQ-LAYOUT-042 (State-Driven)**: WHILE the `x-domain-id` header is absent or invalid in the request, the existing `notFound()` behavior SHALL be preserved.

**REQ-LAYOUT-043 (Optional)**: WHERE the seed script has not been run (no default theme exists), the system SHALL fall back to rendering `moduleOutput` directly without any wrapper, and SHALL log a warning. The system SHALL NOT crash.

### 2.6 Quality 계층 (REQ-LAYOUT-050 ~ 059)

**REQ-LAYOUT-050 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-LAYOUT-051 (Ubiquitous)**: The render pipeline SHALL include at least one integration test that exercises: `mocked ModuleInstance + mocked Prisma + default layout registered → renderModuleWithLayout returns expected JSX tree`.

**REQ-LAYOUT-052 (Ubiquitous)**: The default layout SHALL include at least one e2e test (Playwright) that performs: install → seed default theme → assign to test domain → visit `/` → assert response 200 + footer text appears.

**REQ-LAYOUT-053 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (core, db, apps/web).

**REQ-LAYOUT-054 (Ubiquitous)**: All new code SHALL respect the language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-LAYOUT-055 (Unwanted)**: The Layout system SHALL NOT introduce any new global mutable state. LayoutContext is per-request via RSC; registry is module-level immutable.

---

## 3. Slices

본 SPEC은 3개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Domain Model + Prisma Alignment

종속성: 없음 (다른 슬라이스의 선행)

작업 항목:

1. Prisma migration `layout-id-string`:
   - `Domain.defaultLayoutId Int?` → `String?`
   - `Domain.defaultMobileLayoutId Int?` → `String?`
   - `ModuleInstance.layoutId Int?` → `String?`
   - `ModuleInstance.mobileLayoutId Int?` → `String?`
   - 마이그레이션 시 기존 값은 모두 null로 설정 (data preserving migration)
2. `packages/core/src/theme/layout/types.ts` 신규:
   - `LayoutConfig` interface
   - `LayoutContextValue` interface
   - `ParsedExtraVars` type (from zod schema)
3. `packages/core/src/theme/layout/extra-vars.ts` 신규:
   - `layoutExtraVarsSchema` (Zod)
   - `parseLayoutExtraVars(raw: unknown): ParsedExtraVars`
4. `packages/core/src/theme/layout/loader.ts` 신규:
   - `loadLayoutById(id: string, prisma): Promise<LayoutConfig | null>`
   - `loadLayoutByName(themeId: string, name: string, prisma): Promise<LayoutConfig | null>`
5. `packages/core/src/theme/layout/resolver-with-db.ts` 신규:
   - `resolveLayoutFromInstance(instance, prisma, ctx): Promise<ResolveResult>` wrap of existing `resolver.ts`
6. `packages/core/src/theme/index.ts` 재정리: layout submodule exports
7. 단위 테스트: extra-vars, loader, resolver-with-db (12+ tests)
8. mobile-layout.ts 와 mobile-layout.test.ts를 `@deprecated SPEC-LAYOUT-001 m.layouts removed` JSDoc 코멘트 추가 (즉시 삭제는 안 함 — 다른 코드가 참조 중일 수 있음)

검증:

- `pnpm prisma migrate dev --name layout-id-string` 성공
- `pnpm tsc --noEmit` 0 error
- `pnpm test packages/core` 통과

EARS coverage: REQ-LAYOUT-001~009, REQ-LAYOUT-011 (loader 부분)

### Slice B: Render Pipeline + LayoutContext

종속성: Slice A 완료

작업 항목:

1. `packages/core/src/theme/layout/context.tsx` 신규:
   - `LayoutContext` (React.createContext)
   - `LayoutProvider` (client component, `'use client'`)
   - `useLayoutContext()` (throws if outside)
   - `useLayoutContextOptional()` (returns null)
2. `packages/core/src/theme/layout/registry.ts` 신규:
   - `layoutRegistry: Map<string, ComponentType<LayoutComponentProps>>`
   - `registerLayout(name, component)` (idempotent)
   - `getLayout(name): ComponentType | null`
3. `packages/core/src/theme/layout/slot.tsx` 신규:
   - `<LayoutSlot name="content">{children}</LayoutSlot>` (Server Component, pass-through)
4. `packages/core/src/theme/layout/pipeline.ts` 신규:
   - `renderModuleWithLayout({ instance, moduleOutput, prisma, request }): Promise<ReactNode>`
5. 단위 테스트: context, registry, pipeline (10+ tests including fallback cases)
6. integration test: mocked instance + registered default-stub + pipeline returns proper tree

검증:

- `pnpm test packages/core` 통과
- pipeline의 fallback 경로 (no layout, missing registry entry) 모두 cover

EARS coverage: REQ-LAYOUT-020~025, REQ-LAYOUT-010 (재사용), REQ-LAYOUT-012, REQ-LAYOUT-022

### Slice C: themes/default + apps/web Integration

종속성: Slice B 완료

작업 항목:

1. `themes/default/theme.json` 신규 (ThemeManifest)
2. `themes/default/layouts/default.tsx` 신규 (DefaultLayout RSC)
3. `themes/default/install.ts` 신규 (seed script)
4. `package.json` scripts: `"seed:default-theme": "tsx themes/default/install.ts"` 추가
5. `packages/core/src/theme/layout/registry.ts`에 default layout 등록 (import + registerLayout)
6. `apps/web/app/[mid]/page.tsx` 수정:
   - `getModuleDefinition` 호출 후, `def.routes.index(...)` 결과를 `renderModuleWithLayout`으로 wrap
   - 기존 `notFound()` 분기 유지
7. `apps/web/app/page.tsx` 수정/신규:
   - 현재 `x-domain-id` 헤더에서 Domain 조회 → `indexModuleInstanceId`로 redirect 또는 직접 dispatch
   - `indexModuleInstanceId` null이면 placeholder ("No index module configured for this domain") 렌더
8. e2e 테스트 1개: Playwright로 설치 → 시드 → 도메인 홈 방문 → footer 텍스트 존재 확인
9. 8+ 추가 단위 테스트 (DefaultLayout snapshot, install.ts upsert behavior)

검증:

- `pnpm seed:default-theme` 성공
- `pnpm dev`로 띄운 환경에서 `/` 방문 → 200 + DefaultLayout DOM (`data-rhymix-layout="default"`) 확인
- e2e 테스트 통과
- 전체 `pnpm test` 통과

EARS coverage: REQ-LAYOUT-030~036, REQ-LAYOUT-040~043, REQ-LAYOUT-050~055

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 4개:

1. **AC-LAYOUT-A1**: GIVEN 빈 DB + Slice A 적용 완료, WHEN `pnpm prisma migrate dev` 실행, THEN 모든 layoutId 컬럼이 String?로 변경되고 기존 row의 layoutId는 null이다.
2. **AC-LAYOUT-B1**: GIVEN 모의 ModuleInstance (layoutId 지정) + Slice B의 registry에 stub layout 등록, WHEN `renderModuleWithLayout`가 호출되면, THEN 반환된 JSX는 `<LayoutProvider><StubLayout>{moduleOutput}</StubLayout></LayoutProvider>` 구조다.
3. **AC-LAYOUT-C1**: GIVEN 클린 DB + 시드 default theme + 도메인이 default 레이아웃에 할당됨 + indexModuleInstanceId 지정됨, WHEN 사용자가 도메인 홈 `/`을 방문, THEN HTTP 200 + DOM에 `[data-rhymix-layout="default"]` 요소 + footer 텍스트가 존재한다.
4. **AC-LAYOUT-C2**: GIVEN 클린 DB (theme 시드 안 함), WHEN 사용자가 모듈 라우트 `/{anyMid}` 방문, THEN HTTP 200 + moduleOutput이 unwrapped로 반환되고 console.warn 로그가 출력된다 (graceful fallback).

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정 (research §3.1 결정 반영)

신규 코드는 **packages/core/src/theme/layout/** 서브폴더에 둔다. 신규 `@rhymix-ts/layout` 패키지는 생성하지 않는다. 근거는 research §3.1.

기존 27개 파일 처분:

- KEEP 14개 (types, resolver, manifest-validator, inheritance, installer, skin-resolver, token-css, assignment-store + 각 테스트)
- SUPERSEDE 2개 (mobile-layout.ts/test) — `@deprecated` JSDoc만 추가하고 즉시 삭제 X
- DEFER 8개 (hot-swap, dark-mode, widget-style, preview + 각 테스트) — 변경 없음, Phase 4까지 dormant
- 신규 8개 (layout/{context, registry, slot, pipeline, loader, resolver-with-db, extra-vars, types}.tsx/.ts)

### 5.2 RSC vs Client Component

- **Server-side**: pipeline.ts, loader.ts, resolver-with-db.ts, DefaultLayout, install.ts, apps/web 라우트 (RSC)
- **Client-side**: LayoutProvider (`'use client'`), 추후 추가될 interactive widget 컴포넌트
- Pure functions: resolver.ts (기존), extra-vars.ts, registry.ts (no React 의존)

### 5.3 ID 타입 통일 (research §3.3)

마이그레이션 파일명: `layout-id-string`. 마이그레이션 SQL은 Prisma가 자동 생성한다. 다음과 같은 형태가 될 것:

```sql
ALTER TABLE "domains" ALTER COLUMN "defaultLayoutId" TYPE TEXT USING NULL;
ALTER TABLE "domains" ALTER COLUMN "defaultMobileLayoutId" TYPE TEXT USING NULL;
ALTER TABLE "module_instances" ALTER COLUMN "layoutId" TYPE TEXT USING NULL;
ALTER TABLE "module_instances" ALTER COLUMN "mobileLayoutId" TYPE TEXT USING NULL;
```

`USING NULL` 캐스팅은 기존 row가 모두 null이거나 사용자가 의도하지 않은 0 값임을 전제로 한다. 본 SPEC의 마이그레이션 가드 테스트가 이를 검증한다.

### 5.4 Render Pipeline 시퀀스

```
[Request] → apps/web/app/[mid]/page.tsx
  ├─ headers() → siteId, domainId
  ├─ ModuleInstance lookup
  ├─ getModuleDefinition(moduleCode)
  ├─ moduleOutput = await def.routes.index({ instance, params, searchParams, prisma })
  └─ return renderModuleWithLayout({ instance, moduleOutput, prisma, request })
                  ↓
         resolveLayoutFromInstance(instance, prisma, ctx)
                  ↓
         { config: LayoutConfig, source: 'site' | 'domain' | 'module_instance' }
                  ↓
         getLayout(config.name) → ComponentType<LayoutComponentProps>
                  ↓
         parseLayoutExtraVars(config.extraVars) → ParsedExtraVars
                  ↓
         buildContextValue(...) → LayoutContextValue
                  ↓
         <LayoutProvider value={contextValue}>
           <LayoutComponent extraVars={parsed}>
             {moduleOutput}
           </LayoutComponent>
         </LayoutProvider>
```

### 5.5 LayoutContext 모양

```typescript
interface LayoutContextValue {
  site: { id: number; title: string | null };
  domain: { id: number; hostname: string };
  user: { id: number; nickname: string } | null;
  menu: { id: number; title: string; url: string | null }[];
  extraVars: ParsedExtraVars;
}
```

`menu`는 SPEC-WIDGET-001에서 위젯이 GNB를 렌더할 때 사용. Phase 1에서는 GlobalHeader가 이미 동일 데이터를 직접 조회하므로 LayoutContext.menu는 정보적(informational) 필드. SPEC-WIDGET-001이 본 SPEC을 의존하면 widget이 useLayoutContext().menu를 읽어 자기 GNB를 그릴 수 있게 된다.

### 5.6 Theme Seed 메커니즘

`themes/default/install.ts`는 `packages/core/src/theme/installer.ts`의 `installTheme(manifestPath, prisma)` 함수를 호출한다. 이 함수는 이미 14개 KEEP 파일 중 하나이며 다음을 수행한다:

1. manifest 파일 읽기
2. Zod 검증
3. Theme upsert (by name)
4. layouts[] 배열의 각 항목에 대해 Layout upsert

본 SPEC은 installer.ts의 내부 로직을 수정하지 않는다 (필요 시 minor patch는 허용하되 별도 사유 명시).

### 5.7 Tailwind 4 통합

- 기존 `apps/web/app/globals.css`가 Tailwind 4를 import함 (assumption from project state)
- DefaultLayout은 Tailwind utility 클래스만 사용. `@apply`나 별도 CSS 모듈 사용 X.
- token-css.ts가 Theme.tokensSchema → `--rx-` CSS custom properties로 변환하는 기능을 제공함 (KEEP 14개 중 하나). Phase 1에서는 DefaultLayout이 token을 직접 사용하지 않지만, ThemeAssignment.tokensOverride가 있으면 LayoutProvider가 `<style>` 태그에 CSS variables를 inject할 준비를 한다 (REQ-LAYOUT-014 optional).

---

## 6. Risks & Mitigations

상세는 research §5 참조. 핵심 5가지:

| Risk | Mitigation |
|---|---|
| Prisma migration 충돌 | 기존 row layoutId는 모두 null로 시작. Slice A에 마이그레이션 가드 테스트 포함. |
| GlobalHeader 중복 | Phase 1 default layout은 header를 그리지 않음. Phase 4에서 통합 논의. |
| Layout RCE 위험 | registry.ts는 정적 import만 허용. dynamic require 금지. |
| extraVars JSON 오류 | Zod safeParse + default fallback. |
| SPEC-WIDGET-001과의 인터페이스 | LayoutContextValue 모양을 본 SPEC에서 확정. SPEC-WIDGET-001은 read-only consumer. |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. 해결 없이도 Slice A는 진행 가능.

1. **Site 모델의 정확한 위치**: research §2.1에서 ModuleInstance.siteId Int로 확인했으나 Site 모델의 다른 필드(예: title)는 schema.prisma의 어디인지 미확인. Slice B 작업 시 expert-backend가 확인하여 LayoutContextValue.site 모양 확정. (가정: Site 모델에 title 필드가 있거나, Site.config에 title이 있음)
2. **ThemeAssignment.refType의 정확한 값**: scope=DOMAIN일 때 refType="domain", refId=Domain.id (string)인지 확인 필요. Slice A 작업 시 결정.
3. **install.ts 실행 환경**: tsx로 직접 실행 vs Prisma seed (`prisma db seed`) vs 별도 CLI. Slice C 작업 시 expert-backend가 결정 — 권고는 `tsx themes/default/install.ts` (단순 + 의존성 적음).

위 3개 모두 SPEC 합의 사항이 아닌 구현 detail. expert-backend가 발견 즉시 코드에 반영.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **관리자 레이아웃 편집 UI**: admin/site/design 페이지의 3-pane editor (theme/layout/skin assignment, token 편집, GUI 폼 자동 생성) — SPEC-THEME-POLISH-001 Slice 1 (Phase 4)
2. **다크모드 토글 + persistence**: dark mode UI + localStorage 저장 — SPEC-THEME-POLISH-001 Slice 2 (Phase 4)
3. **위젯 토큰 파서**: `<rx-widget name="login_info" />` 같은 인라인 토큰을 React 컴포넌트로 치환 — SPEC-WIDGET-001 (Phase 1 병행)
4. **빌트인 위젯 (login_info, content)**: 위젯 구현체 — SPEC-WIDGET-001
5. **페이지 모듈**: ModuleInstance.content 본문 편집 UI + WYSIWYG editor — SPEC-PAGE-001 (Phase 1 후속)
6. **Theme hot-swap**: 런타임에 테마 교체 (rebuild 없이) — Phase 4
7. **Theme preview**: 관리자가 적용 전 미리보기 — Phase 4
8. **추가 default theme의 extra_vars 5개 외 8개**: VISUAL_USE/IMAGE/TEXT/LINK 1-3, WEB_FONT — SPEC-THEME-POLISH-001
9. **m.layouts 디렉토리 + mlayout_srl 분기**: master plan 결정에 따라 responsive-only로 통일. 별도 mobile-specific layout 미지원.
10. **xedition 레이아웃 포팅**: master plan 결정에 따라 default 1개만. xedition은 백로그.
11. **user_layout 레이아웃**: 운영자가 직접 HTML 작성하는 빈 레이아웃 — 백로그
12. **Smarty 템플릿 실행**: 레거시 `.html` 파일을 컴파일/실행하는 어떤 메커니즘도 미지원. legacy 파일은 참조용.
13. **시드 외 admin import/export**: layout JSON export/import UI — SPEC-ADMIN-EXTRAS-001 (Phase 5)
14. **레이아웃 컴포넌트 동적 로딩**: registry.ts는 정적 import만. 운영자가 disk에 새 레이아웃 디렉토리를 떨어뜨려도 자동 등록되지 않음.
15. **i18n 다국어 layout 메타**: theme.json의 displayName은 단일 문자열. 다국어 displayName은 백로그.
16. **CSS-in-JS 또는 styled-components**: 본 SPEC은 Tailwind utility만 사용.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 30+ (Slice A: 12+, Slice B: 10+, Slice C: 8+ including 1 e2e)
Estimated Slice Count: 3 (A: Domain/Prisma, B: Pipeline/Context, C: Default theme + apps/web integration)
Dependencies (upstream): SPEC-AUTH-001 ✅, SPEC-ADMIN-001 Slice A ✅, packages/core/src/theme/* (14 KEEP files)
Blocks (downstream): SPEC-WIDGET-001 (Phase 1), SPEC-PAGE-001 (Phase 1), SPEC-THEME-POLISH-001 (Phase 4)
