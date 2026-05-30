---
id: SPEC-THEME-POLISH-001
document-type: research
created: 2026-05-30
language: ko
---

# SPEC-THEME-POLISH-001 — Research Notes

본 research는 SPEC-THEME-POLISH-001 작성 시 참조한 사실 자료와 패턴 결정 근거를 정리한다. SPEC-LAYOUT-001 (Slice A~D 완료) 위에 빌드하므로, 본 research는 SPEC-LAYOUT-001/research.md를 base로 하고 본 SPEC 고유 영역만 deep-dive한다.

---

## 1. 흡수 대상 SPEC 비교

### 1.1 MASTER-PLAN-002 Section 5.11 — 본 SPEC의 직접 모체

```
### 5.11 SPEC-THEME-POLISH-001 (Phase 4, P1)
- 흡수: REMEDIATION THEME Slice E + F
- Scope: admin/site/design 3-pane editor, Theme/Layout/Skin assignment UI, dark mode toggle, token 편집 UI (Zod schema → 자동 폼)
- Acceptance headline:
  - WHEN 관리자가 token 값을 변경하면, THE SYSTEM SHALL 다음 HTTP 응답에서 rebuild 없이 새 값을 반영한다
  - WHEN 사용자가 다크모드 토글을 누르면, THE SYSTEM SHALL `<html class="dark">` 를 적용하고 localStorage에 저장한다
- Test count estimate: +28
- Slice count: 2 (admin UI + dark mode)
```

본 SPEC은 위 명세를 충실히 따른다. 2 slice 구조, +28 tests, 두 acceptance headline 그대로 반영.

### 1.2 SPEC-LAYOUT-001 — 본 SPEC의 dependency

SPEC-LAYOUT-001은 Phase 1 P0로 이미 완료된 상태. 본 SPEC이 의존하는 자산:

- `packages/core/src/theme/types.ts` `themeTokensSchema` — Zod schema (TokenEditor의 form 기반)
- `packages/core/src/theme/token-css.ts` `generateCssVariables`, `generateDarkCssVariables` — 런타임 CSS 변수 생성
- `packages/core/src/theme/dark-mode.ts` `getDarkModeConfig`, `buildDarkMediaQuery` — supportsDarkMode 판정
- `packages/core/src/theme/layout/context.tsx` `LayoutProvider` — CSS variable injection 위치
- `packages/core/src/theme/installer.ts` — Theme/Layout upsert
- `themes/default/` — baseline theme (본 SPEC에서 `supportsDarkMode: true` 로 격상)
- REQ-LAYOUT-014: `ThemeAssignment.tokensOverride` JSON 컬럼 활용 (Phase 1에서는 "optional"로 stored only, 본 SPEC에서 active로 격상)

SPEC-LAYOUT-001의 Exclusion 절은 본 SPEC을 명시적으로 후속으로 deferred:

- "1. 관리자 레이아웃 편집 UI: admin/site/design 페이지의 3-pane editor (theme/layout/skin assignment, token 편집, GUI 폼 자동 생성) → SPEC-THEME-POLISH-001 Slice 1 (Phase 4)"
- "2. 다크모드 토글 + persistence: dark mode UI + localStorage 저장 → SPEC-THEME-POLISH-001 Slice 2 (Phase 4)"

본 SPEC이 이 두 deferred 항목을 정확히 흡수한다.

### 1.3 SPEC-ADMIN-001 — 본 SPEC의 dependency

SPEC-ADMIN-001은 admin shell이 완료된 상태. 본 SPEC이 재사용:

- `apps/web/app/admin/layout.tsx` — admin 인증 + 2FA 게이트
- `apps/web/components/admin/AdminSidebar.tsx` — `/admin/site/design` 메뉴 항목 추가 대상
- `apps/web/components/admin/AdminTopbar.tsx` — 도메인 selector 위치
- `apps/web/lib/auth/admin-middleware.ts` `isAdminSession()` — Server Action 가드
- x-site-id header routing — multi-tenant scope 결정
- SPEC-ADMIN-001 admin log (action="theme.layout.assign" 등) — audit trail
- `@rhymix-ts/ui/components` `Toaster` — Server Action 결과 알림

### 1.4 REMEDIATION-PLAN-001 THEME Slice E + F — supersede 대상

REMEDIATION-PLAN-001은 본 SPEC에 의해 superseded됨. REMEDIATION의 Slice E/F 정의:

**REMEDIATION THEME Slice E**:

- `apps/web/app/admin/site/design/page.tsx` + 3 pane components (`PaneLayouts`, `PaneSkins`, `PaneTokens`)
- tRPC routers: `theme.ts` (list/install/activate/preview/updateTokens), `layout.ts` (assign), `skin.ts` (assign)
- 테스트 추정 +20

**REMEDIATION THEME Slice F**:

- `apps/web/components/theme-toggle.tsx` (next-themes useTheme)
- `apps/web/lib/theme/dark-mode.ts` (dark variant 헬퍼)
- `apps/web/app/layout.tsx` `<ThemeProvider attribute="class">` (next-themes wrapping)
- `themes/default/tokens.ts` dark variant 보강
- 테스트 추정 +8

본 SPEC과 REMEDIATION 사이의 차이점:

| 항목 | REMEDIATION | 본 SPEC | 결정 근거 |
|---|---|---|---|
| 라이브러리 | next-themes | 자체 ColorSchemeProvider | next-themes 의존성 제거. 기존 `dark-mode.ts` (`packages/core/src/theme/`) 헬퍼와 통합 우선. |
| Server Action | tRPC 라우터 | Next.js Server Action | Next.js 16 권장 패턴. tRPC는 client-server query에 유지하되, mutation은 Server Action으로 단순화. |
| Pane 이름 | PaneLayouts / PaneSkins / PaneTokens | SelectorPane / PreviewPane / TokenEditor | 본 SPEC의 3-pane editor 구조 (Selector / Preview / Editor) 가 명확. REMEDIATION은 3개 pane이 모두 "editor"성격. |
| Test count | +20 (E) + +8 (F) = 28 | +19 (A) + +8 (B) = 27 | MASTER-PLAN-002 + 28 추정과 align. |

본 SPEC이 REMEDIATION을 supersede한다는 의미: REMEDIATION의 의도는 보존하되 구현 디테일을 갱신.

---

## 2. 기존 코드 상태 검증

### 2.1 `packages/core/src/theme/` 구조

SPEC-LAYOUT-001 Slice A~C 완료 후 현재 상태:

```
packages/core/src/theme/
├── assignment-store.ts     (KEEP, ThemeAssignment 조회/저장)
├── assignment-store.test.ts
├── dark-mode.ts            (KEEP, supportsDarkMode 헬퍼) — 본 SPEC Slice B에서 활용
├── dark-mode.test.ts
├── hot-swap.ts             (DEFER, Phase 4까지 dormant)
├── hot-swap.test.ts
├── index.ts                (수정 가능 — theme submodule exports)
├── inheritance.ts          (KEEP)
├── inheritance.test.ts
├── installer.ts            (KEEP, Theme/Layout upsert)
├── installer.test.ts
├── layout/                 (SPEC-LAYOUT-001 신규)
│   ├── context.tsx         (LayoutProvider, useLayoutContext)
│   ├── extra-vars.ts       (Zod parser)
│   ├── loader.ts
│   ├── pipeline.ts         (renderModuleWithLayout)
│   ├── registry.ts
│   ├── resolver-with-db.ts
│   ├── slot.tsx
│   └── types.ts
├── manifest-validator.ts   (KEEP)
├── manifest-validator.test.ts
├── mobile-layout.ts        (SUPERSEDE — @deprecated)
├── mobile-layout.test.ts
├── preview.ts              (DEFER, Phase 4까지 dormant)
├── preview.test.ts
├── resolver.ts             (KEEP, resolveLayout pure function)
├── resolver.test.ts
├── skin-resolver.ts        (KEEP)
├── skin-resolver.test.ts
├── token-css.ts            (KEEP, generateCssVariables) — 본 SPEC Slice A에서 활용
├── token-css.test.ts
├── types.ts                (KEEP, themeTokensSchema, themeManifestSchema)
├── widget-style.ts         (DEFER)
└── widget-style.test.ts
```

본 SPEC이 packages/core에 신규 추가하는 파일 없음. 모든 신규 코드는 `apps/web/` 안에 둠 (admin UI는 Next.js app 영역).

### 2.2 `apps/web/app/admin/` 구조

SPEC-ADMIN-001 완료 후 현재 상태:

```
apps/web/app/admin/
├── layout.tsx               (인증 + 2FA 게이트)
├── layout.test.tsx
├── logs/                    (admin log 뷰)
├── members/                 (회원 관리)
├── menu/                    (메뉴 관리)
├── modules/                 (모듈 관리)
├── page.tsx                 (admin 홈)
├── pages/                   (page 모듈 관리)
├── settings/                (사이트 설정)
├── system/                  (시스템 정보)
└── widgets/                 (위젯 관리)
```

본 SPEC이 신규 추가: `apps/web/app/admin/site/design/` 디렉토리.

`apps/web/app/admin/settings/` 와의 관계: settings는 일반 사이트 설정 (제목, 도메인, 메일 등), design은 visual 영역. 분리된 메뉴 항목으로 둔다.

### 2.3 `themes/default/` 구조

```
themes/default/
├── install.ts          (seed script, theme.json 기준 upsert)
├── layouts/
│   └── default.tsx     (DefaultLayout RSC)
├── node_modules/       (workspace 심볼릭링크)
├── package.json
├── theme.json          (ThemeManifest)
└── tsconfig.json
```

본 SPEC 수정 대상:

- `themes/default/theme.json` — `supportsDarkMode: false` → `true`, `tokensSchema.dark.colors` 정의 추가
- `themes/default/install.ts` — dark token seed (현재는 light token만 seed 됨)

### 2.4 `apps/web/app/layout.tsx` 현재 상태

```typescript
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TRPCProvider>
          <SessionProviderWrapper>
            <AutoLoginRefresher />
            <GlobalHeader />
            <main>{children}</main>
          </SessionProviderWrapper>
        </TRPCProvider>
      </body>
    </html>
  );
}
```

본 SPEC Slice B가 수정:

1. `<head>` element 추가 + `<script>` 주입
2. `<body>` 안의 provider tree에 `<ColorSchemeProvider>` 래핑

이미 `suppressHydrationWarning` 속성이 있으므로 dark mode toggle 시 React 경고 발생 안 함. 잘 설계되어 있음.

### 2.5 `apps/web/components/layout/GlobalHeader.tsx` 통합 지점

본 SPEC Slice B가 GlobalHeader에 DarkModeToggle 마운트. 기존 GlobalHeader는 SPEC-LAYOUT-001 외부 (Next.js root layout 영역, REQ-LAYOUT-032). 따라서 DarkModeToggle 도 Rhymix layout 경계 밖에 있음 → 모든 페이지 (admin/sample/index)에서 일관되게 표시.

---

## 3. 핵심 패턴 결정

### 3.1 Dark Mode FOIT 방지 패턴

문제 상황:

1. SSR이 light mode HTML 응답 생성
2. 사용자 브라우저가 HTML 받음
3. CSS / React 로드 중 → light mode 표시
4. localStorage 읽고 dark preference 발견 → dark mode toggle
5. 사용자 시야에 light → dark flash (FOIT, Flash of Incorrect Theme)

해결 방안 비교:

**방안 A: Cookie 기반 SSR**

- 운영 흐름: 첫 진입 시 cookie 없음 → light SSR. 이후 토글하면 cookie set → 다음 요청부터 cookie 읽어 SSR 시 dark class 부여.
- 장점: FOIT 완전 제거. 모든 환경에서 동작.
- 단점: middleware에 cookie 파싱 로직 추가. 첫 진입 시에는 FOIT 여전히 존재. cross-origin 이슈.

**방안 B: Inline script in `<head>` (권고)**

- 운영 흐름: localStorage 동기 읽기 → `document.documentElement.classList.add('dark')` 동기 실행. React hydration 전.
- 장점: 모든 첫 진입에서도 FOIT 제거. server-side cookie 의존 없음. localStorage가 정답 (per-device).
- 단점: localStorage 접근 실패 (private browsing) 시 fallback 필요. `try-catch` 로 silent fail.

**방안 C: next-themes 라이브러리**

- 운영 흐름: next-themes의 `<ThemeProvider>` + `<ThemeScript>` 활용.
- 장점: 검증된 라이브러리. 다중 mode 지원 (light/dark/system).
- 단점: 새 dependency 도입. 자체 `dark-mode.ts` 헬퍼와 통합 복잡도. 라이브러리 size +5KB.

**결정: 방안 B**. 근거:

- 본 프로젝트는 이미 `packages/core/src/theme/dark-mode.ts` 헬퍼를 보유 (`getDarkModeConfig`, `buildDarkMediaQuery`). 이를 활용하여 자체 ColorSchemeProvider 구현이 라이브러리 도입보다 자연스러움.
- next-themes의 추가 dependency를 피해 번들 사이즈 최적화.
- 방안 A의 cookie SSR은 multi-tenant 환경에서 cookie scope 결정이 복잡 (siteId per cookie? domain per cookie?).

방안 B의 inline script 작성 patterns:

```javascript
// next-themes의 ThemeScript도 본질적으로 같은 패턴 (참조: vercel/next-themes)
(function() {
  try {
    var pref = localStorage.getItem('rx-color-scheme');
    var dark = pref === 'dark' || (pref === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
```

핵심 디자인 결정:

- `localStorage` 키 이름: `rx-color-scheme` (rhymix-ts prefix)
- 값: `'dark' | 'light'` (간단)
- Default fallback: `prefers-color-scheme` media query
- 에러 처리: `try-catch` silent (localStorage 접근 실패 시 light mode로 fallback)

### 3.2 Zod Schema → React Hook Form Auto-Generation

핵심 라이브러리: `react-hook-form` v7 + `@hookform/resolvers/zod`.

표준 patterns:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { themeTokensSchema } from '@rhymix-ts/core/theme/types';

const TokenEditor = ({ defaults }: { defaults: ThemeTokens }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(themeTokensSchema),
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (data) => {
    await saveTokensAction({ tokens: data, ... });
  });

  return (
    <form onSubmit={onSubmit}>
      <fieldset>
        <legend>Colors</legend>
        <input type="color" {...register('colors.primary')} />
        {errors.colors?.primary && <span>{errors.colors.primary.message}</span>}
        {/* ... */}
      </fieldset>
      <button type="submit">Save</button>
    </form>
  );
};
```

Zod schema introspection 패턴 (token-form-builder.ts):

```typescript
import { z } from 'zod';

interface FieldDescriptor {
  name: string;           // "colors.primary"
  type: 'color' | 'text' | 'number';
  label: string;
  min?: number;
  max?: number;
}

export function buildFormDescriptors(schema: z.ZodObject<any>, prefix = ''): FieldDescriptor[] {
  const result: FieldDescriptor[] = [];
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (fieldSchema instanceof z.ZodObject) {
      result.push(...buildFormDescriptors(fieldSchema, path));
    } else if (fieldSchema instanceof z.ZodString) {
      // colors의 4개 필드는 color picker, 그 외는 text
      const isColor = /^colors\./.test(path);
      result.push({ name: path, type: isColor ? 'color' : 'text', label: key });
    } else if (fieldSchema instanceof z.ZodNumber) {
      // min/max from Zod schema metadata
      result.push({ name: path, type: 'number', label: key, /* min, max */ });
    }
  }
  return result;
}
```

대안 검토:

- `@tanstack/react-form`: 신생, ecosystem 작음
- `formik`: 유지보수 stagnation
- 자체 useState + onChange: 비효율적, validation/submission 보일러플레이트 많음

→ react-hook-form 채택.

### 3.3 Hot-Reload (Runtime CSS Variable) 메커니즘

SPEC-LAYOUT-001 REQ-LAYOUT-014가 정의한 `ThemeAssignment.tokensOverride` JSON 컬럼이 본 SPEC의 핵심 통로:

1. **저장**: 운영자 → `saveTokens` Server Action → `ThemeAssignment.tokensOverride = {...}` upsert
2. **revalidate**: `revalidatePath('/')` 또는 `revalidateTag('theme:'+siteId)` 호출
3. **다음 요청**: 사용자 → `apps/web/app/[mid]/page.tsx` → `renderModuleWithLayout({ instance, ... })` 호출
4. **resolver**: `resolveLayoutFromInstance` 가 ThemeAssignment 조회 → tokensOverride 검출
5. **pipeline**: tokensOverride 가 LayoutContext.tokens 로 전달
6. **LayoutProvider**: 서버에서 `generateCssVariables(tokens)` 호출 → `<style>` 태그 생성 → `<head>` 또는 `<body>` 안에 inject
7. **응답**: 사용자 브라우저가 새 CSS variables를 받음 → 즉시 reflect

핵심 디자인 결정:

- Disk 파일 (`themes/default/theme.json`) 미수정. theme.json은 baseline default 보존.
- 모든 customization은 DB의 `ThemeAssignment.tokensOverride` JSON에만 저장.
- Next.js의 dynamic rendering 또는 ISR + revalidation으로 cache 일관성 유지.
- `unstable_cache` + tag-based invalidation으로 ThemeAssignment 조회 캐싱 (옵션).

`<style>` 태그 inject 위치 결정:

- **옵션 1**: `<head>` 안 — 가장 표준. CSS variables가 모든 CSS 규칙보다 먼저 정의됨.
- **옵션 2**: `<body>` 시작점 — RSC 컴포넌트의 자식으로 inject 가능. Next.js 16 RSC 친화적.
- **권고**: 옵션 2 (LayoutProvider 안). `<head>`에 inject하려면 Next.js의 `<Head>` API 활용 필요하지만 RSC와 충돌. body 시작점은 React 자식 트리 자연스러움.

```tsx
// packages/core/src/theme/layout/context.tsx (개선안)
export const LayoutProvider = ({ value, children, cssVariables }: LayoutProviderProps) => {
  return (
    <LayoutContext.Provider value={value}>
      {cssVariables && <style dangerouslySetInnerHTML={{ __html: cssVariables }} />}
      {children}
    </LayoutContext.Provider>
  );
};
```

### 3.4 3-Pane Editor 레이아웃

CSS Grid 기반:

```tsx
<div
  className="grid h-screen"
  style={{ gridTemplateColumns: '240px 1fr 400px' }}
>
  <SelectorPane />
  <PreviewPane />
  <TokenEditor />
</div>
```

또는 Tailwind utility:

```tsx
<div className="grid grid-cols-[240px_1fr_400px] h-screen">
  ...
</div>
```

뷰포트 < 1280px일 때 vertical stack:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_400px] min-h-screen">
  ...
</div>
```

세 pane 모두 `overflow-y-auto`로 독립 스크롤.

Preview pane의 iframe:

```tsx
<iframe
  src={`/?preview-theme=${themeName}&preview-tokens=${stagedTokensHash}`}
  className="w-full h-full border-0"
  title="Theme preview"
/>
```

`preview-tokens` 쿼리 파라미터는 staged token 객체의 hash (예: SHA-256 first 16 chars). 변경되면 자동 iframe reload. Server는 query param에 따라 다른 ThemeAssignment.tokensOverride를 일시적으로 적용 (preview-only).

---

## 4. 보안 검토

### 4.1 Inline Script XSS

`<script dangerouslySetInnerHTML>` 의 content는 정적 문자열 (`color-scheme-script.ts`). 사용자 입력을 절대 포함하지 않으므로 XSS 위험 없음. ESLint rule `react/no-danger`은 본 위치에서 의도적으로 disable.

CSP `script-src` 미설정 환경: 기본 동작. 설정된 환경: nonce 필요.

```tsx
// nonce가 있는 경우
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
```

Next.js의 nonce 메커니즘:

```typescript
// middleware.ts (existing)
const nonce = crypto.randomBytes(16).toString('base64');
response.headers.set('x-nonce', nonce);
```

```tsx
// app/layout.tsx
import { headers } from 'next/headers';
const nonce = headers().get('x-nonce');
```

### 4.2 `<style>` 태그 CSP

`style-src 'unsafe-inline'` 미허용 환경: nonce 필요. 동일 패턴 적용.

### 4.3 Preview iframe 격리

`preview-tokens` 쿼리 파라미터로 staged token을 server에 전달:

- 운영자만 admin 페이지 안에서 iframe을 만들기 때문에 일반 사용자에게 노출 안 됨
- iframe URL은 단순히 사용자 페이지 URL + query params. 모든 사용자가 접근 가능
- 하지만 `preview-tokens` 가 일반 사용자에게 노출되면 UI 변조 가능 (보안 이슈)

대응:

- `preview-tokens` 값은 서버에 저장된 임시 cache 키. 일반 사용자가 임의 값으로 접근해도 server가 거부.
- 또는 admin session cookie 검증 (preview는 admin 권한자만).

Slice A 구현 시 expert-security 리뷰 권고.

### 4.4 Server Action 권한

모든 Server Action 시작에 `isAdminSession(await auth())` 호출:

```typescript
// apps/web/app/admin/site/design/actions.ts
'use server';

import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';

export async function saveTokens(input: SaveTokensInput) {
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error('Unauthorized');
  }
  // ... Zod 검증 + DB upsert + admin log
}
```

SPEC-ADMIN-001 패턴 그대로 재사용.

---

## 5. 의존성 그래프

```
SPEC-LAYOUT-001 ✅ (Phase 1)
       │
       ├── REQ-LAYOUT-014 (tokensOverride stored) ──┐
       │                                             │
       └── LayoutProvider + LayoutContext ──┐        │
                                            │        │
SPEC-ADMIN-001 ✅ (Phase 2)                 │        │
       │                                    │        │
       └── AdminLayout + AdminSidebar + ────┤        │
           isAdminSession + admin log       │        │
                                            ▼        ▼
                              SPEC-THEME-POLISH-001 (Phase 4) ← 본 SPEC
                                            │
                                            ├── Slice A (Admin UI)
                                            │   ├─ 3-pane editor
                                            │   ├─ Token editor (Zod → form)
                                            │   ├─ Assignment Server Actions
                                            │   └─ Hot-reload via tokensOverride
                                            │
                                            └── Slice B (Dark Mode)
                                                ├─ DarkModeToggle
                                                ├─ ColorSchemeProvider
                                                ├─ FOIT prevention inline script
                                                └─ themes/default supportsDarkMode 격상
```

본 SPEC은 leaf SPEC (downstream dependency 없음).

---

## 6. 외부 참조 자료

### 6.1 next-themes 패턴 학습 (라이브러리 자체는 도입 안 함)

next-themes (vercel/next-themes) 가 제공하는 `<ThemeScript>` 컴포넌트는 본 SPEC의 inline script와 동일 패턴. 본 SPEC은 자체 구현하지만, next-themes의 다음 디자인 결정을 차용:

- `localStorage` key 표준화 (`theme` → 본 SPEC `rx-color-scheme`)
- `class` attribute strategy (vs `data-theme`) — `class="dark"` 채택
- `prefers-color-scheme` media query fallback
- React Context를 통한 hook API (`useColorScheme` ↔ next-themes의 `useTheme`)

### 6.2 react-hook-form + Zod resolver 패턴

공식 문서:

- https://react-hook-form.com/get-started — `useForm` 기본
- https://github.com/react-hook-form/resolvers — Zod resolver 설치 및 사용

핵심 패턴 (이미 3.2에서 다룸).

### 6.3 Next.js 16 Server Action 패턴

공식 문서:

- https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

핵심 결정 사항:

- `'use server'` directive를 파일 최상단에 둠
- Server Action은 default function이 아닌 export function으로 정의
- form submission 외에도 client에서 호출 가능 (`await saveTokens(input)`)
- `revalidatePath` / `revalidateTag` 호출로 cache invalidation

### 6.4 Tailwind CSS dark mode

공식 문서:

- https://tailwindcss.com/docs/dark-mode — `class` strategy

설정:

- `tailwind.config.ts` 또는 Tailwind 4의 `@import 'tailwindcss'` 안에서 `darkMode: 'class'` (Tailwind 3) 또는 동등 설정 (Tailwind 4 CSS-first)
- 본 프로젝트는 Tailwind 4. 따라서 `globals.css` 의 `@theme` 블록 안에서 dark variant 정의:

```css
@theme {
  --color-primary: #3B82F6;
  /* ... */
}

@theme dark {
  --color-primary: #60A5FA;
  /* ... */
}
```

또는 SPEC-LAYOUT-001 token-css.ts가 생성한 `.dark { ... }` CSS block을 추가 inject. 본 SPEC은 후자 채택 (REQ-THEME-POLISH-036).

### 6.5 FOIT 패턴 참조

- https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx — ThemeScript 구현
- https://web.dev/articles/prefers-color-scheme — `prefers-color-scheme` 표준
- https://github.com/donavon/use-dark-mode — 다크모드 React hook 패턴

---

## 7. 결정 사항 요약

1. **next-themes 도입 안 함**. 자체 ColorSchemeProvider + inline script로 구현. 근거: `packages/core/src/theme/dark-mode.ts` 헬퍼와 통합 우선, 번들 사이즈 절약.

2. **mutation은 Server Action, query는 tRPC 유지**. REMEDIATION은 모두 tRPC 라우터로 제안했으나, Next.js 16 권장 패턴에 맞춰 simplified.

3. **`react-hook-form` 채택**. Zod resolver 공식 지원, ecosystem 성숙.

4. **`tokensOverride` JSON 컬럼 활용**. SPEC-LAYOUT-001 REQ-LAYOUT-014를 active로 격상. theme.json disk 파일 미수정.

5. **`<style>` 태그 inject 위치는 LayoutProvider 안**. RSC 친화적, body 시작점.

6. **`localStorage` 키는 `rx-color-scheme`** (rhymix-ts prefix).

7. **Theme upload UI 미포함**. CLI/disk only. zip 업로드는 별도 SPEC.

8. **Per-user dark mode preference DB 저장 미포함**. localStorage only. cross-device sync는 별도 SPEC.

9. **In-admin custom theme 생성 미포함**. file-based only. 별도 SPEC.

10. **다크모드 토글은 GlobalHeader에 마운트**. 모든 페이지에서 일관 노출.

---

## 8. Open Questions (구현 detail)

`spec.md` Section 7의 5개 Open Question 중 첫 3개는 본 SPEC에서 결정됨. 나머지 2개:

- **Q4**: Preview iframe 보안 격리 — Slice A 작업 시 expert-security 리뷰
- **Q5**: react-hook-form 대안 평가 — Slice A 시작 시 final pick

---

## 9. SPEC 작성 시점의 코드 상태 확인 사항

본 SPEC은 다음 사실에 기반:

- `apps/web/app/layout.tsx` 현재 line 22-34 RootLayout 구조 확인 완료
- `apps/web/app/admin/layout.tsx` 현재 admin 인증 + 2FA 게이트 패턴 확인 완료
- `packages/core/src/theme/dark-mode.ts` `getDarkModeConfig`, `buildDarkMediaQuery` 함수 존재 확인 완료
- `packages/core/src/theme/token-css.ts` `generateCssVariables`, `generateDarkCssVariables`, `getTailwindThemeExtension` 함수 존재 확인 완료
- `packages/core/src/theme/types.ts` `themeTokensSchema` (Zod), `themeManifestSchema` 정의 확인 완료
- `themes/default/` 디렉토리 구조 (install.ts, layouts/default.tsx, theme.json) 확인 완료
- SPEC-LAYOUT-001/spec.md 의 모든 REQ 및 Exclusion 절 확인 완료
- MASTER-PLAN-002 Section 5.11 (line 351~359) 확인 완료
- REMEDIATION-PLAN-001 의 THEME Slice E (line 202~221), Slice F (line 223~240) 확인 완료
- SPEC-ADMIN-001 의 admin shell 패턴 (layout, sidebar, isAdminSession) 확인 완료

위 사실들이 SPEC 작성 후 변경되었다면 SPEC도 재검토 필요.

---

Version: 1.0.0
Status: research complete (spec.md drafted on this basis)
References:
- MASTER-PLAN-002 Section 5.11
- SPEC-LAYOUT-001 spec.md (Exclusions 1, 2; REQ-LAYOUT-014)
- SPEC-ADMIN-001 (Admin Shell)
- REMEDIATION-PLAN-001 THEME Slice E + F (lines 202~240)
- packages/core/src/theme/{dark-mode,token-css,types}.ts
- apps/web/app/{layout,admin/layout}.tsx
