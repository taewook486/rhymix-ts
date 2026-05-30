---
id: SPEC-BOARD-CRUD-001
title: 게시판 모듈 — 사용자 UI 및 권한 매트릭스
version: 1.0.0
status: draft
created: 2026-05-27
updated: 2026-05-27
author: MoAI manager-spec
priority: P0
phase: 2
parent: MASTER-PLAN-002
depends-on:
  - SPEC-AUTH-001
  - SPEC-ADMIN-001
  - SPEC-LAYOUT-001
  - SPEC-DOCUMENT-001
  - SPEC-COMMENT-001
absorbs:
  - SPEC-CONTENT-001 (board UI portion)
issue_number: TBD
related-research: SPEC-BOARD-CRUD-001/research.md
language: ko
---

# SPEC-BOARD-CRUD-001 — Board Module (Phase 2 / P0)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.6의 직접 흡수 + REMEDIATION-PLAN-001 CONTENT Slice B의 board UI 부분 흡수. 본 SPEC은 Phase 2 콘텐츠 도메인 트리오의 마지막 SPEC으로, SPEC-DOCUMENT-001(문서 도메인)과 SPEC-COMMENT-001(댓글 도메인)이 제공하는 service/router 위에 게시판 wrapper 모듈 + 사용자 라우트 UI + 권한 매트릭스 관리자 UI를 얹는다. 기존 `packages/board`는 monolithic하게 document/comment 코드를 포함하고 있는데, 본 SPEC은 그 의존 방향을 뒤집어 board가 document/comment 패키지를 사용하는 thin wrapper로 재배치한다.

---

## 1. Goal & Audience

### 1.1 Goal

**게시판 mid에 사용자가 방문하면 게시판이 동작한다**를 의미 있게 달성한다. 즉:

- `/{mid}` 또는 `/board/{mid}` 라우트가 board 타입 모듈 인스턴스를 만나면, SPEC-LAYOUT-001 default 레이아웃 안에서 게시판 목록 페이지가 렌더된다.
- 로그인 사용자는 글쓰기/댓글 작성/수정/삭제 라이프사이클을 완주할 수 있다.
- 비로그인 사용자는 쓰기 폼 접근 시 `/login`으로 redirect되며 `callbackUrl`이 보존된다.
- 관리자는 게시판별 권한 매트릭스(grants × member groups)와 게시판별 카테고리/extra_vars를 admin UI에서 편집할 수 있다.
- `packages/board`는 더 이상 document/comment의 도메인 entity 코드를 직접 보유하지 않는다 — `packages/document`와 `packages/comment`를 의존한다.

### 1.2 Audience

- expert-refactoring agent — Slice A 구현 (의존성 재배치, 기존 board 도메인 코드의 document/comment 패키지 이주 + re-export 호환층)
- expert-frontend agent — Slice B 구현 (사용자 라우트 UI: 목록/상세/쓰기/댓글)
- expert-frontend agent — Slice C 구현 (admin 권한 매트릭스 UI + 카테고리 UI)
- expert-backend agent — Slice B/C 보조 (Server Action + 권한 가드)
- 운영자 — 게시판 인스턴스를 만들고, 권한 매트릭스를 설정하고, 게시판이 실제로 사용 가능한지 검증

### 1.3 Non-Goals (본 SPEC 범위 외)

- 문서 CRUD 자체의 service/router — SPEC-DOCUMENT-001
- 댓글 CRUD 자체의 service/router — SPEC-COMMENT-001
- 파일 첨부 업로드 endpoint — SPEC-FILE-001 (Phase 3). 본 SPEC은 업로드 통합 지점(write form 안의 attachment slot)만 정의한다.
- 포인트 적립 (글/댓글 작성 시) — SPEC-POINT-001 (Phase 3). 본 SPEC은 point 이벤트 emit 지점만 noop으로 둔다.
- 신고 워크플로우 UI — SPEC-DOCUMENT-001/COMMENT-001에서 service는 제공, UI는 본 SPEC에서 최소 표시만.
- 게시판 export/import — SPEC-ADMIN-EXTRAS-001 (Phase 5).
- WYSIWYG 에디터 통합 — Phase 1+2는 textarea + raw HTML. WYSIWYG는 후속 SPEC.
- 모바일 전용 board 스킨 — responsive-only 정책(master plan).
- 다국어 카테고리 라벨 — 백로그.

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 의존성 재배치 계층 (REQ-BOARD-001 ~ 019)

**REQ-BOARD-001 (Ubiquitous)**: The `packages/board/` package SHALL declare workspace dependencies on `@rhymix-ts/document` and `@rhymix-ts/comment` in its `package.json` and SHALL NOT re-implement document or comment domain logic locally.

**REQ-BOARD-002 (Ubiquitous)**: The existing `packages/board/src/document.ts` and `packages/board/src/comment.ts` modules SHALL be removed and their domain code SHALL be migrated to `packages/document/` and `packages/comment/` respectively (per SPEC-DOCUMENT-001 and SPEC-COMMENT-001 scope).

**REQ-BOARD-003 (Ubiquitous)**: `packages/board/src/index.ts` SHALL re-export document and comment public APIs from their new packages for a deprecation grace period, marked with `@deprecated` JSDoc tags pointing consumers to the new import paths.

**REQ-BOARD-004 (Ubiquitous)**: All existing `packages/board` tests (~40 tests across document/comment/category/permission/attachment/history/vote/search/trash/report) SHALL continue to pass after migration. Tests that exercise document or comment domain behavior SHALL be moved to their respective new packages; tests that exercise board-specific behavior (permissions, category, attachment glue) SHALL remain in `packages/board`.

**REQ-BOARD-005 (Ubiquitous)**: The `Board` Prisma model SHALL remain owned by `packages/board` (i.e., `Board.permissions`, `Board.extraKeys`, board-level config). `Document`, `Comment`, and their satellite tables SHALL be conceptually owned by `packages/document` and `packages/comment` even though they reside in the shared Prisma schema file.

**REQ-BOARD-006 (Event-Driven)**: WHEN a downstream module (page, widget, future modules) needs to query documents or comments, the module SHALL import from `@rhymix-ts/document` or `@rhymix-ts/comment` directly, NOT from `@rhymix-ts/board`. The board package SHALL NOT act as a proxy.

**REQ-BOARD-007 (Ubiquitous)**: A characterization test bundle SHALL be authored before refactoring begins, capturing the current public API surface of `packages/board` (exported function names, signatures, and at least one happy-path behavior per function). The post-refactor build SHALL pass the same bundle against the new import surface (with deprecation re-exports).

### 2.2 게시판 모듈 정의 계층 (REQ-BOARD-020 ~ 029)

**REQ-BOARD-020 (Ubiquitous)**: The Board system SHALL register a `ModuleDefinition` with `moduleCode = 'board'` in `packages/board/src/module.ts`, using the existing `registerModule` registry API in `packages/core/src/modules/registry.ts` (consistent with the `pageModuleDefinition` pattern from SPEC-PAGE-001).

**REQ-BOARD-021 (Ubiquitous)**: `boardModuleDefinition.routes` SHALL declare four route handlers: `index` (list view), `detail` (document view, `:documentId` sub-path), `write` (create document form), and `edit` (edit existing document form). Each handler SHALL match the `ModuleRouteIndex`-compatible async Server Component signature.

**REQ-BOARD-022 (Ubiquitous)**: `boardModuleDefinition` SHALL declare a config Zod schema `boardConfigSchema` covering board-level settings: `categories: BoardCategoryConfig[]`, `extraKeys: BoardExtraKeyConfig[]`, `noticeDocumentIds: number[]`, `pageSize: number` (default 20), `allowAnonymousWrite: boolean` (default false), `requirePasswordForGuest: boolean` (default true).

**REQ-BOARD-023 (Ubiquitous)**: `packages/board/` SHALL declare a dependency on `@rhymix-ts/core` (module registry, layout pipeline types) and SHALL NOT import `@prisma/client` directly except via injected `prisma` props (consistent with SPEC-PAGE-001 REQ-PAGE-009).

### 2.3 사용자 라우트 — 목록 (REQ-BOARD-030 ~ 039)

**REQ-BOARD-030 (Event-Driven)**: WHEN a request reaches `apps/web/app/[mid]/page.tsx` and the resolved `ModuleInstance.moduleCode === 'board'`, the system SHALL invoke `boardModuleDefinition.routes.index`, obtain `moduleOutput`, and pass it to SPEC-LAYOUT-001's `renderModuleWithLayout`.

**REQ-BOARD-031 (Event-Driven)**: WHEN the board list route is rendered, the system SHALL display documents in descending `list_order` order, paginated according to `boardConfig.pageSize`, and SHALL display documents with `notice === true` pinned above the non-notice list (in addition to their natural pagination position).

**REQ-BOARD-032 (Event-Driven)**: WHEN the list route receives `searchParams.category=N`, the system SHALL filter documents to those with `categorySrl === N` (delegating to SPEC-DOCUMENT-001 search REQs).

**REQ-BOARD-033 (Event-Driven)**: WHEN the list route receives `searchParams.q=text`, the system SHALL invoke the document full-text search service (depends on SPEC-DOCUMENT-001 search REQs) and display matching documents only.

**REQ-BOARD-034 (Event-Driven)**: WHEN the list route receives `searchParams.page=N`, the system SHALL render the N-th page (1-indexed) of results, and SHALL render pagination controls with previous/next/first/last/N around current navigation.

**REQ-BOARD-035 (State-Driven)**: WHILE the current user does not have `list` grant on the board, the list route SHALL render a 403-equivalent error component within the layout, and SHALL NOT leak document titles, counts, or category names.

### 2.4 사용자 라우트 — 상세 (REQ-BOARD-040 ~ 049)

**REQ-BOARD-040 (Event-Driven)**: WHEN a request reaches `apps/web/app/[mid]/[documentId]/page.tsx` and the resolved `ModuleInstance.moduleCode === 'board'`, the system SHALL invoke `boardModuleDefinition.routes.detail({ documentId })` and return the document detail node wrapped by `renderModuleWithLayout`.

**REQ-BOARD-041 (Event-Driven)**: WHEN the detail route is rendered, the system SHALL display the document title, author info, regdate, content (sanitized — delegated to SPEC-DOCUMENT-001), and the comment list (delegated to SPEC-COMMENT-001 query API).

**REQ-BOARD-042 (State-Driven)**: WHILE the requested document's `status === 'SECRET'`, the detail route SHALL allow read access ONLY when (a) the requester is the author, (b) the requester is admin, or (c) the requester provides the correct password (delegated to SPEC-DOCUMENT-001 password check).

**REQ-BOARD-043 (State-Driven)**: WHILE the current user does not have `view` grant on the board, the detail route SHALL render a 403-equivalent error component, and SHALL NOT leak the document title or content.

**REQ-BOARD-044 (Event-Driven)**: WHEN the detail route is rendered AND `view_count_increment` is true (default), the system SHALL increment `Document.readedCount` by 1 (best-effort, idempotency not guaranteed in Phase 2).

### 2.5 사용자 라우트 — 글쓰기/수정 (REQ-BOARD-050 ~ 059)

**REQ-BOARD-050 (Event-Driven)**: WHEN an unauthenticated user accesses `apps/web/app/[mid]/write/page.tsx` for a board where `allowAnonymousWrite === false`, the system SHALL redirect to `/login` with a `callbackUrl` query parameter preserving the original write URL (including any `?category=` or `?reply=` params).

**REQ-BOARD-051 (Event-Driven)**: WHEN an authenticated user with `write_document` grant submits the write form via a Server Action, the system SHALL invoke the SPEC-DOCUMENT-001 createDocument service inside a transaction, and on success SHALL redirect to the detail route of the newly created document.

**REQ-BOARD-052 (Unwanted)**: The Board system SHALL NOT allow a user without `write_document` grant to invoke the create action. IF a user without the grant submits, THEN the system SHALL reject with a 403-equivalent error and SHALL NOT create a Document row.

**REQ-BOARD-053 (Event-Driven)**: WHEN an authenticated user accesses `apps/web/app/[mid]/[documentId]/edit/page.tsx`, the system SHALL load the existing document, verify the current user is the author OR has admin-level board permission, and render the edit form pre-populated with the existing content.

**REQ-BOARD-054 (Event-Driven)**: WHEN the edit form is submitted, the system SHALL invoke the SPEC-DOCUMENT-001 updateDocument service. On success the system SHALL redirect to the detail route preserving the existing documentId.

**REQ-BOARD-055 (Ubiquitous)**: The write/edit form SHALL include a textarea for content, an input for title, a category select populated from `boardConfig.categories`, dynamic inputs for each `boardConfig.extraKeys` entry, and a (Phase 2 inert) file attachment slot. The file slot SHALL render a disabled placeholder with text indicating "파일 첨부는 Phase 3에서 활성화됩니다" (depends on SPEC-FILE-001).

**REQ-BOARD-056 (Optional)**: WHERE `boardConfig.allowAnonymousWrite === true` AND the writer is unauthenticated, the write form SHALL include a guest nickname input and a guest password input. The system SHALL store the hashed password on the Document row for later guest-edit verification (delegated to SPEC-DOCUMENT-001).

### 2.6 사용자 라우트 — 댓글 (REQ-BOARD-060 ~ 069)

**REQ-BOARD-060 (Ubiquitous)**: The board detail route SHALL include a comment list section below the document body. The comment list SHALL be rendered as a tree (using `parentId` + `listOrder`) up to a maximum depth of 5 (per SPEC-COMMENT-001 REQ).

**REQ-BOARD-061 (Event-Driven)**: WHEN an authenticated user with `write_comment` grant submits the comment reply form (as a Server Action), the system SHALL invoke the SPEC-COMMENT-001 createComment service in a transaction, and on success SHALL refresh the detail view (revalidate path).

**REQ-BOARD-062 (Event-Driven)**: WHEN a user submits an edit on their own comment via the inline edit form, the system SHALL invoke SPEC-COMMENT-001 updateComment after verifying ownership.

**REQ-BOARD-063 (Event-Driven)**: WHEN a user submits a delete on their own comment, the system SHALL invoke SPEC-COMMENT-001 deleteComment (soft delete) and the detail view SHALL re-render with the comment removed (or marked deleted, per SPEC-COMMENT-001 policy).

**REQ-BOARD-064 (Unwanted)**: The Board system SHALL NOT allow a non-owner, non-admin user to edit or delete another user's comment. IF such an attempt is made, THEN the system SHALL reject with a 403-equivalent error.

**REQ-BOARD-065 (Event-Driven)**: WHEN an unauthenticated user clicks the reply button on the detail route, the system SHALL redirect to `/login` with `callbackUrl` preserving the detail URL and the reply intent (e.g., `?reply=COMMENT_ID`).

### 2.7 관리자 권한 매트릭스 (REQ-BOARD-070 ~ 079)

**REQ-BOARD-070 (Ubiquitous)**: The Board system SHALL provide an admin route at `apps/web/app/(admin)/admin/boards/[mid]/permissions/page.tsx` containing a 2-D editor whose rows are board grants and whose columns are member groups defined in SPEC-AUTH-001 / SPEC-ADMIN-001.

**REQ-BOARD-071 (Ubiquitous)**: The grants axis SHALL include at least 7 grants matching legacy Rhymix: `list`, `view`, `write_document`, `write_comment`, `vote_log_view`, `update_view`, `consultation_read`. Phase 2 minimum enforced: `list`, `view`, `write_document`, `write_comment`. Remaining grants SHALL render in the UI but enforcement deferred to Phase 5 SPEC-ADMIN-EXTRAS-001.

**REQ-BOARD-072 (Event-Driven)**: WHEN an admin saves the permissions matrix, the system SHALL persist the matrix as JSON to `Board.permissions` (existing column, see `packages/board/src/permissions.ts`) in the shape `Record<Grant, number[]>` where the array contains allowed member group srl values.

**REQ-BOARD-073 (Ubiquitous)**: The permission evaluator (`canPerformAction` in `packages/board/src/permissions.ts`) SHALL be extended to support all 7 grants (currently supports only 4). Existing test cases SHALL be preserved; new tests SHALL be added per added grant.

**REQ-BOARD-074 (State-Driven)**: WHILE a board has no explicit `permissions[action]` entry, the system SHALL apply the default `[1]` (member only, current behavior per `permissions.ts` line 58) for `list`, `view`, `write_document`, `write_comment`, and SHALL apply `[]` (admin only) for `vote_log_view`, `update_view`, `consultation_read`.

**REQ-BOARD-075 (Unwanted)**: The Board system SHALL NOT allow a non-admin to access the permissions matrix UI. IF a non-admin accesses `/admin/boards/[mid]/permissions`, THEN the system SHALL redirect to `/login` or return a 403-equivalent error (consistent with SPEC-ADMIN-001 admin guard).

**REQ-BOARD-076 (Ubiquitous)**: The relationship between `Board.permissions` JSON and the generic ACL system in `packages/auth/src/rbac.ts` SHALL be resolved during Slice C implementation: the board permission evaluator is THE authoritative gatekeeper for board actions, and the generic RBAC system SHALL NOT override per-board grants. (See Open Question 2.)

### 2.8 카테고리 / extra_vars 관리 (REQ-BOARD-080 ~ 089)

**REQ-BOARD-080 (Ubiquitous)**: The Board system SHALL provide an admin route at `apps/web/app/(admin)/admin/boards/[mid]/categories/page.tsx` with CRUD for board categories. Each category SHALL have `title: string`, `description?: string`, `parentId?: number` (tree), `order: number`, `color?: string`.

**REQ-BOARD-081 (Event-Driven)**: WHEN an admin creates/updates/deletes a category, the system SHALL persist categories as JSON in `boardConfig.categories` (via `ModuleConfig.config.board` namespace) within a transaction.

**REQ-BOARD-082 (Ubiquitous)**: The Board system SHALL provide an admin route at `apps/web/app/(admin)/admin/boards/[mid]/extra-keys/page.tsx` with CRUD for board extra keys (additional document fields). Each extra key SHALL have `name: string`, `label: string`, `type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date'`, `required: boolean`, `options?: string[]` (for select), `order: number`.

**REQ-BOARD-083 (Event-Driven)**: WHEN an admin saves extra keys, the system SHALL persist them in `boardConfig.extraKeys` via `ModuleConfig.config.board`. The write/edit form (REQ-BOARD-055) SHALL dynamically render an input for each defined extra key.

### 2.9 공지글 고정 (REQ-BOARD-090 ~ 094)

**REQ-BOARD-090 (Ubiquitous)**: The Board system SHALL allow admins to mark a document as a notice via the document edit UI (admin-only toggle). The notice flag SHALL be persisted on `Document.notice` (boolean, owned by SPEC-DOCUMENT-001 schema).

**REQ-BOARD-091 (Event-Driven)**: WHEN the board list route renders, the system SHALL fetch all documents where `notice === true AND moduleSrl === instance.id` and pin them above the paginated non-notice list. Notice documents SHALL be visually distinguished (e.g., `[공지]` prefix, distinct background).

**REQ-BOARD-092 (State-Driven)**: WHILE a notice document also appears on the current pagination page (because of its natural order), the system SHALL deduplicate so the document renders only once (in the pinned area).

### 2.10 Quality 계층 (REQ-BOARD-100 ~ 109)

**REQ-BOARD-100 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-BOARD-101 (Ubiquitous)**: The user-route integration tier SHALL include at least one Playwright e2e test: install → seed board instance with categories + sample documents → visit `/{mid}` → assert list renders inside `[data-rhymix-layout="default"]` with at least one document title visible → click document → assert detail view renders with comment list.

**REQ-BOARD-102 (Ubiquitous)**: The write-flow e2e test SHALL cover the unauthenticated-redirect path: visit `/{mid}/write` while logged out → assert redirect to `/login?callbackUrl=%2F{mid}%2Fwrite` → log in → assert redirect back to write form.

**REQ-BOARD-103 (Ubiquitous)**: The permissions admin SHALL include at least 5 unit tests for `canPerformAction` covering each new grant (extending existing tests).

**REQ-BOARD-104 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (`packages/board`, `packages/document`, `packages/comment`, `apps/web`).

**REQ-BOARD-105 (Ubiquitous)**: All new code SHALL respect language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-BOARD-106 (Unwanted)**: The Board system SHALL NOT introduce new global mutable state. Module registration is idempotent; per-request state is loaded fresh.

---

## 3. Slices

본 SPEC은 3개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: 의존성 재배치 (Refactor)

종속성: SPEC-DOCUMENT-001 Slice A 완료, SPEC-COMMENT-001 Slice A 완료 (둘 다 신규 패키지 골조 + 도메인 코드 이주가 끝나야 한다).

작업 항목:

1. **Characterization 테스트 작성 (PRESERVE)**:
   - 기존 `packages/board/src/index.ts` export 시그니처를 snapshot으로 캡쳐 (function name, arity)
   - 핵심 6개 함수에 대한 happy-path behavior test (createDocument, deleteDocument, voteUp, voteDown, createComment, deleteComment via current board API)
2. **document/comment 코드 이주**:
   - `packages/board/src/document.ts` → `packages/document/src/service.ts` (SPEC-DOCUMENT-001 Slice A에서 이미 시작됨; 본 SPEC은 완료를 검증)
   - `packages/board/src/comment.ts` → `packages/comment/src/service.ts` (SPEC-COMMENT-001 Slice A에서 이미 시작됨; 본 SPEC은 완료를 검증)
   - 의존 테스트(document.test.ts, comment.test.ts)도 함께 이동
3. **packages/board/package.json 수정**:
   - `dependencies`에 `@rhymix-ts/document: workspace:*`, `@rhymix-ts/comment: workspace:*` 추가
   - 본인이 의존하지 않는 entity 코드는 export 안 함
4. **packages/board/src/index.ts 재구성**:
   - board 고유 모듈(`config`, `permissions`, `category`, `attachment`, `extra-keys`, `extra-vars-schema`, `history`, `report`, `search`, `trash`, `vote`, `rate-limit`)만 export
   - document/comment 함수는 `@deprecated` JSDoc 표시와 함께 re-export (deprecation grace)
5. Characterization 테스트 재실행하여 회귀 없음 검증

검증:

- `pnpm test packages/board packages/document packages/comment` 전부 통과
- `pnpm tsc --noEmit` 0 error
- `pnpm build packages/board` 성공
- characterization snapshot 비교 통과

EARS coverage: REQ-BOARD-001 ~ 007

### Slice B: 사용자 라우트 UI (목록/상세/쓰기/댓글)

종속성: Slice A 완료 + SPEC-LAYOUT-001 Slice B (renderModuleWithLayout) + SPEC-DOCUMENT-001 Slice B (tRPC + service 안정화) + SPEC-COMMENT-001 Slice B (tRPC + service 안정화)

작업 항목:

1. **모듈 정의**:
   - `packages/board/src/module.ts` 신규: `boardModuleDefinition` (routes: index/detail/write/edit, configSchema)
   - `apps/web/lib/modules/register.ts`에 `registerModule(boardModuleDefinition)` 추가
2. **목록 라우트**:
   - `apps/web/app/[mid]/page.tsx`는 이미 모듈 디스패처로 동작; `moduleCode === 'board'`일 때 `boardModuleDefinition.routes.index`가 호출되도록 검증
   - `packages/board/src/routes/index-route.tsx` 신규 (RSC) — 목록 view (페이지네이션, 카테고리 필터, 검색, 공지 고정)
3. **상세 라우트**:
   - `apps/web/app/[mid]/[documentId]/page.tsx` 신규 — board moduleCode일 때 `routes.detail` 위임
   - `packages/board/src/routes/detail-route.tsx` 신규 (RSC) — 문서 본문 + 댓글 트리 + 답글 폼 + view count 증가
4. **쓰기/수정 라우트**:
   - `apps/web/app/[mid]/write/page.tsx` 신규 — `routes.write` 위임 + 미로그인 redirect
   - `apps/web/app/[mid]/[documentId]/edit/page.tsx` 신규 — `routes.edit` 위임 + 작성자/admin 가드
   - `packages/board/src/routes/write-form.tsx` 신규 (client component) — title/textarea/category select/extraKeys 동적 입력 + file slot disabled
   - Server Actions: `packages/board/src/actions/create-document.ts` (이미 존재, 검증 후 보강), `update-document.ts` 신규
5. **댓글 UI**:
   - `packages/board/src/routes/comment-list.tsx` 신규 (RSC) — 트리 렌더 (재귀 컴포넌트)
   - `packages/board/src/routes/comment-form.tsx` 신규 (client) — 작성 / 인라인 편집 / 삭제 UI
   - Server Actions: `packages/board/src/actions/comment-create.ts`, `comment-update.ts`, `comment-delete.ts` 신규
6. **권한 가드**:
   - `permissions.ts` 확장: 7개 grant 전부 지원 (현재 4개 → 7개)
   - 모든 라우트는 진입 시 `canPerformAction` 호출 후 무권한이면 403 fragment 렌더
7. e2e 테스트:
   - 1개 e2e: 목록 → 상세 → 댓글 흐름
   - 1개 e2e: 비로그인 write 접근 → /login redirect → 로그인 후 callbackUrl 복귀

검증:

- `pnpm dev`에서 board 인스턴스 생성 → 글쓰기 → 댓글 → 라이프사이클 완주
- e2e 2개 통과
- 단위 테스트 15개 이상 추가
- `pnpm tsc --noEmit` 0 error

EARS coverage: REQ-BOARD-020 ~ 029, REQ-BOARD-030 ~ 069, REQ-BOARD-090 ~ 092, REQ-BOARD-100 ~ 106

### Slice C: 관리자 권한 매트릭스 + 카테고리 + extra_vars UI

종속성: Slice B 완료

작업 항목:

1. **권한 매트릭스 UI**:
   - `apps/web/app/(admin)/admin/boards/[mid]/permissions/page.tsx` 신규
   - 행: 7개 grant. 열: SPEC-AUTH-001/ADMIN-001의 member groups (DB에서 조회)
   - 체크박스 매트릭스, save action → `Board.permissions` JSON 업데이트
   - admin 가드 + 비admin 403
2. **카테고리 관리 UI**:
   - `apps/web/app/(admin)/admin/boards/[mid]/categories/page.tsx` 신규
   - 트리 리스트 + 추가/수정/삭제/순서 변경 (드래그 안 함, 단순 up/down 버튼)
   - save action → `ModuleConfig.config.board.categories` 업데이트
3. **extra_vars 관리 UI**:
   - `apps/web/app/(admin)/admin/boards/[mid]/extra-keys/page.tsx` 신규
   - 키 추가/수정/삭제 (type select: text/textarea/select/checkbox/date), 필수 토글, 옵션 입력 (type=select일 때)
   - save action → `ModuleConfig.config.board.extraKeys` 업데이트
4. **공지글 토글 (admin only)**:
   - 상세 라우트의 admin UI에 "공지로 지정/해제" 버튼 추가 (Slice B에서 placeholder만 두었다면 본 슬라이스에서 활성화)
   - action: `Document.notice` 토글 (SPEC-DOCUMENT-001 update API 사용)
5. 단위 테스트: 권한 evaluator 7-grant 테스트 (5개 이상), categories/extraKeys CRUD 테스트 (5개 이상)

검증:

- 관리자가 권한 매트릭스를 변경하면 사용자 측에서 즉시 반영됨 (캐싱 없음)
- 카테고리 추가 → 쓰기 폼 select에 즉시 나타남
- extra_vars 추가 → 쓰기 폼에 동적 입력 즉시 나타남
- 전체 `pnpm test` 통과

EARS coverage: REQ-BOARD-070 ~ 089, REQ-BOARD-103

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 6개:

1. **AC-BOARD-A1**: GIVEN 기존 `packages/board` 코드 + Slice A 적용 완료, WHEN `pnpm test packages/board packages/document packages/comment` 실행, THEN characterization 테스트를 포함한 모든 기존 테스트가 통과한다 (회귀 없음).
2. **AC-BOARD-B1**: GIVEN board 인스턴스가 mid=`free`로 생성됨 + 샘플 문서 3개 시드, WHEN 사용자가 `/free`를 방문, THEN HTTP 200 + default 레이아웃 안에 3개 문서 목록이 표시된다 + 페이지네이션 컨트롤이 표시된다.
3. **AC-BOARD-B2**: GIVEN 비로그인 사용자, WHEN `/free/write`를 방문, THEN `/login?callbackUrl=%2Ffree%2Fwrite`로 redirect된다.
4. **AC-BOARD-B3**: GIVEN 로그인 사용자 + `write_document` grant 보유, WHEN 쓰기 폼을 제출, THEN 새 Document가 생성되고 `/{mid}/{newDocumentId}`로 redirect된다.
5. **AC-BOARD-C1**: GIVEN 관리자 세션, WHEN `/admin/boards/free/permissions`에서 `list` 행의 `guest` 그룹 체크박스를 해제하고 저장, THEN `Board.permissions.list`에 해당 그룹이 제외되어 저장되고, guest로 `/free` 방문 시 403 fragment가 렌더된다.
6. **AC-BOARD-C2**: GIVEN 관리자 세션, WHEN `/admin/boards/free/categories`에서 "공지사항" 카테고리를 추가, THEN 쓰기 폼의 카테고리 select에 즉시 "공지사항"이 나타난다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 의존 그래프의 역전

현재 (Phase 2 이전):

```
packages/board/
    ├── document.ts  (board가 직접 보유)
    ├── comment.ts   (board가 직접 보유)
    └── ...
```

목표 (Phase 2 이후):

```
packages/document/   ← document 도메인 (independent)
packages/comment/    ← comment 도메인 (independent)
packages/board/      ← document + comment를 사용하는 wrapper
    ├── module.ts    (boardModuleDefinition)
    ├── routes/      (UI 라우트 핸들러)
    ├── permissions.ts (board-specific ACL)
    ├── config.ts    (boardConfig schema)
    └── actions/     (Server Actions)
```

이 역전을 안전하게 달성하기 위해 Slice A에서 characterization 테스트를 먼저 작성한 뒤 코드를 이주한다 (DDD ANALYZE-PRESERVE-IMPROVE 원칙).

### 5.2 routes 디스패치 패턴

board는 mid가 매칭되었을 때 4개 sub-route 중 하나를 선택해야 한다:

- `/{mid}` → routes.index
- `/{mid}/{documentId}` → routes.detail
- `/{mid}/write` → routes.write
- `/{mid}/{documentId}/edit` → routes.edit

apps/web 측은 Next.js App Router의 catch-all/dynamic segment 조합으로 처리한다:

- `apps/web/app/[mid]/page.tsx` (이미 존재) → routes.index 위임
- `apps/web/app/[mid]/[documentId]/page.tsx` (신규) → routes.detail 위임 (`documentId === 'write'`인 경우 routes.write로 위임 분기)
- `apps/web/app/[mid]/[documentId]/edit/page.tsx` (신규) → routes.edit 위임

대안: `apps/web/app/[mid]/write/page.tsx`를 별도 segment로 두면 `documentId` 분기가 필요 없다. Slice B 구현 시 expert-frontend 결정. 권고: `write`를 별도 segment로 분리 (충돌 회피).

### 5.3 Server Actions 사용

write/edit/comment 작성은 모두 Server Action으로 처리한다 (REQ-PAGE-031 동일 패턴). 폼은 `<form action={serverAction}>` 구조를 따르고, action 내부에서 (1) 권한 가드 → (2) document/comment 서비스 호출 → (3) revalidatePath + redirect 순서로 진행한다.

### 5.4 권한 매트릭스 — Board.permissions vs RBAC

현재 `packages/board/src/permissions.ts`는 `Board.permissions` JSON을 평가하는 single function이다. `packages/auth/src/rbac.ts`는 일반 RBAC(role-based access control) — admin 그룹 판별, isAdmin OR-게이트 등 — 을 다룬다. 두 시스템의 관계는:

- **rbac.ts는 site-wide / app-wide 권한**: 관리자 여부, 사이트 관리자 여부
- **permissions.ts는 board-instance-wide 권한**: 특정 게시판에서 특정 액션 허용 여부

board 동작 시 호출 순서: `isAdminCheck (rbac.ts) → if not admin, canPerformAction (permissions.ts) → if false, 403`.

이 관계를 명시적으로 문서화하고 (Open Question 2 해결) 두 시스템이 충돌하지 않게 한다.

### 5.5 공지글 고정 저장 위치

옵션 A: `Document.notice` boolean 컬럼 (SPEC-DOCUMENT-001 owned)
옵션 B: `boardConfig.noticeDocumentIds: number[]` (board별 명시적 목록)

권고: **옵션 A** — 레거시 Rhymix와 일관, 문서 자체의 속성, 쿼리 단순(`WHERE moduleSrl=? AND notice=true`). 옵션 B는 admin이 임의 문서를 공지로 임의 promote할 때 유리하지만 두 시스템 중복 정합 부담 큼. (Open Question 3 — 본 SPEC 권고는 A.)

### 5.6 file 첨부 통합점 (Phase 3 대비)

write/edit 폼은 file slot을 disabled placeholder로 렌더한다 (REQ-BOARD-055). Phase 3 SPEC-FILE-001 완료 시:

- placeholder를 활성화된 업로드 컴포넌트로 교체
- Server Action에서 file id를 함께 받아 Document와 연결
- delete cascade는 SPEC-FILE-001이 file → document 이벤트 후크로 처리

본 SPEC은 file slot의 props 인터페이스(`onAttach?: (fileId: number) => void`)만 정의하고 구현은 비활성으로 둔다.

### 5.7 캐시 — Phase 2는 의도적으로 미적용

레거시 Rhymix의 module_cache / widget_cache는 본 SPEC 범위 외. Phase 2는 SSR 매 요청마다 fresh fetch. 성능 우려는 SPEC-INFRA-CACHE-001 후속 SPEC에서 처리.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| document/comment 코드 이주 시 회귀 | Slice A에서 characterization 테스트 우선. 이주 후 동일 테스트 통과 강제 (REQ-BOARD-004, 007) |
| Board.permissions 평가가 4 grant → 7 grant 확장 시 기존 로직 깨짐 | permissions.ts의 default 분기 유지 + 추가 grant는 기본값 `[]` (admin only). 기존 4개 grant의 default `[1]`은 보존 (REQ-BOARD-074) |
| 비로그인 사용자가 미공개 board 목록 페이지에서 정보 누설 | REQ-BOARD-035: `list` grant 없으면 제목/카운트/카테고리명까지 모두 hide. 503 fragment만 렌더. e2e 테스트로 가드 |
| Server Action에서 권한 가드 누락 | actions/*.ts 각 함수의 첫 줄에서 `canPerformAction` 호출 강제. 코드 리뷰 체크리스트 + lint 규칙 (선택) |
| 공지글 dedup 누락 (페이지네이션 위치와 공지 영역에 중복 출현) | REQ-BOARD-092: list query에서 `notice=true` 제외 후 paginate, 별도로 notice 목록을 prepend. 단위 테스트 필수 |
| ARTICLE/CONTENT/WIDGET pageType 혼동 (page 모듈과 경계) | SPEC-PAGE-001 Slice A에서 board는 명시적으로 별개 moduleCode. document/comment 의존만 공유, page 모듈은 본 SPEC 범위 외 |
| Slice A의 deprecation re-export가 영구화될 위험 | re-export에 `@deprecated` JSDoc + Phase 3 시작 시 제거 일정 명시 (별도 SPEC-CLEANUP에서 처리) |
| Board.permissions JSON의 schema drift | Zod schema(boardPermissionsSchema)로 read 시 validate. invalid면 default로 fall-back + warning log |
| 트리 댓글 렌더 재귀가 깊은 게시판에서 무한 루프 | REQ-BOARD-060: depth max 5. SPEC-COMMENT-001 validate 후 본 SPEC은 trust. 추가로 list flatten 시점에 cycle detection (방어 코드) |

---

## 7. Open Questions (3개)

본 SPEC 작성 시점에 미해결인 항목들. 모두 Slice B/C 진입 전 결정 필요.

1. **WYSIWYG 에디터 선택**: Phase 2는 raw textarea + HTML로 출시한다. 그러나 운영자 UX가 매우 낮아 후속 SPEC이 필수다. 후보:
   - TinyMCE (legacy Rhymix가 사용, 무게 큼, 라이선스 주의)
   - CKEditor 5 (modern, modular, 라이선스 주의)
   - ProseMirror (가장 가볍고 RSC와 통합 용이, 진입 장벽 높음)
   - Tiptap (ProseMirror 래퍼, React-friendly)
   - 권고: **Tiptap** — Phase 1 시점에 결정 안 함, 별도 SPEC-WYSIWYG-001로 분리.
2. **Grants schema 위치 결정**: `Board.permissions` JSON 평가는 `packages/board/src/permissions.ts`에 있다. 일반 RBAC(`packages/auth/src/rbac.ts`)와의 관계는 본 SPEC Section 5.4 권고대로 정의 — 단, 실제 코드 통합 시 다음을 검증해야 한다:
   - `rbac.ts`가 site-admin OR-게이트를 노출하는가? (현재 노출 패턴 확인 필요)
   - `permissions.ts`가 site-admin을 escape hatch로 인정하는가? (현재 `isAdmin` flag로 인정 — line 48 확인됨)
   - admin 권한 단일 진입점 가이드라인을 SPEC-AUTH-001 후속 patch로 문서화할지 여부
   - 권고: SPEC-AUTH-001을 patch하지 말고 본 SPEC Slice C 구현 시 `getEffectivePermissionContext()` helper를 `packages/board`에 두어 어둠상자로 처리.
3. **공지 핀 저장 위치 — Document.notice vs boardConfig.noticeIds**: 본 SPEC Section 5.5 권고는 `Document.notice` (옵션 A). 그러나 일부 운영 시나리오(특정 게시판에서 임시로 다른 문서를 promoting)에서 옵션 B가 더 유연. 권고: **옵션 A를 기본**으로 채택하고, 옵션 B는 SPEC-ADMIN-EXTRAS-001에서 "보드 운영자의 promoteNotice 액션"으로 추가 (Document.notice + boardConfig.priorityIds 병행).

위 3개 결정은 Slice B 진입 전 user 확인이 필요한 항목이지만, Slice A는 결정에 영향받지 않으므로 우선 진행 가능.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **문서 도메인 entity / CRUD service**: Document 생성/수정/삭제/검색 — SPEC-DOCUMENT-001. 본 SPEC은 그 service의 소비자.
2. **댓글 도메인 entity / CRUD service**: Comment 생성/수정/삭제 — SPEC-COMMENT-001. 본 SPEC은 그 service의 소비자.
3. **파일 첨부 업로드 endpoint**: 실제 multipart 업로드 / 이미지 resize / cover image — SPEC-FILE-001 (Phase 3). 본 SPEC은 file slot의 disabled placeholder만.
4. **포인트 적립 트랜잭션**: 글쓰기/댓글 작성 시 회원 포인트 부여 — SPEC-POINT-001 (Phase 3). 본 SPEC은 point.add 호출 지점만 noop으로 둔다.
5. **WYSIWYG 에디터**: TinyMCE/CKEditor/Tiptap 등 — Open Question 1 + 후속 SPEC-WYSIWYG-001. Phase 2는 textarea raw HTML.
6. **신고 워크플로우 UI**: 신고 접수/조사/처리 흐름 — SPEC-DOCUMENT-001/COMMENT-001 service만 노출, UI는 본 SPEC + ADMIN-EXTRAS에 분산.
7. **게시판 export/import (JSON)**: 게시판 + 카테고리 + 문서 전체 dump — SPEC-ADMIN-EXTRAS-001 (Phase 5).
8. **RSS / Atom feed**: 게시판 RSS — 백로그 (SPEC-MODULE-BACKLOG).
9. **트랙백 / 핑백**: 레거시 modules/trackback — 폐기, master plan에서 미포함.
10. **모바일 전용 board 스킨 (m.skin)**: responsive-only 정책. 별도 mobile skin은 백로그.
11. **다국어 카테고리 라벨**: 카테고리 title의 i18n — 백로그.
12. **board별 RSS 토큰 / 외부 위젯 endpoint**: 백로그.
13. **댓글 알림 (notification)**: 새 댓글 시 이메일/푸시 — SPEC-MAIL-001(Phase 3)/notification 별도 SPEC.
14. **board 단위 IP 차단 / 욕설 필터**: spamfilter — 백로그 (SPEC-MODULE-BACKLOG).
15. **board별 캐시 무효화 정책**: 캐싱 인프라 자체가 백로그(SPEC-INFRA-CACHE-001).
16. **수정 이력 UI 풀세트**: `Document.histories`는 SPEC-DOCUMENT-001 service에서 보존하나, history 비교/롤백 UI는 본 SPEC 범위 외.
17. **vote_log_view / consultation_read grant의 동작 구현**: REQ-BOARD-071에 따라 UI 매트릭스에는 노출되나 enforcement는 Phase 5.
18. **board별 admin 권한 위임 (module_admins)**: 특정 회원을 특정 게시판의 매니저로 지정 — SPEC-ADMIN-EXTRAS-001 Slice 2 (Phase 5).
19. **공지 promote/demote 임시 액션**: 임의 문서를 임시 공지로 — Open Question 3 후속 SPEC 처리.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 25+ (Slice A: characterization 7+ / Slice B: route + e2e 13+ / Slice C: admin UI 5+)
Estimated Slice Count: 3 (A: dependency reorganization, B: user routes UI, C: admin UI for permissions/categories/extraKeys)
Dependencies (upstream): SPEC-DOCUMENT-001 (Phase 2 병행), SPEC-COMMENT-001 (Phase 2 병행), SPEC-LAYOUT-001 ✅ (Phase 1), SPEC-AUTH-001 ✅, SPEC-ADMIN-001 ✅
Soft dependency: SPEC-FILE-001 (Phase 3, 첨부 slot 활성화 시점), SPEC-POINT-001 (Phase 3, point 적립 활성화 시점)
Blocks (downstream): Phase 3 SPEC-FILE-001 (board write 폼의 attachment 통합), Phase 5 SPEC-ADMIN-EXTRAS-001 (잔여 grant enforcement)
