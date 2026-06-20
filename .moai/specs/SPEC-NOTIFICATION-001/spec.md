---
id: SPEC-NOTIFICATION-001
title: 인앱 알림 센터 (Notification Center)
version: 1.0.0
status: in-progress
created_at: 2026-06-20
updated: 2026-06-20
author: MoAI manager-spec
priority: medium
phase: 7
parent: SPEC-MODULE-BACKLOG-001
depends-on: [SPEC-COMMENT-001, SPEC-DOCUMENT-001, SPEC-AUTH-001]
issue_number: 0
related-research: SPEC-NOTIFICATION-001/research.md
language: ko
labels: [notification, comment, mention]
---

# SPEC-NOTIFICATION-001 — 인앱 알림 센터 (Phase 7 / P2)

## HISTORY

- 2026-06-20 (v1.0.0): 최초 작성. SPEC-MODULE-BACKLOG-001(triage) §3.B가 KEEP으로 분류한 레거시 `ncenterlite` 모듈의 후속 구현 SPEC. triage REQ-MODBL-013("WHEN SPEC-NOTIFICATION-001 (ncenterlite, 가칭) is authored, it SHALL deliver an in-app notification center (notification creation on new comment/mention/message, list, mark-as-read, per-user notification preferences, unsubscribe), and IF private messaging exists THEN message-arrival SHALL be one of the notification triggers.")의 범위 경계를 입력 제약으로 사용. 쪽지(SPEC-MESSAGE-001)는 triage 시점 미존재(역시 KEEP/미착수)이므로 message-arrival은 하드 의존 없는 future-ready 훅으로만 설계한다. 레거시 `/mnt/d/project/rhymix/modules/ncenterlite/` 1차 소스(스키마 4종, `ncenterlite.controller.php`)를 직접 분석한 결과는 `research.md`에 기록되어 있으며, 그 Recommendations 절의 10개 미해결 설계 질문을 본 SPEC `## Implementation Notes`에서 best-judgment로 확정한다(SPEC-FEED-001의 Q1-Q5 패턴을 그대로 따름). status: draft — 구현 대기 신규 SPEC.
- 2026-06-20 (plan-audit iteration 2): REQ-NOTIF-026(SHALL/MAY 혼용 EARS 라벨 모호성, plan-auditor D5)을 numbered REQ 목록에서 제거하고 비구속 가이드라인(§5.2.1)으로 이동.
- 2026-06-20 (plan-audit iteration 3): frontmatter 결함 3건(labels 누락, created→created_at, priority enum) 수정 완료. plan-audit PASS(0.80). status: draft → approved.
- 2026-06-20 (run, Slice A): 2단계 팀 실행으로 구현 완료. Phase 1(backend-core): packages/db/prisma/schema.prisma에 Notification/NotificationPreference 모델+enum 추가, packages/notification 패키지 신설(point 패턴), packages/comment/src/service.ts 댓글 훅 연동. Phase 2(ui-dev+test-dev 병렬): (member)/notifications, (member)/settings/notifications 라우트, packages/ui NotificationBell + GlobalHeader 연동(작업 항목 6), packages/notification 단위테스트 29건. 전체 105 테스트 통과, tsc 0 errors, expert-security IDOR 독립 리뷰 PASS(CRITICAL/HIGH 0건, .moai/reports/plan-audit/SPEC-NOTIFICATION-001-security-review-1.md). Quality Gate §3 item 3(e2e, REQ-NOTIF-065)는 SPEC-ADMIN-EXTRAS-001 패턴과 동일하게 별도 후속 작업으로 deferred — Slice A 핵심 구현/단위테스트/보안검토는 완료.

---

## 1. Goal & Audience

### 1.1 Goal

**rhymix-ts 회원이 자신에게 영향을 주는 활동(댓글 작성, 멘션)에 대해 인앱 알림을 받고, 알림 목록을 확인하고, 읽음 처리하고, 알림 종류별로 수신 여부를 설정할 수 있다**를 달성한다. 즉:

- 자신의 게시글에 댓글이 달리면(또는 자신의 댓글에 답글이 달리면) 알림이 생성된다.
- (Slice 결정에 따라) 댓글 본문에서 `@nickname` 형태로 멘션되면 알림이 생성된다.
- 회원은 `(member)/notifications`에서 자신의 알림 목록을 최신순으로 확인하고, 개별/전체 읽음 처리를 할 수 있다.
- 회원은 `(member)/settings/notifications`에서 알림 카테고리별(댓글/답글/멘션/쪽지) 수신 여부를 켜고 끌 수 있다(구독 해제 포함).
- 쪽지(SPEC-MESSAGE-001)가 향후 구현되면, 쪽지 도착이 알림 트리거에 추가될 수 있도록 결합도가 낮은 훅 표면을 지금 마련해 둔다(SPEC-MESSAGE-001을 지금 import하지 않음).

### 1.2 Audience

- expert-backend agent — `packages/notification` 패키지(schemas/service/hooks/config/errors/index) + `notificationHooks` 트랜잭션 내 직접호출 구현
- expert-frontend agent — `(member)/notifications`(목록+읽음처리), `(member)/settings/notifications`(설정) 신규 라우트 + `NotificationBell` 드롭다운 컴포넌트
- expert-security agent — 알림 데이터의 회원 간 격리(타인 알림 조회/읽음처리 차단), 멘션 파싱 입력 검증 검토
- 운영자 — 사이트 전역 알림 정책(향후 확장 여지, 본 SPEC은 사이트 전역 설정 없음) 확인
- 회원 — 알림을 받고 목록에서 확인/읽음 처리/설정을 변경하는 최종 사용자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 실시간 푸시 전달(SSE/WebSocket/폴링) — rhymix-ts에 해당 인프라 전무(research.md §3). 다음 네비게이션/수동 새로고침만 지원.
- 메일/SMS/모바일 푸시 채널 — 메일은 SPEC-MAIL-001 소유, SMS/푸시는 인프라 부재로 영구 제외.
- 쪽지(SPEC-MESSAGE-001) 실제 구현 — 도메인 자체가 미존재. 본 SPEC은 future-hook 표면만 제공.
- 스크랩/투표 알림 — 레거시 ncenterlite의 일부였으나 REQ-MODBL-013 명시 범위(신규 댓글/멘션/쪽지) 밖.
- 관리자 커스텀 알림 타입(`ncenterlite_notify_type`) — 레거시 관리자 전용 확장 기능, 본 SPEC은 고정 카테고리 enum만 지원.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. REQ ID는 `REQ-NOTIF-NNN`. 5개 계층으로 그룹화.

### 2.1 알림 생성 계층 (REQ-NOTIF-001 ~ 019)

**REQ-NOTIF-001 (Ubiquitous)**: The Notification system SHALL persist notifications in a `Notification` model owned by a new `packages/notification` package, structurally following the `packages/point` reference shape (`schemas.ts` / `service.ts` / `hooks.ts` / `config.ts` / `errors.ts` / `index.ts`). (패키지 소유권 판단 근거는 Implementation Notes Q1.)

**REQ-NOTIF-002 (Event-Driven)**: WHEN a comment is created on a document via `createComment` (`packages/comment/src/service.ts`) AND the document's author is a registered member AND the comment author is not the document author, the Notification system SHALL create a `Notification` row with `recipientId = document.authorId`, `category = COMMENT`, `sourceType = COMMENT`, `sourceId = comment.id`.

**REQ-NOTIF-003 (Event-Driven)**: WHEN a reply comment is created (`parentId IS NOT NULL`) AND the parent comment's author is a registered member AND the reply author is not the parent comment author, the Notification system SHALL create a `Notification` row with `recipientId = parentComment.authorId`, `category = COMMENT_REPLY`, `sourceType = COMMENT`, `sourceId = comment.id`, in addition to (not instead of) REQ-NOTIF-002 when both apply to different recipients.

**REQ-NOTIF-004 (Unwanted)**: The Notification system SHALL NOT create a self-notification: IF the triggering actor's member id equals the would-be recipient's member id, THEN no `Notification` row SHALL be created for that pairing.

**REQ-NOTIF-005 (Event-Driven)**: WHEN `createComment` runs inside its `prisma.$transaction`, the Notification system SHALL be invoked via a direct in-transaction hook call (`notificationHooks.onCommentCreated(prisma, event, tx)`), mirroring the existing `pointHooks.onCommentCreated` call site at `packages/comment/src/service.ts:121`, so that notification creation is atomic with the comment write. (훅 결합 방식 판단 근거는 Implementation Notes Q2.)

**REQ-NOTIF-006 (Ubiquitous)**: The `Notification` model SHALL include a `sourceType` enum reserving a `MENTION` value for forward compatibility, regardless of whether mention parsing ships in this SPEC's first implemented slice. (멘션 범위 판단 근거는 Implementation Notes Q3.)

**REQ-NOTIF-007 (Optional)**: Where mention parsing is in scope for the implementing slice, WHEN a comment body contains one or more `@nickname` tokens matching existing registered members, the Notification system SHALL create one `Notification` row per resolved mentioned member with `category = MENTION`, `sourceType = MENTION`, `sourceId = comment.id`, excluding self-mentions (REQ-NOTIF-004) and excluding mentions that would duplicate a REQ-NOTIF-002/003 notification already created for the same recipient from the same comment (no double notification for the same comment+recipient pair).

**REQ-NOTIF-008 (Unwanted)**: The Notification system SHALL NOT create a notification for a recipient whose `NotificationPreference` for the relevant `category` has `enabled = false`. The preference check SHALL occur before the row insert, not as a post-filter at read time.

**REQ-NOTIF-009 (Ubiquitous)**: The Notification system SHALL expose a named-export future-hook, `notificationHooks.onMessageSent(prisma, event, tx?)`, with `category = MESSAGE` and `sourceType = MESSAGE`, that SPEC-MESSAGE-001 MAY call once private messaging exists. `packages/notification` SHALL NOT import any module from a `packages/message` package (which does not yet exist) — the dependency direction SHALL be message → notification only, never the reverse. (future-hook 설계 근거는 Implementation Notes Q2, Q9.)

**REQ-NOTIF-010 (Ubiquitous)**: Each `Notification` row SHALL store a denormalized `actorId` (nullable, the triggering member) and `actorNickname` (snapshot string) so that list rendering does not require a join back to a possibly-deleted member, mirroring the legacy `target_member_srl`/`target_nick_name` snapshot pattern (research.md §1).

### 2.2 목록 & 읽음 처리 계층 (REQ-NOTIF-020 ~ 029)

**REQ-NOTIF-020 (Ubiquitous)**: The Notification system SHALL provide a `listNotifications({ recipientId, cursor?, limit? }, { prisma })` service function returning notifications ordered newest-first (`createdAt DESC`), scoped strictly to `recipientId` matching the requesting member's own id.

**REQ-NOTIF-021 (Unwanted)**: The Notification system SHALL NOT allow a member to list, read, or mark-as-read another member's notifications. Every read/write operation SHALL verify `notification.recipientId === actor.memberId` and SHALL reject (not silently no-op) on mismatch.

**REQ-NOTIF-022 (Event-Driven)**: WHEN a member opens `(member)/notifications`, the system SHALL render the member's notifications newest-first with `read` state visually distinguished, each item linking to the source document/comment URL.

**REQ-NOTIF-023 (Event-Driven)**: WHEN a member marks a single notification as read (`markNotificationRead(notificationId, actor)`), the system SHALL set `read = true`, `readAt = now()` for that row only, scoped by REQ-NOTIF-021.

**REQ-NOTIF-024 (Event-Driven)**: WHEN a member triggers "mark all as read" (`markAllNotificationsRead(actor)`), the system SHALL set `read = true`, `readAt = now()` for all of that member's currently-unread notifications in a single update.

**REQ-NOTIF-025 (Ubiquitous)**: The system SHALL provide an unread-count query (`countUnreadNotifications(recipientId, { prisma })`) suitable for rendering a badge count, e.g. in a `NotificationBell` component.

**REQ-NOTIF-027 (Ubiquitous)**: Real-time delivery (no-reload notification appearance) SHALL NOT be implemented. Notification freshness SHALL rely on next-navigation Server Component re-render or manual client-side refetch only. (실시간 배제 판단 근거는 Implementation Notes Q4 and `## Exclusions`.)

### 2.3 사용자별 설정 & 구독 해제 계층 (REQ-NOTIF-030 ~ 049)

**REQ-NOTIF-030 (Ubiquitous)**: The Notification system SHALL persist per-member notification preferences in a `NotificationPreference` model with shape `{ id, memberId, category, enabled }` and constraint `@@unique([memberId, category])`, normalized (one row per member per category) rather than the legacy wide-column-per-category table (`ncenterlite_user_set`). (모델 형태 판단 근거는 Implementation Notes Q5.)

**REQ-NOTIF-031 (Ubiquitous)**: The `category` field on both `Notification` and `NotificationPreference` SHALL use a shared enum `NotificationCategory` with at minimum the values `COMMENT`, `COMMENT_REPLY`, `MENTION`, `MESSAGE` — `MENTION` and `MESSAGE` reserved per REQ-NOTIF-006/009 regardless of whether they are actively produced by this SPEC's implemented slice.

**REQ-NOTIF-032 (State-Driven)**: WHILE a member has no `NotificationPreference` row for a given category, the Notification system SHALL treat that category as `enabled = true` (opt-out model, matching legacy default-on behavior) — absence of a preference row SHALL NOT be treated as disabled.

**REQ-NOTIF-033 (Event-Driven)**: WHEN a member updates their preferences via `(member)/settings/notifications`, the system SHALL upsert one `NotificationPreference` row per category (`@@unique([memberId, category])` enables idempotent upsert) within a transaction.

**REQ-NOTIF-034 (Ubiquitous)**: Setting `NotificationPreference.enabled = false` for a category SHALL function as the unsubscribe mechanism for that category. The Notification system SHALL NOT implement a separate per-document/per-comment unsubscribe table (legacy `ncenterlite_unsubscribe`) — category-level opt-out is the supported granularity for this SPEC. (단위 결정 근거는 Implementation Notes Q5, `## Exclusions`.)

**REQ-NOTIF-035 (Unwanted)**: The Notification system SHALL NOT expose SMS/push/mail channel toggles in the preferences UI. Only the single in-app ("web") channel exists; channel-matrix settings (`use[type][method]` legacy pattern) are out of scope.

**REQ-NOTIF-036 (Ubiquitous)**: The `Document.notifyMessage` column (currently unused, `packages/db/prisma/schema.prisma:714`) SHALL be left untouched and SHALL NOT be repurposed by this SPEC. (처분 판단 근거는 Implementation Notes Q6.)

### 2.4 future-hook 표면 계층 (REQ-NOTIF-050 ~ 059)

**REQ-NOTIF-050 (Ubiquitous)**: `packages/notification` SHALL export `notificationHooks` as a plain object of named async functions (`onCommentCreated`, `onMentionDetected` (if Q3 in-scope), `onMessageSent`), each with signature `(prisma: PrismaClient, event: TEvent, tx?: Prisma.TransactionClient) => Promise<void>`, matching `packages/point/src/hooks.ts`'s `pointHooks` shape exactly.

**REQ-NOTIF-051 (Unwanted)**: `packages/notification` SHALL NOT import from, or declare a dependency on, any `packages/message` package. The coupling direction for message-arrival notifications SHALL be: a future `packages/message` calls `notificationHooks.onMessageSent(...)`, never the reverse.

**REQ-NOTIF-052 (Ubiquitous)**: WHERE a future SPEC-MESSAGE-001 implementation exists, that implementation SHALL be solely responsible for calling `notificationHooks.onMessageSent` at its message-creation write path; this SPEC SHALL NOT implement that call site since the call site does not yet exist (no `packages/message/src/service.ts` to modify).

**REQ-NOTIF-053 (Ubiquitous)**: `packages/comment/src/events.ts`'s existing event bus (currently only the `'deleted'` event type) SHALL NOT require a new `'created'` event type for this SPEC's hook design, because notification creation on comment-create uses the direct in-transaction call path (REQ-NOTIF-005), not the EventEmitter bus. (이벤트버스 갭 회피 판단 근거는 Implementation Notes Q2.)

### 2.5 품질 계층 (REQ-NOTIF-060 ~ 069)

**REQ-NOTIF-060 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-NOTIF-061 (Ubiquitous)**: There SHALL be at least one test asserting `notificationHooks.onCommentCreated` does not create a self-notification (REQ-NOTIF-004) and does not create a notification when the recipient's category preference is disabled (REQ-NOTIF-008).

**REQ-NOTIF-062 (Ubiquitous)**: There SHALL be at least one security/isolation test asserting that member A cannot list, read-count, or mark-as-read member B's notifications (REQ-NOTIF-021), and that the underlying query is scoped by `recipientId`, not by an unscoped table-wide fetch filtered client-side.

**REQ-NOTIF-063 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (`packages/notification`, `packages/comment`, `apps/web`).

**REQ-NOTIF-064 (Ubiquitous)**: All new code SHALL respect language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers/enum members in English.

**REQ-NOTIF-065 (Ubiquitous)**: There SHALL be at least one e2e test: seed a board, create a document by member A, have member B comment on it, navigate as member A to `(member)/notifications` → assert exactly one unread `COMMENT` notification referencing member B's comment is visible, mark it read, assert unread count becomes 0.

---

## 3. Slices

본 SPEC은 2개 슬라이스로 분해된다. Slice A가 REQ-MODBL-013의 필수 표현("new comment ... list, mark-as-read, ... preferences, unsubscribe")을 모두 충족하는 MVP이며, Slice B는 멘션 감지를 추가하는 확장이다. (분할 판단 근거는 Implementation Notes Q3.)

### Slice A: 알림 모델 + 댓글 알림 생성 + 목록/읽음처리 + 설정/구독해제 (MVP)

종속성: SPEC-COMMENT-001(`createComment` 트랜잭션 훅 위치), SPEC-DOCUMENT-001(문서 작성자 조회), SPEC-AUTH-001(회원 세션) 완료(모두 ✅).

작업 항목:

1. `Notification`/`NotificationPreference` 모델 추가 마이그레이션 + `NotificationCategory`/`NotificationSourceType` enum (`packages/db/prisma/schema.prisma`).
2. `packages/notification` 패키지 신설: `schemas.ts`(Zod) + `service.ts`(`NotificationService`: create/list/markRead/markAllRead/countUnread/upsertPreference) + `hooks.ts`(`notificationHooks.onCommentCreated`, `onMessageSent` future-hook) + `config.ts` + `errors.ts` + `index.ts`.
3. `packages/comment/src/service.ts:121` 인근에 `notificationHooks.onCommentCreated` 트랜잭션 내 호출 추가(REQ-NOTIF-002/003/004/005/008).
4. `(member)/notifications` 라우트(목록 + 개별/전체 읽음처리 서버 액션).
5. `(member)/settings/notifications` 라우트(카테고리별 on/off = 구독해제, REQ-NOTIF-033/034).
6. `NotificationBell` 컴포넌트(`packages/ui` 프리미티브 `dropdown-menu`+`badge`+`sonner` 조합) — 헤더에 미읽음 카운트 배지.
7. 단위 테스트: 자기-알림 배제, preference 게이트, recipient 격리, upsert idempotency.

검증: `pnpm test packages/notification` 통과 / `pnpm tsc --noEmit` 0 error / 댓글 작성 시 알림 생성 → 목록에 표시 → 읽음 처리 동작.

EARS coverage: REQ-NOTIF-001~006, 008~010, 020~025, 027, 030~036, 050~053, 060~064.

### Slice B: 멘션 감지

종속성: Slice A 완료.

작업 항목:

1. `@nickname` 정규식 추출 유틸(`packages/notification/src/mention.ts` 또는 `packages/comment` 내 — Technical Approach §5.1 참조) + 멤버 닉네임 해석.
2. 자기-멘션 제외 + 댓글 본문 기준 동일 수신자 중복 알림 억제(REQ-NOTIF-007).
3. `notificationHooks.onMentionDetected` 훅 추가, comment 생성 트랜잭션 내 호출.
4. 단위 테스트: 멘션 파싱 정확성(다중 멘션/존재하지 않는 닉네임/자기-멘션), REQ-NOTIF-002와의 중복 억제.
5. e2e 테스트(REQ-NOTIF-065 확장: 멘션 케이스).

검증: 댓글에 `@nickname` 포함 시 해당 회원에게 `MENTION` 카테고리 알림 생성 / 자기-멘션·중복 미생성 확인.

EARS coverage: REQ-NOTIF-007.

---

## 4. Acceptance Criteria (요약)

핵심 5개 (Given-When-Then):

1. **AC-NOTIF-A1**: GIVEN 회원 A가 작성한 문서, WHEN 회원 B가 그 문서에 댓글 작성, THEN 회원 A에게 `category=COMMENT` 알림 1건 생성 + `(member)/notifications`에서 미읽음으로 표시.
2. **AC-NOTIF-A2 (self-notification 배제)**: GIVEN 회원 A가 작성한 문서, WHEN 회원 A가 자기 문서에 직접 댓글 작성, THEN 알림 0건 생성.
3. **AC-NOTIF-A3 (preference 게이트)**: GIVEN 회원 A가 `COMMENT` 카테고리 preference를 `enabled=false`로 설정, WHEN 회원 B가 회원 A 문서에 댓글 작성, THEN 알림 0건 생성(REQ-NOTIF-008).
4. **AC-NOTIF-A4 (읽음 처리 + 격리)**: GIVEN 회원 A에게 미읽음 알림 2건, WHEN 회원 A가 "전체 읽음" 실행, THEN 두 건 모두 `read=true` + 미읽음 카운트 0 / WHEN 회원 B가 회원 A의 알림 id로 읽음 처리 시도, THEN 거부(403/Forbidden 등가).
5. **AC-NOTIF-B1 (멘션, Slice B)**: GIVEN 게시판에 닉네임 `bob`인 회원 존재, WHEN 다른 회원이 `@bob 확인해주세요`라는 댓글 작성, THEN `bob`에게 `category=MENTION` 알림 1건 생성, 자기 자신을 멘션한 부분은 무시.

상세 Given-When-Then은 `acceptance.md`에서 확장.

---

## 5. Technical Approach

### 5.1 패키지 위치 및 의존 방향

`packages/notification`을 신설한다(comment/document에 종속 폴딩 금지). `packages/point` 구조(schemas/service/hooks/config/errors/index)를 그대로 따른다. 의존 방향은 `comment`/`document` → `notification`(단방향)이며, `point`와 동일한 방향성을 유지해 기존 아키텍처 관례와 정합시킨다. `packages/notification`은 `packages/message`(미존재)를 import하지 않는다 — 결합은 미래의 message 패키지가 `notificationHooks.onMessageSent`를 호출하는 단방향으로 역전된다(research.md §1의 레거시 `triggerAfterSendMessage` 단방향 훅 결합과 동일 패턴).

### 5.2 훅 메커니즘: 트랜잭션 내 직접 호출

알림 생성(댓글/멘션)은 `pointHooks` 패턴을 그대로 따라 `prisma.$transaction` 내부에서 직접 호출한다(`packages/comment/src/service.ts:121`의 `pointHooks.onCommentCreated` 호출과 병렬 위치). 누락된 알림은 누락된 캐시 무효화보다 나쁜 실패 모드이므로(사용자가 인지조차 못함), fire-and-forget EventEmitter 버스(`commentEvents`/`documentEvents`)는 부적합하다. 이 결정에 따라 `packages/comment/src/events.ts`에 `created` 이벤트를 신규 추가할 필요가 없다(REQ-NOTIF-053) — 이벤트버스 갭이 본 SPEC의 차단요인이 되지 않는다.

쪽지 도착 future-hook만 예외적으로 named-export 함수 형태의 느슨결합을 유지한다 — `packages/message`가 아직 없으므로 지금 트랜잭션 호출 지점을 만들 수 없고, 만들 필요도 없다(REQ-NOTIF-052).

### 5.2.1 (비구속 가이드라인) 알림 클릭/열람 시 암묵적 읽음 처리

레거시 `triggerAfterModuleHandlerProc`는 사용자가 알림이 가리키는 문서/댓글을 열람하면 해당 알림을 암묵적으로 읽음 처리했다(research.md §1). 본 SPEC은 이를 **구속력 있는 SHALL 요구사항으로 채택하지 않는다** — MVP의 필수 읽음 처리 경로는 명시적 mark-as-read(REQ-NOTIF-023/024)이며, 암묵적 "열람 시 읽음"은 구현자가 선택적으로 추가할 수 있는 향상(enhancement)일 뿐이다. 구현 시 알림 항목 클릭이 곧 소스 URL 이동이므로, 그 네비게이션 핸들러에서 `markNotificationRead`를 함께 호출하면 자연스럽게 구현되나, 이는 numbered REQ가 아니므로 acceptance 게이트의 대상이 아니다. 향후 이 동작을 강제하려면 별도 REQ로 승격하고 대응 AC/EC를 추가해야 한다(현 시점 Open Question Q10 참조).

### 5.3 멘션 범위: Slice 분리로 해결

REQ-MODBL-013은 "new comment/mention"을 명시하므로 멘션이 완전히 범위 밖일 수는 없으나, `@nickname` 파싱 + 멤버 해석 + 자기-멘션 제외 + 중복 억제는 비자명한 신규 로직(레거시 포팅이 아니라 신규 구현, research.md §2 — rhymix-ts에 멘션 기능 0건)이다. 댓글 알림 + 목록 + 읽음처리 + 설정 + 구독해제(REQ-MODBL-013의 나머지 전부)를 Slice A(MVP)로 먼저 완결하고, 멘션 감지를 Slice B로 분리한다. `sourceType`/`category` enum에는 Slice A 시점부터 `MENTION` 값을 선반영(REQ-NOTIF-006/031)하여 Slice B 착수 시 마이그레이션 추가 없이 기능만 채울 수 있게 한다.

### 5.4 데이터 모델: 정규화된 사용자별 설정

`NotificationPreference`는 레거시의 와이드 컬럼 테이블(`ncenterlite_user_set`, 카테고리당 1컬럼)을 포팅하지 않고 `@@unique([memberId, category])` 정규화 테이블로 설계한다. `model Point`(schema.prisma:544, `[memberId, createdAt(sort: Desc)]` 인덱스)가 `Notification`의 직접 유사 선례이며, 카테고리 추가 시(예: 향후 `SCRAP`, `VOTE` 확장) 마이그레이션 없이 새 enum 값+row만 추가하면 된다.

### 5.5 회원용 UI: 그린필드, admin 패턴 재사용

`apps/web/app/(member)/`에는 현재 회원 본인용 설정 페이지가 전무하다(`documents`/`drafts`만 존재). `(member)/notifications`, `(member)/settings/notifications`는 신규 라우트이지만, `apps/web/app/admin/boards/[mid]/feed/page.tsx`(SPEC-FEED-001)의 Zod `.parse(... ?? {})` 기본값 → `<form action={serverAction}>` → `'use server'` → `prisma.$transaction` → `revalidateTag` 패턴을 그대로 재사용한다. 차이점은 인증 가드가 `session.user.isAdmin` 대신 `session.user.id === recipientId`(본인 데이터만) 스코핑이라는 것뿐이다.

**`apps/web/app/admin/settings/notification/page.tsx`와 명확히 구분**: 해당 페이지는 admin 전역 SMTP/이메일 발신 설정(SPEC-ADMIN-002 REQ-ADMIN2-110, 이미 완료)이며 본 SPEC의 회원용 인앱 알림 센터와 전혀 무관하다. 구현 단계에서 두 경로를 혼동하지 않도록 본 절에 명시한다.

### 5.6 UI 프리미티브

`packages/ui`의 `dropdown-menu`+`badge`+`sonner`(toast) 조합으로 신규 `NotificationBell` 컴포넌트를 작성한다. 전용 벨/패널 컴포넌트는 rhymix-ts에 전무하므로 그린필드 작성이다.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 알림 생성이 fire-and-forget로 구현되어 댓글은 저장되었으나 알림이 누락됨 | 트랜잭션 내 직접 훅 호출(REQ-NOTIF-005), `pointHooks`와 동일 패턴으로 원자성 보장. |
| 타 회원의 알림을 조회/읽음처리할 수 있는 권한 누락(IDOR) | 모든 read/write에서 `recipientId === actor.memberId` 검증 + 명시적 격리 테스트(REQ-NOTIF-062). |
| 멘션 파싱이 Slice A 범위로 잘못 흡수되어 MVP 지연 | Slice 분리(A=필수, B=멘션)로 명시. `sourceType`에 `MENTION` 선반영해 Slice B 착수 비용 최소화. |
| `packages/notification`이 미존재 `packages/message`를 import해 빌드 깨짐 | REQ-NOTIF-009/051에서 의존 방향을 명시적으로 금지. 코드 리뷰에서 import 그래프 검증. |
| `NotificationPreference` 부재를 "비활성"으로 잘못 해석해 알림이 전혀 발송되지 않음 | REQ-NOTIF-032에서 옵트아웃 모델(부재=활성)을 명시. 단위 테스트로 기본 동작 고정. |
| `(member)/` 회원 설정 라우트가 admin 가드 패턴을 잘못 복사해 인증 우회 발생 | admin feed 페이지의 `isAdmin` 체크를 `session.user.id === recipientId` 본인 스코핑으로 교체 — 패턴 재사용 시 가드 로직 자체는 다르다는 점을 §5.5에 명시. |

---

## 7. Open Questions

본 SPEC 작성 시점 미해결 항목. 모두 Implementation Notes에서 best-judgment로 잠정 확정(서브에이전트는 사용자 직접 질의 불가). `/moai run` 전 운영 확인 권장.

- **Q1. `packages/notification` 신설 vs comment/document 폴딩** — 잠정: **신규 패키지 신설**.
- **Q2. 훅 결합 방식(트랜잭션 직접호출 vs 이벤트버스)** — 잠정: **댓글/멘션=직접호출, 쪽지=future-hook named export**.
- **Q3. 멘션 감지 Slice A 포함 여부** — 잠정: **Slice B로 분리**(Slice A는 enum 선반영만).
- **Q4. 실시간 전달** — 잠정: **범위 밖**, 다음 네비게이션/수동 갱신만.
- **Q5. `NotificationPreference` 모델 형태** — 잠정: **정규화 `@@unique([memberId, category])`**.
- **Q6. `notifyMessage` 필드 처분** — 잠정: **손대지 않음**(미사용 유지).
- **Q7. 댓글 이벤트버스 `created` 이벤트 신규 필요 여부** — 잠정: **불필요**(직접호출 경로 채택으로 갭 회피).
- **Q8. admin SMTP 알림 설정과의 혼동 방지** — 잠정: **spec.md §5.5에 명시적 구분 기재**.
- **Q9. `packages/message` 의존 방향** — 잠정: **message → notification 단방향, 역방향 금지**.
- **Q10. 알림 클릭/열람 시 암묵적 읽음 처리** — 잠정: **비구속 가이드라인(§5.2.1)으로만 유지, numbered REQ 아님**.
- **Q11. 탈퇴/비활성 회원에게 알림 생성 시도(EC-3) 시 동작** — 잠정: **알림 생성을 건너뛰고 댓글 작성은 정상 진행**(단일 결정적 동작).

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **실시간 알림 푸시**(SSE/WebSocket/폴링) — rhymix-ts에 해당 인프라 전무(research.md §3). 다음 네비게이션/수동 새로고침만 지원. 영구 제외는 아니나 별도 인프라 SPEC 필요.
2. **SMS / 모바일 푸시 채널** — rhymix-ts에 대응 인프라 없음. REQ-MODBL-013에도 언급 없음. 영구 제외.
3. **메일 채널** — SPEC-MAIL-001 소유 영역. 본 SPEC은 알림 생성 시 메일 발송을 트리거하지 않는다(추후 SPEC-MAIL-001이 `notificationHooks`를 구독할 수 있도록 인터페이스만 열어둠 — 본 SPEC 범위 아님).
4. **스크랩 / 투표 알림** — 레거시 ncenterlite의 트리거였으나 REQ-MODBL-013 명시 범위(신규 댓글/멘션/쪽지) 밖. 백로그.
5. **관리자 정의 커스텀 알림 타입**(레거시 `ncenterlite_notify_type`) — 고정 enum(`NotificationCategory`)만 지원. 관리자 확장 UI는 빌드하지 않음.
6. **쪽지(SPEC-MESSAGE-001) 실제 구현** — 도메인 자체가 미존재. 본 SPEC은 `notificationHooks.onMessageSent` future-hook 표면만 제공하며, 쪽지 작성/발송/수신함 자체는 빌드하지 않는다.
7. **문서/댓글 단위 개별 구독해제**(레거시 `ncenterlite_unsubscribe`, "이 스레드만 끔") — 본 SPEC은 카테고리 레벨 구독해제(REQ-NOTIF-034)만 지원. 세분화된 단위 구독해제는 백로그.
8. **알림 읽음 시 자동 리다이렉트 전용 라우트**(레거시 `procNcenterliteRedirect`) — 회원은 알림 항목의 일반 링크를 클릭해 이동하며, 별도 리다이렉트 전용 엔드포인트는 만들지 않는다.

위 항목이 필요해질 경우 명시적으로 후속 SPEC에서 다루며 본 SPEC 범위를 확장하지 않는다.

---

## Implementation Notes

본 SPEC은 구현 SPEC(draft)이며, 서브에이전트인 manager-spec은 사용자에게 직접 질의할 수 없어 다음 설계 모호 지점을 best-judgment로 확정하고 근거를 명시한다. `/moai run` 전 운영자 검토 권장.

### Q1 판단 — 신규 `packages/notification` 패키지

**결정: comment/document에 폴딩하지 않고 신규 패키지를 신설한다.** 근거: (a) `packages/point`가 정확히 동일한 구조적 선례(schemas/service/hooks/config/errors/index)를 갖고 있고 comment/document/auth로부터 단방향으로 호출되는 cross-cutting 도메인이다 — notification도 동일한 cross-cutting 성격(댓글/멘션/쪽지 등 여러 소스 도메인이 공통으로 트리거)을 가진다, (b) comment 패키지에 폴딩하면 향후 document-mention이나 message-arrival 트리거를 추가할 때 comment가 부적절한 소유자가 된다, (c) 의존 방향(comment/document → notification)이 point와 동일하여 기존 아키텍처 관례에 정합한다. 대안(comment 패키지 내부 서브모듈)은 향후 멀티소스 확장 시 재추출 비용이 더 크다고 판단해 기각.

### Q2 판단 — 댓글/멘션=직접호출, 쪽지=future-hook named export

**결정: 댓글/멘션 알림 생성은 `prisma.$transaction` 내 직접 훅 호출(`pointHooks` 패턴), 쪽지 도착은 named-export future-hook(이벤트버스 아님).** 근거: 레거시 `_insertNotify`도 동기 쓰기였고(research.md §1), 알림 생성 실패가 사용자에게 보이지 않는 누락이 되는 것은 캐시 무효화 누락보다 심각한 실패 모드다 — fire-and-forget `commentEvents`/`documentEvents` 버스는 부적합. 반면 쪽지는 `packages/message`가 아직 존재하지 않으므로 트랜잭션 호출 지점 자체를 만들 수 없다 — `notificationHooks.onMessageSent`라는 이름이 고정된 함수를 미리 export해 두면, 향후 SPEC-MESSAGE-001이 자신의 트랜잭션 안에서 이 함수를 호출하기만 하면 되고, `packages/notification`은 `packages/message`를 전혀 알 필요가 없다(레거시 `triggerAfterSendMessage` 단방향 훅 결합과 동일 패턴, research.md §1).

### Q3 판단 — 멘션 감지는 Slice B로 분리

**결정: Slice A(MVP)는 댓글 알림 + 목록 + 읽음처리 + 설정/구독해제만 구현하고, 멘션 파싱은 Slice B로 분리한다. `sourceType`/`category` enum에는 Slice A부터 `MENTION` 값을 선반영한다.** 근거: REQ-MODBL-013 원문은 "new comment/mention"을 병기하므로 멘션이 완전히 범위 밖일 수는 없지만, `@nickname` 정규식 추출 + 멤버 해석 + 자기-멘션 제외 + 상한 처리는 레거시 포팅이 아닌 완전 신규 로직이다(research.md §2 — `grep -rln "mention"` 0건). MVP를 가능한 빨리 검증 가능한 단위로 쪼개는 것이 Enforce Simplicity 원칙에 부합하며, enum 선반영으로 Slice B 착수 시 스키마 마이그레이션 재작업이 불필요하다. 대안(멘션을 Slice A에 포함)은 단일 슬라이스의 작업량과 리스크를 불필요하게 키운다고 판단해 기각.

### Q4 판단 — 실시간 전달 범위 밖

**결정: SSE/WebSocket/폴링 기반 실시간 알림 전달은 빌드하지 않는다. 다음 네비게이션 시 Server Component 재렌더 또는 드롭다운 오픈 시 수동 재조회만 지원한다.** 근거: rhymix-ts에 `EventSource`/`WebSocket`/폴링 훅이 전무하다(research.md §3, 전체 검색 0건). 신규 실시간 인프라 도입은 본 SPEC의 핵심 가치(알림 생성/목록/읽음처리/설정)와 독립적인 별도 인프라 투자이며, REQ-MODBL-013도 실시간성을 명시하지 않는다.

### Q5 판단 — `NotificationPreference` 정규화 모델

**결정: 레거시의 와이드 컬럼 테이블을 포팅하지 않고 `@@unique([memberId, category])` 정규화 테이블로 설계하며, 문서/댓글 단위 개별 구독해제(레거시 `ncenterlite_unsubscribe`)는 빌드하지 않고 카테고리 레벨 구독해제만 지원한다.** 근거: `model Point`(schema.prisma:544)가 정확한 선례이며, schema.prisma에 현재 사용자별(per-user) 설정 모델이 전무해 `NotificationPreference`가 최초 사례가 된다 — 정규화 테이블은 향후 카테고리 추가 시 마이그레이션이 불필요하다. 문서/댓글 단위 구독해제는 "카테고리 전체를 끔" vs "이 스레드만 끔"이라는 별개의 세분화 축으로, REQ-MODBL-013이 요구하는 "per-user notification preferences, unsubscribe"는 카테고리 레벨로 충분히 해석 가능하다고 판단해 더 좁은 단위는 백로그로 미룬다(Enforce Simplicity).

### Q6 판단 — `notifyMessage` 필드는 손대지 않음

**결정: `Document.notifyMessage`(schema.prisma:714, 현재 완전 미사용)는 재활용하지 않고 그대로 둔다.** 근거: 레거시에 동일 이름의 컬럼이 없어 의미가 불명확하다(research.md §2 — 가장 가까운 추정은 XE의 "이 글 watch" 체크박스이나 확정할 근거 없음). 모호한 기존 필드를 새 의미로 재활용하면 향후 그 필드를 실제로 검토하는 다른 SPEC과 충돌할 위험이 있다. 재활용(option a)보다 변경 없음(option b)이 더 안전한 기본값이며, 본 SPEC의 알림 트리거(REQ-NOTIF-002/003/007)는 이 필드 없이도 완전히 정의 가능하다.

### Q7 판단 — 댓글 이벤트버스 `created` 이벤트 신규 불필요

**결정: `packages/comment/src/events.ts`에 `created` 이벤트 타입을 추가하지 않는다.** 근거: Q2에서 결정한 트랜잭션 내 직접 호출 경로(REQ-NOTIF-005)는 이벤트버스를 거치지 않으므로, "이벤트버스 방식을 택할 경우" 필요했던 선행 작업(research.md Recommendation #3)이 본 SPEC에는 적용되지 않는다. 이는 설계 결정의 부산물로 자동 해결되며 별도 작업 항목으로 잡지 않는다(REQ-NOTIF-053).

### Q8 판단 — admin SMTP 설정과의 혼동 방지를 spec.md에 명시

**결정: `apps/web/app/admin/settings/notification/page.tsx`(admin 전역 SMTP, SPEC-ADMIN-002 REQ-ADMIN2-110, 완료)와 본 SPEC의 회원용 인앱 알림 센터를 §5.5에서 명시적으로 구분 기재한다.** 근거: 두 경로의 이름(`notification`)이 겹쳐 구현 단계에서 잘못된 파일을 수정할 위험이 있다 — research.md에서도 명시적으로 경고한 지점이며, 문서화 외 별도 코드 변경은 필요 없다.

### Q9 판단 — `packages/message` 의존 방향 단방향 고정

**결정: `packages/notification`은 어떤 형태로도 `packages/message`를 import하지 않는다. 결합은 항상 message → notification 방향이다.** 근거: `packages/message`가 아직 존재하지 않는 상태에서 양방향 또는 역방향 의존을 설계하면 빌드가 깨지거나 순환 의존이 발생한다. 레거시 `communication` 모듈이 `ncenterlite`를 전혀 import하지 않고 범용 훅 버스를 통해서만 결합되었던 패턴(research.md §1)이 그대로 적용 가능한 선례다.

### Q10 판단 — 암묵적 "열람 시 읽음"은 비구속 가이드라인으로만 유지

**결정: 알림이 가리키는 문서/댓글 열람 시 자동 읽음 처리는 numbered REQ로 채택하지 않고, Technical Approach §5.2.1의 비구속 가이드라인으로만 남긴다.** 근거: 이 동작은 레거시 `triggerAfterModuleHandlerProc`에 존재했으나(research.md §1), MVP의 필수 읽음 처리 경로는 명시적 mark-as-read(REQ-NOTIF-023/024)로 이미 완전히 정의된다. 비강제(MAY) 문구를 가진 항목을 numbered SHALL 요구사항 목록에 두면 EARS 구속력과 acceptance 게이트의 경계가 모호해진다(plan-auditor D5 지적). 따라서 enhancement로 분리하고, 향후 강제가 필요하면 별도 REQ로 승격 + 대응 AC/EC 추가를 조건으로 한다.

### Q11 판단 — 탈퇴/비활성 회원 수신자에 대한 알림 생성은 건너뛴다

**결정: 트리거 시점에 수신자(문서 작성자/부모댓글 작성자/멘션 대상)가 이미 탈퇴(soft-delete)했거나 비활성 상태이면, 해당 수신자에 대한 `Notification` 행을 생성하지 않고 건너뛴다. 단, 이 건너뜀이 댓글 작성 트랜잭션 자체를 실패시키지 않는다(댓글 작성은 정상 완료).** 근거: acceptance.md EC-3이 "건너뛴다 OR 생성하되 조회 불가"의 미확정 OR-절로 남아 있던 것을 단일 결정적 동작으로 확정한다(plan-auditor D6 지적). 조회 불가능한 알림 행을 생성하는 대안(b)은 사용자가 결코 볼 수 없는 dead row를 누적시키고 미읽음 카운트 정합성을 해칠 위험이 있어 기각한다. 건너뛰기(a)는 REQ-NOTIF-005의 원자성 요건(알림 생성이 댓글 작성 가용성을 해치면 안 됨)과도 일관된다. 구현 시 수신자 존재/활성 여부 확인은 알림 행 insert 직전에 수행하며, 확인 실패는 예외가 아닌 정상적인 no-op 분기로 처리한다.

### 의존성 근거 요약

- **SPEC-COMMENT-001**: `createComment`의 `prisma.$transaction` 내부에 `notificationHooks.onCommentCreated` 호출 지점을 추가하는 대상 — `packages/comment/src/service.ts:121` (`pointHooks.onCommentCreated`와 병렬 위치).
- **SPEC-DOCUMENT-001**: 문서 작성자(`document.authorId`) 조회 — 댓글 알림의 1차 수신자 결정에 필요.
- **SPEC-AUTH-001**: 회원 세션(`session.user.id`) — `(member)/notifications`, `(member)/settings/notifications` 라우트의 본인 스코핑 가드에 필요.

---

Version: 1.0.0
Status: approved (구현 대기 — Slice A/B 미착수)
Estimated REQ Count: 40 (5개 계층: 알림생성 10, 목록/읽음처리 7, 설정/구독해제 7, future-hook 4, 품질 6 — 일부 그룹 내 번호 여유)
Estimated Slice Count: 2 (A: 모델+댓글알림+목록/읽음처리+설정/구독해제 MVP, B: 멘션감지)
Dependencies (upstream): SPEC-COMMENT-001 ✅, SPEC-DOCUMENT-001 ✅, SPEC-AUTH-001 ✅
Next Action: `/moai run SPEC-NOTIFICATION-001` (Slice A 우선) — SPEC-MODULE-BACKLOG-001 KEEP 잔여는 본 SPEC 작성으로 poll/쪽지/알림센터 중 알림센터 완료, 쪽지(SPEC-MESSAGE-001)만 잔여
