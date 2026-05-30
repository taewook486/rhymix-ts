---
id: SPEC-ADMIN-EXTRAS-001
title: Admin Extras — Export/Import + 잔여 ADMIN REQ 마감
version: 1.0.0
status: draft
created: 2026-05-30
updated: 2026-05-30
author: MoAI manager-spec
priority: P2
phase: 5
parent: MASTER-PLAN-002
absorbs: [SPEC-ADMIN-001 Slice H, SPEC-ADMIN-001 Slice I, REMEDIATION-PLAN-001 ADMIN Slice H, REMEDIATION-PLAN-001 ADMIN Slice I]
depends-on: [SPEC-ADMIN-001, SPEC-AUTH-001, SPEC-WIDGET-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001]
issue_number: TBD
related-research: SPEC-ADMIN-EXTRAS-001/research.md
language: ko
---

# SPEC-ADMIN-EXTRAS-001 — Admin 완결 (Phase 5 / P2)

## HISTORY

- 2026-05-30 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.12의 직접 흡수. SPEC-ADMIN-001의 Slice H(export/import)와 Slice I(잔여 REQ)를 흡수하여 ADMIN 도메인을 완결한다. 본 SPEC은 Phase 5 마감 SPEC으로, 이전 phase의 Site/Domain/ModuleInstance/Menu/Widget/Document/Comment가 모두 구현되어 있음을 전제한다. SPEC-ADMIN-001의 Slice G(위젯 registry/admin UI)는 이미 SPEC-WIDGET-001에 흡수되었고, 본 SPEC은 그 잔여 항목을 정리한다. REMEDIATION-PLAN-001의 ADMIN Slice H/I discussion을 본 SPEC이 supersede한다.

---

## 1. Goal & Audience

### 1.1 Goal

**Phase 5 P2 ADMIN 도메인을 완결한다.** 즉:

- 사이트 운영 데이터(메뉴 트리, 모듈 인스턴스, 콘텐츠 일부)를 JSON 번들로 export/import하여 스테이징↔운영 환경 간 동기화를 가능하게 한다.
- SPEC-ADMIN-001의 미구현 REQ(REQ-ADMIN-023 2FA 강제, REQ-ADMIN-031 cross-level DnD, REQ-ADMIN-043 WidgetInstance 프리셋 라이브러리, REQ-ADMIN-072 AdminLog IP 필터, REQ-ADMIN-090 모듈 일괄 작업 UI)를 마감하여 ADMIN-001의 acceptance criteria를 100% 달성한다.
- 관리자별 즐겨찾기(`AdminFavorite`)를 사이드바에 노출하여 자주 쓰는 admin 페이지에 빠르게 접근하도록 한다.
- 모든 신규 기능은 SPEC-ADMIN-001의 기존 가드(`requireAdmin`) + AdminLog 미들웨어를 거치며, 보안 검증을 우회하지 않는다.

### 1.2 Audience

- expert-backend agent — Slice A 백엔드 구현 (export/import 직렬화, dry-run, 트랜잭션 적용, 2FA 가드, IP/CIDR 필터)
- expert-frontend agent — Slice A/B 프론트 구현 (AdminFavorites UI, cross-level DnD, 일괄 작업 UI, 2FA enrollment 페이지, IP 필터 폼)
- 운영자 — 스테이징 환경에서 사이트 설정을 JSON으로 내보내고 운영 환경에서 가져오기를 dry-run으로 미리보기 후 적용하는 최종 검증자
- 시스템 관리자 — admin 그룹에 2FA enrollment 강제를 켰을 때 모든 관리자가 우회 없이 2FA를 등록·통과하는지 검증하는 최종 검증자

### 1.3 Non-Goals (본 SPEC 범위 외)

- ADMIN-001 Slice A~F(Site/Domain/Module/Menu 기반) — 이미 구현됨 (status: completed)
- ADMIN-001 Slice G(위젯 registry/admin UI) — SPEC-WIDGET-001로 흡수됨
- 회원 / 그룹 / 차단 목록 export/import — 본 SPEC은 운영 구조(메뉴/모듈/콘텐츠)만 다룬다. 회원 데이터는 PII 위험으로 별도 SPEC에서 정책 결정 후 다룸
- 자동 스케줄 export (cron-driven backup) — 백로그. 본 SPEC은 사용자 트리거 export만
- 시점 복원(point-in-time restore) / DB 백업 — DBA 책임 영역. 본 SPEC은 application-layer 번들만
- 2FA 백업 코드 관리 / recovery flow — SPEC-AUTH-001에서 정의된 2FA 모델을 재사용. 본 SPEC은 admin 그룹 enforcement gate만 추가
- SSO/OIDC 연동 — 백로그
- Admin UI 다국어(i18n) — SPEC-ADMIN-001 Open Question 3, 백로그
- 모듈별 콘텐츠 마이그레이션 도구(게시판→위키 변환 등) — 백로그
- 감사 로그 보존 정책 / 파티셔닝 — SPEC-ADMIN-001 Open Question 2, 백로그

자세한 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. REQ ID는 `REQ-ADMIN-EXTRAS-XXX`이며, SPEC-ADMIN-001의 REQ를 구현하는 항목은 본 SPEC의 REQ 본문에 `(SPEC-ADMIN-001 REQ-ADMIN-XXX 실현)` 형태로 명시한다.

### 2.1 Export 계층 (REQ-ADMIN-EXTRAS-001 ~ 014)

**REQ-ADMIN-EXTRAS-001 (Ubiquitous)**: The Admin Extras system SHALL provide a `tRPC` mutation `admin.export.create(input: ExportRequest)` that produces an `AdminExportBundle` JSON object containing the selected entities. (SPEC-ADMIN-001 REQ-ADMIN-091 실현)

**REQ-ADMIN-EXTRAS-002 (Ubiquitous)**: The `AdminExportBundle` SHALL include a top-level metadata block `{ exportFormatVersion: string, exportedAt: ISO8601, exportedBy: { actorId, nickname }, sourceSiteId: int, source: { rhymixTsVersion, dbSchemaVersion } }`. The `exportFormatVersion` SHALL be a semver string (`"1.0.0"` for the initial release) used by the importer to gate compatibility.

**REQ-ADMIN-EXTRAS-003 (Ubiquitous)**: The `ExportRequest` SHALL accept a selection object `{ menu: boolean, moduleInstances: boolean, documents: { include: boolean, mids?: string[] }, comments: { include: boolean, mids?: string[] }, siteSettings: boolean }` so the administrator selects exactly which entity classes to include. The default selection SHALL be `{ menu: true, moduleInstances: true, documents: { include: false }, comments: { include: false }, siteSettings: true }`.

**REQ-ADMIN-EXTRAS-004 (Event-Driven)**: WHEN the administrator clicks the export button in `apps/web/app/admin/settings/export` with a valid `ExportRequest`, the system SHALL build the bundle in a read-only Prisma transaction and SHALL stream it as a downloadable JSON file with `Content-Type: application/json` and `Content-Disposition: attachment; filename="rhymix-export-{siteId}-{YYYYMMDD-HHMMSS}.json"`. (MASTER-PLAN-002 acceptance headline 1 직접 실현)

**REQ-ADMIN-EXTRAS-005 (Ubiquitous)**: The exported menu tree SHALL include all `Menu` rows of the site plus all `MenuItem` rows under each menu, serialized as a recursive tree keyed by `menuId` with `items` arrays nested via `parentId`. `MenuItem` button state JSON (`normalBtn`, `hoverBtn`, `activeBtn`) SHALL be preserved verbatim.

**REQ-ADMIN-EXTRAS-006 (Ubiquitous)**: The exported `ModuleInstance` rows SHALL include each instance's core fields (`moduleCode`, `mid`, `name`, `browserTitle`, `layoutId`, `mobileLayoutId`, `skin`, `mobileSkin`, `menuId`, `isDefault`, `rssEnabled`) plus the associated `ModuleConfig.config` JSON blob. Referenced layout/menu IDs SHALL be replaced with stable export keys (`{ type: "layoutRef", name }`, `{ type: "menuRef", title }`) so the importer can resolve them in the target environment.

**REQ-ADMIN-EXTRAS-007 (Event-Driven)**: WHEN `documents.include` is `true` AND `documents.mids` is empty, the system SHALL export documents from every module instance whose `moduleCode === "board"`. WHEN `documents.mids` is non-empty, only documents from the listed `mid` values SHALL be included. Documents SHALL be serialized using SPEC-DOCUMENT-001 schema with author references replaced by `{ type: "userRef", email }`.

**REQ-ADMIN-EXTRAS-008 (Event-Driven)**: WHEN `comments.include` is `true`, the system SHALL export comments via the SPEC-COMMENT-001 schema, scoped by the same `mids` selection as documents. Comment parent/child relationships SHALL be preserved via export-local `commentRef` keys.

**REQ-ADMIN-EXTRAS-009 (Ubiquitous)**: Each exported entity SHALL carry an `exportKey` string unique within the bundle (e.g., `"menu:Main", "moduleInstance:notice"`) so the importer can detect conflicts without relying on numeric DB IDs from the source environment.

**REQ-ADMIN-EXTRAS-010 (Unwanted)**: The export bundle SHALL NOT include any sensitive material. Specifically: hashed passwords, session tokens, 2FA secrets, password reset tokens, API keys, SMTP credentials, OAuth client secrets, file binary contents, or `User.email` for non-author rows SHALL be omitted or redacted. File references SHALL include path/checksum only, not blob data.

**REQ-ADMIN-EXTRAS-011 (Ubiquitous)**: The export operation SHALL be recorded in `AdminLog` with `action="export.create"`, `target="site:{siteId}"`, and `diff={ selection, bundleSizeBytes, entityCounts }`. (SPEC-ADMIN-001 REQ-ADMIN-070 호환)

**REQ-ADMIN-EXTRAS-012 (Unwanted)**: The export route SHALL NOT be accessible to non-administrators. The route SHALL reuse the existing `protectedAdminProcedure` middleware from SPEC-ADMIN-001 §`admin.site` (auth + isAdmin + 2FA + audit). A non-admin session SHALL receive `UNAUTHORIZED`.

**REQ-ADMIN-EXTRAS-013 (State-Driven)**: WHILE an export bundle exceeds the configured size limit (`exportMaxBytes`, default 100 MiB), the system SHALL abort the export and SHALL respond with a structured error suggesting the administrator narrow the selection. The size SHALL be measured before streaming completes via a counting writer.

**REQ-ADMIN-EXTRAS-014 (Optional)**: WHERE the administrator opts in via `ExportRequest.minify: true`, the bundle SHALL be produced without whitespace. Default behavior SHALL be pretty-printed (indent 2) for human reviewability.

### 2.2 Import 계층 (REQ-ADMIN-EXTRAS-015 ~ 029)

**REQ-ADMIN-EXTRAS-015 (Ubiquitous)**: The Admin Extras system SHALL provide a `tRPC` mutation pair `admin.import.dryRun(bundle)` and `admin.import.apply(bundle, decisions)` so the administrator can preview impact before committing. (SPEC-ADMIN-001 REQ-ADMIN-092 실현)

**REQ-ADMIN-EXTRAS-016 (Ubiquitous)**: The Admin Extras system SHALL define a Zod schema `adminExportBundleSchema` covering every entity class shape and SHALL validate the uploaded bundle against this schema on both `dryRun` and `apply`. (SPEC-ADMIN-001 REQ-ADMIN-092 (a) 스키마 검증 실현)

**REQ-ADMIN-EXTRAS-017 (Event-Driven)**: WHEN the bundle's `exportFormatVersion` is incompatible with the importer's supported range, the system SHALL reject the bundle with a structured error specifying both the bundle version and the importer's supported version list. Compatibility SHALL follow semver MAJOR-match-only: importer `1.x` accepts bundle `1.*`, rejects `2.*` and `0.*`.

**REQ-ADMIN-EXTRAS-018 (Ubiquitous)**: The `dryRun` response SHALL contain `{ plan: ImportPlanEntry[], conflicts: ConflictReport[], summary: { create: int, update: int, skip: int, errors: int } }`. Each `ImportPlanEntry` SHALL include `exportKey`, `entityType`, `action: "create"|"update"|"skip"|"error"`, `targetId?: int`, and `diffPreview?: object`. (SPEC-ADMIN-001 REQ-ADMIN-092 (b)/(c) 실현)

**REQ-ADMIN-EXTRAS-019 (Event-Driven)**: WHEN `dryRun` detects a conflict (e.g., a `ModuleInstance` with the same `(siteId, mid)` already exists), the entry's `action` SHALL be `"update"` with a `diffPreview` showing field-level deltas, AND the importer SHALL include the conflict in `conflicts[]` so the UI can require explicit administrator decision before apply.

**REQ-ADMIN-EXTRAS-020 (Ubiquitous)**: The `apply` mutation SHALL accept an `ImportDecisions` object mapping each conflicting `exportKey` to one of `"overwrite" | "skipConflict" | "abort"`. WHEN any `exportKey` is missing a decision AND there is a conflict for it, `apply` SHALL refuse with a structured error before opening any transaction.

**REQ-ADMIN-EXTRAS-021 (Event-Driven)**: WHEN `apply` runs, the system SHALL wrap ALL writes in a single Prisma transaction. WHEN any single step throws, the entire transaction SHALL roll back so the DB returns to the pre-import state. (SPEC-ADMIN-001 REQ-ADMIN-093 부분 적용 금지 실현)

**REQ-ADMIN-EXTRAS-022 (Ubiquitous)**: The importer SHALL resolve `exportKey` references in declaration order: menus before module instances (module instances may reference `menuId`), module instances before documents, and parent comments before child comments. The resolver SHALL build a lookup map from `exportKey → targetId` as entities are upserted.

**REQ-ADMIN-EXTRAS-023 (Ubiquitous)**: For each upserted `ModuleInstance`, the system SHALL re-validate the `config` JSON against the module's `configSchema` (Zod) from the in-memory `ModuleDefinition` registry. WHEN the target environment does not register the module code present in the bundle, the importer SHALL mark that entity as `action: "error"` with reason `"unknown moduleCode"` in `dryRun`, AND `apply` SHALL refuse.

**REQ-ADMIN-EXTRAS-024 (Unwanted)**: The importer SHALL NOT execute arbitrary code from the bundle. The bundle is a pure data document. The importer SHALL NOT `eval`, dynamic `import()`, `Function()`, or treat any string field as executable. ModuleConfig values that look like code SHALL be stored as JSON only.

**REQ-ADMIN-EXTRAS-025 (Unwanted)**: The importer SHALL NOT cross-write into entity classes that are not declared in the bundle's `selection`. A bundle selecting only `menu: true` SHALL NOT modify module instances even if those fields were embedded.

**REQ-ADMIN-EXTRAS-026 (Ubiquitous)**: After a successful `apply`, the system SHALL record `AdminLog` entries with `action="import.apply"`, `target="site:{siteId}"`, and `diff={ summary, decisions, bundleHash }`. WHEN `apply` fails, the system SHALL record `action="import.failed"` with the failure reason.

**REQ-ADMIN-EXTRAS-027 (Unwanted)**: The import route SHALL NOT be accessible to non-administrators. The route SHALL reuse `protectedAdminProcedure` with the 2FA gate (REQ-ADMIN-EXTRAS-030 below) enforced.

**REQ-ADMIN-EXTRAS-028 (State-Driven)**: WHILE the uploaded file exceeds the configured size limit (`importMaxBytes`, default 100 MiB) OR the parsed bundle contains more than the configured entity ceiling (`importMaxEntities`, default 50,000), the system SHALL reject the upload before allocating the parse buffer.

**REQ-ADMIN-EXTRAS-029 (Ubiquitous)**: The importer SHALL invalidate all relevant cache tags after a successful `apply` (`module:*`, `menu:*`, `domain:*`) to ensure the next request reflects the imported state. (SPEC-ADMIN-001 REQ-ADMIN-061 호환)

### 2.3 AdminFavorites 계층 (REQ-ADMIN-EXTRAS-030 ~ 037)

**REQ-ADMIN-EXTRAS-030 (Ubiquitous)**: The Admin Extras system SHALL surface the per-administrator `AdminFavorite` list in the admin sidebar above the standard navigation, ordered by `listOrder` ascending. (SPEC-ADMIN-001 REQ-ADMIN-100 실현)

**REQ-ADMIN-EXTRAS-031 (Event-Driven)**: WHEN an administrator visits any `apps/web/app/admin/...` page, the system SHALL render an "Add to favorites" button in the page header that, when clicked, persists a `AdminFavorite` row with `label = document.title`, `href = current pathname`, and the next `listOrder`. (SPEC-ADMIN-001 REQ-ADMIN-101 실현)

**REQ-ADMIN-EXTRAS-032 (Event-Driven)**: WHEN the administrator removes a favorite from the sidebar, the system SHALL delete the corresponding `AdminFavorite` row and update the displayed order immediately. WHEN the administrator drag-reorders favorites, the system SHALL persist the new `listOrder` values in a single transaction.

**REQ-ADMIN-EXTRAS-033 (Ubiquitous)**: `AdminFavorite` rows SHALL be scoped per `memberId`. The sidebar SHALL only display rows owned by the current admin. The system SHALL NOT expose another admin's favorites to anyone other than the owner.

**REQ-ADMIN-EXTRAS-034 (Unwanted)**: The favorites system SHALL NOT accept arbitrary `href` values. The system SHALL validate `href` to begin with `/admin/` (path-only, no protocol, no host) before persisting. External URLs SHALL be rejected with a structured error.

**REQ-ADMIN-EXTRAS-035 (State-Driven)**: WHILE the favorites list for a member exceeds `favoriteMaxCount` (default 50), the system SHALL refuse to create new entries until the member removes some, AND SHALL display a clear message.

**REQ-ADMIN-EXTRAS-036 (Optional)**: WHERE the administrator selects an icon from a preset list (Lucide icon names), the favorite SHALL store the icon name in `AdminFavorite.icon` and the sidebar SHALL render it. Custom icon SVG upload SHALL NOT be supported.

**REQ-ADMIN-EXTRAS-037 (Event-Driven)**: WHEN an administrator clicks a favorite that points to a now-deleted resource (404), the system SHALL display the standard 404 page AND SHALL NOT silently delete the favorite. The administrator MUST decide to remove or keep the stale favorite.

### 2.4 2FA 강제 계층 (REQ-ADMIN-EXTRAS-040 ~ 047)

**REQ-ADMIN-EXTRAS-040 (Ubiquitous)**: The Admin Extras system SHALL read the site setting `requireAdminTwoFactor: boolean` (existing in SPEC-ADMIN-001 `Site.settings` JSON) AND SHALL expose a typed accessor `getSiteAdminTwoFactorPolicy(siteId)` returning the parsed boolean. (SPEC-ADMIN-001 REQ-ADMIN-023 실현 prerequisite)

**REQ-ADMIN-EXTRAS-041 (State-Driven)**: WHILE `requireAdminTwoFactor === true` AND the current session belongs to a member in the admin group AND the member has NOT enrolled a 2FA factor, the system SHALL redirect every `/admin/*` request to `/admin/2fa/enroll` (except `/admin/2fa/enroll` itself and `/admin/logout`). (MASTER-PLAN-002 acceptance headline 2 직접 실현)

**REQ-ADMIN-EXTRAS-042 (State-Driven)**: WHILE `requireAdminTwoFactor === true` AND the member has enrolled a 2FA factor AND the current session has NOT passed a 2FA challenge in this session lifetime, the system SHALL redirect every `/admin/*` request to `/admin/2fa/verify` (except `/admin/2fa/verify` and `/admin/logout`).

**REQ-ADMIN-EXTRAS-043 (Event-Driven)**: WHEN the administrator successfully verifies the 2FA challenge at `/admin/2fa/verify`, the system SHALL set a session-bound flag `session.adminTwoFactorVerified = true` AND SHALL redirect to the originally requested admin path.

**REQ-ADMIN-EXTRAS-044 (Ubiquitous)**: The 2FA enrollment flow at `/admin/2fa/enroll` SHALL support TOTP (RFC 6238) as the primary method, reusing the 2FA model and verification logic already defined in SPEC-AUTH-001. Backup codes SHALL be generated and displayed exactly once at enrollment time per SPEC-AUTH-001's existing flow.

**REQ-ADMIN-EXTRAS-045 (Unwanted)**: The system SHALL NOT permit any `/admin/*` route (including tRPC procedures, server actions, and API endpoints) to bypass the 2FA gate by direct URL access, header manipulation, cookie tampering, or method override. The gate SHALL be enforced at the `protectedAdminProcedure` middleware AND at the admin layout's `requireAdmin2FAIfEnabled` server-side check.

**REQ-ADMIN-EXTRAS-046 (Unwanted)**: The system SHALL NOT offer a "remember this device for N days" option for admin 2FA. Every new session SHALL re-challenge.

**REQ-ADMIN-EXTRAS-047 (Event-Driven)**: WHEN the site administrator toggles `requireAdminTwoFactor` from `false` to `true`, the system SHALL immediately invalidate the `adminTwoFactorVerified` flag of all live admin sessions so they are re-challenged on the next request.

### 2.5 메뉴 Cross-Level DnD 계층 (REQ-ADMIN-EXTRAS-050 ~ 055)

**REQ-ADMIN-EXTRAS-050 (Ubiquitous)**: The Admin Extras system SHALL extend the existing menu builder at `apps/web/app/admin/menu` to support drag-and-drop reordering across parent levels (e.g., moving an item from under parent A to under parent B). (SPEC-ADMIN-001 REQ-ADMIN-031 cross-level 실현)

**REQ-ADMIN-EXTRAS-051 (Event-Driven)**: WHEN an administrator drops a `MenuItem` onto a different parent slot, the system SHALL update both `parentId` AND `listOrder` in a single Prisma transaction along with sibling reindexing. The mutation SHALL be `admin.menu.items.reorder({ menuId, ops: ReorderOp[] })` where each op carries `{ itemId, newParentId, newListOrder }`.

**REQ-ADMIN-EXTRAS-052 (Unwanted)**: The system SHALL NOT permit moves that create a cycle (e.g., moving item A under one of A's descendants). The validator SHALL detect cycles in O(depth) before the transaction begins AND SHALL reject the move with a structured error.

**REQ-ADMIN-EXTRAS-053 (Ubiquitous)**: After a successful reorder, the system SHALL invalidate the menu cache tag `menu:{menuId}` AND SHALL record `AdminLog` with `action="menu.reorder"`, `target="menu:{menuId}"`, and `diff={ ops }`. (SPEC-ADMIN-001 REQ-ADMIN-061, REQ-ADMIN-070 호환)

**REQ-ADMIN-EXTRAS-054 (State-Driven)**: WHILE the tree depth after the move would exceed `menuMaxDepth` (default 6), the system SHALL reject the move with a clear message. The depth SHALL be checked from the moved item's deepest descendant after the proposed move.

**REQ-ADMIN-EXTRAS-055 (Event-Driven)**: WHEN the administrator cancels the drag mid-move (release outside any drop zone OR press Escape), the UI SHALL revert the optimistic update AND no mutation SHALL be sent to the server.

### 2.6 WidgetInstance Preset Library 계층 (REQ-ADMIN-EXTRAS-060 ~ 065)

**REQ-ADMIN-EXTRAS-060 (Ubiquitous)**: The Admin Extras system SHALL extend the existing `admin/widgets` page (from SPEC-WIDGET-001 Slice D) to allow saving the currently configured props of a widget as a named `WidgetInstance` preset. (SPEC-ADMIN-001 REQ-ADMIN-043 실현)

**REQ-ADMIN-EXTRAS-061 (Event-Driven)**: WHEN an administrator fills props in the widget code generator AND clicks "Save as preset", the system SHALL create a `WidgetInstance` row with `widgetName`, a user-supplied `label`, and the validated `props` JSON.

**REQ-ADMIN-EXTRAS-062 (Event-Driven)**: WHEN an administrator opens a saved preset, the system SHALL re-validate `props` against the current `propsSchema` of the widget definition. WHEN validation fails (the widget schema changed since the preset was saved), the system SHALL display a structured warning with the field-level diff AND SHALL allow the administrator to migrate or delete the preset, but SHALL NOT silently overwrite.

**REQ-ADMIN-EXTRAS-063 (Ubiquitous)**: The preset library SHALL list all `WidgetInstance` rows grouped by `widgetName` with `label`, `createdAt`, `updatedAt`, AND a `registered: boolean` flag indicating whether the widget definition is currently in the in-memory registry (per SPEC-WIDGET-001 REQ-WIDGET-009).

**REQ-ADMIN-EXTRAS-064 (Event-Driven)**: WHEN an administrator selects a preset, the generator form SHALL pre-fill with the preset's `props`, AND the generated `<rx-widget>` token string SHALL reflect those props identically to a fresh creation.

**REQ-ADMIN-EXTRAS-065 (Unwanted)**: The preset library SHALL NOT introduce a new Prisma model. The existing `WidgetInstance` model from SPEC-WIDGET-001 is reused unchanged.

### 2.7 AdminLog IP/CIDR 필터 계층 (REQ-ADMIN-EXTRAS-070 ~ 075)

**REQ-ADMIN-EXTRAS-070 (Ubiquitous)**: The Admin Extras system SHALL extend the existing `admin/logs` page (SPEC-ADMIN-001 Slice F) to accept an `ip` filter input that supports both a single IP address (IPv4 or IPv6) AND a CIDR range. (SPEC-ADMIN-001 REQ-ADMIN-072 IP 필터 실현)

**REQ-ADMIN-EXTRAS-071 (Event-Driven)**: WHEN the administrator submits the log filter form with `ip="192.168.1.1"`, the system SHALL return only `AdminLog` rows whose `ip === "192.168.1.1"` (exact match). WHEN the filter is `ip="192.168.1.0/24"`, the system SHALL return all rows whose `ip` falls within that CIDR block.

**REQ-ADMIN-EXTRAS-072 (Ubiquitous)**: CIDR matching SHALL support both IPv4 (e.g., `10.0.0.0/8`) and IPv6 (e.g., `2001:db8::/32`). The system SHALL use a vetted library (e.g., `ipaddr.js` or `ip-cidr`) chosen in `research.md` rather than custom regex.

**REQ-ADMIN-EXTRAS-073 (Event-Driven)**: WHEN the input is syntactically invalid (e.g., `192.168.1.300`, `not-an-ip/24`), the system SHALL return a structured 422 error with the parser's reason AND SHALL NOT execute the query.

**REQ-ADMIN-EXTRAS-074 (State-Driven)**: WHILE the result count for a given filter would exceed `logQueryMaxRows` (default 10,000), the system SHALL paginate AND SHALL NOT load all rows into memory. CIDR filtering SHALL be applied at the DB level via `inet` casting OR at the application level over a paginated stream — implementation chosen in `research.md`.

**REQ-ADMIN-EXTRAS-075 (Ubiquitous)**: The IP filter SHALL be combinable with the existing actor / action / target / time-range filters (REQ-ADMIN-072). The combined filter SHALL be the intersection of all individual filters.

### 2.8 모듈 일괄 작업 계층 (REQ-ADMIN-EXTRAS-080 ~ 086)

**REQ-ADMIN-EXTRAS-080 (Ubiquitous)**: The Admin Extras system SHALL extend `apps/web/app/admin/modules` to support bulk operations on selected `ModuleInstance` rows. (SPEC-ADMIN-001 REQ-ADMIN-090 모듈 일괄 작업 실현)

**REQ-ADMIN-EXTRAS-081 (Ubiquitous)**: The supported bulk actions SHALL be: `enable`, `disable`, `delete`. The action set SHALL NOT include `mid` rename or `moduleCode` change (these are per-instance critical operations that require single-row affordances).

**REQ-ADMIN-EXTRAS-082 (Event-Driven)**: WHEN the administrator selects N module instances AND triggers a bulk action, the system SHALL display a confirmation dialog listing the affected `mid` values AND the action. The dialog SHALL require explicit confirmation (button text matches the action verb) before proceeding.

**REQ-ADMIN-EXTRAS-083 (Event-Driven)**: WHEN the bulk action is `delete`, the system SHALL first check whether any selected instance is referenced as a domain's `indexModuleInstanceId`. WHEN any is, the entire bulk action SHALL be refused with a structured error listing those instances AND the domain IDs that reference them. (SPEC-ADMIN-001 REQ-ADMIN-006 호환)

**REQ-ADMIN-EXTRAS-084 (Ubiquitous)**: All bulk writes SHALL run inside a single Prisma transaction. WHEN any individual row fails the per-row check (e.g., `onUninstall` hook throws for one instance), the entire bulk action SHALL roll back. (SPEC-ADMIN-001 REQ-ADMIN-093 패턴 적용)

**REQ-ADMIN-EXTRAS-085 (Ubiquitous)**: The system SHALL record `AdminLog` with `action="module.bulk.{enable|disable|delete}"`, `target="site:{siteId}"`, and `diff={ instanceIds, mids, results }`.

**REQ-ADMIN-EXTRAS-086 (Unwanted)**: The bulk action UI SHALL NOT be accessible to non-administrators. The route SHALL reuse `protectedAdminProcedure` with the 2FA gate enforced.

### 2.9 Quality / Security 계층 (REQ-ADMIN-EXTRAS-090 ~ 095)

**REQ-ADMIN-EXTRAS-090 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-ADMIN-EXTRAS-091 (Ubiquitous)**: The export bundle serializer AND import deserializer SHALL have a round-trip test: `export(seed) → bundle → import(bundle, decisions={overwrite for all}) → final DB state === seed DB state` for menu, module, settings entities.

**REQ-ADMIN-EXTRAS-092 (Ubiquitous)**: The 2FA gate SHALL have integration tests covering all four states: (enrolled / not enrolled) × (verified in session / not verified) for admin sessions, AND a negative test confirming non-admin sessions are unaffected.

**REQ-ADMIN-EXTRAS-093 (Ubiquitous)**: The CIDR filter SHALL have unit tests covering: exact IPv4 match, exact IPv6 match, IPv4 /24, IPv4 /8, IPv6 /32, invalid syntax (422), no-match (empty result), boundary addresses.

**REQ-ADMIN-EXTRAS-094 (Ubiquitous)**: The menu cross-level DnD SHALL have a unit test for the cycle detector AND an integration test for a 3-level move (item from depth 2 to depth 0 under a different root).

**REQ-ADMIN-EXTRAS-095 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages. All new code SHALL respect the language settings: code comments in Korean, strings/identifiers in English.

---

## 3. Slices

본 SPEC은 2개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: Export/Import + AdminFavorites

종속성: SPEC-ADMIN-001 Slice A~F (Site/Domain/Module/Menu/AdminLog 모델 존재) 완료, SPEC-DOCUMENT-001 (선택적 export 대상), SPEC-COMMENT-001 (선택적 export 대상)

작업 항목:

1. `packages/admin/src/export/bundle-schema.ts` 신규:
   - `adminExportBundleSchema` Zod 정의 (메타 블록 + 엔터티별 schema)
   - `exportFormatVersion = "1.0.0"` 상수 + supported range
2. `packages/admin/src/export/serializer.ts` 신규:
   - 메뉴 트리 직렬화 (parentId 트리 → 중첩 배열)
   - ModuleInstance + ModuleConfig 직렬화 (`menuRef`, `layoutRef` 치환)
   - Document/Comment 직렬화 (선택적, SPEC-DOCUMENT/COMMENT의 schema 재사용)
   - 민감 정보 redaction (REQ-010)
3. `packages/admin/src/import/deserializer.ts` 신규:
   - 스키마 검증 → 버전 체크 → dryRun plan 생성
   - exportKey → targetId 리졸버 (선언 순서: menu → module → document → comment)
   - ModuleConfig 재검증 (in-memory registry의 configSchema)
4. `packages/admin/src/import/apply.ts` 신규:
   - 단일 Prisma transaction wrapping
   - `ImportDecisions` 적용 (overwrite / skipConflict / abort)
   - 실패 시 전체 롤백 + AdminLog 실패 기록
   - 성공 시 cache tag invalidation
5. `apps/web/app/admin/settings/export/page.tsx` 신규:
   - 선택 체크박스 폼 (menu/moduleInstances/documents/comments/siteSettings)
   - "Export" 버튼 → tRPC `admin.export.create` 호출 + JSON 다운로드
6. `apps/web/app/admin/settings/import/page.tsx` 신규:
   - 파일 업로드 → tRPC `admin.import.dryRun` → plan 미리보기
   - 충돌 항목별 decision 선택 UI → "Apply" 버튼 → tRPC `admin.import.apply`
7. `packages/admin/src/favorites/actions.ts` 신규:
   - `addFavorite`, `removeFavorite`, `reorderFavorites` server actions
   - `href` 검증 (`/admin/` prefix 강제)
   - 최대 개수 가드
8. `apps/web/app/admin/_components/AdminSidebar.tsx` 확장:
   - 즐겨찾기 섹션 추가 (사이드바 상단)
   - 페이지 헤더에 "Add to favorites" 버튼 + 드래그 reorder
9. tRPC 라우터:
   - `admin.export.create`, `admin.import.dryRun`, `admin.import.apply`
   - `admin.favorite.list/add/remove/reorder`
10. 단위/통합 테스트:
    - export round-trip (REQ-091) — 5+ tests
    - import dryRun conflict report — 5+ tests
    - import apply transaction rollback — 3+ tests
    - 민감 정보 redaction — 3+ tests
    - AdminFavorite CRUD + href 검증 — 5+ tests

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test packages/admin apps/web` 통과
- 운영자 시나리오: 스테이징에서 export → JSON 검수 → 운영에서 dryRun → conflict 결정 → apply 성공

EARS coverage: REQ-ADMIN-EXTRAS-001~029, REQ-ADMIN-EXTRAS-030~037, REQ-ADMIN-EXTRAS-090~091

### Slice B: 잔여 REQ (2FA + DnD + Preset + IP 필터 + 일괄 작업)

종속성: SPEC-AUTH-001 (2FA 모델), SPEC-WIDGET-001 (WidgetInstance + admin/widgets 페이지), SPEC-ADMIN-001 Slice F (admin/logs 페이지), Slice A의 AdminFavorite 사이드바와 병행 가능

작업 항목:

1. **2FA 강제 게이트** (`packages/admin/src/security/two-factor-gate.ts` 신규):
   - `getSiteAdminTwoFactorPolicy(siteId)` accessor
   - `requireAdmin2FAIfEnabled` 미들웨어 강화 (enroll redirect + verify redirect)
   - `session.adminTwoFactorVerified` 세션 플래그
   - 정책 토글 시 기존 verified 플래그 일괄 무효화 hook
2. **2FA enrollment / verify 페이지**:
   - `apps/web/app/admin/2fa/enroll/page.tsx`: SPEC-AUTH-001의 TOTP enrollment flow 재사용
   - `apps/web/app/admin/2fa/verify/page.tsx`: 6자리 코드 입력 폼
3. **메뉴 cross-level DnD** (`apps/web/app/admin/menu/page.tsx` 확장):
   - `@dnd-kit/core` 또는 동등 라이브러리 (research.md에서 결정)
   - 드래그 핸들 + 부모-자식 드롭 영역 분리
   - `admin.menu.items.reorder` ReorderOp 배치 mutation
   - 사이클 검출기 (move 시작 전 O(depth) 검증)
   - 깊이 제한 검사
4. **WidgetInstance preset library** (`apps/web/app/admin/widgets/page.tsx` 확장):
   - SPEC-WIDGET-001 Slice D의 제너레이터 폼에 "Save as preset" 추가
   - 프리셋 목록 (widgetName별 그룹) + 선택 시 폼 prefill
   - 프리셋 열기 시 propsSchema 재검증 + diff 경고
5. **AdminLog IP/CIDR 필터** (`apps/web/app/admin/logs/page.tsx` 확장):
   - 필터 폼에 `ip` 입력 추가 (단일 IP 또는 CIDR)
   - `packages/admin/src/logs/ip-filter.ts` 신규: 라이브러리 기반 CIDR 매칭
   - DB-level vs application-level 매칭 전략 (research.md에서 결정)
   - 422 invalid syntax 에러
6. **모듈 일괄 작업 UI** (`apps/web/app/admin/modules/page.tsx` 확장):
   - 다중 선택 체크박스 + 액션 바
   - 확인 다이얼로그 (영향받는 mid 목록 + 액션 동사)
   - `admin.module.bulk(action, instanceIds)` mutation
   - 트랜잭션 + 인덱스 모듈 가드 + 롤백
   - AdminLog 일괄 기록
7. 단위/통합 테스트:
   - 2FA gate 4 상태 매트릭스 (REQ-092) — 8+ tests
   - CIDR 필터 (REQ-093) — 8+ tests
   - 메뉴 cross-level DnD + 사이클 검출 (REQ-094) — 6+ tests
   - 모듈 일괄 작업 + 인덱스 가드 — 5+ tests
   - WidgetInstance 프리셋 schema diff — 3+ tests

검증:

- `pnpm tsc --noEmit` 0 error
- `pnpm test` 통과
- e2e 시나리오: `requireAdminTwoFactor=true` → 미enroll 관리자가 /admin 접속 → enroll 페이지로 리다이렉트 → TOTP 등록 → /admin 접근 가능

EARS coverage: REQ-ADMIN-EXTRAS-040~047, REQ-ADMIN-EXTRAS-050~055, REQ-ADMIN-EXTRAS-060~065, REQ-ADMIN-EXTRAS-070~075, REQ-ADMIN-EXTRAS-080~086, REQ-ADMIN-EXTRAS-092~095

---

## 4. Acceptance Criteria (요약)

본 SPEC의 acceptance는 별도 파일 `acceptance.md`에 Given-When-Then 형식으로 상세 기술된다. 핵심 6개:

1. **AC-EXTRAS-A1 (master plan headline 1)**: GIVEN 관리자가 admin/settings/export 페이지에서 selection = { menu: true, moduleInstances: true, siteSettings: true }로 export 버튼을 누름, WHEN tRPC `admin.export.create`가 호출되면, THEN HTTP 200 + `Content-Type: application/json` + `Content-Disposition: attachment` 헤더와 함께 메타 블록(exportFormatVersion="1.0.0") + menus/moduleInstances/siteSettings를 포함한 번들이 다운로드된다. AND `AdminLog`에 `action="export.create"` 레코드가 생성된다.

2. **AC-EXTRAS-A2 (round-trip)**: GIVEN 시드된 사이트(메뉴 3개, 모듈 인스턴스 5개, 사이트 설정 N개) + 관리자 export 실행, WHEN 빈 DB에 동일 번들을 dryRun → "create all" → apply, THEN final DB state의 menu/moduleInstance/setting 트리가 시드와 동일하다(외래키는 새 ID로 재배치, exportKey 관점에서 동일). 7번째 항목에서 강제 실패를 주입하면 1~6번째도 전부 롤백되어 빈 DB가 유지된다 (REQ-021).

3. **AC-EXTRAS-A3 (favorites)**: GIVEN 관리자 A가 `/admin/menu` 페이지에서 "Add to favorites" 버튼을 누름, WHEN 페이지를 새로고침하면, THEN 사이드바에 "메뉴 빌더" 즐겨찾기가 표시되고 클릭 시 `/admin/menu`로 이동한다. GIVEN 관리자 B가 동일 사이드바를 봄, THEN A의 즐겨찾기는 보이지 않는다 (REQ-033).

4. **AC-EXTRAS-B1 (master plan headline 2)**: GIVEN 사이트 설정 `requireAdminTwoFactor=true` + 관리자 X가 admin 그룹 소속 + 2FA 미enroll 상태, WHEN X가 `/admin/menu`에 접속, THEN 302 → `/admin/2fa/enroll`로 리다이렉트된다. AND TOTP 등록 완료 후 `/admin/menu`에 다시 접속 시 302 → `/admin/2fa/verify`로 리다이렉트되고, 코드 검증 통과 시 원래 요청 경로로 리다이렉트된다. AND 동일 시나리오에서 비관리자 Y는 영향받지 않는다 (REQ-045).

5. **AC-EXTRAS-B2 (CIDR 필터)**: GIVEN `AdminLog`에 ip=`10.0.0.5`, ip=`10.0.1.5`, ip=`192.168.1.5` 레코드가 있음, WHEN 관리자가 logs 페이지에서 `ip="10.0.0.0/24"`로 필터, THEN 결과는 `10.0.0.5` 1건만. WHEN `ip="10.0.0.0/16"`, THEN `10.0.0.5` + `10.0.1.5` 2건. WHEN `ip="not-an-ip/24"`, THEN 422 + 파서 오류 메시지.

6. **AC-EXTRAS-B3 (일괄 작업 + 인덱스 가드)**: GIVEN 도메인 D의 indexModuleInstanceId=인스턴스 X + 관리자가 admin/modules에서 [X, Y, Z]를 선택하고 "bulk delete"를 트리거, WHEN 확인 다이얼로그에서 "Delete"를 누르면, THEN 트랜잭션이 시작되기 전에 X가 인덱스 모듈임을 감지하고 전체 작업이 거부된다. X, Y, Z 모두 DB에 존재한다. AND 에러 메시지에 X와 도메인 D의 식별자가 포함된다 (REQ-083).

상세 Given-When-Then scenarios는 `acceptance.md` 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

- **순수 직렬화/검증/CIDR/2FA gate**: `packages/admin/src/` (신규 또는 기존 admin 패키지 확장)
  - `export/`, `import/`, `favorites/`, `security/`, `logs/ip-filter.ts`
  - 의존: Prisma client (인자로 주입), Zod, ipaddr.js (또는 동등). Next.js 의존 없음
- **admin UI 페이지**: `apps/web/app/admin/...`
  - `settings/export/`, `settings/import/`, `2fa/enroll/`, `2fa/verify/`, `widgets/` (확장), `menu/` (확장), `logs/` (확장), `modules/` (확장)
- **tRPC 라우터**: `apps/web/server/api/admin/`
  - `export.ts`, `import.ts`, `favorite.ts`, (기존) `menu.ts` (reorder 확장), (기존) `module.ts` (bulk 확장), (기존) `log.ts` (ip 필터 확장)

근거: SPEC-ADMIN-001의 admin 라우터 구조를 그대로 따르되, export/import는 사이드 이펙트가 큰 새 라우터로 분리한다. 순수 로직은 `packages/admin`에 두어 단위 테스트가 Next.js 런타임 없이 가능하도록 한다.

### 5.2 Export 직렬화 전략

- **트리 직렬화**: 메뉴는 parentId 트리 → 중첩 children 배열. parentId의 외래키 의미는 export 내부에서만 유의미하므로 `parentExportKey` 필드로 대체
- **외래키 추상화**: `ModuleInstance.menuId`/`layoutId` → `{ type: "menuRef", title }`, `{ type: "layoutRef", name }`. 운영 환경에서 동일 이름의 menu/layout이 없으면 dryRun이 conflict로 표시
- **메타 블록**: `exportFormatVersion`을 semver로 두고 MAJOR-match 만 import 가능. v2.0.0이 도입되면 v1 번들은 별도 마이그레이션 도구로 변환 후 import
- **민감 정보 redaction**: `User.passwordHash`, `Session.token`, `User.twoFactorSecret`, `OAuthAccount.clientSecret`, `Mail.smtpPassword`, `User.email`(작성자가 아닌 곳) 모두 직렬화 단에서 자르고 테스트로 검증

### 5.3 Import 트랜잭션 전략

- 전체를 단일 Prisma transaction(`prisma.$transaction(async tx => { ... })`)으로 감싸고, `Prisma.TransactionIsolationLevel.Serializable`로 운영
- 선언 순서: menus → moduleInstances → documents → comments (외래키 의존)
- `exportKey → targetId` lookup 맵은 트랜잭션 내 스코프 변수
- 어떤 단계든 throw하면 트랜잭션 자체가 롤백 → REQ-021/093 보장
- 대용량 import는 transaction timeout 위험이 있으므로 `importMaxEntities` ceiling으로 1차 가드

### 5.4 2FA 강제 흐름

```
session = current admin session
policy  = getSiteAdminTwoFactorPolicy(siteId)
if !policy.required: pass
if user not in admin group: pass
if !user.twoFactorEnrolled: redirect /admin/2fa/enroll
if !session.adminTwoFactorVerified: redirect /admin/2fa/verify
else: pass
```

- enforcement는 두 지점에서 동시에: `app/admin/layout.tsx`의 server-side check + `protectedAdminProcedure`의 tRPC 미들웨어
- 정책 토글 시 `session.adminTwoFactorVerified`를 일괄 무효화하는 hook을 site setting update path에 부착 (REQ-047)
- 2FA 모델/검증 자체는 SPEC-AUTH-001 재사용. 본 SPEC은 **enforcement gate**만 추가

### 5.5 CIDR 필터 라이브러리

후보:
- `ipaddr.js`: zero-dep, IPv4/IPv6 + CIDR + 검증. 표준
- `ip-cidr`: ipaddr.js wrapper, 직관적 API
- 자체 구현: 거부 (research §보안 검토)

선택 권고: `ipaddr.js` (research.md에서 확정). DB 레벨 vs 애플리케이션 레벨 매칭은 PostgreSQL의 `inet` 타입을 새로 도입하는 비용 vs 페이지네이션 스트림의 단순성 비교 → research.md에서 결정 (권고: 애플리케이션 레벨 + LIMIT 페이지네이션).

### 5.6 메뉴 cross-level DnD

- 라이브러리: `@dnd-kit/core` + `@dnd-kit/sortable` (research.md에서 후보 평가)
- 드롭 영역: 형제 (sibling reorder, parentId 유지) + 자식 (cross-level, parentId 변경)
- 사이클 검출: 이동 대상 itemId의 자손 트리를 미리 계산해 `newParentId`가 자손에 포함되지 않는지 O(depth) 검증
- 깊이 제한: 이동 후 가장 깊은 잎의 depth = (newParentId의 depth) + (이동 대상의 자체 subtree depth) <= menuMaxDepth
- 단일 트랜잭션 ReorderOp 배열로 처리 (sibling reindex 포함)

### 5.7 모듈 일괄 작업

- UI: 체크박스 + 액션 바 + 확인 다이얼로그
- 백엔드: `admin.module.bulk(action: "enable"|"disable"|"delete", instanceIds: int[])`
- 인덱스 모듈 가드: action="delete"일 때 트랜잭션 시작 전 `Domain.indexModuleInstanceId IN (instanceIds)` 검사 후 비어있지 않으면 거부
- 각 인스턴스의 `ModuleDefinition.onUninstall` 라이프사이클 훅을 트랜잭션 내에서 호출 (SPEC-ADMIN-001 REQ-ADMIN-005 호환)
- 일부 실패 시 전체 롤백 (REQ-084)

### 5.8 보안 위협 모델

| 위협 | 완화 |
|---|---|
| Import bundle 임의 코드 실행 | 번들은 순수 데이터. eval/dynamic import/Function 금지. ModuleConfig는 JSON으로만 저장. configSchema 검증 강제 (REQ-024) |
| Import 통한 권한 상승 | 회원/그룹/세션은 본 SPEC export/import 범위 외 (Non-Goals). 권한 모델 변경 불가 |
| 2FA 우회 | tRPC 미들웨어 + 레이아웃 server check 이중 가드. URL 직접 접근, header/cookie 변조, method override 모두 차단 (REQ-045) |
| AdminFavorite XSS | `href`는 `/admin/` prefix path만 허용 + 사이드바 렌더에서 String escape (REQ-034) |
| Export 민감 정보 누출 | redaction을 serializer 단에서 강제 + 단위 테스트로 검증 (REQ-010) |
| Import 대용량 DoS | `importMaxBytes` + `importMaxEntities` ceiling. 파싱 전 사이즈 검사 (REQ-028) |
| CIDR 파서 ReDoS | 라이브러리(`ipaddr.js`) 사용 강제. 자체 regex 금지 (REQ-072) |

---

## 6. Risks & Mitigations

상세는 research.md 참조 (구현 시 보강). 핵심 5가지:

| Risk | Mitigation |
|---|---|
| Export format 호환성 표류 | 메타 블록의 `exportFormatVersion`를 semver로 강제 + MAJOR-match 만 허용. v2 도입 시 별도 마이그레이션 도구 |
| Import transaction timeout (대용량 번들) | `importMaxEntities` 디폴트 50,000 + 파일 크기 100MiB. 초과 시 거부 |
| 2FA enforcement edge cases (정책 토글 시 라이브 세션) | `requireAdminTwoFactor` true 전환 시 모든 admin 세션의 verified 플래그 일괄 무효화 hook (REQ-047) |
| CIDR 매칭 성능 (대규모 AdminLog) | 페이지네이션 + 라이브러리 기반 매칭. DB inet 타입 도입 여부는 research.md에서 트레이드오프 분석 |
| 메뉴 사이클 (잘못된 DnD 클라이언트가 cycle 시도) | 서버 측 사이클 검출 (O(depth)) + 트랜잭션 거부. 클라이언트 검증은 UX 가드일 뿐 신뢰 경계 |
| WidgetInstance 프리셋 schema drift | 프리셋 열기 시 propsSchema 재검증 + diff 경고 표시 + admin 결정 강제 (REQ-062) |
| Import dryRun과 apply 사이의 시간 간격에서 상태 변화 | apply 시 dryRun의 plan을 재검증. 충돌이 변경되면 422 + 다시 dryRun 안내 |

---

## 7. Open Questions (None blocking)

본 SPEC 작성 시점에 미해결인 항목들. 해결 없이도 Slice A는 진행 가능.

1. **Export format schema versioning 전략**: `exportFormatVersion`을 semver MAJOR-match-only로 정의(현재 권고)하면 v1→v2 전환 시 별도 마이그레이션 도구가 필요하다. 대안은 forward-compat reader(미지의 필드 무시 + 누락 필드는 default). 권고: MAJOR-match + 별도 도구. 운영 자동화 비용 vs schema 진화 자유도 트레이드오프. (Slice A 작업 시 expert-backend가 research.md 검토 후 확정)

2. **2FA 방식 (TOTP only vs WebAuthn 추가)**: 본 SPEC은 TOTP만 명시(REQ-044)했다. WebAuthn(보안 키 또는 platform authenticator) 지원은 SPEC-AUTH-001의 2FA 모델 확장이 필요하다. 권고: Phase 5는 TOTP만, WebAuthn은 백로그. (Slice B 작업 시 user 확인. 보안 정책 결정)

3. **AdminFavorites scope (per-user vs role-based)**: 본 SPEC은 per-user (REQ-033)로 결정. role-based 공유 즐겨찾기(예: 운영팀 전체 표준 핀)는 백로그. 권고: per-user 유지. role-based는 데이터 모델 추가 변경 필요. (확정)

4. **CIDR 매칭 위치 (DB inet vs application-level)**: PostgreSQL `inet` 타입으로 마이그레이션하면 DB 인덱스 활용 가능하지만 기존 `ip String?` 컬럼을 변경해야 한다. 애플리케이션 레벨 ipaddr.js + 페이지네이션은 단순하지만 대용량(>100K) AdminLog에서 느리다. 권고: 초기 v1은 application-level + LIMIT 페이지네이션, 성능 문제 발생 시 SPEC-ADMIN-EXTRAS-002에서 inet 마이그레이션. (Slice B 작업 시 expert-backend가 prod 데이터 규모 보고 결정)

5. **메뉴 DnD 라이브러리**: `@dnd-kit` vs `react-dnd` vs `dnd-kit/sortable`만. 권고: `@dnd-kit/core + @dnd-kit/sortable` (TypeScript first, accessible, 활발한 유지보수). (Slice B 작업 시 expert-frontend가 확정)

6. **Import dryRun의 캐싱**: dryRun 결과를 sessionStorage에 저장하여 apply 단계에서 재사용할지, 매번 새로 계산할지. 권고: 매번 재계산 (시간 간격에 따른 상태 변화 가능성). (구현 detail)

위 6개 모두 SPEC 합의 사항이 아닌 구현 detail. 1, 2, 4는 user/operator 정책 결정이 필요할 수 있으며, 발견 즉시 user 확인 후 코드에 반영.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **회원/그룹/세션 export/import**: PII 위험과 권한 모델 변경 위험으로 본 SPEC은 운영 구조(메뉴/모듈/콘텐츠)만 다룬다. 회원 데이터 마이그레이션은 별도 SPEC에서 정책 결정 후.
2. **자동 스케줄 export (cron-driven backup)**: 본 SPEC은 사용자 트리거 export만. 정기 백업은 인프라/운영 책임 영역.
3. **시점 복원 (point-in-time restore) / DB 백업**: DBA 책임 영역. 본 SPEC은 application-layer 번들만.
4. **2FA 백업 코드 관리 / recovery flow**: SPEC-AUTH-001에서 정의된 2FA 모델을 재사용. 본 SPEC은 admin 그룹 enforcement gate만 추가. recovery (예: 백업 코드 분실 시 SMS) 는 백로그.
5. **WebAuthn / 하드웨어 보안 키**: Phase 5는 TOTP만. WebAuthn 지원은 SPEC-AUTH-001 확장이 선행되어야 함. (Open Question 2)
6. **"Remember this device" for admin 2FA**: REQ-046에서 명시적 금지. 모든 새 세션은 재검증.
7. **role-based AdminFavorites (공유 즐겨찾기)**: per-user 만 지원. role-based는 백로그. (Open Question 3)
8. **모듈 일괄 작업 — rename / moveCode**: REQ-081에서 제외. `mid` 변경과 `moduleCode` 변경은 per-instance critical 작업으로 단일 행 affordance가 필요.
9. **모듈 일괄 작업 — 다른 도메인으로 이동**: 사이트/도메인 간 모듈 이동은 데이터 무결성 위험. 백로그.
10. **외부 import 소스 (URL fetch, Git pull)**: 파일 업로드만. 외부 URL fetch는 SSRF 위험.
11. **Import 부분 적용 모드 (best-effort)**: REQ-093 패턴 강제. 전부 성공 또는 전체 롤백. "일부만 적용하고 나머지는 보고"는 미지원.
12. **SSO / OIDC 연동**: 백로그.
13. **Admin UI 다국어 (i18n)**: SPEC-ADMIN-001 Open Question 3, 본 SPEC도 미지원.
14. **감사 로그 보존 정책 / 파티셔닝**: SPEC-ADMIN-001 Open Question 2, 백로그.
15. **AdminLog CSV export**: SPEC-ADMIN-001 REQ-ADMIN-072의 CSV 부분은 본 SPEC에서 다루지 않는다 (IP 필터만). CSV는 별도 후속.
16. **모듈 일괄 작업의 batch undo**: 한 번에 100개를 삭제했을 때 "undo" 기능은 백로그. 운영자는 import 번들을 통해 복구.
17. **AdminFavorite 폴더/카테고리**: 단일 평면 목록만. 폴더 구조는 백로그.
18. **WidgetInstance preset 공유 (관리자 간)**: 본 SPEC의 preset은 사이트 전역 (memberId scope 없음, REQ-WIDGET 모델 그대로). 사용자별 preset은 백로그.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC range를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: 35+ (Slice A: 21+, Slice B: 14+)
Estimated Slice Count: 2 (A: Export/Import + AdminFavorites, B: 잔여 REQ — 2FA/DnD/Preset/IP 필터/일괄 작업)
Dependencies (upstream): SPEC-ADMIN-001 ✅ (completed), SPEC-AUTH-001 ✅, SPEC-WIDGET-001 (preset 확장 대상), SPEC-DOCUMENT-001 (선택적 export 대상), SPEC-COMMENT-001 (선택적 export 대상)
Blocks (downstream): 없음 (Phase 5 마감 SPEC). MASTER-PLAN-002 ADMIN 도메인 완결.
Master Plan Section: 5.12
Absorbs: SPEC-ADMIN-001 Slice H + I, REMEDIATION-PLAN-001 ADMIN Slice H + I
ADMIN-001 REQ 실현: REQ-ADMIN-023 (2FA), REQ-ADMIN-031 (cross-level DnD), REQ-ADMIN-043 (WidgetInstance preset), REQ-ADMIN-072 (IP 필터), REQ-ADMIN-090 (모듈 일괄 작업), REQ-ADMIN-091/092/093 (export/import), REQ-ADMIN-100/101 (AdminFavorites)
