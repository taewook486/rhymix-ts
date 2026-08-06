---
id: SPEC-DOCUMENT-001
title: 문서 도메인 독립 패키지 (Document Domain Standalone Package)
version: 1.0.0
status: completed
created: 2026-05-27
updated: 2026-06-27
author: MoAI manager-spec
priority: P0
phase: 2
parent: MASTER-PLAN-002
depends-on: [SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-LAYOUT-001]
absorbs: [SPEC-CONTENT-001 document portion]
issue_number: TBD
related-research: SPEC-DOCUMENT-001/research.md
language: ko
---

# SPEC-DOCUMENT-001 — 문서 도메인 독립 패키지 (Phase 2 / P0)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.4(line 279~288)의 직접 흡수. SPEC-CONTENT-001(line 750+ test, Slice A~F+UI 완료)의 document 도메인 영역을 `packages/board/`에서 분리하여 `packages/document/`로 독립화한다. 본 SPEC은 기능 변경(behavior change)을 목표로 하지 않으며, "packages 분리 + 누락된 도메인 기능 보완"이 1차 목표다. 기존 `document.ts`(555 LoC), `extra-keys.ts`(255 LoC), `extra-vars-schema.ts`, `history.ts`, `search.ts`, `report.ts`, `rate-limit.ts`, `permissions.ts`, `trash.ts`, `on-install.ts`가 `packages/board/src/`에 응집되어 있음. 사용자 통증(MASTER-PLAN-002 Section 0.4): board가 document에 의존하는 thin wrapper로 정렬되어야 하나 현재는 응집되어 wiki/blog/page 등 다른 모듈이 document를 직접 소비할 수 없다.

---

## 1. Goal & Audience

### 1.1 Goal

**Rhymix의 `modules/document` 도메인을 `packages/board`로부터 분리하여 독립 패키지 `packages/document/`로 승격한다.** 즉:

- 현재 `packages/board/src/`에 응집되어 있는 document 코드(약 1,500 LoC + 약 1,500 LoC 테스트)를 신규 `packages/document/`로 물리 이동한다.
- 신규 패키지는 `packages/board`에 의존하지 않으며, 반대로 `packages/board`가 `packages/document`에 의존하도록 dependency 방향을 정렬한다 (MASTER-PLAN-002 Section 1 line 66, Section 5.4 line 281~282).
- document 도메인의 누락 기능을 보완한다: tRPC document router(공개 + 보호 procedure), 비밀글 비밀번호 액세스, 임시저장(DRAFT) UI 데이터 모델, 수정 이력 조회 UI 스캐폴드.
- Board의 grants 매트릭스(`packages/auth/src/rbac`) 통합 경계를 명확히 한다 — document는 board 권한을 "소비"하지만 board 자체에는 의존하지 않는다(권한 결정은 호출자가 전달).

### 1.2 Audience

- expert-backend agent — Slice A 구현 (packages 분리 + characterization tests 보존)
- expert-backend agent — Slice B 구현 (tRPC document router + Server Actions)
- expert-frontend agent — Slice C 구현 (secret/draft/trash/history UI 스캐폴드)
- expert-refactoring agent — board package 정리 (board가 document를 의존하는 wrapper로 변환)
- 운영자/개발자 — board 외 다른 모듈(wiki, blog, page article-mode)에서 document를 재사용 가능하도록 도메인 API를 검증하는 최종 사용자

### 1.3 Non-Goals (본 SPEC 범위 외)

- board UI 라우트(`/board/[mid]`)의 글쓰기/상세보기 페이지 → SPEC-BOARD-CRUD-001 (Phase 2 후속)
- comment 도메인 독립화 → SPEC-COMMENT-001 (Phase 2 병행). 본 SPEC은 Comment 관계를 보존만 한다.
- 파일 첨부 업로드 endpoint → SPEC-FILE-001 (Phase 3). 본 SPEC은 `FileAttachment` Prisma 관계(`documentId`)만 보존한다.
- 포인트 부여(point per document) → SPEC-POINT-001 (Phase 3). 본 SPEC은 point.add 호출 hook 지점만 정의한다 (실제 호출 없음).
- WYSIWYG 에디터 통합 → 후속 SPEC. Phase 2는 textarea + HTML sanitize만 (현재 코드 보존).
- 외부 검색 엔진(Meilisearch) 통합 → 백로그. PostgreSQL FTS는 이미 동작 중.
- 별칭 URL(`document_aliases`) → 백로그 (레거시에는 있으나 현재 Prisma 모델 없음).
- 신고 워크플로우 admin UI → 본 SPEC은 `DocumentReport` 모델 보존 + report.ts 이동만 (관리자 UI는 SPEC-ADMIN-EXTRAS-001).
- 모바일 본문(mcontent) — document에는 없음. page 전용 (SPEC-PAGE-001).
- 데이터 마이그레이션 (PHP `documents` → TS `documents`) → 별도 SPEC.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. 8개 카테고리(Schema, CRUD, Search, Secret, Draft, History, Trash, ACL, Integration)로 그룹화.

### 2.1 Schema 계층 (REQ-DOC-001 ~ 009)

**REQ-DOC-001 (Ubiquitous)**: The Document system SHALL reuse the existing Prisma `Document` model (`packages/db/prisma/schema.prisma` line 613~668) without breaking changes. Additive migrations only; column rename or removal is forbidden in this SPEC.

**REQ-DOC-002 (Ubiquitous)**: The Document system SHALL preserve all existing Document columns: `id`, `documentSrl`, `boardId`, `categoryId`, `title`, `content`, `contentText`, `authorId`, `userIdSnapshot`, `nickName`, `email`, `ipAddress`, `password`, `readedCount`, `votedCount`, `blamedCount`, `commentCount`, `trackbackCount`, `uploadedCount`, `status` (`DocumentStatus`: PUBLIC/SECRET/TEMP), `commentStatus`, `isNotice`, `langCode`, `tags`, `extraVars` (Json), `listOrder`, `updateOrder`, `regdate`, `lastUpdate`, `deletedAt`, `searchVector` (tsvector GENERATED).

**REQ-DOC-003 (Ubiquitous)**: The Document system SHALL preserve the existing `DocumentStatus` enum values (PUBLIC, SECRET, TEMP). PUBLIC=공개, SECRET=비밀글(password 보호), TEMP=임시저장(draft). No new status values are introduced in this SPEC.

**REQ-DOC-004 (Ubiquitous)**: The Document system SHALL preserve the existing `DocumentExtraKey` model (schema.prisma line 733~750) — `boardId`, `varIdx`, `varName`, `varType` (text/textarea/number/select/checkbox/date/email/url), `varIsRequired`, `varSearch`, `varSort`, `varOptions` (Json), `langCode` — and SHALL reuse the dynamic Zod schema builder `buildExtraVarsSchema(keys)` (currently in `packages/board/src/extra-vars-schema.ts`).

**REQ-DOC-005 (Ubiquitous)**: The Document system SHALL preserve the existing `DocumentCategory` model (schema.prisma line 707~730) with tree structure (`parentId` self-relation) and `documentCount` denormalized counter. The category tree depth SHALL match legacy Rhymix behavior (no hard limit, but practical 5 levels per `research.md`).

**REQ-DOC-006 (Ubiquitous)**: The Document system SHALL preserve the existing `DocumentUpdateLog` model (schema.prisma line 783~798) for edit history — `documentId`, `prevTitle`, `prevContent`, `prevExtraVars` (Json), `editorId`, `editorIp`, `regdate`.

**REQ-DOC-007 (Ubiquitous)**: The Document system SHALL preserve the existing `DocumentVote` (line 801~816) and `DocumentReport` (line 819~833) models. Vote/report business logic lives in `packages/document/src/vote.ts` and `report.ts` after the move (currently `packages/board/src/`).

**REQ-DOC-008 (Ubiquitous)**: The Document system SHALL preserve the existing `Trash` model relation (`Document.trash Trash?`). Soft delete sets `deletedAt`; Trash entry is created when `Board.trashUse=true` with 30-day retention (`trash.ts:38` TRASH_RETENTION_DAYS).

**REQ-DOC-009 (Ubiquitous)**: The Document system SHALL NOT introduce new Prisma migrations in Slice A (package separation). New migrations, if any, SHALL appear only in Slice C (domain feature completion) and SHALL be additive (e.g., index additions, nullable columns).

### 2.2 Package Structure 계층 (REQ-DOC-010 ~ 019)

**REQ-DOC-010 (Ubiquitous)**: The Document system SHALL be packaged as `packages/document/` with a `package.json` declaring name `@rhymix-ts/document`, version `0.1.0`, dependencies on `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/auth` (for permission type imports), `zod`, `isomorphic-dompurify`.

**REQ-DOC-011 (Ubiquitous)**: The Document system SHALL NOT depend on `@rhymix-ts/board`. Reverse dependency direction is enforced: `packages/board` MAY depend on `packages/document` but not vice versa.

**REQ-DOC-012 (Ubiquitous)**: The Document system SHALL expose a top-level barrel export at `packages/document/src/index.ts` re-exporting: `createDocument`, `updateDocument`, `deleteDocument`, `listDocuments`, `getDocument`, `searchDocuments`, `searchTags`, `softDeleteDocument`, `restoreDocument`, `purgeDocument`, `listTrash`, `recordUpdate`, `getUpdateHistory`, `createExtraKey`, `updateExtraKey`, `deleteExtraKey`, `listExtraKeys`, `reorderExtraKeys`, `buildExtraVarsSchema`, `evictExtraVarsSchemaCache`, plus the existing error classes (`ExtraVarsRequiredError`, `ExtraVarsNotConfiguredError`, `BoardPermissionDeniedError`, `DocumentOwnershipError`, `ExtraKeyDuplicateNameError`, `ExtraKeyOptionsRequiredError`, `TrashNotFoundError`, `TrashExpiredError`).

**REQ-DOC-013 (Ubiquitous)**: The Document system SHALL physically relocate the following source files from `packages/board/src/` to `packages/document/src/`: `document.ts`, `document.test.ts`, `extra-keys.ts`, `extra-keys.test.ts`, `extra-vars-schema.ts`, `extra-vars-schema.test.ts`, `history.ts`, `history.test.ts`, `search.ts`, `search.test.ts`, `report.ts`, `report.test.ts`, `rate-limit.ts`, `rate-limit.test.ts`, `permissions.ts`, `permissions.test.ts`, `trash.ts`, `trash.test.ts`, `vote.ts`, `vote.test.ts`, `on-install.ts`. (`research.md` Section 2 enumerates the exact line counts per file.)

**REQ-DOC-014 (Ubiquitous)**: The Document system SHALL NOT relocate `packages/board/src/attachment.ts` (file attachment) — that file moves to `packages/file/` in SPEC-FILE-001 (Phase 3). For Phase 2, `attachment.ts` remains in `packages/board/src/` and may import from `packages/document` if needed.

**REQ-DOC-015 (Ubiquitous)**: The Document system SHALL NOT relocate `packages/board/src/comment.ts` — that file moves to `packages/comment/` in SPEC-COMMENT-001 (Phase 2 parallel).

**REQ-DOC-016 (Ubiquitous)**: The Document system SHALL NOT relocate `packages/board/src/category.ts` in this SPEC. Category management lives within document domain (`DocumentCategory` model) but the file relocation is deferred to SPEC-BOARD-CRUD-001 to avoid touching `incrementDocumentCount` callsites mid-flight. For Phase 2 Slice A, `packages/document/` MAY import `incrementDocumentCount` from `packages/board/src/category` temporarily; Slice C SHALL move `category.ts` into `packages/document/`.

**REQ-DOC-017 (Unwanted)**: The Document system SHALL NOT import `@prisma/client` constructors directly. PrismaClient instances are passed via `ctx: { prisma: PrismaClient }` props (consistent with current `packages/board` convention; see `document.ts` line 184).

**REQ-DOC-018 (Ubiquitous)**: The Document system SHALL declare TypeScript strict mode (consistent with monorepo `tsconfig.base.json`). Zero `any` types are introduced; existing `any` usage in lazy-loaded `_DOMPurify` (line 30) is preserved verbatim.

**REQ-DOC-019 (Ubiquitous)**: The Document system SHALL register itself with the module registry (`packages/core/src/modules/registry.ts`) with `moduleCode = 'document'` so that wiki/blog modules can mount Document as their content backend. The registration is idempotent and Phase 2 ships only the registration call — no admin UI for direct `moduleCode='document'` instances is required (board remains the primary consumer).

### 2.3 CRUD 계층 (REQ-DOC-020 ~ 039)

**REQ-DOC-020 (Event-Driven)**: WHEN `createDocument(input, ctx)` is invoked by a member, the Document system SHALL persist a `Document` row, sanitize `content` via DOMPurify, derive `contentText` (plain text), and SHALL increment `Board.documentCount` and `DocumentCategory.documentCount` (when `categoryId` provided) in the same transaction (current `document.ts:230` behavior preserved).

**REQ-DOC-021 (Event-Driven)**: WHEN `createDocument` is invoked, the Document system SHALL validate `extraVars` against the board's `DocumentExtraKey` set using `buildExtraVarsSchema(keys).parse(extraVars)`. IF the board has required keys and `extraVars` is missing, THEN the system SHALL throw `ExtraVarsRequiredError` (current behavior preserved, REQ-CONTENT-121).

**REQ-DOC-022 (Event-Driven)**: WHEN `createDocument` is invoked by an actor without `write_document` permission on the target board, the system SHALL throw `BoardPermissionDeniedError('write_document')`. The permission check uses `canPerformAction(board, 'write_document', actor)` from `permissions.ts`.

**REQ-DOC-023 (Event-Driven)**: WHEN `updateDocument(input, ctx)` is invoked by the document author or an admin, the Document system SHALL apply partial updates (`title`, `content`, `status`, `extraVars`). The `content` field SHALL be re-sanitized. IF `actor` is neither admin nor `authorId === actor.userId`, THEN the system SHALL throw `DocumentOwnershipError`.

**REQ-DOC-024 (Event-Driven)**: WHEN `updateDocument` is invoked AND `Board.updateLog === true` AND either `title` or `content` actually changed, the Document system SHALL call `recordUpdate({documentId, prevTitle, prevContent, prevExtraVars, editorId, editorIp})` within the same transaction to create a `DocumentUpdateLog` row (current `document.ts:341` behavior preserved).

**REQ-DOC-025 (Event-Driven)**: WHEN `deleteDocument(input, ctx)` is invoked by the document author or an admin, the Document system SHALL perform a soft delete (`deletedAt = now()`) via `softDeleteDocument`. IF `Board.trashUse === true`, the system SHALL also create a `Trash` row with `expiresAt = now() + 30 days`. IF `categoryId` is set, the system SHALL decrement `DocumentCategory.documentCount` in the same transaction.

**REQ-DOC-026 (Event-Driven)**: WHEN `restoreDocument(input, ctx)` is invoked by an admin, the Document system SHALL clear `deletedAt`, delete the Trash row, and SHALL increment `DocumentCategory.documentCount` when applicable. IF the Trash entry has `expiresAt < now()`, THEN the system SHALL throw `TrashExpiredError`.

**REQ-DOC-027 (Event-Driven)**: WHEN `purgeDocument(input, ctx)` is invoked by an admin, the Document system SHALL hard-delete the row via Prisma cascade (deletes `Comment`, `DocumentVote`, `DocumentReport`, `DocumentUpdateLog`, `Trash` cascading; `FileAttachment.documentId` SET NULL).

**REQ-DOC-028 (Ubiquitous)**: The Document system SHALL preserve the current cursor pagination contract for `listDocuments` — `{ notices, items, nextCursor }` (current `document.ts:425`). Cursors are base64url-encoded `(listOrder: BigInt, id: number)` tuples (`encodeCursor`/`decodeCursor`).

**REQ-DOC-029 (Event-Driven)**: WHEN `listDocuments` is invoked with `notice` rows in the board AND `Board.exceptNotice === false`, the Document system SHALL return notices separately from items, ordered by `listOrder DESC` (current behavior).

**REQ-DOC-030 (Unwanted)**: The Document system SHALL NOT modify the existing query plans (Prisma `$queryRaw` for FTS, findMany with cursor). Performance characteristics of `listDocuments` and `searchDocuments` SHALL match the pre-move baseline within ±5% on identical fixtures (validated via existing `document.test.ts` and `search.test.ts`).

### 2.4 Search 계층 (REQ-DOC-040 ~ 049)

**REQ-DOC-040 (Event-Driven)**: WHEN a search query is submitted via `searchDocuments(input, ctx)`, the Document system SHALL execute `search_vector @@ plainto_tsquery('simple', query)` against PostgreSQL FTS (current `search.ts:81` behavior). The query SHALL be combined with `boardId`, `deletedAt IS NULL`, optional `categoryId`, `tags @>`, `authorId`, date range, count range, and cursor conditions.

**REQ-DOC-041 (Event-Driven)**: WHEN `searchDocuments` is invoked, the Document system SHALL return `{ items, nextCursor, total }` where `total` is derived from `COUNT(*) OVER()` in the same SQL (single round-trip).

**REQ-DOC-042 (Ubiquitous)**: The Document system SHALL preserve the existing GIN index on `Document.tags` (line 665) and `Document.extraVars` (line 666). Search performance characteristics are unchanged.

**REQ-DOC-043 (Event-Driven)**: WHEN `searchTags(input, ctx)` is invoked, the Document system SHALL return up to 20 distinct tag suggestions matching `prefix%` via `unnest(tags) ILIKE` (current `search.ts:167` behavior).

**REQ-DOC-044 (Unwanted)**: The Document system SHALL NOT introduce external search backends (Meilisearch, Elasticsearch) in this SPEC. FTS-only.

### 2.5 Secret Document 계층 (REQ-DOC-050 ~ 059)

**REQ-DOC-050 (State-Driven)**: WHILE `Document.status === 'SECRET'`, the Document system SHALL allow read access only to (a) the author (`authorId === actor.userId`), (b) administrators (`actor.isAdmin === true`), or (c) password-holders who submit the matching `Document.password` via the password gate. (MASTER-PLAN-002 Section 5.4 line 286 headline.)

**REQ-DOC-051 (Event-Driven)**: WHEN `getDocument(id, ctx, actor?)` is called on a SECRET document AND the actor is neither author nor admin AND no valid password token is present, the Document system SHALL throw `DocumentAccessDeniedError` (new error class introduced in this SPEC).

**REQ-DOC-052 (Event-Driven)**: WHEN a password is set on a SECRET document creation/update, the Document system SHALL hash the password using a one-way function (argon2id, consistent with `packages/auth`) and store the hash in `Document.password`. Plain-text passwords SHALL NOT be persisted. (NEW requirement — current `document.ts` does not hash password; this is a security improvement scoped to Slice C.)

**REQ-DOC-053 (Event-Driven)**: WHEN a reader submits a password via `unlockSecretDocument({ documentId, password }, ctx)`, the Document system SHALL verify the hash and, on match, issue a short-lived signed JWT/session-scoped token (`secret_doc:{documentId}`) cookie valid for 24 hours. Subsequent reads SHALL accept this token.

**REQ-DOC-054 (Unwanted)**: The Document system SHALL NOT expose `Document.password` (hash or plaintext) in any API response — `getDocument`, `listDocuments`, `searchDocuments` SHALL strip the field server-side before returning.

**REQ-DOC-055 (State-Driven)**: WHILE a document is SECRET, the Document system SHALL exclude it from `listDocuments` results for users without read permission (author/admin/password-token), even when `status: 'PUBLIC'` is the filter (i.e., SECRET docs do not leak in PUBLIC listings).

### 2.6 Draft (TEMP) 계층 (REQ-DOC-060 ~ 069)

**REQ-DOC-060 (Event-Driven)**: WHEN `createDocument` is invoked with `status: 'TEMP'`, the Document system SHALL persist the row as a draft visible only to the author. The default status is `TEMP` (current `document.ts:173` behavior preserved).

**REQ-DOC-061 (State-Driven)**: WHILE `Document.status === 'TEMP'`, the Document system SHALL exclude the document from public listings (`listDocuments` with default filter `status: 'PUBLIC'`) and SHALL NOT increment `Board.documentCount` (counted only when status transitions to PUBLIC).

**REQ-DOC-062 (Event-Driven)**: WHEN `listDrafts({ authorId, limit, cursor }, ctx)` is invoked, the Document system SHALL return drafts authored by `authorId` ordered by `lastUpdate DESC`. Only the author or an admin MAY call this.

**REQ-DOC-063 (Event-Driven)**: WHEN `publishDraft({ documentId, actor }, ctx)` is invoked by the author or admin, the Document system SHALL transition `status` from `TEMP` to `PUBLIC` and SHALL increment `Board.documentCount` in the same transaction.

**REQ-DOC-064 (Unwanted)**: The Document system SHALL NOT auto-purge drafts. Manual deletion via `deleteDocument` is the only removal mechanism for TEMP rows (matches current behavior).

### 2.7 History 계층 (REQ-DOC-070 ~ 079)

**REQ-DOC-070 (Event-Driven)**: WHEN `updateDocument` mutates `title` or `content` AND `Board.updateLog === true`, the Document system SHALL record a `DocumentUpdateLog` snapshot (`prevTitle`, `prevContent`, `prevExtraVars`, `editorId`, `editorIp`) within the same transaction (REQ-CONTENT-110 preserved).

**REQ-DOC-071 (Event-Driven)**: WHEN `getUpdateHistory({ documentId, actor }, ctx)` is invoked, the Document system SHALL return `DocumentUpdateLog[]` sorted by `regdate DESC`. Only the document author or an admin MAY call this (current `history.ts:80` permission check preserved).

**REQ-DOC-072 (Ubiquitous)**: The Document system SHALL provide a `getHistoryDiff({ documentId, fromRegdate, toRegdate }, ctx)` function that returns paired `(prev, current)` snapshots. Slice C delivers this with a thin server function; UI rendering (diff highlighting) is scaffolded but full diff UI is optional.

### 2.8 Trash 계층 (REQ-DOC-080 ~ 089)

**REQ-DOC-080 (Event-Driven)**: WHEN a document is soft-deleted via `softDeleteDocument`, the Document system SHALL set `deletedAt = now()`, and IF `Board.trashUse === true`, the system SHALL upsert a `Trash` row with `expiresAt = now() + 30 days` (`TRASH_RETENTION_DAYS` constant preserved).

**REQ-DOC-081 (Event-Driven)**: WHEN `listTrash({ boardId?, cursor?, limit?, actor }, ctx)` is invoked by an admin, the Document system SHALL return `Trash[]` joined with `Document` ordered by `expiresAt ASC` (oldest expiring first).

**REQ-DOC-082 (Event-Driven)**: WHEN `restoreDocument({ documentId, actor }, ctx)` is invoked, the Document system SHALL refuse if Trash is expired (`TrashExpiredError`). On success, `deletedAt` is cleared and `Trash` row is deleted in the same transaction.

**REQ-DOC-083 (Unwanted)**: The Document system SHALL NOT automatically purge expired Trash rows in this SPEC. Manual `purgeDocument` is the only path. (Cron-based auto-purge is deferred to SPEC-INFRA or admin tooling.)

### 2.9 ACL Integration 계층 (REQ-DOC-090 ~ 099)

**REQ-DOC-090 (Ubiquitous)**: The Document system SHALL consume Board's grants matrix (`Board.permissions` Json) via the helper `canPerformAction(board, action, actor)` (current `permissions.ts:42`). The grants supported in Phase 2 are: `list`, `view`, `write_document`, `write_comment`. Other grants (`vote_log_view`, `update_view`, `consultation_read`) are deferred.

**REQ-DOC-091 (Ubiquitous)**: The Document system SHALL accept `actor: { userId, userGroupSrl, isAdmin }` shape (current convention). Resolution of `actor` from session (`packages/auth`) is the caller's responsibility. The Document system does not read sessions directly.

**REQ-DOC-092 (Ubiquitous)**: The Document system SHALL preserve the admin escape hatch — when `actor.isAdmin === true`, all permission checks pass (current `permissions.ts:48`). This applies uniformly to read/write/delete/restore/purge.

**REQ-DOC-093 (State-Driven)**: WHILE a board has `Board.permissions[action] === []` (empty allowlist), the Document system SHALL deny that action for all non-admin actors (deliberate lockdown semantics; current behavior).

### 2.10 tRPC Router 계층 (REQ-DOC-100 ~ 119)

**REQ-DOC-100 (Ubiquitous)**: The Document system SHALL expose a tRPC router at `packages/document/src/server/router.ts` named `documentRouter` (exported). The router uses `publicProcedure` and `protectedProcedure` from `apps/web/src/server/trpc` (or equivalent shared trpc init).

**REQ-DOC-101 (Ubiquitous)**: The `documentRouter` SHALL define the following public procedures (no auth required, but result respects ACL via injected actor):
  - `list({ moduleInstanceId, status, search?, categoryId?, tags?, sort?, cursor?, limit? })` → `DocumentListResult`
  - `get({ id, passwordToken? })` → `Document` (excluding `password` field per REQ-DOC-054)
  - `searchTags({ boardId, prefix })` → `string[]`
  - `search({ boardId, query?, ... })` → `SearchDocumentsResult`

**REQ-DOC-102 (Ubiquitous)**: The `documentRouter` SHALL define the following protected procedures (require authenticated session):
  - `create({ moduleInstanceId, title, content, nickName?, status?, categoryId?, tags?, extraVars? })` → `Document`
  - `update({ id, title?, content?, status?, extraVars? })` → `Document`
  - `delete({ id })` → `Document`
  - `unlockSecret({ documentId, password })` → `{ token: string; expiresAt: Date }`
  - `listDrafts({ cursor?, limit? })` → cursor list
  - `publishDraft({ documentId })` → `Document`
  - `history.list({ documentId })` → `DocumentUpdateLog[]`
  - `history.diff({ documentId, fromRegdate, toRegdate })` → paired snapshots
  - `trash.list({ boardId?, cursor?, limit? })` (admin-only via middleware) → `ListTrashResult`
  - `trash.restore({ documentId })` (admin-only) → `Document`
  - `trash.purge({ documentId })` (admin-only) → `{ documentId }`

**REQ-DOC-103 (Event-Driven)**: WHEN a protected procedure's actor lacks the required permission, the router SHALL convert the domain `BoardPermissionDeniedError` / `DocumentOwnershipError` / `DocumentAccessDeniedError` to `TRPCError({ code: 'FORBIDDEN', cause })`.

**REQ-DOC-104 (Event-Driven)**: WHEN a Zod validation fails in any procedure input, the router SHALL return `TRPCError({ code: 'BAD_REQUEST' })`.

**REQ-DOC-105 (Ubiquitous)**: The Document system SHALL provide Server Action wrappers at `packages/document/src/server/actions.ts` for write operations (`createDocument`, `updateDocument`, `deleteDocument`, `publishDraft`, `unlockSecret`) usable from Next.js Server Components / forms in `apps/web`. Each action handles CSRF via Next.js built-in (form action) and returns `ActionResult<T>` (discriminated union: `{ ok: true, data }` | `{ ok: false, error }`).

### 2.11 Quality 계층 (REQ-DOC-120 ~ 129)

**REQ-DOC-120 (Ubiquitous)**: All migrated test files SHALL pass without modification of assertions. Test relocation is mechanical (path-only, no behavior change). Total test count SHALL match the pre-move baseline (currently ~110 tests across `document.test.ts:43122 LoC`, `extra-keys.test.ts`, `extra-vars-schema.test.ts`, `history.test.ts`, `search.test.ts`, `report.test.ts`, `rate-limit.test.ts`, `trash.test.ts`, `vote.test.ts`, `permissions.test.ts`).

**REQ-DOC-121 (Ubiquitous)**: Slice C SHALL add at least the following NEW tests:
  - Secret document password hash + unlock (REQ-DOC-052/053): 4+ tests
  - SECRET listing exclusion (REQ-DOC-055): 2+ tests
  - Draft publish transition (REQ-DOC-063): 3+ tests
  - History diff function (REQ-DOC-072): 2+ tests
  - tRPC router happy paths + permission errors: 8+ tests
  - Server Actions wrappers: 3+ tests
  - **Target NEW tests in Slice C: ~25**; combined with relocated tests Slice A preserves ~110, total ~135.

**REQ-DOC-122 (Ubiquitous)**: Coverage for `packages/document/src/**` SHALL be at least 85% (statements + branches) per TRUST 5 Tested pillar.

**REQ-DOC-123 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL report 0 errors across `packages/document`, `packages/board`, and `apps/web` after Slices A/B/C.

**REQ-DOC-124 (Ubiquitous)**: All new code SHALL respect `.moai/config/sections/language.yaml`: code comments in Korean (`code_comments: ko`), identifiers/strings/error codes in English. @MX tags SHALL use Korean descriptions per `mx-tag-protocol.md`.

**REQ-DOC-125 (Unwanted)**: The Document system SHALL NOT introduce new global mutable state. The `_DOMPurify` lazy holder (current `document.ts:30`) is preserved as-is; the `extra-vars-schema` cache (current `extra-vars-schema.ts`) is preserved as-is.

**REQ-DOC-126 (Ubiquitous)**: The `packages/board` package SHALL be updated to re-export Document-related symbols transitively (`export * from '@rhymix-ts/document'`) for backward compatibility with existing `apps/web` import paths during the migration window. The re-export SHALL be removed in SPEC-BOARD-CRUD-001 once all apps/web imports are migrated.

### 2.12 Integration & Migration 계층 (REQ-DOC-130 ~ 139)

**REQ-DOC-130 (Ubiquitous)**: All `apps/web/**` import paths referring to `@rhymix-ts/board/document` (or `from '@rhymix-ts/board'` for Document symbols) SHALL be updated in Slice A to `from '@rhymix-ts/document'`. Re-export shim in `packages/board` (REQ-DOC-126) covers any missed callsites until Slice B completes.

**REQ-DOC-131 (Ubiquitous)**: `pnpm-workspace.yaml` SHALL include `packages/document` in its workspace globs (currently `packages/*` covers it implicitly; verify in Slice A).

**REQ-DOC-132 (Ubiquitous)**: The Document system SHALL emit lifecycle events for cross-package integration (Phase 3+ consumers like `packages/point`, `packages/file`):
  - `document.created` (after createDocument transaction commits)
  - `document.updated` (after updateDocument commits)
  - `document.deleted` (after softDeleteDocument commits)
  - `document.restored` (after restoreDocument commits)
  - `document.purged` (after purgeDocument commits)
  
  Phase 2 ships only the event emitter hook points (typed event bus stub); concrete subscribers are added in Phase 3 SPECs.

**REQ-DOC-133 (Unwanted)**: The Document system SHALL NOT directly call `packages/point` (Phase 3) or `packages/file` (Phase 3) APIs. Integration is via the event bus stub (REQ-DOC-132).

**REQ-DOC-134 (Ubiquitous)**: The Document system SHALL preserve the existing `on-install.ts` lifecycle hook (currently in `packages/board/src/`). On move, the hook continues to install default `DocumentExtraKey` rows (if any) when a board is created. The hook's exact signature is preserved (current `on-install.ts` is ~50 LoC per `ls -la` output).

---

## 3. Slices (high-level)

본 SPEC은 3개 슬라이스로 분해된다. 상세 작업 항목은 `plan.md` 참조.

### Slice A: 패키지 분리 (Package Separation)

**목표**: `packages/board/src/` → `packages/document/src/` 물리적 이동. 0 behavior change. characterization tests로 회귀 가드.

**산출물**:
- `packages/document/` 신규 패키지(골조 + 이동된 파일 11개 + 테스트 11개)
- `packages/board/src/index.ts`에 re-export shim 추가 (REQ-DOC-126)
- `apps/web/**` import 경로 업데이트
- `pnpm-workspace.yaml` 검증
- `pnpm test` 전체 통과 (~110 tests no change)
- `pnpm tsc --noEmit` 0 error

**EARS coverage**: REQ-DOC-001~018, REQ-DOC-120, REQ-DOC-123, REQ-DOC-130~131

### Slice B: tRPC Router + Server Actions

**목표**: document 도메인 API를 tRPC + Server Actions로 노출. apps/web의 write 경로 통일.

**산출물**:
- `packages/document/src/server/router.ts` (documentRouter)
- `packages/document/src/server/actions.ts` (Server Actions wrappers)
- `apps/web/src/server/trpc/root.ts`에 documentRouter 마운트
- 기존 `apps/web/lib/board/actions.ts`의 document 관련 액션 호출을 document 패키지 actions로 대체 (board 자체 액션은 SPEC-BOARD-CRUD-001에서)
- 새 테스트: tRPC router + actions 8+ tests

**EARS coverage**: REQ-DOC-100~105, REQ-DOC-132~133

### Slice C: 도메인 기능 완성 (Domain Feature Completion)

**목표**: 비밀글 비밀번호 해시화 + 비밀번호 액세스 게이트, 임시저장 UI 데이터 모델, 휴지통/이력 UI 스캐폴드, category.ts 이동, 이벤트 버스 stub.

**산출물**:
- `packages/document/src/secret.ts`: argon2id 해시화 + 토큰 발급/검증 + listDocuments에서 SECRET 필터
- `packages/document/src/draft.ts`: `listDrafts`, `publishDraft`
- `packages/document/src/events.ts`: typed event bus stub (REQ-DOC-132)
- `apps/web/app/(member)/drafts/page.tsx`: 임시저장 목록 스캐폴드
- `apps/web/app/admin/trash/page.tsx`: 휴지통 목록 스캐폴드 (admin-only)
- `apps/web/app/(member)/documents/[id]/history/page.tsx`: 수정 이력 스캐폴드
- `packages/board/src/category.ts` → `packages/document/src/category.ts` 이동 (REQ-DOC-016)
- 새 마이그레이션 (있다면): SECRET 인덱스 추가 정도, additive only
- 새 테스트 25+ (REQ-DOC-121)

**EARS coverage**: REQ-DOC-019, REQ-DOC-050~055, REQ-DOC-060~064, REQ-DOC-072, REQ-DOC-121, REQ-DOC-126(제거 일부), REQ-DOC-134

---

## 4. Acceptance Criteria (요약)

본 SPEC의 핵심 acceptance는 MASTER-PLAN-002 Section 5.4의 3개 headline을 충족한다. Given-When-Then 형식 핵심 5개:

1. **AC-DOC-A1 (Package Separation, REQ-DOC-001~018, REQ-DOC-120)**:
   GIVEN `packages/board/src/document.ts` + 관련 10개 파일이 존재하고, WHEN Slice A 완료 후 `pnpm test` 실행, THEN (a) 모든 파일이 `packages/document/src/`에 존재하고 (b) 기존 ~110 tests가 100% 통과하며 (c) `packages/board/src/document.ts`는 더 이상 존재하지 않고 (d) `apps/web/**`의 모든 import 경로가 `@rhymix-ts/document` 또는 `@rhymix-ts/board` re-export shim을 경유한다.

2. **AC-DOC-B1 (Create + Counter Atomicity, REQ-DOC-020, MASTER-PLAN line 285)**:
   GIVEN 인증된 member + `write_document` 권한이 있는 board (`Board.documentCount = 5`), WHEN `documentRouter.create.mutation({ moduleInstanceId, title:'X', content:'Y', status:'PUBLIC' })`를 호출, THEN HTTP 200 + 반환된 Document.boardId 매칭 + `Board.documentCount === 6` (단일 트랜잭션) + 응답 페이로드에 `password` 필드 부재.

3. **AC-DOC-B2 (FTS Search, REQ-DOC-040, MASTER-PLAN line 286)**:
   GIVEN board에 PUBLIC document 3개("javascript tutorial", "rust patterns", "javascript advanced")가 존재하고, WHEN `documentRouter.search.query({ boardId, query: 'javascript' })`를 호출, THEN 반환 `items.length === 2` + `total === 2` + 실행된 SQL이 `search_vector @@ plainto_tsquery('simple', 'javascript')`를 포함 (test에서 raw query 검증).

4. **AC-DOC-C1 (SECRET Document Access, REQ-DOC-050, MASTER-PLAN line 287)**:
   GIVEN `Document(status='SECRET', authorId=42, password=argon2id_hash('xy123'))`가 존재하고, WHEN:
     - case (a) actor = author(userId=42) → `documentRouter.get.query({ id })`는 document 반환 + `password` 필드 부재
     - case (b) actor = admin → document 반환 + `password` 필드 부재
     - case (c) actor = anon, passwordToken 없음 → `TRPCError(FORBIDDEN)`
     - case (d) actor = anon, `unlockSecret({ documentId, password:'xy123' })` 호출 → `{ token, expiresAt }` 반환, 이후 `get({ id, passwordToken: token })` → document 반환
     - case (e) actor = anon, `unlockSecret({ documentId, password:'wrong' })` → `TRPCError(FORBIDDEN)`
   THEN 위 5개 case 모두 위 expectation을 충족한다.

5. **AC-DOC-C2 (Draft Publish, REQ-DOC-063)**:
   GIVEN `Document(status='TEMP', authorId=42)` + `Board.documentCount = 10`, WHEN author가 `documentRouter.publishDraft.mutation({ documentId })`를 호출, THEN `Document.status === 'PUBLIC'` + `Board.documentCount === 11` + `listDocuments({ status:'PUBLIC' })` 결과에 해당 document 포함.

상세 Given-When-Then scenarios + edge cases는 `plan.md` Section "Acceptance Gates per Slice" 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/document/`** 독립 패키지에 둔다 (MASTER-PLAN-002 Section 1 line 66 + Section 9.1-4 신규 패키지 5개 추가 결정). 패키지 의존성:
- 의존: `@rhymix-ts/core`(module registry), `@rhymix-ts/db`(Prisma client type), `@rhymix-ts/auth`(Actor type/RBAC heleprs), `zod`, `isomorphic-dompurify`
- 비의존: `@rhymix-ts/board` (역방향 의존 금지, REQ-DOC-011)
- 외부에서 의존됨: `@rhymix-ts/board`(wrapper), 향후 `@rhymix-ts/page`(ARTICLE 모드), `@rhymix-ts/comment`(parent document 참조)

### 5.2 Characterization Tests로 회귀 가드

Slice A는 behavior change zero. 보장 메커니즘:
- 기존 test 파일은 그대로 이동 (path만 변경)
- vitest workspace에서 자동으로 `packages/document/**/*.test.ts` 발견
- import 경로는 mechanical replace: `from './document'` → `from './document'` (같은 패키지 내) / `from '@rhymix-ts/board/...'` → `from '@rhymix-ts/document/...'` (외부)
- snapshot tests는 없음 (현재 codebase 확인 — search/list result는 plain assertion)

### 5.3 비밀글 비밀번호 해시화 (Slice C 신규)

현재 `document.ts`는 password를 **plaintext**로 `Document.password` 컬럼에 저장. 이는 security smell. Slice C에서 argon2id로 hash 도입:
- 의존: `argon2` (이미 `packages/auth`에서 사용 중 — 동일 라이브러리 재사용)
- 마이그레이션 전략: 기존 plaintext row가 있다면(현재 dev DB 없음 — verify) **자동 hash upgrade on next read**. 백필 스크립트는 SPEC-INFRA에서.
- 토큰 메커니즘: `unlockSecret`이 성공하면 JWT(`secret_doc:{id}`, 24h) 발급 → cookie 또는 client memory. `getDocument`가 password token을 검증.

### 5.4 SECRET 필터의 listDocuments 통합 (REQ-DOC-055)

현재 `listDocuments({status:'PUBLIC'})`는 SECRET 행을 자연스럽게 제외(WHERE status='PUBLIC'). 하지만 `status:'SECRET'`로 명시 조회 시 위험. Slice C에서:
- `listDocuments`에 actor 옵셔널 파라미터 추가
- SECRET 행 노출 조건: actor가 author이거나 admin이거나 passwordToken 보유
- 기본 호출(actor 없음, status='PUBLIC')은 변경 없음 → REQ-DOC-030 보장

### 5.5 RSC vs Client Component

- **Server-side (RSC + Server Actions)**: document service, tRPC procedures, Server Actions wrappers, listDrafts/listTrash/history 데이터 fetch
- **Client-side (`'use client'`)**: 글쓰기 폼(textarea), 비밀번호 입력 폼, 비밀글 unlock UI, 휴지통 검색 필터
- 본문 렌더 자체(글 상세보기)는 SPEC-BOARD-CRUD-001에 위임. 본 SPEC은 데이터 API + 최소 admin/scaffold UI만.

### 5.6 이벤트 버스 (REQ-DOC-132)

Phase 2 ships only the **type stub**. 구현 라이브러리 선택은 Slice C 구현 시 결정:
- 옵션 (a): in-process EventEmitter (Node `events`) — 가장 단순, no extra dep
- 옵션 (b): typed-emitter wrapper (`mitt` or custom Zod-validated emitter)
- 옵션 (c): Inngest/BullMQ (백로그 — Phase 5)

권고: **옵션 (a)** in-process EventEmitter + 타입 정의(`DocumentEventMap`). Phase 3에서 분산 큐가 필요해지면 어댑터 교체.

### 5.7 incrementDocumentCount cross-package callsite

현재 `document.ts:246`는 `import { incrementDocumentCount } from './category'`. category.ts가 Slice A에서는 board 패키지에 남는다(REQ-DOC-016) → Slice A에서는 `import { incrementDocumentCount } from '@rhymix-ts/board/category'`로 일시적 외부 의존. Slice C에서 category.ts 이동 → 같은 패키지 내 import로 정상화.

**대안 검토**: category.ts를 Slice A에서 함께 이동 → 그러나 `incrementDocumentCount`의 caller 분석 시 board admin UI(`apps/web/app/admin/boards/...`)에서도 호출 → board package 정리(SPEC-BOARD-CRUD-001)와 함께 다루는 것이 안전. Slice A는 최소 변경 원칙 우선.

### 5.8 password 필드 strip (REQ-DOC-054)

현재 `getDocument`(line 538)는 `findUniqueOrThrow`로 전체 row를 반환 → password가 그대로 노출. Slice B에서 tRPC router 레이어에 strip 로직 삽입:
```typescript
// pseudo: actual code in router.ts
const doc = await getDocument(id, ctx);
const { password: _, ...safe } = doc;
return safe;
```
또는 `getDocument` 자체를 `Omit<Document, 'password'>` 반환으로 변경. 후자 선호 — 도메인 함수가 security boundary 책임.

### 5.9 ID 타입 일관성

- `Document.id: Int` (autoincrement, schema.prisma line 614) — number
- `Document.documentSrl: BigInt?` (legacy migration용 — 별도)
- `Document.listOrder: BigInt` — cursor에 사용 (`encodeCursor` line 110)
- `Board.id: Int` — number
- Actor: `userId: number` (User.id), `userGroupSrl: number` (legacy compat)
- DocumentExtraKey.id: Int

cursor 직렬화 시 BigInt → string 왕복 주의 (현재 `document.ts:101~123` 패턴 보존).

### 5.10 board ↔ document re-export shim

Slice A 종료 시점 `packages/board/src/index.ts`:
```typescript
// re-export shim for backward compatibility (REQ-DOC-126)
// To be removed after SPEC-BOARD-CRUD-001 migrates apps/web imports.
export * from '@rhymix-ts/document';
// board 고유 export (예: board service, board admin)
export * from './board-service';
```
이 shim은 SPEC-BOARD-CRUD-001에서 제거된다 (REQ-DOC-126 후반).

---

## 6. Risks & Mitigations

상세는 `research.md` 참조. 핵심 6가지:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| board → document import 경로 누락으로 apps/web 빌드 실패 | 중간 | 높음 | re-export shim(REQ-DOC-126)으로 cushion. Slice A 종료 직전 `pnpm tsc --noEmit` + `pnpm build` 전체 통과 확인. |
| category.ts 위치 결정 지연 (REQ-DOC-016) | 중간 | 중간 | Slice A는 board에 남기고 외부 import. Slice C에서 이동 — 두 단계 분리. |
| 비밀번호 plaintext → hash 마이그레이션 시 기존 데이터 손실 | 낮음 | 높음 | 현재 dev DB만 존재. plaintext password가 있는 row 검색 후 hash로 일괄 변환하는 idempotent script. Auto-upgrade on read 보조. |
| FTS GENERATED column이 새 패키지에서 인식 안 됨 | 낮음 | 높음 | Prisma schema는 단일 — 위치 무관. `Unsupported("tsvector")` 타입은 그대로. `$queryRaw` 사용 → Prisma client만 작동하면 OK. |
| tRPC router mount 시 기존 board router와 path 충돌 | 중간 | 중간 | `trpc.document.*`로 namespace 분리. board router는 `trpc.board.*` 그대로. apps/web/src/server/trpc/root.ts에 명시적 mount. |
| 새 테스트 추가 시 기존 test 시간 회귀 | 낮음 | 낮음 | document.test.ts는 이미 43KB의 대형 파일. 새 secret/draft/history 테스트는 분리 파일(`secret.test.ts`, `draft.test.ts`, `events.test.ts`)로 추가. |
| 이벤트 버스 stub 미정의로 Phase 3 SPEC이 막힘 | 낮음 | 중간 | Slice C에서 type 정의는 반드시 ship. 구현체는 EventEmitter wrapper minimum. |
| board/document 양방향 dep으로 circular | 낮음 | 높음 | REQ-DOC-011 enforced. lint rule(`eslint-plugin-import/no-cycle`) 또는 `madge --circular` check를 Slice A 종료 게이트에 포함. |

---

## 7. Open Questions

본 SPEC 작성 시점에 미해결인 3가지. 해결 없이 Slice A는 시작 가능 — 사용자가 `/moai run` 호출 전 결정 권장.

1. **Q1 — 비밀글 토큰 저장 위치 (cookie vs session vs JWT)**:
   - 옵션 (a) httpOnly cookie `secret_doc_token` (24h) — 가장 단순, CSRF safe
   - 옵션 (b) Auth.js session에 SECRET access list 누적
   - 옵션 (c) signed JWT in URL fragment — sharable but leaky
   - **권고: 옵션 (a) httpOnly cookie**. SPEC-AUTH-001과 일관(Auth.js 세션 cookie와 별도 namespace).

2. **Q2 — DocumentExtraKey langCode 다국어 정책**:
   현재 `langCode: 'ko'` 하드코딩(`document.ts:202`). Phase 2에서 다국어 지원 확장 여부?
   - 옵션 (a) Phase 2는 'ko'만 — 다국어는 백로그
   - 옵션 (b) actor.langCode 또는 board.defaultLangCode를 받아 동적 처리
   - **권고: 옵션 (a)**. 다국어는 SPEC-I18N-001(별도) 영역. 본 SPEC은 단일 언어 보존.

3. **Q3 — 이벤트 버스 구현 라이브러리 선택**:
   - 옵션 (a) Node `EventEmitter` 직접 + Zod 타입 (no extra dep)
   - 옵션 (b) `mitt` (1.4KB, well-known)
   - 옵션 (c) `tiny-typed-emitter` (TS 친화)
   - **권고: 옵션 (a)**. Phase 3에서 분산 큐 어댑터 필요 시 교체.

위 3개 모두 SPEC 합의가 강제되진 않으며, 구현 detail은 expert-backend가 Slice 진행 중 결정.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **board UI 라우트(`/board/[mid]` 글쓰기/상세보기 페이지)** — SPEC-BOARD-CRUD-001 (Phase 2 후속). 본 SPEC은 데이터 API만.
2. **comment 도메인 독립화** — SPEC-COMMENT-001 (Phase 2 병행). `Comment` 관계 보존만.
3. **file 첨부 업로드 endpoint** — SPEC-FILE-001 (Phase 3). `FileAttachment.documentId` 관계만 보존.
4. **point 부여 (point per document)** — SPEC-POINT-001 (Phase 3). 이벤트 emit만, 구독자 없음.
5. **WYSIWYG 에디터 통합** — 후속 SPEC. textarea + HTML sanitize 보존.
6. **외부 검색 엔진 (Meilisearch/Elasticsearch)** — 백로그. PostgreSQL FTS만.
7. **별칭 URL (document_aliases)** — 백로그. 레거시 PHP에는 있으나 현재 Prisma 모델 없음.
8. **신고 워크플로우 admin UI** — `DocumentReport` 모델 + report.ts 이동만. UI는 SPEC-ADMIN-EXTRAS-001(Phase 5).
9. **모바일 본문(mcontent)** — document에는 없음(legacy도 없음). page 전용(SPEC-PAGE-001 mcontent).
10. **데이터 마이그레이션 (PHP `documents` → TS)** — 별도 SPEC(코드 포팅 완료 후).
11. **자동 휴지통 purge cron** — REQ-DOC-083. 수동 `purgeDocument`만.
12. **DocumentExtraKey 다국어 동적 처리** — Q2 권고에 따라 'ko' 고정. SPEC-I18N-001 별도.
13. **wiki/blog 모듈의 document 마운트 UI** — REQ-DOC-019 registration만 ship. 실제 wiki/blog 모듈은 별도 SPEC.
14. **별도 Document 인스턴스의 admin UI (`/admin/documents/{id}`)** — Phase 5 SPEC-ADMIN-EXTRAS-001. 본 SPEC은 trash/history 스캐폴드만.
15. **postgres tsvector 다국어 분석기 (korean morph analyzer)** — `simple` 분석기 보존. 한국어 분석기 도입은 백로그.
16. **document_readed_log (조회 추적)** — 레거시 PHP에는 있으나 현재 Prisma 모델 없음. 백로그.
17. **document_voted_log row-level audit** — `DocumentVote` 모델은 있으나 audit log 분리는 미구현. 백로그.
18. **document 별 PDF/markdown export** — 백로그.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC 범위를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~135 total (~110 relocated + ~25 new in Slice C, MP-002 target ~30)
Estimated Slice Count: 3 (A: packages 분리, B: tRPC + actions, C: 도메인 기능 완성)
Dependencies (upstream): SPEC-AUTH-001 (Actor/RBAC type), SPEC-ADMIN-001 (module registry, board admin shell), SPEC-LAYOUT-001 (Phase 1 — renderModuleWithLayout 소비 측 host)
Soft dependency: SPEC-CONTENT-001(absorbed — 본 SPEC이 흡수)
Blocks (downstream): SPEC-COMMENT-001 (comment 트리에서 parent document 참조), SPEC-BOARD-CRUD-001 (board는 document를 wrap), SPEC-FILE-001 (FileAttachment.documentId 보존), SPEC-POINT-001 (document.created 이벤트 구독)
