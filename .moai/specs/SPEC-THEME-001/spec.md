---
id: SPEC-THEME-001
title: Theme, Layout & Skin System
status: draft
priority: P1
created: 2026-05-10
domain: theme
related: [SPEC-ADMIN-001, SPEC-CONTENT-001]
---

# SPEC-THEME-001: Theme, Layout & Skin System

## Overview

본 SPEC은 Rhymix CMS의 핵심 프레젠테이션 계층인 **Layout / Skin / Widget Style / Mobile Layout** 시스템을 Next.js 16 App Router + Tailwind CSS 4 기반의 현대적 React 아키텍처로 재설계한다. Rhymix는 PHP/Smarty 기반의 템플릿 시스템에서 모듈 출력물을 레이아웃이 감싸는 구조로 동작했으며, 본 시스템은 이 정신을 보존하되 React Server Components(RSC), CSS Custom Properties, 강타입 토큰 스키마를 통해 재구성한다.

### Conceptual Mapping (Rhymix → Next.js + Tailwind)

| Rhymix 개념                     | Next.js + Tailwind 매핑                                          | 비고                                                    |
| ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `layouts` table (`layout_srl`)  | React Layout Component (RSC) + DB 레지스트리                     | `layout_path` → 컴포넌트 import 경로                    |
| `extra_vars` (JSON)             | Zod로 스키마화된 Theme Settings (per layout/theme)               | 강타입 폼 자동 생성 가능                                |
| `skins/{module}/`               | `themes/{theme}/skins/{moduleType}/{skinName}.tsx` Registry      | 모듈별 React 컴포넌트 변형                              |
| `m.skins/{module}/`             | 동일 Skin이 responsive 처리하거나 mobile-specific 컴포넌트 제공  | mlayout_srl=-2(responsive) 권장                         |
| `colorset`                      | Theme Token Variants (CSS Custom Properties로 매핑)              | Tailwind 4 `@theme` 블록과 결합                         |
| `widgetstyles/{name}/`          | Widget Wrapper Component (HOC 또는 Slot 패턴)                    | 위젯 출력 시각적 래핑                                   |
| `layout_type` (P/M)             | desktop/mobile breakpoint + container queries                    | mobile-first responsive 우선                            |
| `mlayout_srl` (-1/-2/specific)  | Theme Resolution Hierarchy (default → responsive → mobile-only)  | -2(responsive)가 기본 권장                              |
| Site-level default layout       | `ThemeAssignment` (scope=domain)                                 | per-domain Prisma 레코드                                |
| Module-instance skin override   | `ThemeAssignment` (scope=module_instance, mid 기반)              | mid별 skin 선택                                         |

### Architectural Pillars

1. **Theme as Package**: 하나의 테마는 `themes/{themeName}/` 디렉토리 또는 npm 패키지로 배포 가능한 자기완결적 단위.
2. **Layout as RSC**: Layout은 React Server Component로 정의되며, `children` slot에 모듈 페이지를 받아 wrapping.
3. **Skin as Module Variant**: 모듈 타입(board, page, document 등)별로 복수의 Skin이 존재하고 module instance(mid) 단위로 선택.
4. **Tokens as CSS Variables**: 색상·타이포·간격은 CSS custom properties로 표현되어 재빌드 없이 hot-swap 가능.
5. **Resolution Hierarchy**: `module instance skin > module instance theme > domain theme > site default`.

## User Stories

- **US-1 (사이트 관리자)**: As a site admin, I want to assign a default theme/layout per domain so that multi-site deployments can have visually distinct presentations.
- **US-2 (사이트 관리자)**: As a site admin, I want to override the skin per module instance (mid) so that the same board module can render differently in different sections.
- **US-3 (사이트 관리자)**: As a site admin, I want to customize theme tokens (primary color, font family, radii) through an admin UI without writing CSS so that branding adjustments are instant.
- **US-4 (최종 사용자)**: As an end-user, I want to toggle between light and dark mode so that I can read content comfortably in any environment.
- **US-5 (사이트 관리자)**: As a site admin, I want a preview mode for theme changes so that I can verify changes before publishing them to live visitors.
- **US-6 (테마 작성자)**: As a theme author, I want to package a theme with manifest, layouts, skins, and tokens so that I can distribute it via npm or zip.
- **US-7 (테마 작성자)**: As a theme author, I want to publish multiple skin variants per module type (e.g., board: classic, gallery, blog) so that admins can choose presentation per module instance.
- **US-8 (모바일 사용자)**: As a mobile user, I want layouts to adapt responsively (or use mobile-specific layout when configured) so that the experience is optimized for small screens.
- **US-9 (사이트 관리자)**: As a site admin, I want to enable/disable dark mode globally or per domain so that I can match brand guidelines.
- **US-10 (테마 작성자)**: As a theme author, I want my child theme to extend a parent theme so that I can override only specific layouts/skins/tokens.
- **US-11 (사이트 관리자)**: As a site admin, I want to install or uninstall themes through admin UI so that I can manage theme lifecycle without filesystem access.
- **US-12 (사이트 관리자)**: As a site admin, I want widget output to be wrapped with a chosen widget style so that widgets present consistent visual chrome across the site.

## EARS Requirements

### Theme Manifest

- **REQ-THEME-001**: WHEN a theme directory is registered, THE SYSTEM SHALL parse a `manifest.ts` (or `theme.json`) file containing `name`, `version`, `displayName`, `author`, `parent` (optional), `layouts[]`, `skins{moduleType: skinName[]}`, `tokensSchema` (Zod), and `assets[]`.
- **REQ-THEME-002**: IF the manifest fails Zod validation, THEN THE SYSTEM SHALL reject installation and emit a structured error containing the failing field path.
- **REQ-THEME-003**: THE SYSTEM SHALL always treat `manifest.version` as a semver string and reject non-semver values.

### Layout Registration & Resolution

- **REQ-THEME-010**: WHEN a request reaches a route under `app/(site)/`, THE SYSTEM SHALL resolve the active layout via the chain: module-instance override → domain assignment → site default.
- **REQ-THEME-011**: THE SYSTEM SHALL load the layout component lazily via the registry (`registry.getLayout(layoutSrl)`) returning a React Server Component reference.
- **REQ-THEME-012**: WHERE a Rhymix-compatible legacy `layout_path` is provided, THE SYSTEM SHALL accept both the new component-import form and a wrapper that renders nothing (no Smarty execution; legacy layouts must be ported).
- **REQ-THEME-013**: IF no layout can be resolved, THEN THE SYSTEM SHALL render a built-in `FallbackLayout` and log a warning.

### Skin Registration & Resolution

- **REQ-THEME-020**: WHEN a module page renders, THE SYSTEM SHALL resolve the skin via `registry.getSkin(moduleType, skinName, { theme, mid })` returning a React component.
- **REQ-THEME-021**: THE SYSTEM SHALL allow per-module-instance (mid) skin override stored in `ThemeAssignment` with scope `module_instance`.
- **REQ-THEME-022**: IF the requested skin is unavailable in the active theme, THEN THE SYSTEM SHALL fall back to the parent theme's skin, then to the built-in default skin.

### Theme Token System

- **REQ-THEME-030**: THE SYSTEM SHALL expose theme tokens (colors, typography, spacing, radii, shadows) as CSS custom properties prefixed `--rx-` (e.g., `--rx-color-primary`).
- **REQ-THEME-031**: WHEN an admin updates theme tokens, THE SYSTEM SHALL re-emit the CSS variables on the next response without requiring a Next.js rebuild.
- **REQ-THEME-032**: THE SYSTEM SHALL strongly type the token schema per theme via Zod and generate TypeScript types for theme settings forms.
- **REQ-THEME-033**: WHERE Tailwind utility classes reference theme tokens (e.g., `bg-primary`), THE SYSTEM SHALL bridge them through Tailwind 4 `@theme inline` block consuming the same custom properties.

### Dark Mode

- **REQ-THEME-040**: THE SYSTEM SHALL support dark mode using `next-themes` with class strategy (`class="dark"`).
- **REQ-THEME-041**: WHEN a user toggles dark mode, THE SYSTEM SHALL persist the preference to `localStorage` and respect `prefers-color-scheme` as default.
- **REQ-THEME-042**: WHERE a theme defines a `tokens.dark` variant, THE SYSTEM SHALL emit dark-mode CSS variables under `.dark` selector.
- **REQ-THEME-043**: IF a theme does not provide a dark token set, THEN THE SYSTEM SHALL disable dark-mode toggle UI for that theme.

### Per-Domain Theme Assignment

- **REQ-THEME-050**: THE SYSTEM SHALL store per-domain theme assignments in `ThemeAssignment` (scope=`domain`, ref=`siteSrl`).
- **REQ-THEME-051**: WHEN a request's hostname matches a configured domain, THE SYSTEM SHALL apply that domain's theme assignment.
- **REQ-THEME-052**: WHERE no domain assignment exists, THE SYSTEM SHALL apply the site default assignment.

### Per-Module-Instance Skin Override

- **REQ-THEME-060**: THE SYSTEM SHALL allow setting a skin override per module instance (mid) via admin UI.
- **REQ-THEME-061**: WHEN a module instance specifies an override, THE SYSTEM SHALL prefer that skin over domain or site defaults.
- **REQ-THEME-062**: THE SYSTEM SHALL preserve Rhymix's `mlayout_srl` semantics: `-1` = use site default mobile layout, `-2` = responsive (reuse PC layout), or specific layout id.

### Theme Installation

- **REQ-THEME-070**: WHEN an admin uploads a theme zip or installs from npm, THE SYSTEM SHALL extract/install to `themes/{themeName}/`, validate the manifest, and register it in the `Theme` table.
- **REQ-THEME-071**: IF a theme with the same name already exists, THEN THE SYSTEM SHALL reject installation unless the admin explicitly confirms upgrade.
- **REQ-THEME-072**: WHEN an admin uninstalls a theme, THE SYSTEM SHALL refuse if any active assignment references it.

### Theme Preview

- **REQ-THEME-080**: THE SYSTEM SHALL provide a no-commit preview mode where an admin sees a candidate theme applied without affecting other users.
- **REQ-THEME-081**: WHEN preview mode is active, THE SYSTEM SHALL signal preview state via a session cookie (`rx-theme-preview`) so that subsequent navigation maintains preview.
- **REQ-THEME-082**: THE SYSTEM SHALL automatically expire preview sessions after 30 minutes of inactivity.

### Responsive & Mobile Layout

- **REQ-THEME-090**: THE SYSTEM SHALL define standard breakpoints `mobile (<768px)`, `tablet (768–1024px)`, `desktop (>=1024px)` exposed as Tailwind tokens and CSS custom properties.
- **REQ-THEME-091**: WHEN `mlayout_srl = -2` (responsive), THE SYSTEM SHALL reuse the desktop layout and rely on container queries / Tailwind breakpoints.
- **REQ-THEME-092**: WHEN `mlayout_srl` references a specific mobile layout id, THE SYSTEM SHALL render that layout for user-agents identified as mobile.
- **REQ-THEME-093**: THE SYSTEM SHALL provide a fallback chain: specific mobile layout → responsive fallback (PC layout) → built-in `FallbackLayout`.

### Widget Styling

- **REQ-THEME-100**: THE SYSTEM SHALL allow widgets to be wrapped by a `WidgetStyle` component selected per-widget-instance.
- **REQ-THEME-101**: WHERE a widget instance specifies no style, THE SYSTEM SHALL use the active theme's default widget style.

### Theme Inheritance

- **REQ-THEME-110**: WHERE a theme manifest declares `parent: "themeName"`, THE SYSTEM SHALL inherit unspecified layouts/skins/tokens from the parent.
- **REQ-THEME-111**: THE SYSTEM SHALL support a single-level parent (no transitive inheritance) to limit resolution complexity.
- **REQ-THEME-112**: IF a parent theme is missing or uninstalled, THEN THE SYSTEM SHALL refuse to install/activate the child theme.

### Asset Bundling

- **REQ-THEME-120**: THE SYSTEM SHALL serve theme static assets (CSS, JS, images, fonts) from `themes/{theme}/public/` mounted under `/themes/{theme}/`.
- **REQ-THEME-121**: WHERE a theme provides a `tokens.css` file, THE SYSTEM SHALL include it in the document head only when that theme is active.

### Hot-Swap

- **REQ-THEME-130**: WHEN an admin changes only token values (no component changes), THE SYSTEM SHALL apply changes within one HTTP response cycle without requiring a Next.js rebuild.
- **REQ-THEME-131**: WHEN component-level changes occur (new layout/skin TS files), THE SYSTEM SHALL require a deploy/rebuild and clearly communicate this in the admin UI.

## Acceptance Criteria

### AC-THEME-001 (REQ-THEME-001/002)
- **Given** a theme package with valid `manifest.ts` exporting required fields,
- **When** the admin runs theme installation,
- **Then** the theme is registered in `Theme` table with `status = installed`.
- **Given** a theme manifest missing `tokensSchema`,
- **When** installation is attempted,
- **Then** the system rejects with error `MANIFEST_INVALID` and displays the missing field.

### AC-THEME-010 (REQ-THEME-010)
- **Given** a domain `example.com` assigned to theme `aurora` and a module instance with mid=42 having no override,
- **When** a request to `https://example.com/board/notice` is made,
- **Then** the resolved layout is `aurora`'s default layout, and resolution is logged with chain `module:none → domain:aurora → site:default`.

### AC-THEME-020 (REQ-THEME-020/021)
- **Given** module instance mid=42 has skin override `gallery` for module type `board`,
- **When** the page renders,
- **Then** `registry.getSkin('board', 'gallery', { theme: 'aurora', mid: 42 })` returns the active component, and the rendered HTML contains `data-skin="gallery"`.

### AC-THEME-030 (REQ-THEME-030/031/033)
- **Given** an admin updates `--rx-color-primary` from `#0066ff` to `#ff3366`,
- **When** the next request is served,
- **Then** the response includes the new value in the inlined CSS variables block, and Tailwind `bg-primary` resolves to the new color without a build step.

### AC-THEME-040 (REQ-THEME-040/041/042)
- **Given** a theme provides a dark token variant,
- **When** the user clicks the dark-mode toggle,
- **Then** the `<html>` element gains `class="dark"`, the preference is saved in `localStorage`, and dark-variant CSS variables apply.

### AC-THEME-050 (REQ-THEME-050/051)
- **Given** two domains `a.example.com` (theme=aurora) and `b.example.com` (theme=eclipse),
- **When** requests reach each domain,
- **Then** each domain renders with its assigned theme without leakage.

### AC-THEME-070 (REQ-THEME-070/071)
- **Given** a zipped theme file,
- **When** the admin uploads it via admin UI,
- **Then** the system extracts to `themes/{name}/`, validates manifest, registers in DB, and shows success toast.
- **Given** a theme with an existing name is uploaded,
- **When** upgrade confirmation is not given,
- **Then** the system rejects with error `THEME_ALREADY_INSTALLED`.

### AC-THEME-080 (REQ-THEME-080/081/082)
- **Given** an admin enters preview mode for theme `eclipse`,
- **When** the admin navigates the site,
- **Then** only requests carrying the admin's `rx-theme-preview` cookie see `eclipse`, while anonymous users see the live theme.

### AC-THEME-090 (REQ-THEME-090/091)
- **Given** a module instance with `mlayout_srl=-2`,
- **When** a mobile user agent requests the page,
- **Then** the desktop layout is rendered and Tailwind responsive utilities + container queries adjust the visual layout for mobile.

### AC-THEME-110 (REQ-THEME-110/112)
- **Given** child theme `aurora-pro` declares `parent: "aurora"`,
- **When** `aurora-pro` is active and a layout is missing in `aurora-pro`,
- **Then** the resolver falls back to `aurora`'s layout.
- **Given** `aurora` is uninstalled while `aurora-pro` exists,
- **When** activation of `aurora-pro` is attempted,
- **Then** the system refuses with error `PARENT_THEME_MISSING`.

### AC-THEME-130 (REQ-THEME-130/131)
- **Given** an admin only modifies token values,
- **When** changes are saved,
- **Then** new tokens are applied on the next request without a rebuild.
- **Given** an admin attempts to add a new layout component file,
- **When** changes are saved,
- **Then** the admin UI displays a banner: "Component changes require redeploy."

## Theme Architecture

### Directory Layout

```
themes/
  aurora/
    manifest.ts                # Theme metadata + Zod token schema
    tokens.ts                  # Token definitions (TS module)
    tokens.css                 # CSS variable defaults (light + .dark variants)
    public/                    # Static assets (fonts, images, logos)
    layouts/
      default.tsx              # React Server Component (default desktop)
      minimal.tsx              # Alternative layout
      mobile.tsx               # Optional mobile-specific
    skins/
      board/
        default.tsx
        gallery.tsx
        blog.tsx
      page/
        default.tsx
      document/
        default.tsx
    widget-styles/
      card.tsx
      bare.tsx
    index.ts                   # Re-exports for static analysis
  aurora-pro/                  # Child theme
    manifest.ts                # parent: "aurora"
    tokens.ts                  # Override only what differs
    skins/board/gallery.tsx    # Overridden skin
```

### Manifest (`manifest.ts`)

```ts
import { z } from 'zod'

export const tokensSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    background: z.string(),
    foreground: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    fontFamilyBase: z.string(),
    fontFamilyHeading: z.string(),
    baseSize: z.number().min(12).max(20),
  }),
  spacing: z.object({
    unit: z.number(),
  }),
  radii: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),
})

export default {
  name: 'aurora',
  version: '1.0.0',
  displayName: 'Aurora',
  author: 'Rhymix Team',
  parent: undefined,
  layouts: ['default', 'minimal', 'mobile'],
  skins: {
    board: ['default', 'gallery', 'blog'],
    page: ['default'],
    document: ['default'],
  },
  widgetStyles: ['card', 'bare'],
  tokensSchema,
  supportsDarkMode: true,
} satisfies ThemeManifest
```

### Registry

The runtime registry resolves theme assets by name → component import. It is initialized at server startup and exposes:

```ts
interface ThemeRegistry {
  getTheme(name: string): ThemeManifest | null
  getLayout(themeName: string, layoutName: string): Promise<React.FC<LayoutProps>>
  getSkin(themeName: string, moduleType: string, skinName: string): Promise<React.FC<SkinProps>>
  getWidgetStyle(themeName: string, styleName: string): Promise<React.FC<WidgetStyleProps>>
  resolveTokens(themeName: string, overrides?: Partial<Tokens>): Tokens
}
```

Lookups walk the parent chain when `parent` is declared.

## Domain Model (Prisma)

```prisma
// CMS domain - Theme/Layout/Skin Registry

model Theme {
  id            String   @id @default(cuid())
  name          String   @unique             // e.g., "aurora"
  displayName   String
  version       String                       // semver
  author        String?
  parent        String?                      // parent theme name
  manifest      Json                         // full manifest snapshot
  tokensSchema  Json                         // Zod schema serialized
  status        ThemeStatus @default(INSTALLED)
  installedAt   DateTime @default(now())
  updatedAt     DateTime @updatedAt

  layouts       Layout[]
  skins         Skin[]
  widgetStyles  WidgetStyle[]
  assignments   ThemeAssignment[]

  @@index([status])
}

enum ThemeStatus {
  INSTALLED
  ACTIVE
  DISABLED
}

// Rhymix-compatible Layout record
model Layout {
  id          String   @id @default(cuid())
  legacySrl   Int?     @unique               // Rhymix layout_srl (migration support)
  themeId     String
  name        String                          // e.g., "default"
  title       String
  layoutPath  String                          // e.g., "themes/aurora/layouts/default"
  layoutType  LayoutType @default(DESKTOP)   // P=DESKTOP, M=MOBILE
  siteSrl     Int?                            // for per-site layouts
  extraVars   Json?                           // typed via tokensSchema

  theme       Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)

  @@unique([themeId, name, layoutType])
  @@index([siteSrl])
}

enum LayoutType {
  DESKTOP   // P
  MOBILE    // M
}

model Skin {
  id          String   @id @default(cuid())
  themeId     String
  moduleType  String                          // "board", "page", "document"
  name        String                          // "default", "gallery"
  title       String
  componentPath String                        // import path

  theme       Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  colorSets   ColorSet[]

  @@unique([themeId, moduleType, name])
  @@index([moduleType])
}

model ColorSet {
  id        String  @id @default(cuid())
  skinId    String
  name      String                            // "blue", "dark"
  tokens    Json                              // partial token override

  skin      Skin    @relation(fields: [skinId], references: [id], onDelete: Cascade)

  @@unique([skinId, name])
}

model WidgetStyle {
  id            String  @id @default(cuid())
  themeId       String
  name          String
  componentPath String

  theme         Theme   @relation(fields: [themeId], references: [id], onDelete: Cascade)

  @@unique([themeId, name])
}

// Resolution: domain → module_instance overrides apply on top
model ThemeAssignment {
  id           String   @id @default(cuid())
  themeId      String
  scope        AssignmentScope                 // SITE, DOMAIN, MODULE_INSTANCE
  refType      String                          // "site" | "domain" | "mid"
  refId        String                          // siteSrl | hostname | mid
  layoutName   String?                         // optional layout override
  mobileLayoutName String?                     // mlayout (-2 for responsive)
  mlayoutMode  MobileLayoutMode @default(RESPONSIVE) // -1/-2/SPECIFIC
  skinName     String?                         // for module instance scope
  tokensOverride Json?                         // per-scope token overrides
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  theme        Theme    @relation(fields: [themeId], references: [id])

  @@unique([scope, refType, refId])
  @@index([refId])
}

enum AssignmentScope {
  SITE
  DOMAIN
  MODULE_INSTANCE
}

enum MobileLayoutMode {
  USE_DEFAULT     // -1
  RESPONSIVE      // -2
  SPECIFIC        //  use mobileLayoutName
}
```

## API Surface (tRPC)

```ts
// trpc/routers/theme.ts
export const themeRouter = router({
  // List installed themes
  list: publicProcedure
    .query(({ ctx }) => ctx.themeService.list()),

  // Install from zip upload or npm package
  install: protectedProcedure
    .input(z.object({
      source: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('upload'), fileId: z.string() }),
        z.object({ kind: z.literal('npm'), packageName: z.string() }),
      ]),
      upgrade: z.boolean().optional(),
    }))
    .mutation(({ input, ctx }) => ctx.themeService.install(input)),

  // Activate theme for a scope
  activate: protectedProcedure
    .input(z.object({
      themeName: z.string(),
      scope: z.enum(['SITE', 'DOMAIN', 'MODULE_INSTANCE']),
      refId: z.string(),
    }))
    .mutation(({ input, ctx }) => ctx.themeService.activate(input)),

  // Enter no-commit preview
  preview: protectedProcedure
    .input(z.object({ themeName: z.string() }))
    .mutation(({ input, ctx }) => ctx.themeService.startPreview(input)),

  // Update token overrides
  updateTokens: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      tokens: z.record(z.unknown()),
    }))
    .mutation(({ input, ctx }) => ctx.themeService.updateTokens(input)),

  // List skins available for a module type
  listSkins: publicProcedure
    .input(z.object({ themeName: z.string(), moduleType: z.string() }))
    .query(({ input, ctx }) => ctx.themeService.listSkins(input)),
})

// trpc/routers/layout.ts
export const layoutRouter = router({
  assign: protectedProcedure
    .input(z.object({
      scope: z.enum(['SITE', 'DOMAIN', 'MODULE_INSTANCE']),
      refId: z.string(),
      layoutName: z.string(),
      mobileLayout: z.object({
        mode: z.enum(['USE_DEFAULT', 'RESPONSIVE', 'SPECIFIC']),
        layoutName: z.string().optional(),
      }),
    }))
    .mutation(({ input, ctx }) => ctx.layoutService.assign(input)),
})

// trpc/routers/skin.ts
export const skinRouter = router({
  assign: protectedProcedure
    .input(z.object({
      mid: z.string(),
      skinName: z.string(),
    }))
    .mutation(({ input, ctx }) => ctx.skinService.assign(input)),
})
```

## Component Composition Pattern

A request to `https://example.com/board/notice` (where `notice` is a module instance, mid=`notice`) composes as follows:

```
Request: GET https://example.com/board/notice
   │
   ▼
┌──────────────────────────────────────────────┐
│ Middleware (next.config / middleware.ts)     │
│  - Resolve domain → siteSrl, hostname        │
│  - Detect user-agent (mobile/desktop)        │
│  - Set request context                       │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ Route Handler (app/[mid]/page.tsx)           │
│  1. ThemeResolver.resolve(req)               │
│     → ResolvedTheme {                        │
│         theme, layout, skin,                 │
│         tokens, mode (light/dark)            │
│       }                                      │
│  2. Module dispatch (board, page, etc.)      │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ <ThemeProvider tokens={resolved.tokens}>     │
│   <Layout (resolved.layout)>                 │
│     <ModulePage moduleType="board" mid="…">  │
│       <Skin (resolved.skin)>                 │
│         <BoardContent posts={…} />           │
│       </Skin>                                │
│     </ModulePage>                            │
│   </Layout>                                  │
│ </ThemeProvider>                             │
└──────────────────────────────────────────────┘
```

`ThemeProvider` injects CSS custom properties via inline `<style>` block emitted by RSC (no client hydration needed for tokens themselves).

### Concrete Code Sketch

```tsx
// app/[mid]/page.tsx (RSC)
import { ThemeResolver } from '@/lib/theme/resolver'
import { ThemeProvider } from '@/components/theme-provider'

export default async function ModuleInstancePage({
  params,
}: { params: Promise<{ mid: string }> }) {
  const { mid } = await params
  const resolved = await ThemeResolver.resolve({ mid, requestHeaders: headers() })

  const Layout = await resolved.registry.getLayout(resolved.theme.name, resolved.layout)
  const Skin = await resolved.registry.getSkin(resolved.theme.name, resolved.moduleType, resolved.skin)

  const moduleData = await fetchModuleData(mid)

  return (
    <ThemeProvider tokens={resolved.tokens} mode={resolved.mode}>
      <Layout extraVars={resolved.extraVars}>
        <Skin data={moduleData} colorSet={resolved.colorSet} />
      </Layout>
    </ThemeProvider>
  )
}
```

```tsx
// components/theme-provider.tsx (RSC, no client JS for tokens)
export function ThemeProvider({
  tokens,
  mode,
  children,
}: {
  tokens: Tokens
  mode: 'light' | 'dark'
  children: React.ReactNode
}) {
  const cssVars = tokensToCssVars(tokens)
  return (
    <>
      <style data-rx-theme>{`:root{${cssVars.light}} .dark{${cssVars.dark ?? ''}}`}</style>
      <div data-theme-mode={mode}>{children}</div>
    </>
  )
}
```

## Reference: Rhymix v2.1.32 Theme System (Verified Live 2026-05-10)

A clean install of Rhymix at `localhost:8080` shipped with the **XEDITION**
layout/skin family and the following surface-level conventions that
Rhymix-TS preserves.

### Default Theme Family

`XEDITION` is the default theme provisioned at install time. It supplies:

- a top layout (logo left, primary nav center, search/settings/profile
  icons right)
- a hero slider section with arrow navigation
- a content-block pattern (image + text two-column)
- a board skin matched to the layout
- per-extra-var settings: main page demo, login widget toggle, layout type
  (auto/wide/fixed), main menu type (FIXED+SHRINKING by default), submenu
  type, fixed-width toggle, slide tab variants

Rhymix-TS ships with at least:

- `default` — neutral, accessibility-first equivalent of XEDITION (preset
  tokens for light/dark mode)
- `default-mobile` — companion mobile layout assigned to `mlayout_srl`

### Theme Settings Form Surface (Three-Pane Editor)

The theme settings pane (Pane 3 in `/admin/site/design`, see
SPEC-ADMIN-001) renders the following form fields auto-derived from the
theme manifest:

| Field | Source | Required |
|---|---|---|
| 경로 (path) | manifest.path | read-only |
| 설명 (description) | manifest.description | read-only |
| 작성자 (author) | manifest.author | read-only |
| 제목 (title) | assignment.title override | yes |
| 헤더 스크립트 | assignment.headerScript | no |
| 확장 변수 (extra_vars) | manifest.tokens (Zod schema) | per-field |

Rule: the manifest's `tokens` Zod schema MUST be sufficient to render Pane
3 with full validation, default values, descriptions, and grouped sections
(rendered as inner tabs: Basic | Slide | etc.).

### Skin Assignment Targets

Rhymix's design pane lets admins assign skins per-target:

- 레이아웃 → `Layout` (assigned per-domain, mobile separately)
- 문서 페이지 → `PageSkin` (per page module instance)
- 게시판 → `BoardSkin` (per board module instance)
- 회원 → `MemberSkin` (site-wide)

Rhymix-TS exposes the same four assignment targets via the
`ThemeAssignment.scope` enum (SITE | DOMAIN | MODULE_INSTANCE) plus the
implicit module type (page/board/member) recovered from the assignment's
target instance.

### PC vs Mobile Tabs

Pane 1's PC/Mobile tab toggle maps directly to `Layout.layoutType` (`P` |
`M`) per Rhymix. Rhymix-TS preserves the toggle but uses responsive design
by default:

- `mlayout_srl = -2` (responsive, reuse PC layout) is the recommended
  default — only show the Mobile tab if the operator explicitly opts into
  a separate mobile layout.

## Out of Scope

- **Visual Theme Editor (drag-drop WYSIWYG)**: Future SPEC; this SPEC delivers token-form editing only.
- **Theme Marketplace / Browsing UI**: Future SPEC; this SPEC handles install via upload or npm package name.
- **Email Template Theming**: Email templates are owned by SPEC-CONTENT-001 (or future SPEC-EMAIL-001).
- **Per-User Personal Themes**: All scope limits to site / domain / module-instance.
- **CSS-in-JS Runtime Theming**: Tokens are CSS custom properties; styled-components or emotion are not adopted.
- **Legacy Smarty Layout Execution**: Rhymix `.html` Smarty layouts must be ported to React; this SPEC does not run a Smarty runtime.

## Open Questions

1. **Tailwind 4 `@theme` vs CSS-in-JS for skin variants**: Should skin-level color variants (Rhymix `colorset`) be expressed as Tailwind `@theme inline` blocks per variant, or should we expose tokens via a small CSS-in-JS layer for runtime variant switching? Decision blocker: how often colorsets change at runtime (per-page navigation vs admin-only).
2. **Server-only token resolution vs client hydration**: Tokens are emitted from RSC. But for dark-mode toggle (`next-themes`), we need to switch CSS class on the client. Should we (a) ship both light and dark token blocks server-side and toggle via `.dark` selector (current plan), or (b) hydrate tokens on the client via React context? Current plan favors (a) for performance.
3. **Manifest format: `manifest.ts` vs `theme.json`**: TS gives us live Zod schemas and IDE support; JSON gives easier external tooling. Plan: support both, with TS as canonical and JSON as a generated artifact.
4. **Container queries vs media queries for responsive**: Tailwind 4 supports both. For mobile-layout fallback, do we make container query the default? Suggested: yes, with media-query fallback for older browsers.

## Dependencies & Risks

### Dependencies

- **SPEC-ADMIN-001 (Module Instance & Domain Management)**: Provides `mid` (module instance identifier), domain registry, and admin UI shell. ThemeAssignment.refId values come from these systems.
- **SPEC-CONTENT-001 (Module Render Targets)**: Defines the module page contract — `(moduleType, mid, query) → renderable data`. Skins receive this data shape.
- **next-themes (^0.4)**: For client-side dark-mode class toggle.
- **Tailwind CSS 4 + `@theme inline`**: For bridging CSS variables to utility classes.
- **Prisma + PostgreSQL JSONB**: For `manifest`, `extraVars`, `tokensOverride` storage.
- **Zod 3.23+**: For manifest validation and tokens schema.
- **shadcn/ui**: As primitive layer for admin UI; theme tokens map onto shadcn token names.

### Risks

| Risk                                                                              | Likelihood | Impact | Mitigation                                                                        |
| --------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------- |
| Hot-swap of token changes diverges from Tailwind's static utility resolution      | Medium     | High   | Use `@theme inline` so utilities resolve to `var(--rx-…)` at request time         |
| Theme installation arbitrary-code execution (TS files import via dynamic require) | High       | Critical | Restrict installation to admins; sandbox via Node `vm` for manifest only; require typed manifest before file system trust |
| Parent theme uninstall breaks child theme silently                                | Medium     | High   | Foreign-key style check in `Theme` table; reject uninstall if children exist      |
| Mobile-layout chain (-1/-2/specific) confuses admins                              | High       | Medium | Admin UI uses radio with friendly labels: "Use site default", "Responsive (recommended)", "Specific mobile layout" |
| Migration from Rhymix `extra_vars` (untyped JSON) to Zod-typed tokens             | High       | High   | Provide migration tool that infers schema from existing values; surface validation errors with deferred fixes |
| Per-domain SSR cache fragmentation                                                | Medium     | Medium | Use `cache-control` keyed on `(hostname, themeVersion, mode)`                     |
| Dark-mode FOUC (flash of unstyled content) on first paint                         | Medium     | Medium | Use `next-themes` `attribute="class"` with synchronous script; emit dark tokens server-side |

### Performance Considerations

- Token CSS injection adds ~1–3KB per response; gzipped ~500B. Acceptable.
- Layout/Skin component imports are dynamic; cache import handles in registry to avoid repeated `import()` overhead.
- `ThemeAssignment` lookup must be sub-millisecond; index on `(scope, refType, refId)`.

### Security Considerations

- Theme upload must be authenticated as site admin; theme files should not be executed during installation, only validated.
- Manifest TS files are dynamically imported only after passing static validation; consider running them in a worker thread / vm context.
- `tokensOverride` JSONB must be validated against `tokensSchema` before persistence (Zod parse).
- Preview cookie (`rx-theme-preview`) must be HttpOnly + SameSite=Strict and signed.

---

## Traceability

- REQ-THEME-001..130 → AC-THEME-001..130 → Implementation in `lib/theme/`, `themes/`, Prisma `Theme*` models
- Related SPEC: SPEC-ADMIN-001 (provides mid/domain), SPEC-CONTENT-001 (provides module render contract)
- Rhymix concepts preserved: `layouts`, `skins`, `m.skins`, `widgetstyles`, `colorset`, `extra_vars`, `mlayout_srl`, `layout_type`
