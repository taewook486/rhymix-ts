# SPEC-ADMIN-001 Slice C Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: Admin Shell UI (`/admin` 레이아웃 + sidebar + topbar) + 모듈 인스턴스 관리 페이지 (목록 / 생성 / 삭제) + shadcn/ui 도입
Base: main = dba255b (Slice B 완료 — middleware Domain 해석 + `[mid]` 라우팅 + tRPC `admin.module.*` 4 procedure)
Depends on: Slice A (도메인 서비스), Slice B (tRPC 라우터 + `protectedAdminProcedure`)

> **Note**: 본 슬라이스는 SPEC-ADMIN-001 의 **사용자 표면 UI 첫 단계** 다. Slice B 가 tRPC 로 노출한 `admin.module.{create,list,get,delete}` 4 개 procedure 를 (a) Admin Shell 레이아웃 (sidebar IA + topbar + main content area), (b) 모듈 인스턴스 목록 페이지, (c) 모듈 생성 폼, (d) 모듈 삭제 confirm 다이얼로그로 묶어 관리자가 브라우저 UI 만으로 인스턴스를 CRUD 할 수 있게 한다. 이 과정에서 **shadcn/ui** 를 `@rhymix-ts/ui` 워크스페이스 패키지에 도입해 후속 슬라이스 (Menu 편집, Site 설정, Members 관리) 가 동일 디자인 시스템을 공유한다. Menu/MenuItem CRUD, AdminLog `auditLogger` 활성화, 2FA 강제, Site 설정 페이지는 Slice D 이후로 분리한다.

---

## Pre-Flight Findings (2026-05-16)

Slice C 착수 직전 워크스페이스 구조, Tailwind 4 설정, Next.js App Router 라우트 충돌 가능성, tRPC 클라이언트 패턴을 점검해 네 가지 결정을 확정했다.

### Q1: shadcn/ui 설치 위치 — `packages/ui/` 에 도입, `@rhymix-ts/ui` 가 wrapper 제공

`packages/ui/` 는 현재 `cn()` 유틸 하나만 export 하는 minimal workspace 패키지다 (packages/ui/src/index.ts, line 1-7). 의존성도 `clsx` + `tailwind-merge` 뿐이라 shadcn/ui 의 **정확한 호스트** 위치다. `apps/web/package.json` 에 `@rhymix-ts/ui: workspace:*` 가 이미 등록되어 있으므로 web 앱에서 `import { Button } from '@rhymix-ts/ui'` 형태로 즉시 사용 가능하다.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: `apps/web/components/ui/` 에 직접 shadcn init                          | 단일 패키지로 끝. 설정 단순.                         | 후속 SPEC (Mobile 앱, 별도 admin 앱) 에서 동일 컴포넌트 재사용 시 중복 발생.        |
| **Path B (채택)**: `packages/ui/src/components/` 에 shadcn 도입, `@rhymix-ts/ui` 가 re-export | 워크스페이스 차원 디자인 시스템. 후속 SPEC 에서 재사용 가능. | `components.json` 의 `aliases.components` 가 packages/ui 를 가리켜야 함 (튜닝 1회). |

→ **채택 경로**: Path B. `packages/ui/src/components/` 디렉토리에 shadcn 의 primitive 컴포넌트를 두고 `packages/ui/src/index.ts` 에서 barrel re-export. shadcn CLI (`pnpm dlx shadcn@latest init`) 는 `components.json` 으로 destination 을 명시하므로 `apps/web/` 에서 init 하되 alias 만 `packages/ui` 를 가리키도록 한다. 단, **Tailwind 4 의 CSS-first 설정 (apps/web/app/globals.css 의 `@import 'tailwindcss'`) 은 변경하지 않는다** — shadcn 의 CSS 변수와 base 스타일을 globals.css 에 추가하는 패치만 적용. tailwind.config.ts 파일은 만들지 않는다 (Tailwind 4 는 CSS @theme 블록으로 토큰 정의).

설치할 컴포넌트 (8개): `button`, `input`, `label`, `table`, `dialog`, `dropdown-menu`, `badge`, `sonner` (toast). sidebar 는 직접 구현 (shadcn 의 `sidebar` 블록은 사이즈가 크고 우리 IA 와 합치되지 않음 — Q4 참조).

### Q2: `app/(admin)/` route group vs `app/admin/` — `app/admin/` 에 layout 추가, route group 도입 안 함

현재 `apps/web/app/admin/page.tsx` 는 AUTH-001 Slice H 가 도입한 placeholder 다 (apps/web/app/admin/page.tsx:11-28). spec.md 의 의도된 구조 (line 820-832) 는 `app/(admin)/` 라우트 그룹이지만, Next.js 의 라우트 그룹은 URL 에 영향을 주지 않으므로 `app/admin/page.tsx` 와 `app/(admin)/page.tsx` 가 동시에 존재하면 **둘 다 `/admin` 으로 매핑되어 빌드 오류** 가 난다.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: `app/admin/` 의 placeholder 를 삭제하고 `app/(admin)/` 으로 전체 이전 | spec.md 의 구조와 정확히 일치                       | placeholder 파일 변경 이력 손실. 그룹 도입의 실익이 작음 (현 시점 단일 그룹).        |
| **Path B (채택)**: `app/admin/` 디렉토리를 그대로 유지하고 `layout.tsx` + 하위 페이지 추가 | 기존 placeholder 자연스러운 진화. 파일 한 개 (layout.tsx) 추가로 shell 완성. | spec.md 의 `(admin)` 표기와 불일치 — heads-up 으로 명시.                            |

→ **채택 경로**: Path B. `apps/web/app/admin/layout.tsx` 를 신규 추가하고, 기존 `apps/web/app/admin/page.tsx` 의 placeholder 콘텐츠를 dashboard 카드로 교체한다. spec.md 의 `(admin)` 표기는 후속 SPEC 에서 다중 admin 영역 (`(admin-mobile)` 등) 이 필요할 때 도입한다 — Slice C 범위 밖. heads-up 으로 다음 슬라이스에 명시한다.

### Q3: tRPC 클라이언트 — Server Component 에서는 `createCaller` (SSR direct), Client Component 에서는 React Query

`apps/web/lib/trpc/` 디렉토리는 **아직 없다**. 클라이언트 구성은 본 슬라이스에서 신규 도입한다. Next.js 16 App Router 의 두 가지 호출 경로를 고려한다.

| 호출 경로                          | 방식                                          | 사용처                                                                              |
| ---------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Server Component (목록 페이지)     | `appRouter.createCaller(ctx)` 직접 호출       | `/admin/modules/page.tsx` — list 데이터를 SSR 로 미리 로드해 hydration mismatch 회피 |
| Client Component (생성 폼, 삭제)   | `trpc.admin.module.create.useMutation()` 등 | 사용자 인터랙션 핸들러                                                              |
| Server Action (form action)        | Server Action 안에서 `appRouter.createCaller(ctx).admin.module.create(input)` | mutation 의 형태가 Form submission 인 경우 — Slice C 의 생성 폼이 이 패턴 사용     |

→ **채택 경로**: 셋 다 사용한다.
- **목록 페이지** (`/admin/modules/page.tsx`) 는 Server Component 로 두고 `createCaller` 로 list 호출.
- **생성 폼** 은 Server Action 패턴 (`actions.ts` 의 `createModuleAction`) — `useActionState` 로 progressive enhancement.
- **삭제** 는 Client Component + Server Action (deleteModuleAction) — confirm 다이얼로그가 client interaction.

이 결정의 결과: 본 슬라이스에서는 `@trpc/react-query` 의 **`TRPCProvider` 와 Query Client provider 를 도입하지 않는다.** React Query 인프라는 Slice D 이후 필요해질 때 (예: 메뉴 드래그앤드롭의 optimistic update) 추가한다. 본 슬라이스의 모든 데이터 흐름은 (a) Server Component direct call + (b) Server Action 두 가지로 충분하다. 이는 token / bundle 비용을 최소화하면서 SPEC-ADMIN-001 Slice C 의 AC 를 완전히 충족한다.

신규 파일: `apps/web/lib/trpc/server.ts` (Server-side `createCaller` 헬퍼) — `appRouter.createCaller(await createContext({ req: ... }))` 를 반환. Server Component / Server Action 에서 `await getServerCaller().admin.module.list(...)` 형태로 사용.

### Q4: Sidebar 컴포넌트 — 직접 구현, shadcn `sidebar` 블록 미도입

shadcn/ui 의 `sidebar` 블록 (https://ui.shadcn.com/blocks/sidebar) 은 약 500 LOC 의 collapsible mobile-responsive 컴포넌트이며 Slice C 의 sidebar IA (spec.md line 904-926, 10개 섹션) 와 매핑이 1:1 이 아니다. 직접 구현하는 편이 사이즈가 작고 IA 변경에 유연하다.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: shadcn `sidebar` 블록 도입                                            | mobile collapsible, accessibility 기본 제공          | LOC 큼. IA 와 mapping 추가 작업. Slice C 범위 초과.                                  |
| **Path B (채택)**: 자체 `AdminSidebar` 컴포넌트 (`<nav>` + `<ul>` + Link)     | Slice C 의 IA (대시보드 + 모듈 + 추후 확장 자리) 에 정확히 맞춤. ~100 LOC. | mobile collapse 는 후속 슬라이스에서 추가 필요.                                    |

→ **채택 경로**: Path B. sidebar 의 active link 강조는 `usePathname()` + Tailwind class toggle 로 구현. mobile responsive 는 Slice D 의 Menu 편집기 도입 시점에 함께 (drag-and-drop 라이브러리 추가하는 김에 sidebar 의 mobile drawer 도 도입) 한다. 본 슬라이스는 desktop sidebar 만으로 충분 — admin 페이지는 데스크탑 사용이 압도적.

### Q5 (추가 점검): `@rhymix-ts/ui` 패키지의 React peerDependency vs shadcn 의 client 컴포넌트

`packages/ui/package.json` 의 `peerDependencies` 에 `react: ^19.0.0` 이 있고 (line 20-23), shadcn 의 primitive 컴포넌트는 `"use client"` directive 가 필요하다. Next.js App Router 의 server boundary 에서 client 컴포넌트를 import 하려면 패키지가 ESM + tree-shakable 이어야 하는데 `packages/ui` 는 이미 `"type": "module"` 이며 `main: ./src/index.ts` (소스 직접 export) 이므로 추가 빌드 단계 없이 Next.js 가 처리한다. 단, `index.ts` 에서 client 컴포넌트와 server-safe 유틸 (`cn`) 을 같이 export 하면 server 컴포넌트가 client 컴포넌트의 transitive import 를 흡수해 client-island 가 의도하지 않게 부풀 수 있다.

→ **해결**: barrel 분리. `@rhymix-ts/ui` 메인 entry 는 `cn` 같은 server-safe 유틸만, `@rhymix-ts/ui/components` 같은 별도 subpath 가 client 컴포넌트를 export 하도록 `package.json` 의 `exports` 필드를 확장한다 (현재 `exports: { ".": "./src/index.ts" }` 에 `"./components": "./src/components/index.ts"` 추가). 이로써 server 컴포넌트는 `import { cn } from '@rhymix-ts/ui'` 만 import 하고 client 컴포넌트는 `import { Button } from '@rhymix-ts/ui/components'` 를 사용해 boundary 가 깨끗해진다.

---

## Slice C — Admin Shell UI + Module 관리 페이지 + shadcn/ui

### Goal

Slice B 가 만든 tRPC 라우터 위에 (a) Admin Shell 레이아웃 (sidebar + topbar + main content area + 비관리자 redirect), (b) `/admin` 대시보드의 간략 카드 (모듈 개수 표시), (c) `/admin/modules` 모듈 인스턴스 목록 페이지 (테이블 + 생성 버튼), (d) `/admin/modules/new` 모듈 생성 폼 (mid / moduleCode / name 입력), (e) 모듈 삭제 confirm 다이얼로그 (인덱스 모듈 보호 에러 toast) 를 도입한다. 이 다섯 가지가 완성되면 관리자는 브라우저만으로 사이트의 모듈 인스턴스를 CRUD 할 수 있다. 동시에 후속 슬라이스 (Menu, Site, Members) 가 재사용할 **shadcn/ui 디자인 시스템** 을 `@rhymix-ts/ui` 워크스페이스 패키지에 도입한다.

### Branch

`feature/admin-001-slice-c` (base: main = dba255b, Slice B 머지 후 새로 생성)

### REQ / AC scope

Slice C 에서 완전 구현:

- **REQ-ADMIN-020 (admin 가드 UI 표면)** — `apps/web/app/admin/layout.tsx` 가 server-side 에서 `isAdminSession` 검사 후 비관리자는 `/login?callbackUrl=/admin` 으로 redirect. tRPC FORBIDDEN (Slice B 의 `protectedAdminProcedure`) 와 함께 이중 게이트.
- **REQ-ADMIN-021 (비관리자에게 관리자 데이터 비노출 — UI 레벨)** — layout 단계 redirect 로 admin route 가 비관리자에게 렌더링되지 않음.
- **Admin Shell IA (spec.md line 904-926 중 본 슬라이스 범위)** — sidebar 가 다음 섹션을 렌더링:
  - 대시보드 `/admin`
  - 콘텐츠 > 게시판(모듈) `/admin/modules`
  - 그 외 섹션 (사이트 / 회원 / 설정 등) 은 disabled 상태로 표기 (`<li>` 에 `aria-disabled="true"` + Slice D 도입 예정 라벨) — 사용자에게 IA 의 전체 모습을 미리 보여주되 클릭은 차단.
- **REQ-ADMIN-020 (모듈 CRUD UI)** — `/admin/modules` 페이지가 `admin.module.list` 결과를 테이블로 렌더링, "새 모듈" 버튼, 행마다 "삭제" 버튼.
- **REQ-ADMIN-020 (모듈 생성 UI)** — `/admin/modules/new` 의 폼이 mid / moduleCode / name 을 입력받아 `createModuleAction` Server Action → tRPC `admin.module.create` 호출. 성공 시 `/admin/modules` 로 redirect.
- **REQ-ADMIN-006 (인덱스 모듈 보호 UI 표면)** — 삭제 confirm 다이얼로그에서 `IndexModuleProtectedError` (Slice B 의 tRPC `CONFLICT`) 가 발생하면 사용자 친화적 toast 표시.

Slice C 에서 schema/스캐폴딩만 (실제 enforcement 는 Slice D+):

- **REQ-ADMIN-023 (2FA 강제 UI)** — Slice B 의 `requireAdmin2FAIfEnabled` TODO 와 동일하게 layout 단계 redirect 자리 마련 (현재 no-op + TODO 주석). 실제 동작은 Site Settings 슬라이스 (Slice D+) 에서.
- **AdminLog 표시 UI** — `/admin/logs` 페이지는 본 슬라이스에서 미구현. sidebar 에 disabled 항목으로만 보임.

명시적으로 Slice C 범위 밖:

- REQ-ADMIN-030 ~ 034 (Menu / MenuItem CRUD + 드래그앤드롭) → Slice D
- REQ-ADMIN-040 ~ 043 (Widget Registry UI) → 별도 슬라이스
- REQ-ADMIN-050 ~ 063 (사이트 설정, 캐시 액션 UI) → Slice D
- REQ-ADMIN-070 ~ 072 (AdminLog 기록 활성화 + 표시 UI) → Slice D
- REQ-ADMIN-080 ~ 101 (헬스 대시보드 위젯, 가져오기/내보내기, 즐겨찾기 UI) → 후속 슬라이스
- 모듈별 개별 설정 페이지 (`/admin/modules/[code]/[instanceId]`) → 본 슬라이스에서는 삭제만, 개별 설정 페이지는 SPEC-CONTENT-001 의 board 모듈 도입 시
- mobile responsive sidebar (drawer / collapsible) → Slice D
- `ModuleConfig` 1:1 FK 표시 / 편집 → SPEC-CONTENT-001
- React Query Client 인프라 (`TRPCProvider`) → 필요해지는 슬라이스에서

### Files (new + modified)

| File                                                                  | Status | Purpose                                                                              |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `packages/ui/package.json`                                            | edit   | `exports` 필드 확장 (`./components` 추가), shadcn 런타임 deps 추가 (`@radix-ui/*`, `class-variance-authority`, `lucide-react`, `sonner`) |
| `packages/ui/src/components/index.ts`                                 | new    | shadcn primitive barrel re-export                                                    |
| `packages/ui/src/components/button.tsx`                               | new    | shadcn Button (cva variants)                                                          |
| `packages/ui/src/components/input.tsx`                                | new    | shadcn Input                                                                          |
| `packages/ui/src/components/label.tsx`                                | new    | shadcn Label                                                                          |
| `packages/ui/src/components/table.tsx`                                | new    | shadcn Table primitives (Table, TableHeader, TableBody, TableRow, TableCell)         |
| `packages/ui/src/components/dialog.tsx`                               | new    | shadcn Dialog (Radix Dialog wrapper)                                                  |
| `packages/ui/src/components/dropdown-menu.tsx`                        | new    | shadcn DropdownMenu (Radix DropdownMenu wrapper)                                      |
| `packages/ui/src/components/badge.tsx`                                | new    | shadcn Badge                                                                          |
| `packages/ui/src/components/sonner.tsx`                               | new    | Sonner toast wrapper (`Toaster` component)                                            |
| `apps/web/components.json`                                            | new    | shadcn CLI 설정 — `aliases.components` = `@rhymix-ts/ui/components`, `aliases.utils` = `@rhymix-ts/ui` |
| `apps/web/app/globals.css`                                            | edit   | shadcn CSS variables 추가 (--background, --foreground, --primary 등 + dark mode block). 기존 SPEC-THEME-001 변수는 보존 |
| `apps/web/app/admin/layout.tsx`                                       | new    | Admin Shell — sidebar + topbar + main. server-side `isAdminSession` 가드. `<Toaster />` mount. |
| `apps/web/app/admin/layout.test.tsx`                                  | new    | RED first — C-1, C-2                                                                  |
| `apps/web/app/admin/page.tsx`                                         | edit   | placeholder 를 dashboard 카드로 교체. Server Component 가 `getServerCaller().admin.module.list({ siteId })` 호출 후 총 모듈 개수 표시 |
| `apps/web/app/admin/modules/page.tsx`                                 | new    | 모듈 목록 페이지 — Server Component, list 호출 후 `<ModuleTable>` 렌더, "새 모듈" Link |
| `apps/web/app/admin/modules/page.test.tsx`                            | new    | RED first — C-3, C-4                                                                  |
| `apps/web/app/admin/modules/new/page.tsx`                             | new    | 모듈 생성 폼 — Client Component (`<CreateModuleForm>` 호출)                          |
| `apps/web/app/admin/modules/actions.ts`                               | new    | Server Actions: `createModuleAction`, `deleteModuleAction` (tRPC `createCaller` 위임) |
| `apps/web/app/admin/modules/actions.test.ts`                          | new    | RED first — C-9, C-10                                                                 |
| `apps/web/components/admin/AdminSidebar.tsx`                          | new    | sidebar IA 컴포넌트 (Client Component — `usePathname` active link)                  |
| `apps/web/components/admin/AdminTopbar.tsx`                           | new    | topbar — 사용자 이름 + 로그아웃 link (`<Link href="/api/auth/signout">`)             |
| `apps/web/components/admin/ModuleTable.tsx`                           | new    | 모듈 목록 테이블 — shadcn `<Table>` + 각 행에 삭제 버튼 (Client Component)            |
| `apps/web/components/admin/ModuleTable.test.tsx`                      | new    | RED first — C-7                                                                       |
| `apps/web/components/admin/CreateModuleForm.tsx`                      | new    | 생성 폼 — `useActionState(createModuleAction)` Client Component                       |
| `apps/web/components/admin/CreateModuleForm.test.tsx`                 | new    | RED first — C-5, C-6                                                                  |
| `apps/web/components/admin/DeleteModuleButton.tsx`                    | new    | 삭제 버튼 + confirm 다이얼로그 + toast (Client Component, sonner 사용)                |
| `apps/web/components/admin/DeleteModuleButton.test.tsx`               | new    | RED first — C-8                                                                       |
| `apps/web/lib/trpc/server.ts`                                         | new    | `getServerCaller()` 헬퍼 — `appRouter.createCaller(await createContext({ req }))`     |
| `.moai/specs/SPEC-ADMIN-001/progress.md`                              | edit   | Slice C 결과 섹션 추가                                                                |

신규 파일 26 개 + 수정 4 개. 신규 영역은 `app/admin/*` 하위와 `components/admin/*` 이며, `packages/ui/src/components/` 도 신규 디렉토리이므로 충돌 위험은 낮다. `app/admin/page.tsx` 만 기존 placeholder 를 교체한다.

### 핵심 구현 스케치

#### 1. shadcn/ui 도입 — `packages/ui/` 에 호스팅

```bash
# apps/web/ 에서 실행 (components.json 의 alias 가 packages/ui 를 가리킴)
pnpm dlx shadcn@latest init
# components.json 답변:
#   style: new-york
#   baseColor: zinc
#   cssVariables: yes
#   aliases.components: "@rhymix-ts/ui/components"
#   aliases.utils:      "@rhymix-ts/ui"
# 컴포넌트 추가:
pnpm dlx shadcn@latest add button input label table dialog dropdown-menu badge sonner
```

`packages/ui/package.json` 변경 (의사):
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.460.0",
    "sonner": "^1.7.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0"
  }
}
```

`packages/ui/src/components/index.ts` (barrel):
```ts
export * from './button';
export * from './input';
export * from './label';
export * from './table';
export * from './dialog';
export * from './dropdown-menu';
export * from './badge';
export * from './sonner';
```

`apps/web/app/globals.css` 패치 (의사 — 기존 변수 위에 shadcn 변수 추가):
```css
@import 'tailwindcss';

/* shadcn/ui CSS variables (NEW) */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    /* ... 나머지 shadcn 변수 ... */
  }
  .dark { /* dark 변수 */ }
}

/* SPEC-THEME-001: design tokens (EXISTING — 보존) */
:root {
  --color-bg: 255 255 255;
  /* ... 기존 변수 그대로 ... */
}
```

`shadcn` 의 `.dark` 클래스 토글과 `[data-theme='dark']` 셀렉터가 충돌하지 않도록 globals.css 의 두 변수 그룹을 독립적으로 관리한다 (SPEC-THEME-001 의 의도 보존). 본 슬라이스의 Admin Shell 은 shadcn 변수만 사용하고, 기존 SPEC-THEME-001 의 변수는 후속 슬라이스에서 통합 정리한다.

#### 2. Admin Shell Layout — `apps/web/app/admin/layout.tsx`

```tsx
// apps/web/app/admin/layout.tsx (의사 코드 — Server Component)
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Toaster } from '@rhymix-ts/ui/components';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login?callbackUrl=/admin');
  }
  // TODO (Slice D — Site Settings): requireAdmin2FAIfEnabled
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <AdminSidebar />
      <div className="grid grid-rows-[56px_1fr]">
        <AdminTopbar userName={session.user.name ?? '관리자'} />
        <main className="p-6 overflow-y-auto bg-zinc-50">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
```

#### 3. Sidebar 컴포넌트 — `apps/web/components/admin/AdminSidebar.tsx`

```tsx
'use client';
// apps/web/components/admin/AdminSidebar.tsx (의사 코드)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@rhymix-ts/ui';

interface NavItem { href: string; label: string; disabled?: boolean }

const NAV: ReadonlyArray<{ section: string; items: NavItem[] }> = [
  { section: '대시보드', items: [{ href: '/admin', label: '대시보드' }] },
  {
    section: '콘텐츠',
    items: [
      { href: '/admin/modules', label: '게시판(모듈)' },
      // Slice D 이후 도입
      { href: '/admin/content/pages',     label: '페이지',   disabled: true },
      { href: '/admin/content/documents', label: '문서',     disabled: true },
    ],
  },
  // 사이트 / 회원 / 설정 등도 동일하게 disabled 자리 마련 (spec.md line 904-926)
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 사이드바" className="bg-zinc-900 text-zinc-100 p-4">
      {NAV.map((g) => (
        <div key={g.section} className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-2">{g.section}</h3>
          <ul className="space-y-1">
            {g.items.map((it) => {
              const active = pathname === it.href;
              return (
                <li key={it.href}>
                  {it.disabled ? (
                    <span aria-disabled="true" className="block px-3 py-2 text-sm text-zinc-500 cursor-not-allowed">
                      {it.label} <span className="text-xs">(준비중)</span>
                    </span>
                  ) : (
                    <Link
                      href={it.href}
                      className={cn(
                        'block px-3 py-2 text-sm rounded',
                        active ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800',
                      )}
                    >
                      {it.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

#### 4. Server-side tRPC caller — `apps/web/lib/trpc/server.ts`

```ts
// apps/web/lib/trpc/server.ts (의사 코드)
import { headers } from 'next/headers';
import { appRouter } from '@/server/api/root';
import { createContext } from '@/server/api/context';

export async function getServerCaller() {
  // headers() 를 Request 로 변환 — host/cookie 등 admin context 에 필요한 헤더 보존
  const h = await headers();
  const reqInit = new Request('http://internal', {
    headers: new Headers(Array.from(h.entries())),
  });
  const ctx = await createContext({ req: reqInit });
  return appRouter.createCaller(ctx);
}
```

#### 5. 모듈 목록 페이지 — `apps/web/app/admin/modules/page.tsx`

```tsx
// apps/web/app/admin/modules/page.tsx (의사 코드 — Server Component)
import Link from 'next/link';
import { getServerCaller } from '@/lib/trpc/server';
import { ModuleTable } from '@/components/admin/ModuleTable';
import { Button } from '@rhymix-ts/ui/components';

export const dynamic = 'force-dynamic';

export default async function ModulesPage() {
  const caller = await getServerCaller();
  // siteId 는 createContext 가 host → domain 으로 재해석 (Slice B createContext.ts:39-54)
  // 현재 ctx.siteId 가 caller 의 procedure input 으로 자동 전달되지는 않으므로 명시 입력
  // siteId 는 layout 에서 별도로 노출하거나, 본 Slice 에서는 createContext 가 ctx.siteId 를 채워두면
  // 호출자가 그것을 input.siteId 로 패스. 본 슬라이스는 ctx.siteId 가 set 되어 있다고 가정 (Slice B 보장).
  const siteId = await getCurrentSiteId(); // helper — ctx.siteId 또는 headers() 기반
  const instances = await caller.admin.module.list({ siteId });
  return (
    <section>
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">모듈 인스턴스</h1>
        <Button asChild><Link href="/admin/modules/new">새 모듈</Link></Button>
      </header>
      <ModuleTable instances={instances} siteId={siteId} />
    </section>
  );
}
```

`getCurrentSiteId` 헬퍼는 `apps/web/lib/admin/site-context.ts` 에 둔다 (신규). 본 슬라이스에서는 단순 헬퍼로 `await headers().then(h => Number(h.get('x-site-id')) || 1)` 정도로 구현하며, multi-site 운영 시 (Slice D 의 Site 설정 UI 도입 후) 별도 로직으로 분리한다.

#### 6. Server Action — `apps/web/app/admin/modules/actions.ts`

```ts
'use server';
// apps/web/app/admin/modules/actions.ts (의사 코드)
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';

const CreateSchema = z.object({
  siteId: z.coerce.number().int().positive(),
  moduleCode: z.string().min(1, '모듈 코드를 입력하세요'),
  mid: z.string().min(1, 'mid 를 입력하세요').max(80),
  name: z.string().min(1, '이름을 입력하세요'),
});

export interface ActionState { error?: string; fieldErrors?: Record<string, string[]> }

export async function createModuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateSchema.safeParse({
    siteId:     formData.get('siteId'),
    moduleCode: formData.get('moduleCode'),
    mid:        formData.get('mid'),
    name:       formData.get('name'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const caller = await getServerCaller();
    await caller.admin.module.create(parsed.data);
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '모듈 생성 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/modules');
  redirect('/admin/modules');
}

export async function deleteModuleAction(
  instanceId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller();
    await caller.admin.module.delete({ instanceId });
    revalidatePath('/admin/modules');
    return { ok: true };
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };  // IndexModuleProtectedError → "this instance is the index module..."
    }
    return { error: '삭제 중 오류가 발생했습니다.' };
  }
}
```

#### 7. 모듈 삭제 버튼 + Dialog — `apps/web/components/admin/DeleteModuleButton.tsx`

```tsx
'use client';
// apps/web/components/admin/DeleteModuleButton.tsx (의사 코드)
import { useState, useTransition } from 'react';
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from '@rhymix-ts/ui/components';
import { toast } from 'sonner';
import { deleteModuleAction } from '@/app/admin/modules/actions';

export function DeleteModuleButton({ instanceId, mid }: { instanceId: number; mid: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">삭제</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>모듈 인스턴스 삭제</DialogTitle>
        </DialogHeader>
        <p>mid={mid} 를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await deleteModuleAction(instanceId);
              if ('error' in res) {
                toast.error(res.error);  // IndexModuleProtectedError 표시
              } else {
                toast.success('삭제되었습니다.');
                setOpen(false);
              }
            })}
          >
            {pending ? '삭제 중…' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Test plan (RED first, 10 tests)

본 슬라이스는 TDD 모드를 따른다. 각 테스트는 RED 부터 시작해 GREEN 으로 진행한다. test runner 는 `vitest`; React 컴포넌트 테스트는 `@testing-library/react` + `jsdom` (apps/web/package.json 에 이미 설치됨).

#### `apps/web/app/admin/layout.test.tsx` — 2 tests

테스트 픽스처: `vi.mock('@/lib/auth/config', () => ({ auth: vi.fn() }))`, `vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }))`.

- **C-1**: `auth()` 가 비관리자 세션 반환 (`{ user: { id: 1, isAdmin: false } }`) → `redirect('/login?callbackUrl=/admin')` 호출됨. (REQ-ADMIN-020 / REQ-ADMIN-021 UI 레벨 차단)
- **C-2**: `auth()` 가 관리자 세션 반환 (`{ user: { id: 1, isAdmin: true } }`) → `redirect` 호출 안 됨, children 이 렌더 결과에 포함됨. (REQ-ADMIN-020 GREEN path)

#### `apps/web/app/admin/modules/page.test.tsx` — 2 tests

테스트 픽스처: `vi.mock('@/lib/trpc/server', () => ({ getServerCaller: vi.fn() }))`, `vi.mock('next/headers', ...)`.

- **C-3**: `caller.admin.module.list({ siteId: 1 })` 가 `[{ id: 1, mid: 'notice', moduleCode: 'board', name: 'Notice', createdAt: ... }]` 반환 → 렌더 결과에 `'notice'`, `'board'`, `'Notice'` 텍스트 포함. (REQ-ADMIN-020 list 표면)
- **C-4**: `caller.admin.module.list(...)` 가 `[]` 반환 → 렌더 결과에 `'등록된 모듈 인스턴스가 없습니다'` (또는 동등한 빈 상태 메시지) 표시.

#### `apps/web/components/admin/CreateModuleForm.test.tsx` — 2 tests

테스트 픽스처: `useActionState` 의 dispatcher 를 mock 하거나, `createModuleAction` 자체를 `vi.fn()` 으로 대체.

- **C-5**: 유효 입력 (`mid=notice`, `moduleCode=board`, `name=공지`) 으로 submit → `createModuleAction` 이 올바른 FormData 로 호출됨.
- **C-6**: `mid` 빈 값 + submit → action 의 `fieldErrors.mid` 가 set 되어 렌더 결과에 `'mid 를 입력하세요'` 표시 (zod safeParse 의 결과를 state 로 반영하는 흐름 검증).

#### `apps/web/components/admin/ModuleTable.test.tsx` — 1 test

- **C-7**: `instances=[{ id: 1, mid: 'notice', moduleCode: 'board', name: 'Notice', createdAt: new Date() }]` 로 렌더 → 행마다 `<DeleteModuleButton instanceId={1} mid="notice" />` 가 포함되어 있고 "삭제" 버튼이 표시됨.

#### `apps/web/components/admin/DeleteModuleButton.test.tsx` — 1 test

테스트 픽스처: `vi.mock('@/app/admin/modules/actions', () => ({ deleteModuleAction: vi.fn() }))`, `vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))`.

- **C-8**: `deleteModuleAction` 이 `{ error: 'this instance is the index module of domain D' }` 반환 → "삭제" 버튼 클릭 → confirm dialog 의 "삭제" 클릭 → `toast.error` 가 해당 메시지로 호출됨. (REQ-ADMIN-006 UI 표면)

#### `apps/web/app/admin/modules/actions.test.ts` — 2 tests

테스트 픽스처: `vi.mock('@/lib/trpc/server', () => ({ getServerCaller: vi.fn() }))`, `vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))`, `vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }))`.

- **C-9**: 유효 FormData (`siteId=1`, `moduleCode=board`, `mid=notice`, `name=공지`) → `caller.admin.module.create` 가 해당 input 으로 호출됨 + `revalidatePath('/admin/modules')` + `redirect('/admin/modules')`.
- **C-10**: `caller.admin.module.delete({ instanceId: 5 })` 가 정상 → `revalidatePath('/admin/modules')` 호출 + `{ ok: true }` 반환. 별도로 caller 가 `TRPCError({ code: 'CONFLICT', message: 'this instance is...' })` throw 하면 `{ error: '...' }` 반환.

→ 총 10 개 테스트 (C-1 ~ C-10).

### Domain layer contract (간단 시그니처)

```ts
// apps/web/lib/trpc/server.ts
export async function getServerCaller(): Promise<ReturnType<typeof appRouter.createCaller>>;

// apps/web/app/admin/modules/actions.ts
export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
export async function createModuleAction(prev: ActionState, formData: FormData): Promise<ActionState>;
export async function deleteModuleAction(instanceId: number): Promise<{ ok: true } | { error: string }>;

// apps/web/components/admin/AdminSidebar.tsx
export function AdminSidebar(): JSX.Element;

// apps/web/components/admin/AdminTopbar.tsx
export function AdminTopbar(props: { userName: string }): JSX.Element;

// apps/web/components/admin/ModuleTable.tsx
export function ModuleTable(props: {
  instances: Array<{ id: number; mid: string; moduleCode: string; name: string; createdAt: Date }>;
  siteId: number;
}): JSX.Element;

// apps/web/components/admin/CreateModuleForm.tsx
export function CreateModuleForm(props: { siteId: number }): JSX.Element;

// apps/web/components/admin/DeleteModuleButton.tsx
export function DeleteModuleButton(props: { instanceId: number; mid: string }): JSX.Element;
```

### REQ → Enforcement chain

| REQ                                  | 코드 / 파일                                                                                  | 테스트                |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------- |
| REQ-ADMIN-020 (admin 가드 UI)         | `app/admin/layout.tsx` 의 `isAdminSession` + `redirect`                                       | C-1, C-2              |
| REQ-ADMIN-020 (모듈 CRUD UI 표면)     | `app/admin/modules/page.tsx` + `ModuleTable` + `CreateModuleForm` + `DeleteModuleButton`     | C-3, C-4, C-5, C-7    |
| REQ-ADMIN-020 (생성 흐름)             | `app/admin/modules/new/page.tsx` + `actions.ts:createModuleAction`                             | C-5, C-6, C-9         |
| REQ-ADMIN-020 (삭제 흐름)             | `DeleteModuleButton` + `actions.ts:deleteModuleAction`                                        | C-8, C-10             |
| REQ-ADMIN-021 (비관리자 데이터 비노출)| `app/admin/layout.tsx` redirect (tRPC 의 FORBIDDEN 과 함께 이중 게이트)                       | C-1                   |
| REQ-ADMIN-006 (인덱스 모듈 보호 UI)   | `DeleteModuleButton` 의 toast.error 분기 + `deleteModuleAction` 의 TRPCError CONFLICT 변환    | C-8                   |
| Sidebar IA (spec.md line 904-926)     | `AdminSidebar` 의 `NAV` 배열 — 본 슬라이스 범위 항목은 enabled, 그 외는 disabled              | (시각 검증 — Slice D e2e 에서 커버) |

본 슬라이스의 sidebar IA 의 disabled 항목들은 단위 테스트로 직접 검증하지 않는다 — 향후 슬라이스에서 enable 로 전환될 때 자연스럽게 e2e 로 검증되며, 본 슬라이스에서는 코드 상의 자리 마련만으로 충분하다.

### @MX 태그 후보

@MX 태그는 본 슬라이스의 GREEN 단계에서 추가한다. 우선순위는 다음과 같다 (`code_comments=ko` 기준).

- `app/admin/layout.tsx` 의 `isAdminSession` 가드 — **@MX:ANCHOR** (REQ-ADMIN-020/021 의 UI 진입점. 모든 `/admin/*` 라우트가 이 layout 의 redirect 를 통과해야만 렌더링되며, tRPC `protectedAdminProcedure` 와 함께 이중 게이트를 형성.) @MX:REASON: "권한 우회 경로 차단 — layout 단계 redirect 가 없으면 client navigation 으로 인해 admin 페이지가 일시적으로 비관리자에게 노출될 수 있음."
- `app/admin/layout.tsx` 의 2FA TODO 자리 — **@MX:TODO** (Slice D Site Settings 에서 `requireAdmin2FAIfEnabled` 호출 추가 예정)
- `lib/trpc/server.ts` 의 `getServerCaller` — **@MX:ANCHOR** (모든 Server Component / Server Action 의 tRPC 호출 진입점. fan_in 이 즉시 5 이상이 되며 Slice D 의 Menu / Site / Members 슬라이스에서 더 증가.) @MX:REASON: "context 일관성 — caller 가 `createContext` 를 매번 동일하게 호출해야 siteId 재해석과 헤더 스푸핑 차단이 일관됨."
- `app/admin/modules/actions.ts` — **@MX:NOTE** (Server Action → tRPC 브릿지 패턴. 후속 슬라이스의 actions.ts 들이 동일 패턴을 따라야 한다는 신호.)
- `AdminSidebar` 의 `NAV` 배열 — **@MX:NOTE** (sidebar IA 의 single source of truth. spec.md line 904-926 과 1:1 매핑. Slice D 에서 항목이 enable 로 바뀔 때마다 본 배열을 수정.)
- `CreateModuleForm` 의 zod `CreateSchema` 와 `admin.module.create` input zod schema 의 중복 — **@MX:WARN** @MX:REASON: "Server Action 의 form 검증과 tRPC procedure 의 input 검증이 별도로 정의되어 두 스키마가 drift 할 위험. Slice D 이후 `packages/core/src/modules/schemas.ts` 같은 공유 스키마로 추출 검토."

### Dependencies

- 외부 신규 npm 의존성 (`packages/ui/package.json` 에 추가):
  - `class-variance-authority: ^0.7.0` (shadcn cva variants)
  - `lucide-react: ^0.460.0` (icon set)
  - `sonner: ^1.7.0` (toast)
  - `@radix-ui/react-dialog: ^1.1.2`
  - `@radix-ui/react-dropdown-menu: ^2.1.2`
  - `@radix-ui/react-label: ^2.1.0`
  - `@radix-ui/react-slot: ^1.1.0`
  - shadcn CLI (`shadcn@latest`) — devDep 형태로 root 또는 `apps/web` 에 추가하거나 `pnpm dlx` 로 1회성 실행 (선호: dlx — 영구 설치 불필요).
- 내부 의존:
  - `@rhymix-ts/ui` (본 슬라이스에서 components subpath 추가)
  - `@/server/api/root` (Slice B 의 `appRouter`)
  - `@/server/api/context` (Slice B 의 `createContext`)
  - `@/lib/auth/admin-middleware` (`isAdminSession`)
  - `@/lib/auth/config` (`auth()`)
- 기존 라우트와의 충돌: `app/admin/page.tsx` placeholder 만 본 슬라이스에서 교체. `app/(admin)/` 그룹은 도입하지 않음 (Q2 결론).

### Verification

- `pnpm --filter @rhymix-ts/web typecheck` → 0 errors
- `pnpm --filter @rhymix-ts/ui typecheck` → 0 errors (shadcn 컴포넌트 타입 확인)
- `pnpm --filter @rhymix-ts/web test` → C-1 ~ C-10 모두 GREEN + 기존 web 테스트 회귀 없음
- `pnpm test` (전체 워크스페이스) → 417+ 기존 + 10 신규 = 427+ GREEN, AUTH-001 + Slice A/B 회귀 없음
- `pnpm --filter @rhymix-ts/web build` → Next.js build 통과 (`use client` directive 가 packages/ui 컴포넌트에 올바르게 부착되어 server boundary 명확)
- 브라우저 sanity (수동): `/admin` → sidebar + topbar + dashboard. `/admin/modules` → 빈 테이블 + "새 모듈". `/admin/modules/new` → 폼. mid=notice 입력 후 제출 → `/admin/modules` 로 redirect 후 행 표시. 행의 "삭제" → confirm → toast.
- 비관리자 sanity (수동): 비관리자 로그인 후 `/admin` 접근 → `/login?callbackUrl=/admin` 으로 redirect.
- `git diff --stat main` → 변경 파일 수 확인 (목표: ~26 신규 + 4 수정 = ~30 파일).

### Risks

| 리스크                                                                                       | 영향                                                       | 완화                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadcn CLI 가 `components.json` 의 alias 를 packages/ui 로 지정해도 일부 컴포넌트가 `cn` import 를 `@/lib/utils` 절대 경로로 생성 | typecheck 실패                                              | shadcn 의 `cn` import 경로를 `@rhymix-ts/ui` 로 일괄 치환 (생성 직후 grep + sed). 또는 `apps/web/lib/utils.ts` 에 `export { cn } from '@rhymix-ts/ui'` 한 줄짜리 wrapper 두기 — 후자 채택 (CLI 결과를 손대지 않음).                                              |
| Tailwind 4 의 CSS-first 설정과 shadcn 의 tailwind.config.ts 가정 불일치                       | shadcn 컴포넌트의 CSS 변수 토큰이 적용 안 됨               | shadcn `init` 시 "use CSS variables" 응답 yes, "Tailwind config file" 응답 skip. 변수는 globals.css 의 `@layer base { :root { ... } }` 에 직접 추가. Tailwind v4 의 `@theme inline` 사용도 검토 가능 — 그러나 shadcn 의 변수는 `:root` 가 표준이므로 그대로 따름. |
| `Toaster` 가 SPEC-THEME-001 의 `[data-theme='dark']` 와 shadcn 의 `.dark` 둘 다와 무관하게 작동 | dark mode 에서 toast 가 light 스타일로 보이는 시각 buguette | 본 슬라이스는 light 만 검증. dark mode 통합은 SPEC-THEME-001 + shadcn 변수 통합 정리 슬라이스에서 (후속). 본 슬라이스에서 toast 의 시각 회귀 테스트는 수행하지 않음.                                                                                          |
| `getServerCaller` 의 `headers()` → Request 변환에서 cookie 가 누락                            | tRPC 의 `auth()` 가 세션을 못 찾아 createContext 의 session 이 null | `headers()` 가 반환하는 `ReadonlyHeaders` 에는 `cookie` 가 포함되어 있어 `new Request(..., { headers: Array.from(h.entries()) })` 로 그대로 전파됨. 단위 테스트에서 `auth()` 를 mock 하므로 검증 부담은 적음; 수동 sanity 로 cookie 전파 확인.                |
| `packages/ui/package.json` 의 `exports` 분리 후 기존 `import { cn } from '@rhymix-ts/ui'` 호출자 영향 | 기존 호출자 가 깨질 가능성                                  | `exports['.']` 는 그대로 `./src/index.ts` 유지 (`cn` export 보존), `exports['./components']` 만 추가. 기존 호출자 영향 없음. typecheck 로 검증.                                                                                                              |
| shadcn 컴포넌트가 `"use client"` directive 를 포함해 server component 가 `import { Button }` 만 해도 client boundary 가 도입됨 | client island 크기 증가, hydration 비용                       | barrel 분리 (Q5) 로 `@rhymix-ts/ui` 메인 entry 와 `@rhymix-ts/ui/components` subpath 를 분리. server component 는 메인 entry 만 import. client 컴포넌트는 components subpath import. RSC payload 크기 점검은 본 슬라이스에서는 수행하지 않음 (Lighthouse 측정은 후속). |
| `useActionState` 의 dispatcher 타입과 `Promise<ActionState>` 반환 타입이 React 19 의 type def 와 어긋날 가능성 | TS 에러                                                     | React 19 의 `useActionState<State, Payload>` 시그니처 (`(prevState, payload) => Promise<State>`) 그대로 사용. AUTH-001 Slice F 의 loginAction 이 동일 패턴이므로 참고. 본 슬라이스에서 별도 type cast 불필요.                                                |
| 모듈 생성 폼 의 `siteId` 는 hidden input 으로 전달되는데, 악의적 사용자가 임의 siteId 를 주입하면 권한 우회 가능성 | 다른 사이트의 모듈을 임의 생성                              | `createModuleAction` 안에서 `siteId` 를 FormData 가 아닌 `await getCurrentSiteId()` 로 server-side 결정해 덮어쓰기. 본 슬라이스에서 폼은 siteId 를 보내지 않고 action 이 self-resolve. Risks 표 이 항목으로 명시.                                                |
| `app/admin/page.tsx` 의 dashboard 카드가 module.list 를 호출해 list 결과 의 length 만 표시하는 비용 | DB 쿼리가 dashboard 진입마다 발생                            | 본 슬라이스의 dashboard 는 minimal scope. 카운트 전용 query (`prisma.moduleInstance.count`) 가 더 효율적이나, 그 추가는 Slice D 의 dashboard 위젯 슬라이스에서 정식 도입. 본 슬라이스는 `list` 결과의 length 사용.                                                |
| 비관리자가 직접 `/admin/modules/new` 로 진입 시 `app/admin/layout.tsx` 의 redirect 가 작동하지만, redirect 가 race condition 으로 잠시 폼이 보일 가능성 | UX 결함                                                     | layout 의 redirect 는 server-side 이므로 client 에서는 이미 `/login` 페이지가 응답으로 옴. Race condition 없음. RSC 의 streaming 도입 시 별도 검토 필요하나 본 슬라이스는 `dynamic = 'force-dynamic'` 으로 streaming 회피.                                       |
| 본 슬라이스의 sidebar IA 가 disabled 항목들을 다 보여줘서 UI 가 산만해짐                       | UX 결함                                                     | disabled 항목들은 `<span aria-disabled="true" className="text-zinc-500">` 로 약하게 표시. spec.md line 904-926 의 IA 전체 그림을 미리 보여주는 가치 vs 산만함의 trade-off — 본 슬라이스는 "보여주는" 쪽 채택 (관리자가 향후 기능을 인지). 사용자 피드백으로 후속 슬라이스에서 조정 가능. |

### Heads-up for Slice D

본 슬라이스가 완료되면 Slice D 는 다음을 이어받는다.

- **Menu / MenuItem CRUD tRPC + 메뉴 편집 UI**: `admin.menu.*` 라우터 (Slice B 의 `protectedAdminProcedure` 재사용). `app/admin/site/menu/page.tsx` 의 드래그앤드롭 편집 (REQ-ADMIN-031). 드래그 라이브러리 도입 (dnd-kit 또는 react-arborist) — 본 시점에 sidebar 의 mobile drawer 도입도 함께 검토.
- **AdminLog `auditLogger` tRPC 미들웨어 활성화**: 모든 `admin.*.mutation` 의 before/after diff 를 자동 기록 (Slice B 의 TODO 자리). 본 슬라이스의 `createModuleAction` / `deleteModuleAction` 호출이 자동으로 AdminLog 에 기록되도록 caller 의 미들웨어 체인에 삽입.
- **AdminLog 표시 UI**: `app/admin/logs/page.tsx` — 페이징, 필터, target/action 검색. sidebar 의 disabled 항목 enable 로 전환.
- **Site Settings 페이지 활성화**: `app/admin/site/settings/page.tsx` — `SiteSetting` 모델 도입 + `requireAdmin2FAIfEnabled` 의 source 가 되는 `requireAdminTwoFactor` 필드 도입. 본 슬라이스의 layout 의 TODO 자리에서 호출.
- **2FA 강제 활성화**: 사이트 설정의 `requireAdminTwoFactor=true` 일 때 layout 단계에서 2FA 검증 페이지 redirect (spec.md REQ-ADMIN-023).
- **Members 관리 UI**: `app/admin/members/page.tsx` — AUTH-001 의 User / UserGroup 을 표면. sidebar 의 "회원" 섹션 enable.
- **Dashboard 위젯**: spec.md line 933-941 의 MembersWidget / RecentDocumentsWidget / RecentCommentsWidget. Skeleton + empty state. 본 슬라이스의 dashboard 카드는 위젯 도입 시 교체.
- **`(admin)` route group 도입 검토**: 다중 admin 영역 (예: mobile admin) 이 필요해질 때 본 슬라이스의 `app/admin/` 를 `app/(admin-web)/` + `app/(admin-mobile)/` 로 분리. 본 슬라이스 시점에는 단일 그룹.
- **SPEC-THEME-001 변수와 shadcn 변수 통합 정리**: globals.css 에 두 그룹이 공존 중. 통합 슬라이스로 정리해 single source of truth.
- **mobile responsive sidebar**: drawer + hamburger. tablet 이하에서 sidebar collapse.
- **공유 스키마 추출**: `CreateModuleForm` 의 zod 와 `admin.module.create` 의 zod 가 drift 위험. `packages/core/src/modules/schemas.ts` 로 추출 검토.
- **React Query Client 인프라**: 드래그앤드롭 optimistic update 가 필요해지는 Slice D 시점에 `TRPCProvider` + `QueryClient` 도입. 본 슬라이스의 Server Component 패턴은 그대로 유지하면서 client 측 mutation hook 만 추가.

---

## Open Questions (Slice C 종료 시점 재검토 예정)

1. **dashboard 카드의 `module.list` 호출 비용** — 카드가 1 개뿐이라 1 회 쿼리지만 후속 위젯이 늘면 N+1 쿼리 위험. `prisma.moduleInstance.count` 같은 dedicated query 또는 dataloader 패턴 도입 시점은 Slice D 의 위젯 슬라이스에서.
2. **shadcn `.dark` 와 SPEC-THEME-001 `[data-theme='dark']` 통합** — 본 슬라이스에서는 공존만 보장. 통합 정리 슬라이스는 별도 SPEC 또는 Slice D 의 디자인 토큰 슬라이스에서.
3. **`getCurrentSiteId` 헬퍼의 위치와 책임** — 본 슬라이스에서는 `apps/web/lib/admin/site-context.ts` 에 두지만, ctx.siteId 가 createContext 에서 이미 계산되므로 caller 가 직접 ctx 에서 꺼내도 됨. Slice D 의 Site 설정 슬라이스가 multi-site UX 를 본격 도입할 때 통합 정리.
4. **sidebar 의 disabled 항목 표시 방식** — 본 슬라이스는 "준비중" 라벨 + cursor-not-allowed. UX 피드백에 따라 후속 슬라이스에서 (a) tooltip + ETA, (b) feature flag 기반 hide, (c) progressive disclosure 중 하나로 조정.
5. **`packages/ui` 의 빌드 산출물** — 현재 `main: ./src/index.ts` 로 TypeScript 소스 직접 export. shadcn 컴포넌트의 type-check 가 모든 컨슈머에서 매번 발생. 워크스페이스 규모가 커지면 `tsup` 으로 d.ts + esm 빌드 산출 도입 검토 (별도 SPEC).
6. **Server Action 의 zod 와 tRPC procedure 의 zod 중복** — 본 슬라이스의 `CreateSchema` 는 `admin.module.create` input zod 와 거의 동일. Slice D 의 Menu CRUD 가 같은 패턴을 반복하면 공유 스키마 추출 작업 비용이 커짐. 적절한 시점에 `packages/core/src/modules/schemas.ts` 로 추출.

---

Version: 1.0.0
Created: 2026-05-16
Author: manager-spec via /moai plan SPEC-ADMIN-001 Slice C
