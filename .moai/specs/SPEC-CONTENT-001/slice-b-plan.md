# SPEC-CONTENT-001 — Slice B 플랜

**Status**: in-progress (T-001~T-011 완료, T-005/T-012/T-013 잔여)
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = 59a9bfc (CONTENT-001 Slice A 완료, 521 tests)
**Scope**: tRPC 라우터 + 권한 매트릭스 + XSS sanitize + Comment 도메인 + FTS + Module Registry + [mid]/page.tsx 위임 + BoardIndexPage RSC + 글쓰기 페이지 + Server Action
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` REQ-CONTENT-001~060

---

## 1. 목표 (What & Why)

Slice A 에서 Prisma 스키마 + board ModuleDefinition + Document 도메인 minimal kernel 이 완성됐다.
Slice B 의 임무:

1. **Module Registry** (apps/web 레이어) — `moduleCode` → `ModuleDefinition` 매핑. `[mid]/page.tsx` 가 def.routes.index() 를 위임할 수 있도록.
2. **protectedProcedure** — 일반 인증 사용자용 tRPC 미들웨어 추가.
3. **권한 매트릭스** — Board.permissions Json 을 평가하는 `canPerformAction()`.
4. **Document 도메인 업그레이드** — XSS sanitize, status 파라미터, updateDocument, deleteDocument, FTS.
5. **Comment 도메인** — createComment / listComments / deleteComment + commentCount 원자성.
6. **tRPC 라우터** — admin.board.{list,get} + content.document.{list,get,create,update,delete} + content.comment.{list,create,delete}.
7. **BoardIndexPage RSC** — Document 목록 실제 렌더. Slice A placeholder 교체.
8. **글쓰기 페이지 + Server Action** — `/[mid]/write` 진입점 + createDocument Server Action.

---

## 2. Pre-Flight Findings

### Q1 — ModuleRoutePageProps 에 prisma 추가 필요

**문제**: `packages/board` 는 순수 도메인 패키지. `apps/web` 의 prisma singleton 을 직접 import 하면 계층 위반.

**현재 타입 (`packages/core/src/modules/types.ts`)**:
```ts
export interface ModuleRoutePageProps {
  instance: ModuleInstance & { config: ModuleConfig | null };
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
}
```
`prisma` 필드가 없음.

**결정**: `ModuleRoutePageProps` 에 `prisma: PrismaClient` 추가.
- `packages/core` 는 이미 `@prisma/client` 를 import — 추가 의존성 없음.
- `[mid]/page.tsx` 에서 prisma singleton 을 가져와 props 에 주입.
- `BoardIndexPage(props)` 는 `props.prisma` 를 사용해 `listDocuments` 호출.

### Q2 — [mid]/page.tsx 위임 시점 (Slice B vs Slice C)

**현황**: page.tsx 의 `@MX:TODO` 는 "Slice C 에서 교체" 로 되어 있으나, Slice B 계획에 T-005 로 포함됨.

**결정**: Slice B 에서 위임 구현. 이유:
- registry.ts (T-001) 와 BoardIndexPage RSC (T-012) 가 Slice B 에 포함되므로, 위임 없이는 두 구현이 연결되지 않음.
- 기존 `@MX:TODO` comment 는 Slice B 구현 후 제거.

### Q3 — BoardIndexPage 의 prisma 조달 방식

**결정 (Q1 연계)**: `ModuleRoutePageProps.prisma` 를 통해 주입.
```ts
// apps/web/app/[mid]/page.tsx
import { prisma } from '@/lib/db/prisma';
// ...
return def.routes.index({ instance, params, searchParams, prisma });
```

### Q4 — write 라우트 등록

**현재 `ModuleRouteMap`**:
```ts
export interface ModuleRouteMap {
  index?: ModuleRouteIndex;
  catchAll?: ModuleRouteIndex;
  actions?: Record<string, unknown>;
}
```

**결정**: `write?: ModuleRouteIndex` 를 `ModuleRouteMap` 에 추가.
- `/[mid]/write` 는 별도 Next.js 페이지 파일 (`apps/web/app/[mid]/write/page.tsx`) 로 구현.
- page.tsx 에서 `def.routes.write?.(props)` 를 위임 — 없으면 404.
- Server Action (`packages/board/src/actions/create-document.ts`) 은 `'use server'` directive 로 정의.

### Q5 — packages/board export 범위

**결정**: `packages/board/src/index.ts` 에서 Slice B 신규 심볼 추가 export:
```ts
export { createDocument, updateDocument, deleteDocument, listDocuments, getDocument } from './document.js';
export { createComment, listComments, deleteComment } from './comment.js';
export { canPerformAction } from './permissions.js';
export { BoardPermissionDeniedError, DocumentOwnershipError } from './document.js';
```

---

## 3. 구현 파일 목록

### 3.1 완료된 태스크 (커밋 예정 파일 포함)

| 태스크 | 파일 | 상태 |
|--------|------|------|
| T-001 | `apps/web/lib/modules/registry.ts` | ✅ 완료 |
| T-001 | `apps/web/lib/modules/registry.test.ts` | ✅ 완료 |
| T-002 | `apps/web/server/api/trpc.ts` (protectedProcedure 추가) | ✅ 완료 |
| T-002 | `apps/web/server/api/trpc.test.ts` (protectedProcedure 테스트 추가) | ✅ 완료 |
| T-003 | `packages/board/package.json` (isomorphic-dompurify 의존성) | ✅ 완료 |
| T-004 | `packages/board/src/permissions.ts` | ✅ 완료 |
| T-004 | `packages/board/src/permissions.test.ts` | ✅ 완료 |
| T-006 | `packages/board/src/document.ts` (XSS + update + delete + FTS) | ✅ 완료 |
| T-006 | `packages/board/src/document.test.ts` (신규 테스트 추가) | ✅ 완료 |
| T-007 | `packages/board/src/comment.ts` | ✅ 완료 |
| T-007 | `packages/board/src/comment.test.ts` | ✅ 완료 |
| T-008 | `packages/board/src/document.ts` listDocuments FTS 분기 | ✅ 완료 (T-006 포함) |
| T-009 | `apps/web/server/api/routers/admin/board.ts` | ✅ 완료 |
| T-009 | `apps/web/server/api/routers/admin/board.test.ts` | ✅ 완료 |
| T-009 | `apps/web/server/api/routers/admin/index.ts` (board 라우터 추가) | ✅ 완료 |
| T-010 | `apps/web/server/api/routers/content/document.ts` | ✅ 완료 |
| T-010 | `apps/web/server/api/routers/content/document.test.ts` | ✅ 완료 |
| T-011 | `apps/web/server/api/routers/content/comment.ts` | ✅ 완료 |
| T-011 | `apps/web/server/api/routers/content/comment.test.ts` | ✅ 완료 |
| T-011 | `apps/web/server/api/routers/content/index.ts` | ✅ 완료 |
| - | `apps/web/server/api/root.ts` (contentRouter 추가) | ✅ 완료 |

### 3.2 잔여 태스크

**T-005: [mid]/page.tsx 위임**
파일: `apps/web/app/[mid]/page.tsx` (수정)

- `getModuleDefinition(instance.moduleCode)` 호출
- `def.routes.index?.(props)` 위임 (없으면 notFound)
- `@MX:TODO` tag 제거 (완료됨)
- prisma 를 props 에 주입

**T-012: Real BoardIndexPage RSC**
파일: `packages/board/src/routes/index-page.tsx` (수정)

- `listDocuments({ moduleInstanceId: props.instance.id, status: 'PUBLIC' }, { prisma: props.prisma })` 호출
- Document 목록 `<ul>` 렌더
- Slice A placeholder 교체

**Prerequisite for T-012**: `packages/core/src/modules/types.ts` 에 `prisma: PrismaClient` 추가

**T-013: 글쓰기 페이지 + Server Action**
파일: `packages/board/src/routes/write-page.tsx` (신규)
파일: `packages/board/src/actions/create-document.ts` (신규)
파일: `apps/web/app/[mid]/write/page.tsx` (신규)
파일: `packages/board/src/index.ts` (write route export 추가)
파일: `packages/core/src/modules/types.ts` (ModuleRouteMap.write 추가)

Server Action 패턴:
```ts
'use server';
// createDocumentAction(formData): parse → createDocument → redirect
```

---

## 4. 테스트 계획

| ID | 설명 | 기대치 |
|----|------|--------|
| B-101~103 | registry.ts: getModuleDefinition / listRegisteredModules | ✅ 완료 |
| B-201~202 | protectedProcedure: UNAUTHORIZED / 인증 통과 | ✅ 완료 |
| B-301~303 | permissions: admin bypass / guest blocked / member allowed | ✅ 완료 |
| B-401~410 | document: XSS sanitize / status / update / delete / FTS | ✅ 완료 |
| B-501~506 | comment: create+count / list / delete+count | ✅ 완료 |
| B-601~603 | admin.board: list / get (protectedAdmin) | ✅ 완료 |
| B-701~710 | content.document: list/get/create/update/delete | ✅ 완료 |
| B-801~806 | content.comment: list/create/delete | ✅ 완료 |
| B-901 | [mid]/page.tsx: def.routes.index 위임 확인 | ⏳ 잔여 |
| B-1001 | BoardIndexPage: Document 목록 렌더 확인 | ⏳ 잔여 |
| B-1101 | WritePage: form 렌더 + Server Action 연결 | ⏳ 잔여 |

---

## 5. 의존성 레이어

```
Layer 0 (완료): registry.ts, protectedProcedure, isomorphic-dompurify
Layer 1 (완료): permissions.ts, document.ts 업그레이드, comment.ts
Layer 2 (완료): admin.board, content.document, content.comment tRPC 라우터
Layer 3 (잔여): [mid]/page.tsx 위임 (T-005), BoardIndexPage RSC (T-012), 글쓰기 (T-013)
  - T-005 전제: ModuleRoutePageProps.prisma 추가 (packages/core)
  - T-012 전제: T-005 + ModuleRoutePageProps.prisma
  - T-013 전제: T-012 + ModuleRouteMap.write 추가
```

---

## 6. 완료 기준

- [ ] T-005/T-012/T-013 구현 완료
- [ ] `pnpm test --run` 전체 통과 (~560 tests)
- [ ] `pnpm typecheck` 0 errors
- [ ] packages/board, apps/web 빌드 성공
