---
id: SPEC-COMMENT-001
title: 댓글 도메인 독립 패키지
version: 1.0.0
status: completed
created: 2026-05-27
updated: 2026-06-27
author: MoAI manager-spec
priority: P0
phase: 2
parent: MASTER-PLAN-002
depends-on: [SPEC-AUTH-001, SPEC-DOCUMENT-001]
absorbs: [SPEC-CONTENT-001 (comment portion)]
issue_number: TBD
related-research: SPEC-COMMENT-001/research.md
language: ko
---

# SPEC-COMMENT-001 — 댓글 도메인 독립 패키지 (Phase 2 / P0)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.5의 직접 흡수. 레거시 `modules/comment` 포팅 + 현재 `packages/board/src/comment.{ts,test.ts}`(168 + 195 line)와 `report.ts`의 comment 처리부, `vote.ts`의 comment-side 분기를 신규 `packages/comment/` 독립 패키지로 분리한다. board는 SPEC-BOARD-CRUD-001에서 본 패키지를 사용하는 wrapper로 재정렬된다. SPEC-AUTH-001(권한 매트릭스)과 SPEC-DOCUMENT-001(documentId FK + commentCount 카운터)에 의존. 본 SPEC은 분리(Slice A) + tRPC 데이터 플러밍(Slice B) + 도메인 기능 확장(Slice C, voting/report/secret/depth-limit)으로 구성된다. 알림(notification)은 P3로 명시 — Open Questions 참조.

---

## 1. Goal & Audience

### 1.1 Goal

**`packages/board` 안에 살고 있는 comment 도메인을 독립 패키지로 분리하고, 레거시 `modules/comment`가 제공하던 도메인 기능(트리, 추천/비추천, 신고, 비밀 댓글, depth 제한)을 완성한다.** 즉:

- 현재 board 패키지에 있는 comment 관련 코드(`comment.ts`, `comment.test.ts`, `report.ts`의 comment 분기, `vote.ts`의 comment 분기)를 `packages/comment/` 신규 독립 패키지로 옮긴다. 1단계는 **행동 변경 없음**(characterization tests로 회귀 가드).
- 도메인 기능을 보강한다: 인접 리스트 트리(parent_srl/list_order), 추천/비추천 카운터, 신고 워크플로우(`Comment.report` 엔드포인트), 비밀 댓글(status=SECRET) 가시성 규칙, 최대 depth 5단계 강제.
- tRPC `commentRouter`를 신규 패키지에 등록하여 SPEC-BOARD-CRUD-001의 UI(댓글 작성 폼, 트리 렌더)가 데이터 플러밍을 안정적으로 호출할 수 있게 한다.
- 트랜잭션 무결성: 모든 mutation은 `Document.commentCount` 카운터와 함께 단일 트랜잭션 안에서 처리한다 (현재 board의 createComment/deleteComment가 이미 가지고 있는 계약 유지).

### 1.2 Audience

- expert-backend agent — Slice A 구현 (패키지 분리, characterization 회귀 가드, import 경로 갱신)
- expert-backend agent — Slice B 구현 (tRPC commentRouter + UI integration hooks)
- expert-backend agent — Slice C 구현 (도메인 기능: voting / report / secret / depth-limit)
- expert-frontend agent — SPEC-BOARD-CRUD-001과의 인터페이스 계약 확인 (본 SPEC은 데이터 플러밍까지만 책임)
- 운영자/사용자 — 댓글 작성 → 대댓글(최대 5단계) → 추천 → 신고 → 비밀 댓글 워크플로우가 동작함을 최종 검증

### 1.3 Non-Goals (본 SPEC 범위 외)

- 댓글 작성 폼/리스트 UI 컴포넌트 → SPEC-BOARD-CRUD-001 (Phase 2). 본 SPEC은 commentRouter procedure 인터페이스까지만 제공.
- document 도메인 분리 → SPEC-DOCUMENT-001 (Phase 2, 본 SPEC의 선행 의존). 본 SPEC은 `documentId`를 외부 키로 받는 소비자.
- board 모듈의 grants 매트릭스 UI/완성 → SPEC-BOARD-CRUD-001. 본 SPEC은 기존 `canPerformAction(board, 'write_comment', actor)` 헬퍼만 사용.
- 댓글 알림(이메일/푸시/in-app) → P3, Open Questions 항목 1 참조. Phase 4 SPEC-ADDON-001 또는 Phase 3 SPEC-MAIL-001 이후 별도 SPEC.
- 첨부파일 cascading delete (FileAttachment) → SPEC-FILE-001 (Phase 3). 본 SPEC은 Comment.deletedAt soft delete만 책임.
- 댓글 캐시(레거시 `comments_list` 테이블) → 백로그(SPEC-INFRA-CACHE-001).
- 댓글 검색 인덱스(FTS) → Open Questions 항목 4. 기본은 미적용(레거시도 미적용).
- 댓글 수정 이력 → 백로그.
- 댓글 이동(다른 document로) → 백로그(레거시 `after document.moveDocumentModule` 핸들러는 cascade로만 처리).

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다.

### 2.1 Schema 계층 (REQ-COMMENT-001 ~ 009)

**REQ-COMMENT-001 (Ubiquitous)**: The Comment system SHALL reuse the existing Prisma `Comment` model at `packages/db/prisma/schema.prisma:671~704` without breaking schema changes in Phase 2. Existing fields (id, commentSrl, documentId, parentId, boardId, content, isSecret, password, votedCount, blamedCount, authorId, nickName, ipAddress, status, listOrder, regdate, lastUpdate, deletedAt) SHALL remain compatible.

**REQ-COMMENT-002 (Ubiquitous)**: The Comment system SHALL expose a TypeScript enum or const union `CommentStatus` at `packages/comment/src/types.ts` with values `PUBLIC` (mapped to `Comment.status = 1`) and `SECRET` (mapped to `Comment.status = 2`). The mapping SHALL be documented and stable.

**REQ-COMMENT-003 (Ubiquitous)**: The Comment system SHALL NOT introduce a new Prisma migration in Slice A (분리). Any schema change MUST be deferred to Slice C as an additive, backward-compatible migration. Currently identified additive needs (Slice C): none required — `votedCount`/`blamedCount`/`status`/`isSecret` columns already exist.

**REQ-COMMENT-004 (Ubiquitous)**: The Comment system SHALL define a `CommentVoteLog` Prisma model (Slice C, additive migration `comment-vote-log`) capturing `(commentId, memberId, voteType: 1=up | -1=down, regdate)` with a unique constraint on `(commentId, memberId)`. This mirrors legacy `comment_voted_log` (research.md §1.4).

**REQ-COMMENT-005 (Ubiquitous)**: The Comment system SHALL define a `CommentReport` Prisma model (Slice C, additive migration `comment-report`) capturing `(commentId, reporterId, reporterIp, reason, regdate)` with a unique constraint on `(commentId, reporterId)`. This mirrors legacy `comment_declared_log` and parallels existing `DocumentReport`(MP-002 research §1.4 / current `report.ts`).

**REQ-COMMENT-006 (Ubiquitous)**: The `packages/comment/` package SHALL declare dependencies on `@rhymix-ts/auth` (RBAC `canPerformAction`), `@rhymix-ts/document` (FK consumer for `documentId` + commentCount), and `zod` (input validation). It SHALL NOT import `@prisma/client` directly except via injected `prisma` props (consistent with current `packages/board` convention; see `comment.ts:12`).

**REQ-COMMENT-007 (Unwanted)**: The Comment system SHALL NOT directly increment/decrement counters outside a Prisma `$transaction`. The atomicity contract from current `comment.ts:73~91` (transactional `comment.create` + `document.update commentCount++`) is preserved verbatim.

**REQ-COMMENT-008 (Ubiquitous)**: The Comment system SHALL preserve the HTML sanitization contract from current `comment.ts:23~29` (server-side `isomorphic-dompurify` via lazy require). The sanitizer SHALL run before any database write.

**REQ-COMMENT-009 (Ubiquitous)**: The Comment system SHALL expose a barrel export at `packages/comment/src/index.ts` re-exporting public surface: `createComment`, `listComments`, `deleteComment`, `voteComment`, `reportComment`, `commentRouter`, types, errors. Internal helpers SHALL NOT be exported.

### 2.2 CRUD 계층 (REQ-COMMENT-010 ~ 019)

**REQ-COMMENT-010 (Event-Driven)**: WHEN a member calls `createComment({ documentId, parentId, content, authorId, nickName, actor })`, the system SHALL create a `Comment` row and increment `Document.commentCount` within a single Prisma `$transaction`.

**REQ-COMMENT-011 (Event-Driven)**: WHEN `createComment` is called, the system SHALL validate the actor against the board's `write_comment` grant via `canPerformAction(doc.board, 'write_comment', actor)`. IF the grant check fails, THEN the system SHALL throw `BoardPermissionDeniedError('write_comment')` and SHALL NOT enter the transaction.

**REQ-COMMENT-012 (Event-Driven)**: WHEN `listComments({ documentId })` is called, the system SHALL return all non-soft-deleted comments for the document, ordered by `listOrder` ascending (verbatim from current `comment.ts:104~117`).

**REQ-COMMENT-013 (Event-Driven)**: WHEN `deleteComment({ id, actor })` is called, the system SHALL soft-delete the comment (`deletedAt = now()`) and decrement `Document.commentCount` within a single transaction (verbatim from current `comment.ts:140~168`).

**REQ-COMMENT-014 (Unwanted)**: The Comment system SHALL NOT allow a non-admin actor to delete a comment they did not author. IF `actor.isAdmin === false` AND `comment.authorId !== actor.userId`, THEN the system SHALL throw `DocumentOwnershipError(commentId)` (reused from `packages/document`) and SHALL NOT enter the transaction.

**REQ-COMMENT-015 (Ubiquitous)**: The Comment system SHALL preserve listOrder semantics on creation: `listOrder` SHALL be assigned at insert time such that comments within the same `documentId` are stable-sorted in chronological order. Phase 2 default: use `regdate` epoch milliseconds cast to BigInt (matching the existing `Comment.listOrder BigInt @default(0)` column; concrete strategy decided in research.md).

### 2.3 Tree 계층 (REQ-COMMENT-020 ~ 029)

**REQ-COMMENT-020 (Ubiquitous)**: The Comment system SHALL implement a tree structure using the adjacent-list pattern (`Comment.parentId: Int? → Comment.id`). The schema FK at `schema.prisma:695` is preserved.

**REQ-COMMENT-021 (Event-Driven)**: WHEN `listComments({ documentId })` returns rows, the system SHALL provide a helper `buildCommentTree(rows: Comment[]): CommentNode[]` at `packages/comment/src/tree.ts` that assembles a tree from a flat list in a single pass (O(n) using a Map of `id → node`).

**REQ-COMMENT-022 (Event-Driven)**: WHEN `buildCommentTree` encounters an orphan (parentId references a non-existent or soft-deleted parent), the system SHALL surface it as a root-level node with a `__orphan: true` marker. The system SHALL NOT throw.

**REQ-COMMENT-023 (State-Driven)**: WHILE rendering a comment tree, the system SHALL expose `depth: number` on each `CommentNode` (root = 0, child = parent.depth + 1) so consumers (SPEC-BOARD-CRUD-001 UI) can apply depth-aware styling.

### 2.4 Voting 계층 (REQ-COMMENT-030 ~ 039)

**REQ-COMMENT-030 (Event-Driven)**: WHEN `voteComment({ commentId, voterId, voteType })` is called with `voteType ∈ {1, -1}`, the system SHALL upsert a `CommentVoteLog` row keyed by `(commentId, voterId)` and update the corresponding counter (`votedCount` for `+1`, `blamedCount` for `-1`) within a single transaction.

**REQ-COMMENT-031 (Unwanted)**: The Comment system SHALL NOT allow a member to vote on their own comment. IF `comment.authorId === voterId`, THEN the system SHALL throw `SelfVoteNotAllowedError(commentId)` and SHALL NOT enter the transaction.

**REQ-COMMENT-032 (Event-Driven)**: WHEN a member who has already voted submits a new vote with the SAME `voteType`, the system SHALL treat the action as a no-op and return the existing log without further counter mutation.

**REQ-COMMENT-033 (Event-Driven)**: WHEN a member who has already voted submits a vote with the OPPOSITE `voteType`, the system SHALL atomically (a) decrement the old counter, (b) increment the new counter, and (c) update the log row's `voteType`, all within a single transaction.

**REQ-COMMENT-034 (Unwanted)**: The Comment system SHALL NOT allow guest (unauthenticated) voting. IF `voterId` is null/undefined, THEN the system SHALL throw an authentication error and SHALL NOT mutate state.

### 2.5 Report 계층 (REQ-COMMENT-040 ~ 049)

**REQ-COMMENT-040 (Event-Driven)**: WHEN `reportComment({ commentId, reporterId, reporterIp, reason })` is called, the system SHALL create a `CommentReport` row keyed by `(commentId, reporterId)` and increment `Comment.blamedCount` within a single transaction. The duplicate-suppression pattern SHALL mirror `packages/board/src/report.ts:DuplicateReportError`.

**REQ-COMMENT-041 (Unwanted)**: The Comment system SHALL NOT allow the same `(commentId, reporterId)` pair to report twice. IF a duplicate is detected (DB unique constraint OR application-level findFirst pre-check), THEN the system SHALL throw `DuplicateReportError('comment', commentId)`.

**REQ-COMMENT-042 (Ubiquitous)**: The Comment system's report endpoint SHALL accept a `reason: string` of length 1~500 (Zod validated). Reasons SHALL be stored verbatim (no sanitization applied to admin-facing diagnostic text; sanitization is applied to publicly rendered comment content only).

**REQ-COMMENT-043 (Optional)**: WHERE an automated moderation hook is configured (Phase 4 SPEC-ADDON-001), the system SHALL emit a `comment.reported` event after the transaction commits. Phase 2 default: no event emission.

### 2.6 Secret Comment 계층 (REQ-COMMENT-050 ~ 059)

**REQ-COMMENT-050 (Event-Driven)**: WHEN `createComment` is called with `isSecret: true`, the system SHALL set `Comment.isSecret = true` and `Comment.status = CommentStatus.SECRET` (= 2). The combination SHALL be stable across the system.

**REQ-COMMENT-051 (State-Driven)**: WHILE `comment.isSecret === true`, the system SHALL restrict visibility according to the rules in REQ-COMMENT-052. Visibility is enforced at the service layer (`listComments`, `getComment`), NOT at the database layer (rows remain queryable for admin tooling).

**REQ-COMMENT-052 (Ubiquitous)**: The Comment system SHALL enforce secret comment visibility according to the following rule: a secret comment is visible to (a) its author (`authorId === actor.userId`), (b) the parent document's author (`document.authorId === actor.userId`), (c) ancestor comment authors in the same thread, (d) any admin (`actor.isAdmin === true`). For all other actors, `listComments` SHALL replace `content` with a placeholder string (e.g., `"비밀 댓글입니다."`) and SHALL NOT leak the original content.

**REQ-COMMENT-053 (Optional)**: WHERE password-based unlock is configured (legacy `Comment.password` column), the system SHALL accept an optional `password` parameter on `getComment` and grant visibility on bcrypt-verified match. Phase 2 default: role-based visibility only (REQ-COMMENT-052); password unlock is deferred — Open Questions item 3.

### 2.7 Depth Limit 계층 (REQ-COMMENT-060 ~ 069)

**REQ-COMMENT-060 (Ubiquitous)**: The Comment system SHALL enforce a maximum reply depth of 5 levels (root = depth 0; deepest allowed reply = depth 4).

**REQ-COMMENT-061 (Unwanted)**: IF `createComment` is called with a `parentId` whose depth in the tree is already 4 (creating a child would yield depth 5+), THEN the system SHALL throw `CommentDepthExceededError(parentId, maxDepth=5)` and SHALL NOT enter the transaction.

**REQ-COMMENT-062 (Event-Driven)**: WHEN `createComment` resolves a `parentId`, the system SHALL compute the parent's depth via a single recursive CTE or via parentId chain walk (max 5 reads since the limit is 5). The depth computation SHALL run before the write transaction.

**REQ-COMMENT-063 (Ubiquitous)**: The depth limit constant SHALL be exported as `MAX_COMMENT_DEPTH = 5` from `packages/comment/src/constants.ts` for downstream consumers (SPEC-BOARD-CRUD-001 UI may use it to disable reply buttons at depth 4).

### 2.8 tRPC Router 계층 (REQ-COMMENT-070 ~ 079)

**REQ-COMMENT-070 (Ubiquitous)**: The Comment system SHALL expose a tRPC router `commentRouter` at `packages/comment/src/router.ts` registering procedures: `create` (mutation), `list` (query by documentId), `delete` (mutation), `vote` (mutation), `report` (mutation), `getOne` (query by id).

**REQ-COMMENT-071 (Ubiquitous)**: Each tRPC procedure SHALL use Zod input schemas mirroring the service-layer schemas (REQ-COMMENT-010~060). Input validation SHALL occur at the tRPC layer before delegating to the service.

**REQ-COMMENT-072 (Ubiquitous)**: Authenticated procedures (`create`, `delete`, `vote`, `report`) SHALL use the existing `protectedProcedure` (or equivalent) from the apps/web tRPC bootstrap. The `actor` context object SHALL be derived from the session, NOT from client-supplied input.

**REQ-COMMENT-073 (Event-Driven)**: WHEN a tRPC procedure throws a service-layer error (`BoardPermissionDeniedError`, `DocumentOwnershipError`, `DuplicateReportError`, `SelfVoteNotAllowedError`, `CommentDepthExceededError`), the system SHALL translate it to a structured `TRPCError` with appropriate `code` (`FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`).

### 2.9 Quality 계층 (REQ-COMMENT-080 ~ 089)

**REQ-COMMENT-080 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%. Estimated test count: 22 (Slice A: 5 characterization, Slice B: 6 router, Slice C: 11 domain features).

**REQ-COMMENT-081 (Ubiquitous)**: Slice A SHALL include characterization tests preserving the exact behavior of current `packages/board/src/comment.test.ts` (5 tests: B-501~B-505). These tests SHALL be moved to `packages/comment/src/__tests__/` and SHALL pass before any behavior change in Slice B/C.

**REQ-COMMENT-082 (Ubiquitous)**: Slice C SHALL include integration tests for the transactional contracts (REQ-COMMENT-010, 013, 030, 033, 040): each must verify that mock prisma's `$transaction` was invoked exactly once and that both counters and log rows were touched atomically.

**REQ-COMMENT-083 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (comment, board, document, db, apps/web).

**REQ-COMMENT-084 (Ubiquitous)**: All new code SHALL respect language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers in English.

**REQ-COMMENT-085 (Unwanted)**: The Comment system SHALL NOT introduce new global mutable state. The router registration is idempotent (registered once at apps/web tRPC bootstrap).

---

## 3. Slices

본 SPEC은 3개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: 패키지 분리 (행동 보존 + characterization 가드)

종속성: SPEC-DOCUMENT-001 Slice A (document 패키지 분리) 완료 권장.

작업 항목:

1. `packages/comment/` 신규 패키지 골조 (package.json, tsconfig, src/index.ts)
2. `packages/board/src/comment.ts` → `packages/comment/src/service.ts` 이동 (변경 없음)
3. `packages/board/src/comment.test.ts` → `packages/comment/src/__tests__/service.test.ts` 이동 (변경 없음 — 5개 B-501~B-505 테스트)
4. `packages/board/src/report.ts`의 comment 분기 → `packages/comment/src/report.ts`로 분리(`reportComment(commentId, ...)` 시그니처). board의 `report.ts`는 document 분기만 보존(또는 SPEC-DOCUMENT-001에 위임).
5. `packages/board/src/vote.ts`의 comment 분기 → `packages/comment/src/vote.ts`로 분리(`voteComment` 시그니처).
6. 모든 import 경로 갱신: `packages/board`의 잔여 코드가 comment를 사용한다면 `@rhymix-ts/comment`에서 import. apps/web의 import도 갱신.
7. 회귀 가드: `pnpm test` 전체 통과(특히 기존 board 테스트 모두 그린).

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test packages/comment` 5 characterization tests pass
- `pnpm test packages/board` 잔여 테스트 통과 (회귀 없음)

EARS coverage: REQ-COMMENT-001, 006, 007, 008, 009, 081, 083, 085

### Slice B: tRPC Router + UI Integration Hooks

종속성: Slice A 완료.

작업 항목:

1. `packages/comment/src/router.ts` 신규: `commentRouter`(`create`, `list`, `delete`, `vote`, `report`, `getOne` 6개 procedure)
2. Zod 입력 스키마는 service 함수의 스키마를 재사용 (`CreateCommentSchema` 등)
3. apps/web tRPC 부트스트랩에 `commentRouter` 등록(append to root router)
4. 오류 변환 미들웨어: 서비스 오류 → `TRPCError`(`FORBIDDEN`/`CONFLICT`/`BAD_REQUEST`)
5. `packages/comment/src/tree.ts` 신규: `buildCommentTree(rows): CommentNode[]` + depth 계산
6. 6+ 단위 테스트 (procedure mocks, error translation, tree builder)

검증:

- `pnpm test packages/comment` 통과 (Slice A 5 + Slice B 6 = 11 tests)
- apps/web에서 `trpc.comment.list.useQuery({ documentId })` 호출이 형/시그니처상 동작 (UI는 SPEC-BOARD-CRUD-001)

EARS coverage: REQ-COMMENT-012, 020~023, 070~073

### Slice C: 도메인 기능 (Voting / Report / Secret / Depth Limit)

종속성: Slice B 완료.

작업 항목:

1. Prisma migrations (additive):
   - `comment-vote-log`: `CommentVoteLog(id, commentId FK, memberId, voteType, regdate, @@unique([commentId, memberId]))`
   - `comment-report`: `CommentReport(id, commentId FK, reporterId, reporterIp, reason, regdate, @@unique([commentId, reporterId]))`
2. `voteComment` service + router 통합 — upsert + 카운터 atomic
3. `reportComment` service — `DuplicateReportError` + `Comment.blamedCount++` atomic
4. `CommentStatus` enum + `isSecret` 처리 — `listComments`/`getComment`에서 visibility 필터 적용 (REQ-COMMENT-050~053)
5. `MAX_COMMENT_DEPTH = 5` 상수 + `computeParentDepth(parentId)` 헬퍼 + `createComment`에서 가드(REQ-COMMENT-060~063)
6. 새 오류 클래스: `SelfVoteNotAllowedError`, `CommentDepthExceededError`
7. 11+ 단위/통합 테스트 (vote/upsert, vote 자기-vote 거부, vote 전환, report 중복 차단, secret visibility 4가지 시나리오, depth=4 허용/depth=5 거부)

검증:

- `pnpm prisma migrate dev` 성공 (additive only)
- `pnpm test packages/comment` 통과 (누계 ~22 tests)
- 전체 `pnpm test` 통과

EARS coverage: REQ-COMMENT-002~005, 010, 013, 014, 015, 030~034, 040~043, 050~053, 060~063, 080~085

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 6개:

1. **AC-COMMENT-A1**: GIVEN 현재 board에서 `packages/board/src/comment.test.ts`의 B-501~B-505가 통과, WHEN Slice A 완료, THEN 동일 5개 테스트가 `packages/comment/src/__tests__/service.test.ts`에서 동일하게 통과한다. board 잔여 테스트는 회귀 없이 통과.
2. **AC-COMMENT-B1**: GIVEN Slice B 완료, WHEN apps/web에서 `trpc.comment.list.useQuery({ documentId: 10 })` 호출, THEN 해당 document의 비-삭제 댓글이 `listOrder asc`로 반환된다.
3. **AC-COMMENT-C1**: GIVEN 회원 A가 document 5에 댓글을 작성, WHEN `createComment(...)`, THEN 단일 트랜잭션 안에서 Comment 1행 생성 + `Document.commentCount++` 가 모두 호출된다.
4. **AC-COMMENT-C2 (depth limit)**: GIVEN 댓글 트리에서 parent의 depth = 4 (즉 child가 depth 5가 됨), WHEN `createComment({ parentId: parent.id, ... })`, THEN `CommentDepthExceededError`가 throw되고 트랜잭션이 시작되지 않는다.
5. **AC-COMMENT-C3 (secret visibility)**: GIVEN 회원 B가 비밀 댓글(`isSecret: true`)을 작성, WHEN 무관 회원 C(`isAdmin: false`, document 작성자 아님, 조상 댓글 작성자 아님)가 `listComments`를 호출, THEN 해당 댓글의 `content`는 placeholder 문자열로 치환된다.
6. **AC-COMMENT-C4 (vote switching)**: GIVEN 회원 D가 댓글 100에 upvote 완료(votedCount = 1), WHEN 같은 회원이 downvote로 전환, THEN 단일 트랜잭션 안에서 votedCount-- (= 0), blamedCount++ (= 1), 로그 voteType 갱신이 모두 호출된다.

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/comment/`** 독립 패키지에 둔다 (MASTER-PLAN-002 Section 1 + 9.1-4 결정: `packages/comment` 신규 추가 승인). 패키지는 `@rhymix-ts/auth`(RBAC) + `@rhymix-ts/document`(commentCount 카운터의 소유자)에 의존하며, `packages/board`와 동일하게 `prisma`를 props로 주입받는다(직접 import 금지).

### 5.2 분리 전략: characterization 가드 우선

현재 `packages/board/src/comment.test.ts`(195 line, 5 tests B-501~B-505)는 이미 강력한 동작 계약을 갖고 있다. Slice A는 **순수 이동**(rename + import path 갱신)만 수행하여 이 테스트가 한 줄도 깨지지 않고 통과하도록 한다. 이것이 행동 보존(DDD PRESERVE 원칙)의 가드이다. Slice B/C에서 기능을 추가할 때 이 5개 테스트가 가장 먼저 깨지는지 확인한다 — 깨지면 행동 변경의 신호로 간주.

### 5.3 신규 Prisma 모델 vs 기존 컬럼 재사용

`Comment` 모델 자체는 변경하지 않는다(MP-002 research §1.4 확인: votedCount/blamedCount/isSecret/status/listOrder 모두 이미 존재). 추가되는 것은 **로그 테이블 2개**(`CommentVoteLog`, `CommentReport`) 뿐 — 둘 다 unique index를 통한 중복 차단이 핵심이며, 이는 application-level findFirst 가드와 함께 double safeguard를 형성한다.

### 5.4 commentCount 카운터의 소유권

`Document.commentCount`는 SPEC-DOCUMENT-001이 소유하는 컬럼이지만, 카운터 업데이트는 본 SPEC의 mutation(create/delete)이 트랜잭션 안에서 직접 호출한다 — 현재 `comment.ts:84`의 `tx.document.update({ ... commentCount: { increment: 1 } })` 패턴 유지. 이는 cross-package boundary 위반처럼 보이지만 사실은 **무결성 우선**(NoT distributing transactions) 결정이다. SPEC-DOCUMENT-001은 컬럼을 정의/마이그레이션하고, 본 SPEC은 그 값을 트랜잭션 안에서 변경하는 단일 책임자.

### 5.5 트리 구조: adjacent list (parent_srl + list_order)

레거시 `modules/comment`는 인접 리스트 + path 캐시(`comments_list`) 하이브리드를 썼지만, 본 SPEC은 **인접 리스트만** 채택한다. 이유:

- Phase 2 트래픽 가정 작음 — depth 5 chain walk(최대 5 reads)가 충분히 빠름.
- `comments_list` 캐시는 invalidation 복잡도가 큼(레거시도 정합성 버그가 많았음 — research.md §1.4 PHP 매핑 노트).
- 트리 빌드는 application 레이어(`buildCommentTree`)에서 O(n) 단일 패스로 처리.

### 5.6 Voting: upsert + 트랜잭션

`voteComment`는 다음 의사 로직:

1. existing = `findUnique({ commentId_memberId })`
2. if (existing && existing.voteType === voteType) → no-op return
3. transaction:
   - if existing: decrement old counter, upsert log voteType, increment new counter
   - else: create log, increment counter
4. self-vote 가드는 transaction 진입 전.

DB unique index `@@unique([commentId, memberId])`가 race condition (동시 vote)을 차단한다.

### 5.7 Report: 중복 차단 패턴 미러링

`reportComment`는 `packages/board/src/report.ts`의 `DuplicateReportError` 패턴을 그대로 미러링한다. 다만 `DocumentReport`(현재 모델)와 `CommentReport`(신규 모델)는 별도 테이블이며, 본 SPEC에서 `CommentReport`를 새로 마이그레이션한다. `report.ts`의 unique 제약 부재 이슈(현재 `@MX:NOTE`)는 본 SPEC의 `CommentReport.@@unique([commentId, reporterId])`로 해결한다.

### 5.8 Secret Comment: 서비스 레이어 가드

DB row는 항상 조회되며(admin tooling/moderation 필요), 서비스 레이어 `listComments`/`getComment`가 actor와 thread context(parent author chain, document author)를 기준으로 visibility를 결정하여 content를 placeholder로 치환한다. 이는 SPEC-AUTH-001 RBAC와 일관된 RBAC 스타일.

비밀번호 보호(legacy `Comment.password`)는 Phase 2 미포함 — Open Questions 항목 3.

### 5.9 Depth Limit: 5단계

depth limit은 service-layer 가드(REQ-COMMENT-061). parent를 받으면 parentId 체인을 최대 5단계까지 walk하여 depth 계산. depth 4 parent에 reply 시도 시 throw. UI는 `MAX_COMMENT_DEPTH` 상수를 사용하여 사전 disable.

### 5.10 알림은 P3로 명시 분리

레거시 modules/comment는 직접 mail/notification을 호출하지 않았다(`after document.addComment` 이벤트 → noti 모듈이 별도 처리). 본 SPEC도 동일한 분리 유지 — Phase 4 SPEC-ADDON-001의 `comment.created` hook으로 발화하거나 Phase 3 SPEC-MAIL-001 이후 별도 SPEC. Open Questions 항목 1.

---

## 6. Risks & Mitigations

상세는 `research.md` 참조. 핵심 5가지:

| Risk | Mitigation |
|---|---|
| 패키지 분리 과정에서 commentCount 카운터 불일치 발생 | Slice A는 행동 변경 없이 이동만. B-501/B-504 트랜잭션 테스트가 회귀 가드. Slice B/C에서도 동일 테스트 유지. |
| board의 잔여 코드가 comment에 hard import → 순환 의존 | board → comment 단방향만 허용. comment는 board를 import하지 않음(Permission check는 actor + board prop 주입 방식 유지). |
| Secret comment visibility 룰의 thread-context 계산 비용 | `listComments`가 한 번의 fetch로 parent chain을 in-memory에서 계산. depth limit 5 덕분에 chain walk 최대 5회. |
| Vote switching race condition (동시에 up/down 호출) | `@@unique([commentId, memberId])` + `$transaction` 안의 upsert로 직렬화. 마지막 호출 승. |
| Depth limit 우회(parentId가 트리 외부 댓글 가리킬 때) | parentId의 `documentId === current documentId` 검증을 createComment 진입 시 추가(REQ-COMMENT-061 강화). |

---

## 7. Open Questions

본 SPEC 작성 시점에 미해결인 항목들. Slice A는 모두 해결 없이 진행 가능. 사용자 결정이 필요한 항목은 **MoAI orchestrator의 AskUserQuestion으로 별도 라운드**에서 확정.

1. **알림(notification) 메커니즘**: 댓글 작성 시 document 작성자 + ancestor 댓글 작성자에게 알림 발송 — 어떤 채널을 쓸 것인가? (옵션: a) Phase 4 SPEC-ADDON-001 hook 기반, b) Phase 3 SPEC-MAIL-001의 SMTP 즉시 활용, c) Phase 4 별도 SPEC-NOTIFICATION-001 신설, d) Phase 2 미구현 — P3로 백로그). **권고**: d) Phase 2 미구현 + P3 백로그. 이유: 알림은 cross-cutting concern이며 board 외 다른 도메인(member, document, point)도 비슷한 요구가 있음. 단일 SPEC-NOTIFICATION-001로 통합 설계가 효율적.

2. **Vote 저장 전략 (로그 테이블 vs 카운터만)**: `CommentVoteLog`를 새로 만들 것인가, 아니면 `Comment.votedCount` 카운터만 유지하고 누가 vote했는지는 추적하지 않을 것인가? (옵션: a) 로그 테이블 + 카운터(double bookkeeping, 회수 가능), b) 카운터만(가벼움, vote 변경 불가), c) 로그 테이블만(카운터는 view로 계산)). **권고**: a) 로그 테이블 + 카운터. 이유: 레거시 패턴과 일치(`comment_voted_log`), vote 전환/취소 기능 + abuse 감사가 필요, 카운터는 조회 성능에 필수.

3. **Secret 댓글: 비밀번호 vs 역할 기반**: 레거시는 `Comment.password` 컬럼으로 비밀번호 unlock도 지원했다. (옵션: a) 역할 기반만 — 작성자/문서 작성자/ancestor 작성자/admin만 자동 visible, b) 비밀번호 unlock도 지원 — 비로그인 사용자가 password 입력 시 unlock, c) 둘 다 지원, d) Phase 2는 역할 기반만, 비밀번호는 후속 SPEC). **권고**: d) Phase 2는 역할 기반만, 비밀번호는 후속 SPEC. 이유: 레거시 비밀번호 댓글은 guest 사용 패턴인데, 신규 사이트에서 guest 댓글 자체를 줄이는 방향(actor required)이 일관성 있음. 비밀번호 보호가 필요한 사용자는 후속 SPEC에서 추가 가능.

4. **댓글 검색 인덱스(FTS)**: `Comment.content`에 PostgreSQL FTS GIN 인덱스를 적용할 것인가? (레거시 미적용 — MP-002 §6.3에 백로그로 언급) — 본 SPEC은 미적용 권고, 후속 SPEC에서 결정.

5. **`Comment.commentSrl` BigInt 마이그레이션 키**: 레거시 호환을 위한 `commentSrl BigInt? @unique` 컬럼(schema:673) 유지 vs 폐기. 본 SPEC은 변경 없음 — 운영 데이터 마이그레이션 SPEC(MP-002 §8.4)이 별도로 다룸.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **댓글 작성/리스트/대댓글 UI 컴포넌트**: SPEC-BOARD-CRUD-001(Phase 2). 본 SPEC은 tRPC procedure 인터페이스까지만.
2. **document 도메인 분리**: SPEC-DOCUMENT-001(Phase 2, 본 SPEC의 선행). 본 SPEC은 documentId를 FK로 받는 소비자.
3. **board grants 매트릭스 UI/admin**: SPEC-BOARD-CRUD-001. 본 SPEC은 `canPerformAction(...)` 헬퍼만 사용.
4. **댓글 알림 (in-app/이메일/푸시)**: P3, Open Questions 항목 1. 별도 SPEC-NOTIFICATION-001 권고.
5. **첨부파일 cascading delete**: SPEC-FILE-001(Phase 3). 본 SPEC은 Comment.deletedAt soft delete만.
6. **댓글 캐시 (`comments_list` 테이블)**: 백로그(SPEC-INFRA-CACHE-001).
7. **댓글 검색 FTS 인덱스**: Open Questions 항목 4. 본 SPEC 미적용.
8. **댓글 수정 이력**: 백로그.
9. **댓글 이동(다른 document로)**: 백로그. 레거시 `after document.moveDocumentModule` cascade는 본 SPEC에서 직접 미구현.
10. **비밀번호 기반 비밀 댓글 unlock**: Open Questions 항목 3. Phase 2는 역할 기반만.
11. **레거시 댓글 import 스크립트**: 운영 데이터 마이그레이션 SPEC(MP-002 §8.4 백로그).
12. **`Comment.commentSrl` 정합성 작업**: 본 SPEC 범위 외. 운영 마이그레이션 SPEC에서 다룸.
13. **댓글 자체에 대한 자체 RBAC grants**: 댓글의 권한은 부모 document의 board grants(`write_comment`/`view`)에서 파생. 별도 comment-level grants 없음.
14. **모더레이션 워크플로우 (자동 hide / shadow ban)**: Phase 4 SPEC-ADDON-001 hook으로 추후.
15. **댓글 작성자 익명화 (guest 댓글 nickname only)**: 현재 `comment.ts`가 guest 패턴 일부 지원(authorId nullable, nickName 사용). 본 SPEC은 기존 동작 보존만 하며 guest 댓글 정책 변경은 별도 SPEC에서.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~22 (Slice A: 5 characterization, Slice B: 6 router/tree, Slice C: 11 domain features)
Estimated Slice Count: 3 (A: 패키지 분리, B: tRPC router + tree, C: voting/report/secret/depth)
Dependencies (upstream): SPEC-AUTH-001 ✅ (RBAC `canPerformAction`), SPEC-DOCUMENT-001 (Phase 2, documentId FK + commentCount 컬럼)
Soft dependency: SPEC-BOARD-CRUD-001 (Phase 2, 본 SPEC의 tRPC procedure의 UI 소비자)
Blocks (downstream): SPEC-BOARD-CRUD-001 (board 패키지는 본 SPEC의 service/router에 의존)
