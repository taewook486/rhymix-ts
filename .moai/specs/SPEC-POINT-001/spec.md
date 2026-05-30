---
id: SPEC-POINT-001
title: 포인트 시스템 독립 패키지 + 크로스 모듈 통합 (Point System Standalone Package + Cross-Module Integration)
version: 1.0.0
status: draft
created: 2026-05-27
updated: 2026-05-27
author: MoAI manager-spec
priority: P1
phase: 3
parent: MASTER-PLAN-002
depends-on: [SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001]
absorbs: []
issue_number: TBD
related-research: SPEC-POINT-001/research.md
language: ko
---

# SPEC-POINT-001 — 포인트 시스템 독립 패키지 + 크로스 모듈 통합 (Phase 3 / P1)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.8(line 320~328)의 직접 흡수. 레거시 PHP `modules/point`(MASTER-PLAN-002 research.md Section 1.8, line 272~291)의 단일 `point` 테이블(`member_srl` PK + `point` integer)을 신규 독립 패키지 `packages/point/`로 포팅한다. 본 SPEC은 **회원 생태계 보강 Phase 3의 핵심 cross-cutting 도메인**이며, `Document.create`/`Comment.create`/회원가입 등에서 트랜잭션 단위로 포인트를 부여/차감한다. MASTER-PLAN-002 Section 9.1-6 사용자 결정사항 채택: point 시스템은 board/document/comment가 직접 의존하지 않고 **event-based 약결합**으로 통합한다(SPEC-DOCUMENT-001 REQ-DOC-132 이벤트 버스 stub 소비 측). 단, Slice B에서는 호출자가 transaction 안에서 PointService를 직접 주입하여 atomicity를 보장하는 fallback 경로도 함께 제공한다 — addon hook system(Phase 4 SPEC-ADDON-001)으로 마이그레이션될 때까지 유효.

---

## 1. Goal & Audience

### 1.1 Goal

**Rhymix의 `modules/point` 도메인을 TypeScript 독립 패키지 `packages/point/`로 포팅하고, board/document/comment/member 모듈과 트랜잭션 일관성을 보장하면서 통합한다.** 즉:

- 레거시 단일 테이블(`point.member_srl` PK + `point` int)을 **이벤트 소싱 스타일**로 재설계: 신규 `Point` 모델은 모든 포인트 변동을 amount(signed integer) + reason + sourceType + sourceId로 기록하고, 회원별 잔액은 도출 값(또는 `User`에 캐시 컬럼) 으로 관리한다 (research.md Section 1.2 결정 사유).
- 신규 패키지 `packages/point/`의 `PointService` 클래스: `add`, `subtract`, `getBalance`, `getHistory`, `getLevel` API 노출.
- 게시판 단위 포인트 정책 통합: `Board` 모델에 `pointPerDocument`, `pointPerComment`, `pointPerVote`, `pointPerDownload`, `pointPerFileUpload` 컬럼 추가(MASTER-PLAN-002 Section 5.8 line 323).
- 트랜잭션 통합: `Document.create`/`Comment.create`/`vote` 등의 service가 트랜잭션 안에서 `PointService.add`를 호출(직접 주입) — Phase 4에서 addon hook으로 마이그레이션 가능한 구조(MASTER-PLAN-002 Section 9.1-6 user 결정).
- 음수 잔액 정책: 게시판/사이트 설정으로 clamp_to_zero (기본) vs allow_negative (debt mode) 선택(MASTER-PLAN-002 Section 5.8 line 327 EARS).
- 관리자 도구: `admin/members/[id]/points` 페이지 — 포인트 이력 + 수동 조정(`PointSourceType.MANUAL`).
- 회원가입 보너스: SPEC-AUTH-001 회원 가입 완료 이벤트에 반응하여 사이트 설정 가입 보너스 자동 부여.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (Prisma 마이그레이션 + PointService 클래스 + unit tests)
- expert-backend agent — Slice B 구현 (Board 컬럼 추가 + document/comment/vote 트랜잭션 통합 + member.create 보너스 + admin UI)
- expert-frontend agent — Slice B 일부 (admin/members/[id]/points 페이지 minimal UI)
- 운영자 — `admin/site/points` (사이트 단위 정책)에서 회원 가입 보너스, clamp 기본값을 설정하고 `admin/members/[id]/points`에서 수동 조정/이력 확인하는 사용자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 포인트 레벨 시스템(threshold → name/iconUrl 매핑) — Phase 4 addon 영역으로 이관(MASTER-PLAN-002 research.md Section 1.8 line 286, 본 SPEC research.md Section 1.7 결정). `getLevel` API는 stub만 제공(현재 1단계 고정 반환).
- 포인트 레벨 아이콘 닉네임 옆 표시 — 레거시 `addons/point_level_icon` 영역, SPEC-ADDON-001 (Phase 4).
- 외부 결제/충전 시스템 — 본 SPEC 범위 외. `PointSourceType.PURCHASE` enum 값은 forward-compat로 정의하지만 구현 없음.
- 포인트 양도/송금 — 본 SPEC 범위 외. 백로그.
- 게시판 일괄 재계산(`recal`) 운영 도구 — 본 SPEC은 idempotent 재계산 함수만 export. CLI/admin 일괄 작업은 SPEC-ADMIN-EXTRAS-001(Phase 5).
- 일괄 적용(`apply`)/리셋(`reset`) admin UI — 본 SPEC 범위 외. 수동 조정 UI(`MANUAL` reason)만.
- 알림(notification) 발송 — 포인트 변동 시 회원에게 알림은 Phase 3 후속. 본 SPEC은 변동 기록만.
- 게시물 조회 시 차감(`view_document` point cost) — 레거시 일부에 있으나 본 SPEC은 부여(add)에 집중. 차감(subtract)은 API로 노출하되 view path 통합은 Phase 4 옵션.
- 댓글 추천/비추천 포인트 — Slice B에서 `pointPerVote`로 통합. 그러나 reaction별 세분화(추천 vs 비추천 다른 양)은 본 SPEC 범위 외.
- 데이터 마이그레이션 (PHP `point.point` → TS `Point` 이벤트 stream) — 별도 SPEC. 백로그.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. 9개 카테고리(Schema, Package Structure, Service API, Cross-Module Integration, Clamping Policy, Admin UI, Sign-up Bonus, Idempotency, Quality)로 그룹화.

### 2.1 Schema 계층 (REQ-POINT-001 ~ 009)

**REQ-POINT-001 (Ubiquitous)**: The Point system SHALL introduce a new Prisma model `Point` (table `points`) with the following columns: `id Int @id @default(autoincrement())`, `memberId Int` (FK to `User.id`, onDelete: Cascade), `amount Int` (signed integer; positive = earn, negative = spend), `reason String` (free-form human-readable, max 200 chars), `sourceType PointSourceType` (enum), `sourceId Int?` (optional FK-like id of the originating entity such as document.id, comment.id; not a hard FK to allow cascading deletes without breaking history), `boardId Int?` (optional reference for analytics; not a hard FK, SET NULL semantics emulated by storing snapshot), `createdAt DateTime @default(now()) @db.Timestamptz`.

**REQ-POINT-002 (Ubiquitous)**: The Point system SHALL introduce a new Prisma enum `PointSourceType` with values: `DOCUMENT` (글 작성), `COMMENT` (댓글 작성), `VOTE` (추천/비추천), `DOWNLOAD` (파일 다운로드 — Phase 3 SPEC-FILE-001 forward-compat), `FILE_UPLOAD` (파일 업로드 — forward-compat), `SIGNUP` (회원가입 보너스), `MANUAL` (관리자 수동 조정), `SYSTEM` (시스템 자동 부여/회수, e.g., 일괄 재계산), `PURCHASE` (외부 결제 — 본 SPEC 범위 외, enum만 예약), `REFERRAL` (추천인 보너스 — 본 SPEC 범위 외, enum만 예약). Phase 3 actively implements DOCUMENT, COMMENT, VOTE, SIGNUP, MANUAL, SYSTEM. Others are forward-compat placeholders.

**REQ-POINT-003 (Ubiquitous)**: The `Point` table SHALL have the following indexes: `@@index([memberId, createdAt(sort: Desc)])` for fast history queries, `@@index([memberId])` for balance aggregation, `@@index([sourceType, sourceId])` for idempotency lookups (REQ-POINT-080), `@@index([createdAt])` for time-range analytics.

**REQ-POINT-004 (Ubiquitous)**: The `User` model SHALL gain an additive nullable column `pointBalance Int @default(0)` to cache the current balance derived from `SUM(Point.amount) WHERE memberId = User.id`. This cache is maintained by `PointService.add`/`subtract` transactionally and validated by an idempotent recompute function `PointService.recompute(memberId)`.

**REQ-POINT-005 (Ubiquitous)**: The `Board` model SHALL gain additive nullable columns for per-board point policy: `pointPerDocument Int @default(0)`, `pointPerComment Int @default(0)`, `pointPerVoteUp Int @default(0)`, `pointPerVoteDown Int @default(0)`, `pointPerDownload Int @default(0)`, `pointPerFileUpload Int @default(0)`. Default 0 means "no point awarded" (legacy parity). Negative values are permitted and represent a cost (e.g., `-5` for `pointPerDownload` means downloading costs 5 points).

**REQ-POINT-006 (Ubiquitous)**: A new site-level config key `sitePointConfig` SHALL be persisted via existing `ModuleConfig` (where `moduleCode = 'point'`, `moduleInstanceId = NULL` for site-global) with shape `{ signupBonus: number, clampToZero: boolean, allowNegativeBalance: boolean, defaultLevel: number }` (validated by Zod). Default values: `signupBonus: 0, clampToZero: true, allowNegativeBalance: false, defaultLevel: 1`.

**REQ-POINT-007 (Ubiquitous)**: The Point system SHALL NOT introduce a separate `PointLevel` model in Phase 3 (deferred to Phase 4 addon SPEC-POINT-LEVEL-001 — see research.md Section 1.7 rationale). The `getLevel(memberId)` API stub returns `{ level: 1, name: 'default', iconUrl: null, threshold: 0 }` for all members in Phase 3.

**REQ-POINT-008 (Ubiquitous)**: The Point system SHALL preserve the legacy `Point.amount` semantics as **signed integer** (matching legacy `point.point` int column). No fractional points. No currency conversion. The amount column type is PostgreSQL `INTEGER` (32-bit signed, range ±2.1B) which is sufficient for realistic use.

**REQ-POINT-009 (Unwanted)**: The Point system SHALL NOT modify existing Prisma models other than the additive columns specified in REQ-POINT-004 and REQ-POINT-005. No column rename, no column removal, no relation change to existing tables.

### 2.2 Package Structure 계층 (REQ-POINT-010 ~ 019)

**REQ-POINT-010 (Ubiquitous)**: The Point system SHALL be packaged as `packages/point/` with a `package.json` declaring name `@rhymix-ts/point`, version `0.1.0`, dependencies on `@rhymix-ts/core` (module registry, ModuleConfig), `@rhymix-ts/db` (Prisma client type), `@rhymix-ts/auth` (Actor type), `zod`.

**REQ-POINT-011 (Ubiquitous)**: The Point system SHALL NOT depend on `@rhymix-ts/document`, `@rhymix-ts/comment`, `@rhymix-ts/board`. Reverse dependency direction is enforced: document/comment/board MAY depend on `@rhymix-ts/point` but not vice versa. This preserves the cross-cutting nature of Point (MASTER-PLAN-002 Section 9.1-6).

**REQ-POINT-012 (Ubiquitous)**: The Point system SHALL expose a top-level barrel export at `packages/point/src/index.ts` re-exporting: `PointService`, `createPointService`, `PointSourceType` (enum re-export from Prisma client), `PointInsufficientError`, `PointAmountInvalidError`, `PointMemberNotFoundError`, `PointSiteConfigSchema` (Zod schema), `getSitePointConfig`, `setSitePointConfig`, and the typed event subscriber registration helpers `subscribeToDocumentEvents`, `subscribeToCommentEvents`, `subscribeToMemberEvents`.

**REQ-POINT-013 (Ubiquitous)**: The `PointService` class SHALL accept a `PrismaClient` (or `Prisma.TransactionClient` for transactional callers) via constructor injection — `new PointService(prisma)`. All public methods accept an optional `tx?: Prisma.TransactionClient` parameter for nested transaction participation.

**REQ-POINT-014 (Ubiquitous)**: The Point system SHALL register itself with the module registry (`packages/core/src/modules/registry.ts`) with `moduleCode = 'point'`. The registration is idempotent. No `dispPointAdminList` legacy admin action is implemented in Phase 3 — admin UI is delivered via `apps/web/app/admin/members/[id]/points/page.tsx` (REQ-POINT-060).

**REQ-POINT-015 (Unwanted)**: The Point system SHALL NOT import `@prisma/client` constructors directly. PrismaClient instances are passed via constructor/method parameters (consistent with `packages/document` convention).

**REQ-POINT-016 (Ubiquitous)**: The Point system SHALL declare TypeScript strict mode (consistent with monorepo `tsconfig.base.json`). Zero `any` types are introduced.

### 2.3 Service API 계층 (REQ-POINT-020 ~ 039)

**REQ-POINT-020 (Event-Driven)**: WHEN `PointService.add({ memberId, amount, reason, sourceType, sourceId?, boardId? }, tx?)` is invoked with `amount > 0`, the system SHALL create a `Point` row and SHALL increment `User.pointBalance` by `amount` in the same transaction (or the provided `tx`).

**REQ-POINT-021 (Event-Driven)**: WHEN `PointService.subtract({ memberId, amount, reason, sourceType, sourceId?, boardId? }, tx?)` is invoked with `amount > 0`, the system SHALL create a `Point` row with `amount = -amount` (negative) and SHALL decrement `User.pointBalance` by `amount`, subject to clamping policy (REQ-POINT-050).

**REQ-POINT-022 (Event-Driven)**: WHEN `PointService.add` or `subtract` is invoked with `amount === 0`, the system SHALL no-op (return the current balance without creating a `Point` row). This avoids transaction churn for zero-config boards (`Board.pointPerDocument = 0`, the default).

**REQ-POINT-023 (Event-Driven)**: WHEN `PointService.add` or `subtract` is invoked with `amount` that is not an integer (e.g., NaN, Infinity, float), the system SHALL throw `PointAmountInvalidError`. The wrapper Zod schema enforces `z.number().int()`.

**REQ-POINT-024 (Event-Driven)**: WHEN `PointService.add` or `subtract` is invoked with a `memberId` that does not exist in the `User` table, the system SHALL throw `PointMemberNotFoundError`. The check is performed atomically inside the transaction to avoid TOCTOU races.

**REQ-POINT-025 (Event-Driven)**: WHEN `PointService.getBalance(memberId)` is invoked, the system SHALL return `User.pointBalance` directly (O(1) read) without recomputing from `Point` rows. Callers needing audit-grade balance use `PointService.recompute(memberId)` (REQ-POINT-027).

**REQ-POINT-026 (Event-Driven)**: WHEN `PointService.getHistory({ memberId, cursor?, limit?, sourceType? })` is invoked, the system SHALL return `{ items: Point[], nextCursor: string | null }` ordered by `createdAt DESC, id DESC`. Default `limit = 20`, max `limit = 100`. Cursor is base64url-encoded `(createdAt: ISO string, id: number)` tuple.

**REQ-POINT-027 (Event-Driven)**: WHEN `PointService.recompute(memberId, tx?)` is invoked, the system SHALL execute `SELECT COALESCE(SUM(amount), 0) FROM points WHERE memberId = $1` and update `User.pointBalance` to the result. This is idempotent and used for cache repair / migration / admin debugging.

**REQ-POINT-028 (Event-Driven)**: WHEN `PointService.getLevel(memberId)` is invoked, the system SHALL return the stub `{ level: 1, name: 'default', iconUrl: null, threshold: 0 }` in Phase 3 (REQ-POINT-007). The API signature is forward-compat for Phase 4 SPEC-POINT-LEVEL-001 to swap in the real lookup.

**REQ-POINT-029 (Ubiquitous)**: All `PointService` mutation methods (`add`, `subtract`, `recompute`) SHALL be idempotent when called with the same `(sourceType, sourceId)` pair — see REQ-POINT-080. `getBalance`, `getHistory`, `getLevel` are pure reads, naturally idempotent.

**REQ-POINT-030 (Ubiquitous)**: `PointService` SHALL emit a typed event `point.changed` (via the shared event bus from SPEC-DOCUMENT-001 REQ-DOC-132 stub) after each successful `add`/`subtract` with payload `{ memberId, delta: number, newBalance: number, reason, sourceType, sourceId, timestamp }`. Phase 3 ships the emitter; subscribers (notifications, level badges) are added in Phase 4+.

### 2.4 Cross-Module Integration 계층 (REQ-POINT-040 ~ 049)

**REQ-POINT-040 (Event-Driven)**: WHEN a member creates a document via `documentRouter.create` AND `Board.pointPerDocument !== 0`, the Document service SHALL invoke `PointService.add({ memberId: authorId, amount: pointPerDocument, reason: 'document.create', sourceType: 'DOCUMENT', sourceId: document.id, boardId })` within the same Prisma transaction that creates the Document row. (MASTER-PLAN-002 Section 5.8 line 325 EARS headline.)

**REQ-POINT-041 (Event-Driven)**: WHEN a member creates a comment via `commentRouter.create` AND `Board.pointPerComment !== 0`, the Comment service SHALL invoke `PointService.add({ memberId: authorId, amount: pointPerComment, reason: 'comment.create', sourceType: 'COMMENT', sourceId: comment.id, boardId })` within the same Prisma transaction.

**REQ-POINT-042 (Event-Driven)**: WHEN a member votes (up/down) on a document or comment via the Vote service AND the relevant `Board.pointPerVoteUp` / `pointPerVoteDown` is non-zero, the Vote service SHALL invoke `PointService.add` or `subtract` accordingly on the **content author** (not the voter — matching legacy Rhymix behavior), within the vote transaction. Note: voting on one's own content awards no points (caller-side guard).

**REQ-POINT-043 (Event-Driven)**: WHEN a member completes signup via `authRouter.signup` AND `sitePointConfig.signupBonus > 0`, the Auth service SHALL invoke `PointService.add({ memberId, amount: signupBonus, reason: 'signup.bonus', sourceType: 'SIGNUP', sourceId: memberId })` within the signup transaction (or immediately after, idempotent on retry via REQ-POINT-080).

**REQ-POINT-044 (Event-Driven)**: WHEN a Document is soft-deleted or hard-purged, the Point system SHALL NOT automatically reverse the `DOCUMENT` point entry. Historical Points are preserved as audit trail. The author's balance is not adjusted on content deletion. (Legacy parity: Rhymix does not auto-reverse on delete; admin uses `MANUAL` adjustment if needed.)

**REQ-POINT-045 (Unwanted)**: Cross-module callers SHALL NOT instantiate `PointService` outside their transaction context. The call MUST pass `tx` so that point row insert + balance update + originating row insert form a single atomic unit. Failing this constraint produces a balance-of-truth divergence that `recompute` later corrects, but the SPEC mandates the atomic path.

**REQ-POINT-046 (State-Driven)**: WHILE Phase 4 SPEC-ADDON-001 is not yet shipped, cross-module integration uses **direct service injection** (caller imports `PointService`, instantiates it inside the transaction). The integration layer is encapsulated in a thin helper `pointHooks` (`packages/point/src/hooks.ts`) that maps event types to the corresponding `add`/`subtract` calls. When SPEC-ADDON-001 ships, the helper becomes the addon subscriber.

**REQ-POINT-047 (Event-Driven)**: WHEN a Document/Comment service's transaction rolls back (e.g., due to a constraint violation downstream), the Point row insert SHALL also roll back. Verified by integration test (no orphan Point rows).

### 2.5 Clamping Policy 계층 (REQ-POINT-050 ~ 059)

**REQ-POINT-050 (State-Driven)**: WHILE `sitePointConfig.allowNegativeBalance === false` (default), the Point system SHALL clamp the new balance to a minimum of `0` when `PointService.subtract` would produce a negative balance. The recorded `Point.amount` reflects the **actual deducted amount** (the clamped delta), not the requested amount. (MASTER-PLAN-002 Section 5.8 line 327 EARS headline.)

**REQ-POINT-051 (State-Driven)**: WHILE `sitePointConfig.allowNegativeBalance === true`, the Point system SHALL permit negative balances (debt mode). The full requested amount is deducted regardless of current balance.

**REQ-POINT-052 (Event-Driven)**: WHEN `PointService.subtract` clamps a deduction (REQ-POINT-050), the system SHALL still create the `Point` row with `amount = -(actual_deducted)` (which may be 0 if balance was already 0). The `reason` field is appended with the suffix ` (clamped from ${requested})` for audit clarity.

**REQ-POINT-053 (State-Driven)**: WHILE `sitePointConfig.clampToZero === true` AND a subtract would result in zero deduction (balance already 0), the system SHALL create a `Point` row with `amount = 0` AND emit `point.changed` event with `delta = 0` — to preserve audit trail of attempted operations. (Alternative implementation may skip the row to reduce noise; choice is a Slice A decision.) **권고**: row 생성, 감사 무결성 우선.

**REQ-POINT-054 (Ubiquitous)**: The clamping behavior SHALL be testable: tests SHALL cover (a) sufficient balance subtract, (b) exact balance subtract, (c) over-subtract with clamp (balance ends at 0), (d) over-subtract with allow_negative (balance goes below 0), (e) attempted subtract on 0 balance with clamp (zero-row or no-row depending on REQ-POINT-053 resolution).

**REQ-POINT-055 (Ubiquitous)**: Site-level configuration (`sitePointConfig.clampToZero` and `sitePointConfig.allowNegativeBalance`) SHALL be mutually exclusive in semantics — if both are true, `allowNegativeBalance` wins (clamping is bypassed). The Zod schema MAY enforce this as a refinement.

### 2.6 Admin UI 계층 (REQ-POINT-060 ~ 069)

**REQ-POINT-060 (Ubiquitous)**: The system SHALL provide a minimal admin UI at `apps/web/app/admin/members/[id]/points/page.tsx` showing: (a) current `User.pointBalance`, (b) paginated `Point` history (most recent 50 with cursor "더 보기"), (c) a manual adjustment form (input: amount signed integer + reason text, button: "조정 적용") that invokes `PointService.add({ ..., sourceType: 'MANUAL' })` (or subtract for negative input).

**REQ-POINT-061 (Event-Driven)**: WHEN an administrator submits the manual adjustment form, the system SHALL invoke `PointService.add` or `subtract` with `sourceType = 'MANUAL'`, `reason = ${adminReason} (by admin:${adminId})`, `sourceId = null`. The action requires `actor.isAdmin === true`; non-admin requests return HTTP 403.

**REQ-POINT-062 (Ubiquitous)**: The system SHALL provide a site-level config UI at `apps/web/app/admin/site/points/page.tsx` to edit `sitePointConfig` (signupBonus, clampToZero, allowNegativeBalance, defaultLevel). Form is generated from `PointSiteConfigSchema` (Zod) using existing admin form infrastructure (from SPEC-ADMIN-001 settings/site shell).

**REQ-POINT-063 (Ubiquitous)**: The system SHALL provide a board-level config UI integrated into the existing board admin page (`apps/web/app/admin/boards/[id]/edit/page.tsx` — owned by SPEC-BOARD-CRUD-001) for `pointPerDocument`, `pointPerComment`, `pointPerVoteUp`, `pointPerVoteDown`, etc. **권고**: Phase 3 SPEC-POINT-001 ships only the schema columns + a "포인트 정책" section spec; the actual admin UI integration is handled inside SPEC-BOARD-CRUD-001 Slice extension. If SPEC-BOARD-CRUD-001 ships first, this SPEC adds the UI section.

**REQ-POINT-064 (Unwanted)**: The system SHALL NOT expose the manual adjustment form or the site-level config to non-admin users. RBAC check uses existing `Actor.isAdmin` from `packages/auth`.

**REQ-POINT-065 (Unwanted)**: The system SHALL NOT include bulk recompute / reset / apply admin tools in Phase 3. These are deferred to SPEC-ADMIN-EXTRAS-001 (Phase 5) where `recompute(memberId)` is exposed but not the iteration. The `PointService.recompute` API is available for programmatic use (testing, migration scripts).

### 2.7 Sign-up Bonus 계층 (REQ-POINT-070 ~ 079)

**REQ-POINT-070 (Event-Driven)**: WHEN a member completes signup (post email verification, status transitions to `UNAUTHED` → `MEMBER`) AND `sitePointConfig.signupBonus > 0`, the Auth service SHALL invoke `PointService.add({ memberId: newUserId, amount: signupBonus, reason: 'signup.bonus', sourceType: 'SIGNUP', sourceId: newUserId })` exactly once per member.

**REQ-POINT-071 (Event-Driven)**: WHEN signup retries (e.g., user re-submits the email verification link), the Point system SHALL NOT award duplicate `SIGNUP` bonuses. Idempotency is guaranteed by REQ-POINT-080 (`(sourceType='SIGNUP', sourceId=newUserId)` uniqueness constraint or lookup-before-insert).

**REQ-POINT-072 (State-Driven)**: WHILE `sitePointConfig.signupBonus === 0` (default), the Auth service SHALL skip the Point.add call entirely (no zero-row inserted per REQ-POINT-022).

**REQ-POINT-073 (Unwanted)**: The Sign-up bonus SHALL NOT be awarded retroactively to existing members when an administrator increases `signupBonus`. New members from that point forward only.

### 2.8 Idempotency 계층 (REQ-POINT-080 ~ 089)

**REQ-POINT-080 (Ubiquitous)**: The Point system SHALL guarantee idempotency for cross-module integration points (DOCUMENT, COMMENT, VOTE, SIGNUP) by enforcing a unique constraint on `(sourceType, sourceId)` for these source types **when sourceId is non-null**. The Prisma schema declares `@@unique([sourceType, sourceId])` with a partial index condition; if partial unique indexes are not supported by Prisma at write time, the alternative is `lookup-before-insert` inside the transaction.

**REQ-POINT-081 (Event-Driven)**: WHEN `PointService.add` is invoked with `(sourceType, sourceId)` that already exists in the `Point` table, the system SHALL:
  - option (a, default): silently skip the insert and return the current balance (true idempotency)
  - option (b): throw `PointDuplicateSourceError` (strict mode)
  
  Default is option (a). Strict mode is opt-in via `PointService.add({...}, { strict: true })`.

**REQ-POINT-082 (Ubiquitous)**: `MANUAL` and `SYSTEM` source types are exempt from the idempotency constraint (admin may legitimately add multiple manual adjustments with the same `sourceId = null`). The unique constraint applies only to source types with non-null `sourceId`.

**REQ-POINT-083 (Event-Driven)**: WHEN a Document is hard-deleted via `purgeDocument` (REQ-DOC-027), the existing Point row with `sourceType='DOCUMENT', sourceId=document.id` SHALL remain (REQ-POINT-044). However, a future re-creation of a Document with the same `id` (extremely unlikely under autoincrement but possible after `pg_dump` restore) would collide with idempotency. **권고**: accept this rare collision as a feature — historical audit beats theoretical re-use; if it occurs, admin issues a `MANUAL` correction.

### 2.9 Quality 계층 (REQ-POINT-090 ~ 099)

**REQ-POINT-090 (Ubiquitous)**: The Point system SHALL include the following test files:
  - `packages/point/src/service.test.ts`: add/subtract/getBalance/getHistory/clamping/idempotency (~10 tests)
  - `packages/point/src/recompute.test.ts`: idempotent recompute correctness (~2 tests)
  - `packages/point/src/hooks.test.ts`: cross-module hook helper unit tests (~3 tests)

**REQ-POINT-091 (Ubiquitous)**: Coverage for `packages/point/src/**` SHALL be at least 85% (statements + branches) per TRUST 5 Tested pillar.

**REQ-POINT-092 (Ubiquitous)**: Integration tests in `apps/web` SHALL verify cross-module behavior:
  - Document.create with `Board.pointPerDocument = 10` → author balance increases by 10 (~2 tests)
  - Comment.create with `Board.pointPerComment = 5` → author balance increases by 5 (~1 test)
  - Signup with `sitePointConfig.signupBonus = 100` → new member balance = 100 (~1 test)
  - Vote up on document with `Board.pointPerVoteUp = 1` → content author balance increases by 1 (~1 test)
  - Document transaction rollback → no orphan Point row (~1 test)

**REQ-POINT-093 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL report 0 errors across `packages/point`, `packages/document` (Slice B touchpoints), `packages/comment` (Slice B touchpoints), `packages/board` (Slice B columns), and `apps/web` (admin UI) after Slices A and B.

**REQ-POINT-094 (Ubiquitous)**: All new code SHALL respect `.moai/config/sections/language.yaml`: code comments in Korean (`code_comments: ko`), identifiers/strings/error codes in English. @MX tags SHALL use Korean descriptions per `mx-tag-protocol.md`. `reason` field values in `Point` rows use dot-separated English action codes (`'document.create'`, `'comment.create'`, `'signup.bonus'`, `'admin.manual'`) for machine-readability; UI presents localized labels via a lookup map.

**REQ-POINT-095 (Ubiquitous)**: `Total estimated test count` SHALL be ~15 (Slice A: ~10 service unit tests + ~2 recompute tests = ~12; Slice B: ~3 hook tests + ~6 integration tests in apps/web = ~9 from integration + admin UI smoke; net new unique tests ≈ 15 per MP-002 Section 5.8 estimate).

**REQ-POINT-096 (Unwanted)**: The Point system SHALL NOT introduce global mutable state. All `PointService` instances are constructed per-call or per-request; the only shared state is the database itself.

---

## 3. Slices (high-level)

본 SPEC은 2개 슬라이스로 분해된다. 상세 작업 항목은 `plan.md` 참조.

### Slice A: Point Service + Schema (Standalone Package)

**목표**: 신규 패키지 `packages/point/` 구축. Prisma `Point` 모델 + `PointSourceType` enum + `User.pointBalance` + `sitePointConfig` (ModuleConfig) 마이그레이션. `PointService` 클래스의 5개 public method 구현. 0 cross-module integration (Slice B에서).

**산출물**:
- `packages/db/prisma/migrations/{timestamp}_add_point_system/migration.sql`: 신규 `points` 테이블, `PointSourceType` enum, `users.point_balance` 컬럼 추가
- `packages/db/prisma/schema.prisma`: `Point` 모델 + `PointSourceType` enum + `User.pointBalance` 추가
- `packages/point/package.json` + `tsconfig.json` + `vitest.config.ts`
- `packages/point/src/service.ts`: `PointService` 클래스 (add, subtract, getBalance, getHistory, getLevel, recompute)
- `packages/point/src/errors.ts`: `PointInsufficientError`, `PointAmountInvalidError`, `PointMemberNotFoundError`, `PointDuplicateSourceError`
- `packages/point/src/schemas.ts`: `PointSiteConfigSchema` (Zod), `PointAddInputSchema`, `PointHistoryQuerySchema`
- `packages/point/src/config.ts`: `getSitePointConfig(prisma)`, `setSitePointConfig(prisma, config)` (ModuleConfig 백엔드)
- `packages/point/src/index.ts`: barrel export
- 테스트: `service.test.ts`, `recompute.test.ts`, `config.test.ts` (~12 tests)
- `pnpm test` 통과, `pnpm tsc --noEmit` 0 error

**EARS coverage**: REQ-POINT-001~009, REQ-POINT-010~016, REQ-POINT-020~030, REQ-POINT-050~055, REQ-POINT-080~083, REQ-POINT-090~096 (Slice A 부분)

### Slice B: Cross-Module Integration + Admin UI

**목표**: `Board` 모델에 6개 포인트 정책 컬럼 추가. document/comment/vote/signup 서비스의 트랜잭션 안에서 `PointService` 호출. 회원가입 보너스. admin UI 2개 페이지 (member points, site points config).

**산출물**:
- `packages/db/prisma/migrations/{timestamp}_add_board_point_columns/migration.sql`: `boards` 테이블에 6개 정수 컬럼 추가
- `packages/db/prisma/schema.prisma`: `Board` 모델 컬럼 추가 (additive)
- `packages/point/src/hooks.ts`: `pointHooks` 헬퍼 — `onDocumentCreated`, `onCommentCreated`, `onVoteCast`, `onMemberSignedUp`
- `packages/document/src/document.ts` 수정: `createDocument` 트랜잭션 안에 `pointHooks.onDocumentCreated(tx, ...)` 호출 (REQ-POINT-040)
- `packages/comment/src/comment.ts` 수정: `createComment`에 `pointHooks.onCommentCreated` (REQ-POINT-041)
- `packages/board/src/vote.ts` (이미 존재) 또는 `packages/document/src/vote.ts` 수정: `pointHooks.onVoteCast` (REQ-POINT-042)
- `packages/auth/src/signup.ts` 수정: signup 완료 트랜잭션 안에 `pointHooks.onMemberSignedUp` (REQ-POINT-043, REQ-POINT-070)
- `apps/web/app/admin/members/[id]/points/page.tsx`: 회원별 포인트 이력 + 수동 조정 UI (REQ-POINT-060)
- `apps/web/app/admin/site/points/page.tsx`: 사이트 포인트 정책 설정 UI (REQ-POINT-062)
- 테스트: `hooks.test.ts` (~3 tests), `apps/web` 통합 테스트 (~6 tests)
- `pnpm test` 통과, `pnpm tsc --noEmit` 0 error

**EARS coverage**: REQ-POINT-005, REQ-POINT-040~047, REQ-POINT-060~065, REQ-POINT-070~073, REQ-POINT-092~096

---

## 4. Acceptance Criteria (요약)

본 SPEC의 핵심 acceptance는 MASTER-PLAN-002 Section 5.8의 2개 headline을 충족한다. Given-When-Then 형식 핵심 6개:

1. **AC-POINT-A1 (Point Service Add/Balance, REQ-POINT-020, REQ-POINT-025)**:
   GIVEN `User(id=42, pointBalance=0)`가 존재하고, WHEN `service.add({ memberId: 42, amount: 100, reason: 'test', sourceType: 'MANUAL' })`를 호출, THEN (a) `Point` 행 1개 생성 (memberId=42, amount=100), (b) `service.getBalance(42) === 100`, (c) `User.pointBalance === 100`, (d) `point.changed` 이벤트가 발생한다.

2. **AC-POINT-A2 (Clamping, REQ-POINT-050, MASTER-PLAN line 327 headline)**:
   GIVEN `User(id=42, pointBalance=30)` + `sitePointConfig.clampToZero=true, allowNegativeBalance=false`, WHEN `service.subtract({ memberId: 42, amount: 50, reason: 'test', sourceType: 'MANUAL' })`를 호출, THEN (a) `Point` 행 생성 (amount=-30, reason="test (clamped from 50)"), (b) `getBalance(42) === 0`, (c) `pointBalance === 0`. WHEN `sitePointConfig.allowNegativeBalance=true`로 변경 후 동일 호출, THEN (a) `Point` 행 생성 (amount=-50), (b) `getBalance(42) === -20`.

3. **AC-POINT-B1 (Document.create → Point Award, REQ-POINT-040, MASTER-PLAN line 325 headline)**:
   GIVEN 인증된 member(id=42) + Board(`pointPerDocument=10`) + 회원 잔액 0, WHEN `documentRouter.create.mutation({ moduleInstanceId, title:'X', content:'Y', status:'PUBLIC' })`를 호출 (REQ-DOC-020), THEN (a) Document 1개 생성, (b) `Point(memberId=42, amount=10, sourceType='DOCUMENT', sourceId=document.id)` 행 생성, (c) `User(id=42).pointBalance === 10`, (d) 모두 단일 트랜잭션.

4. **AC-POINT-B2 (Document Transaction Rollback Atomicity, REQ-POINT-047)**:
   GIVEN Board(`pointPerDocument=10`) + Document.create가 downstream constraint violation으로 트랜잭션 롤백되는 시나리오 (test에서 `extraVars` 필수 키 누락으로 `ExtraVarsRequiredError` 강제), WHEN `documentRouter.create` 호출, THEN (a) HTTP 4xx 반환, (b) Document 행 없음, (c) Point 행 없음 (orphan 없음), (d) `User.pointBalance` 변동 없음.

5. **AC-POINT-B3 (Signup Bonus Idempotency, REQ-POINT-070, REQ-POINT-071, REQ-POINT-080)**:
   GIVEN `sitePointConfig.signupBonus=100`, WHEN 새 user(id=99) 가입 완료, THEN `Point(memberId=99, amount=100, sourceType='SIGNUP', sourceId=99)` 행 1개 + `User(id=99).pointBalance === 100`. WHEN 동일 user(id=99)에 대해 가입 후처리가 재실행 (e.g., 이메일 인증 링크 재클릭 시뮬레이션), THEN (a) Point 행은 여전히 1개 (중복 생성 없음), (b) 잔액 여전히 100.

6. **AC-POINT-B4 (Admin Manual Adjustment, REQ-POINT-060, REQ-POINT-061)**:
   GIVEN admin(`isAdmin=true`) + target member(id=42, pointBalance=50), WHEN admin이 `/admin/members/42/points`에서 amount=`-10`, reason=`"패널티"`로 폼 제출, THEN (a) `Point(memberId=42, amount=-10, sourceType='MANUAL', reason='패널티 (by admin:1)')` 행 생성, (b) `pointBalance === 40`, (c) 히스토리 페이지에서 해당 row가 최상단에 노출. WHEN non-admin user가 동일 폼 제출 시도, THEN HTTP 403.

상세 Given-When-Then scenarios + edge cases는 `plan.md` Section "Acceptance Gates per Slice" 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/point/`** 독립 패키지에 둔다 (MASTER-PLAN-002 Section 1 line 71 + Section 9.1-4 신규 패키지 5개 추가 결정). 패키지 의존성:
- 의존: `@rhymix-ts/core`(module registry, ModuleConfig 백엔드), `@rhymix-ts/db`(Prisma client type), `@rhymix-ts/auth`(Actor type), `zod`
- 비의존: `@rhymix-ts/document`, `@rhymix-ts/comment`, `@rhymix-ts/board` (역방향 의존 금지, REQ-POINT-011)
- 외부에서 의존됨: `@rhymix-ts/document`, `@rhymix-ts/comment`, `@rhymix-ts/board`, `@rhymix-ts/auth`, apps/web admin

### 5.2 이벤트 소싱 vs 단일 컬럼 (레거시 vs 신규)

레거시 `point` 테이블은 회원당 1행(`member_srl` PK, `point` int)으로 잔액만 저장 — 이력 없음. 신규는 **이벤트 소싱 + 캐시** 패턴:
- `Point` 테이블: 모든 변동 이력
- `User.pointBalance`: 캐시(O(1) 읽기)
- `recompute(memberId)`: 캐시 재계산

장점: 감사 추적, 디버깅 용이, `MANUAL` 조정 사유 보존, 분석(시간대별 적립/소비 패턴 등) 가능.
단점: 단일 컬럼보다 write 부하 증가(2 row touch per add). 그러나 cross-cutting domain이라 단일 컬럼은 audit trail 부재 — 운영상 위험.

### 5.3 트랜잭션 통합 패턴 (Direct Injection vs Event Bus)

MASTER-PLAN-002 Section 9.1-6: "board/document/comment는 point 이벤트를 emit하지만 직접 의존하지 않는다 (event-based 약결합)". 본 SPEC은 **두 가지 경로 동시 제공**:

(a) **Direct Injection (Phase 3 primary)**:
- `documentRouter.create`가 `pointHooks.onDocumentCreated(tx, { board, document })` 호출
- `pointHooks`는 `packages/point`에서 export
- document → point 직접 import (역방향 의존 금지 REQ-POINT-011 위반 아님; point가 document에 의존하지 않으므로 단방향)

(b) **Event Bus (Phase 4 migration target)**:
- SPEC-DOCUMENT-001 REQ-DOC-132의 이벤트 버스 stub 소비
- `packages/point/src/subscribers.ts`에 `document.created` 구독자 등록
- 그러나 트랜잭션 atomicity는 잃음 (event listener는 commit 후 실행) → "최종 일관성" 모드

Phase 3는 (a)를 채택 — atomicity가 우선. Phase 4 addon이 도착하면 (b) 옵션을 추가하되 (a)는 그대로 유지 (board가 critical path로 표시한 카운터 부여는 transactional, addon이 부여하는 보조 보너스는 eventual).

### 5.4 Idempotency 구현

REQ-POINT-080 — `(sourceType, sourceId)` 유니크. 두 가지 옵션:
- Prisma `@@unique([sourceType, sourceId])` — 단, `sourceId NULL` 행이 다수 허용되어야 함(MANUAL은 sourceId 없음). PostgreSQL UNIQUE constraint는 NULL을 distinct로 취급하므로 자연스럽게 작동.
- 하지만 NULL이 distinct이므로 SOURCE 타입 SIGNUP의 sourceId가 user.id (non-null) → 중복 시 충돌, 정상.
- `MANUAL` 행: sourceId=null → 다수 행 모두 unique 충돌 없음, 정상.

**선택**: 단순 `@@unique([sourceType, sourceId])` 사용. 별도 partial index 불필요.

**구현 행위**:
- `service.add`는 `tx.point.create` 호출
- unique violation(`P2002`)을 catch → option (a) silent skip + 현재 잔액 반환, option (b) `PointDuplicateSourceError` throw
- 기본은 (a). signup retry, document.create 재호출 시 안전.

### 5.5 RSC vs Client Component

- **Server-side**: PointService (서버 전용), tRPC `pointRouter` (`pointBalance`, `pointHistory`, `pointAdjust`), admin pages의 data fetch
- **Client-side**: admin manual adjustment form (form action), site config form
- 회원 본인이 자기 잔액을 보는 UI는 본 SPEC 범위 외 (회원 프로필 페이지에서 fetch — apps/web에서 자유 추가)

### 5.6 sitePointConfig 저장 위치 (ModuleConfig 재사용)

신규 테이블 만들지 않고 기존 `ModuleConfig`(SPEC-ADMIN-001) 재사용:
- `ModuleConfig.moduleCode = 'point'`
- `ModuleConfig.moduleInstanceId = NULL` → 사이트 전역
- `ModuleConfig.config: Json` → `PointSiteConfigSchema`로 직렬화/역직렬화

장점: 신규 마이그레이션 불필요, admin 인프라 재사용.
단점: JSON 컬럼 → 쿼리 단순 (사이트당 1행만 읽음, 부담 없음).

### 5.7 Cursor 포맷 (getHistory)

REQ-POINT-026 — `(createdAt: ISO string, id: number)` base64url. SPEC-DOCUMENT-001의 `encodeCursor`/`decodeCursor` 패턴 재사용 가능. 별도 구현 또는 shared util 후보.

### 5.8 보안 — admin RBAC 의존성

`apps/web/app/admin/**` 경로는 SPEC-ADMIN-001에서 이미 admin 미들웨어로 보호. 본 SPEC은 그 가정을 신뢰하고, `PointService.add` 자체는 RBAC을 강제하지 않음(서비스는 호출자 권한을 가정). admin UI form action에서 `actor.isAdmin` 검증 후 호출.

### 5.9 회원가입 보너스 idempotency (REQ-POINT-071)

문제: 이메일 인증 링크 재클릭 시 signup 후처리가 N번 호출될 가능성. 해결:
- (a) `@@unique([sourceType, sourceId])` — sourceId=newUserId, sourceType=SIGNUP → DB 레벨 보호
- (b) signup 코드에서 `point.findFirst({ sourceType: 'SIGNUP', sourceId: userId })` 선조회 후 분기

권고: 둘 다 적용. (a)는 race 방지, (b)는 unique violation catch의 발생 빈도 감소.

### 5.10 reason 필드 다국어

`reason` 컬럼은 **machine-readable code**(영어, dot-separated): `document.create`, `comment.create`, `signup.bonus`, `vote.up`, `vote.down`, `admin.manual`.

UI 표시 시 `apps/web/lib/point/reason-labels.ts`에서 한국어 매핑:
```typescript
// 예시 (TS 스니펫 — 실제 구현은 i18n.t())
const labels: Record<string, string> = {
  'document.create': '글 작성',
  'comment.create': '댓글 작성',
  'signup.bonus': '회원가입 보너스',
  'admin.manual': '관리자 수동 조정',
}
```

`MANUAL` reason은 admin이 입력한 자유 텍스트를 그대로 저장 (예: `"패널티 (by admin:1)"`).

---

## 6. Risks & Mitigations

상세는 `research.md` 참조. 핵심 7가지:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `User.pointBalance` 캐시와 `SUM(Point.amount)` 불일치 (트랜잭션 동시성 race) | 중간 | 높음 | 모든 add/subtract는 동일 row를 `UPDATE users SET point_balance = point_balance + $delta`로 atomic update. SELECT-THEN-UPDATE 금지. `PointService.recompute(memberId)` 주기적 또는 admin trigger로 보정 가능. |
| Document.create에서 PointService 호출 시 트랜잭션 외부에서 instantiate → atomicity 깨짐 | 중간 | 높음 | `pointHooks.onDocumentCreated(tx, ...)` 시그니처가 `tx` 필수. 정적 lint 또는 코드 리뷰로 강제. 통합 테스트(AC-POINT-B2)가 회귀 가드. |
| signup retry 시 중복 SIGNUP 부여 | 중간 | 중간 | `@@unique([sourceType, sourceId])` + signup 코드에서 lookup-before-insert. 통합 테스트(AC-POINT-B3) 보장. |
| `Board.pointPerDocument` 추가 컬럼이 기존 테스트 회귀 | 낮음 | 낮음 | additive nullable + default 0 → 기존 테스트는 모두 0으로 동작 (no-op per REQ-POINT-022). board fixture 갱신 불필요. |
| `Point.amount` Int32 overflow (10억 행 누적 시) | 낮음 | 낮음 | INT32 = ±21억. 현실적 상한 안전. 우려 시 admin recompute로 검증 가능. |
| event bus stub 미정의로 `point.changed` emit 실패 | 낮음 | 중간 | SPEC-DOCUMENT-001 REQ-DOC-132가 stub 출시 보장. 본 SPEC은 stub API 가정. fallback: 단순 EventEmitter 직접 사용. |
| MANUAL 조정 UI에서 amount=0 submit 시 row 생성 vs no-op 혼란 | 낮음 | 낮음 | REQ-POINT-022 명시: amount=0 → no-op. UI에서 amount=0 입력 시 폼 validation으로 차단. |
| document 트랜잭션 안에서 PointService import circular | 낮음 | 중간 | document → point 단방향만 허용. point는 document에 의존 금지(REQ-POINT-011). `madge --circular` Slice B 종료 게이트. |
| 레거시 PHP `point.point` 데이터 마이그레이션 (운영 데이터) | 낮음 | 중간 | 본 SPEC 범위 외 — 별도 SPEC에서 다룸. 현재 dev DB만 존재. 마이그레이션 시 `Point(sourceType='SYSTEM', amount=legacy_balance, reason='migration.v1')` 1개 row + recompute. |
| 다국어 reason 라벨 매핑 누락으로 UI 빈칸 | 낮음 | 낮음 | `apps/web/lib/point/reason-labels.ts`에 fallback `reason ?? code` 패턴. 통합 테스트가 admin UI에 표시되는 모든 reason을 검증. |

---

## 7. Open Questions

본 SPEC 작성 시점에 미해결인 4가지. 해결 없이 Slice A는 시작 가능 — 사용자가 `/moai run` 호출 전 결정 권장.

1. **Q1 — Clamping 기본값: zero vs allow-negative**:
   - 옵션 (a) **clamp_to_zero (default)** — 안전, 음수 잔액 없음
   - 옵션 (b) `allow_negative` — 외상/디버트 모드, 일부 사이트가 페널티 누적용으로 선호
   - **권고: 옵션 (a) clamp_to_zero**. 사이트 운영자가 명시적으로 enable하지 않는 한 음수 방지. 레거시 PHP 동작과도 일치(레거시는 자동 clamp).
   - 본 SPEC은 (a)를 default로 결정. Slice A에서 `sitePointConfig.clampToZero=true`로 기본 설정.

2. **Q2 — 레벨 시스템 범위: Phase 3 vs Phase 4 addon**:
   - 옵션 (a) Phase 3에서 `PointLevel` 모델 + threshold→name/icon 룩업까지 ship
   - 옵션 (b) **Phase 4 addon으로 미루기** — `getLevel` 은 stub 반환
   - **권고: 옵션 (b)**. 레거시 `addons/point_level_icon`은 addon 형태였고, level threshold는 사이트별 정책 변동성이 큼. Phase 4 SPEC-POINT-LEVEL-001 또는 SPEC-ADDON-001 산하 addon으로 처리.
   - 본 SPEC은 (b) 채택. `getLevel` API는 stub 1단계 고정 반환.

3. **Q3 — 게시판별 포인트 정책 저장 위치: Prisma column vs JSON config**:
   - 옵션 (a) **Prisma column** (`Board.pointPerDocument` 등 6개 INT 컬럼)
   - 옵션 (b) JSON config (`Board.permissions`와 비슷한 `Board.pointPolicy Json`)
   - **권고: 옵션 (a) Prisma column**. 이유: (i) 정형 컬럼이 admin UI 폼 자동 생성에 유리, (ii) SQL 분석/리포팅 용이 (`SUM(pointPerDocument)` 같은 집계), (iii) 마이그레이션 단순, (iv) 6개로 컬럼 수 적당 — JSON으로 압축할 필요 없음.
   - 본 SPEC은 (a) 채택. REQ-POINT-005 반영.

4. **Q4 — 포인트 트랜잭션 idempotency: silent skip vs strict error**:
   - 옵션 (a) **silent skip** (default) — `(sourceType, sourceId)` 중복 시 no-op + 현재 잔액 반환
   - 옵션 (b) strict error — 호출자가 명시적으로 처리
   - **권고: 옵션 (a) default + strict opt-in**. signup retry, document.create 재호출 시 호출자가 매번 try/catch하지 않도록 default를 silent로. admin은 strict로 명확한 오류 받기 가능.
   - 본 SPEC은 (a) 채택. REQ-POINT-081 반영.

위 4개는 본 SPEC 작성 시점에 권고안으로 결정되었으며, 사용자가 `/moai run` 시작 전 변경을 원하면 SPEC HISTORY를 업데이트한다.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **포인트 레벨 시스템 (PointLevel 모델, threshold → icon 매핑)** — Phase 4 addon SPEC-POINT-LEVEL-001 또는 SPEC-ADDON-001 산하. `getLevel` stub만 ship.
2. **포인트 레벨 아이콘 닉네임 옆 표시** — 레거시 `addons/point_level_icon` 영역, SPEC-ADDON-001 (Phase 4).
3. **외부 결제/충전** — `PointSourceType.PURCHASE` enum 값만 예약, 구현 없음.
4. **포인트 양도/송금** — 백로그. 별도 SPEC.
5. **일괄 재계산 / apply / reset 운영 도구** — `PointService.recompute` API만 export. CLI/admin 일괄 작업은 SPEC-ADMIN-EXTRAS-001 (Phase 5).
6. **알림 발송 (포인트 변동 시 회원에게 알림)** — 별도 SPEC (Phase 3 후속 또는 SPEC-NOTIFICATION-001).
7. **게시물 조회 시 포인트 차감 (view_document cost)** — 본 SPEC은 부여(add)에 집중. 차감 API는 존재하나 view path 통합은 Phase 4 옵션.
8. **추천/비추천 별도 포인트 정책 세분화** — `pointPerVoteUp` / `pointPerVoteDown`만 (찬성/반대 각 1개씩). 댓글 추천 vs 글 추천 등 모듈별 추가 세분화는 백로그.
9. **데이터 마이그레이션 (PHP `point.point` → TS Point stream)** — 별도 SPEC. 백로그.
10. **자동 만료 / 시한 포인트 (예: 6개월 후 소멸)** — 백로그. `Point.expiresAt` 컬럼 forward-compat 추가하지 않음 — 필요 시 별도 마이그레이션.
11. **추천인 보너스 시스템** — `PointSourceType.REFERRAL` enum만 예약, 구현 없음.
12. **회원 본인의 포인트 잔액 조회 UI** — apps/web에서 자유 추가 가능하나 본 SPEC 범위 외 (admin UI만).
13. **포인트 통계 대시보드 (사이트 전체 적립/소비량 추이)** — 별도 SPEC (Phase 5 운영 도구).
14. **다국어 reason 라벨 시스템 (i18n)** — apps/web의 `reason-labels.ts`에 단일 언어(ko) 매핑만. 풀 i18n은 SPEC-I18N-001.
15. **외부 API/Webhook (포인트 변동 외부 시스템 통보)** — 백로그.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC 범위를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~15 total (Slice A: ~12 unit/recompute/config tests, Slice B: ~3 hook unit tests + ~6 integration tests in apps/web ≈ 9, dedup new unique ≈ 15 per MP-002 target)
Estimated Slice Count: 2 (A: Point service + schema, B: cross-module integration + admin UI)
Dependencies (upstream): SPEC-AUTH-001 (Actor type, signup hook integration, argon2 dep 무관), SPEC-ADMIN-001 (ModuleConfig 백엔드, admin shell), SPEC-DOCUMENT-001 (document.create 트랜잭션 통합 + REQ-DOC-132 이벤트 버스 stub), SPEC-COMMENT-001 (comment.create 트랜잭션 통합)
Soft dependency: SPEC-BOARD-CRUD-001 (Board admin UI에서 pointPer* 필드 통합 — 별도 진행 가능)
Blocks (downstream): SPEC-ADDON-001 (addon hook system이 point.changed 이벤트 subscribe), SPEC-POINT-LEVEL-001 후속 (레벨 시스템), SPEC-FILE-001 (DOWNLOAD/FILE_UPLOAD sourceType 활성화)
