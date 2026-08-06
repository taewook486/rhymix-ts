# SPEC-ADMIN-001 Slice G Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: Widget System (REQ-ADMIN-040/041/042)
Base: main = 6844771 (Slice F 완료 — 시스템 헬스 + 캐시 관리, 482 tests)
Depends on: Slice A~F 완료

---

## Requirements

- REQ-ADMIN-040: WidgetRegistry — name, displayName, propsSchema(Zod), Component(RSC), defaultProps
- REQ-ADMIN-041: `<rx-widget name="..." props='...' />` 토큰 파싱 → React 컴포넌트 치환
- REQ-ADMIN-042: 미등록/props 오류 → 안전한 fallback (관리자: 오류 메시지, 비관리자: 빈 출력)
- REQ-ADMIN-043: (선택) WidgetInstance DB 저장 — Slice H로 이월

---

## Task Decomposition

### Task G-1: WidgetRegistry (packages/core/src/widgets/)

**New files**:
- `packages/core/src/widgets/types.ts`
- `packages/core/src/widgets/registry.ts`
- `packages/core/src/widgets/registry.test.ts`
- `packages/core/src/widgets/index.ts`

**Modified**:
- `packages/core/package.json` — `"./widgets": "./src/widgets/index.ts"` export 추가

**types.ts**:
```ts
import type { ZodSchema } from 'zod'
import type React from 'react'

export interface WidgetDefinition<P = Record<string, unknown>> {
  name: string
  displayName: string
  propsSchema: ZodSchema<P>
  Component: React.ComponentType<P>
  defaultProps?: Partial<P>
}
```

**registry.ts**:
```ts
const registry = new Map<string, WidgetDefinition>()

export function registerWidget(def: WidgetDefinition): void
export function getWidget(name: string): WidgetDefinition | undefined
export function listWidgets(): WidgetDefinition[]
export function resetWidgetRegistry(): void  // 테스트용
```

**Tests (RED first)**:
- registerWidget → getWidget 로 조회 가능
- 중복 등록 → 덮어쓰기 (마지막이 우선)
- 미등록 name → getWidget 반환 undefined
- listWidgets → 등록된 전체 목록 반환
- resetWidgetRegistry → 목록 비워짐

### Task G-2: rx-widget 렌더러 (apps/web/lib/widgets/)

**New files**:
- `apps/web/lib/widgets/renderer.tsx`
- `apps/web/lib/widgets/renderer.test.tsx`

**renderer.tsx 설계**:

```ts
// 순수 파서 — 테스트 용이
export type ParsedToken =
  | { type: 'text'; value: string }
  | { type: 'widget'; name: string; rawProps: string }

export function parseWidgetTokens(html: string): ParsedToken[]
// 정규식: /<rx-widget\s+name="([^"]+)"\s+props='([^']*)'\s*\/>/g

// React 렌더러
export function renderWidgetContent(
  tokens: ParsedToken[],
  isAdmin?: boolean,
): React.ReactNode

// 편의 래퍼
export function renderWidgetTokens(
  html: string,
  isAdmin?: boolean,
): React.ReactNode
```

**Fallback 규칙** (REQ-ADMIN-042):
- 미등록 위젯: 비관리자 → `<span />`, 관리자 → `<span data-widget-error="unknown:NAME" />`
- props 검증 실패: 비관리자 → `<span />`, 관리자 → `<span data-widget-error="invalid-props:NAME" />`

**Tests (RED first)**:
- 토큰 없는 html → 원문 텍스트 그대로 반환
- 단일 rx-widget → Widget Component로 치환
- 복수 rx-widget + 텍스트 혼합 → 올바른 노드 배열
- 미등록 위젯 + 비관리자 → 빈 span
- 미등록 위젯 + 관리자 → data-widget-error 포함 span
- props 검증 실패 + 관리자 → data-widget-error 포함 span
- 유효 props → Widget.Component 렌더

### Task G-3: 내장 예시 위젯 + 관리자 UI

**New files**:
- `apps/web/lib/widgets/builtins/hello-widget.tsx`
- `apps/web/app/admin/widgets/page.tsx`
- `apps/web/app/admin/widgets/page.test.tsx`

**Modified**:
- `apps/web/components/admin/AdminSidebar.tsx` — "콘텐츠" 섹션에 "위젯 시스템" 링크 추가

**hello-widget.tsx** (예시 위젯, 테스트 환경에서 레지스트리에 등록):
```tsx
import { z } from 'zod'
export const helloWidgetDef = {
  name: 'hello',
  displayName: 'Hello Widget',
  propsSchema: z.object({ name: z.string().default('World') }),
  Component: function HelloWidget({ name }: { name: string }) {
    return <div data-widget="hello">Hello, {name}!</div>
  },
  defaultProps: { name: 'World' },
}
```

**admin/widgets/page.tsx** (Server Component):
- `getServerCaller()` 없이 서버에서 직접 `listWidgets()` 호출 (tRPC 불필요)
- 등록된 위젯 목록 테이블: name, displayName

**Tests**:
- admin/widgets/page.test.tsx: 페이지가 "위젯 시스템" 헤딩 렌더

---

## File Summary

| 파일 | 상태 | 태스크 |
|------|------|--------|
| `packages/core/src/widgets/types.ts` | new | G-1 |
| `packages/core/src/widgets/registry.ts` | new | G-1 |
| `packages/core/src/widgets/registry.test.ts` | new | G-1 |
| `packages/core/src/widgets/index.ts` | new | G-1 |
| `packages/core/package.json` | edit | G-1 |
| `apps/web/lib/widgets/renderer.tsx` | new | G-2 |
| `apps/web/lib/widgets/renderer.test.tsx` | new | G-2 |
| `apps/web/lib/widgets/builtins/hello-widget.tsx` | new | G-3 |
| `apps/web/app/admin/widgets/page.tsx` | new | G-3 |
| `apps/web/app/admin/widgets/page.test.tsx` | new | G-3 |
| `apps/web/components/admin/AdminSidebar.tsx` | edit | G-3 |
| `.moai/specs/SPEC-ADMIN-001/slice-g-plan.md` | new | — |

---

## Acceptance Criteria (Slice G)

- **AC-G-1-1**: `registerWidget` + `getWidget('hello')` → 등록된 위젯 반환
- **AC-G-1-2**: 미등록 이름 → `getWidget` 반환 `undefined`
- **AC-G-2-1**: HTML에 `<rx-widget name="hello" props='{"name":"Alice"}' />` 포함 → HelloWidget 렌더
- **AC-G-2-2**: 미등록 위젯 + 비관리자 → 빈 `<span>` (오류 노출 없음)
- **AC-G-2-3**: 미등록 위젯 + 관리자 → `data-widget-error` 속성 포함 span
- **AC-G-2-4**: props 검증 실패 + 관리자 → `data-widget-error` 속성 포함 span
- 기존 482 테스트 회귀 없음

---

## Deferred to Slice H

- REQ-ADMIN-043: WidgetInstance DB 저장 (재사용 프리셋)
- REQ-ADMIN-031: cross-level DnD
- REQ-ADMIN-090~093: Import/Export
- REQ-ADMIN-100~101: Admin 즐겨찾기

---

Version: 1.0.0
Created: 2026-05-16
