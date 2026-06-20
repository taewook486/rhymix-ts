# SPEC-NOTIFICATION-001 — Compact Reference

Auto-generated compact reference. REQ list + acceptance criteria + files-to-modify + exclusions only. See `spec.md` for full rationale and Implementation Notes.

## REQ List

### 알림 생성 (REQ-NOTIF-001~010)
- REQ-NOTIF-001: `packages/notification` 패키지 신설, `packages/point` 구조 추종.
- REQ-NOTIF-002: 댓글 생성 시 문서 작성자에게 `category=COMMENT` 알림 생성.
- REQ-NOTIF-003: 답글 생성 시 부모댓글 작성자에게 `category=COMMENT_REPLY` 알림 생성.
- REQ-NOTIF-004: 자기-알림 생성 금지(actor === recipient).
- REQ-NOTIF-005: `notificationHooks.onCommentCreated`를 `createComment` 트랜잭션 내 직접 호출.
- REQ-NOTIF-006: `sourceType` enum에 `MENTION` 값 선반영(Slice 무관).
- REQ-NOTIF-007: (Optional, Slice B) `@nickname` 멘션 파싱 → `category=MENTION` 알림, 자기-멘션/중복 배제.
- REQ-NOTIF-008: 수신자의 카테고리 preference가 `enabled=false`면 알림 미생성(삽입 전 게이트).
- REQ-NOTIF-009: `notificationHooks.onMessageSent` future-hook export, `packages/message` import 금지.
- REQ-NOTIF-010: `Notification`에 `actorId`/`actorNickname` 비정규화 스냅샷 저장.

### 목록/읽음처리 (REQ-NOTIF-020~027)
- REQ-NOTIF-020: `listNotifications({recipientId, cursor?, limit?})` newest-first.
- REQ-NOTIF-021: 모든 read/write는 `recipientId === actor.memberId` 검증, 불일치 시 거부.
- REQ-NOTIF-022: `(member)/notifications` 목록 렌더 + 읽음/미읽음 시각 구분.
- REQ-NOTIF-023: `markNotificationRead(id, actor)` 단건 읽음처리.
- REQ-NOTIF-024: `markAllNotificationsRead(actor)` 전체 읽음처리.
- REQ-NOTIF-025: `countUnreadNotifications(recipientId)` 배지용 쿼리.
- REQ-NOTIF-027: 실시간 전달 미구현(다음 네비게이션/수동 갱신만). (REQ-NOTIF-026은 비구속 가이드라인 §5.2.1로 이동 — plan-auditor D5)

### 설정/구독해제 (REQ-NOTIF-030~036)
- REQ-NOTIF-030: `NotificationPreference {id, memberId, category, enabled}`, `@@unique([memberId, category])`.
- REQ-NOTIF-031: `NotificationCategory` enum 공유(`COMMENT`/`COMMENT_REPLY`/`MENTION`/`MESSAGE`).
- REQ-NOTIF-032: preference 행 부재 = `enabled=true`(옵트아웃 모델).
- REQ-NOTIF-033: `(member)/settings/notifications`에서 카테고리별 upsert, 트랜잭션.
- REQ-NOTIF-034: 구독해제 = `enabled=false`(카테고리 레벨, 문서/댓글 단위 아님).
- REQ-NOTIF-035: SMS/푸시/메일 채널 토글 UI 미노출(web 채널만).
- REQ-NOTIF-036: `Document.notifyMessage` 필드 변경 금지(미사용 유지).

### future-hook 표면 (REQ-NOTIF-050~053)
- REQ-NOTIF-050: `notificationHooks` 객체, `pointHooks`와 동일 시그니처 `(prisma, event, tx?) => Promise<void>`.
- REQ-NOTIF-051: `packages/notification` → `packages/message` import 금지(역방향만 허용).
- REQ-NOTIF-052: 메시지 도착 호출 지점 구현은 본 SPEC 범위 아님(SPEC-MESSAGE-001 책임).
- REQ-NOTIF-053: `packages/comment/src/events.ts`에 `created` 이벤트 신규 추가 불필요.

### 품질 (REQ-NOTIF-060~065)
- REQ-NOTIF-060: Vitest 단위 테스트, 신규 코드 커버리지 80%+.
- REQ-NOTIF-061: 자기-알림 배제 + preference 게이트 테스트.
- REQ-NOTIF-062: recipient 격리(IDOR) 테스트.
- REQ-NOTIF-063: `pnpm tsc --noEmit` 0 errors(packages/notification, packages/comment, apps/web).
- REQ-NOTIF-064: 코드 주석 한국어, 식별자/enum 영어.
- REQ-NOTIF-065: e2e — 댓글 알림 생성 → 목록 표시 → 읽음처리 → 미읽음 카운트 0.

## Acceptance Criteria (요약)

- AC-NOTIF-A1: 댓글 작성 → 문서 작성자에게 COMMENT 알림 1건, 미읽음.
- AC-NOTIF-A2: 자기 문서에 자기 댓글 → 알림 0건.
- AC-NOTIF-A3: COMMENT preference disabled → 알림 0건, 댓글은 정상 생성.
- AC-NOTIF-A4: 전체 읽음 처리 → 미읽음 카운트 0 / 타인 알림 읽음 시도 → 거부.
- AC-NOTIF-B1 (Slice B): `@bob` 멘션 → bob에게 MENTION 알림 1건.
- AC-NOTIF-B2 (Slice B): 자기-멘션 → 알림 0건.

## Files to Modify / Create

- `packages/db/prisma/schema.prisma` — `Notification`, `NotificationPreference` 모델 + `NotificationCategory`, `NotificationSourceType` enum (additive)
- `packages/db/prisma/migrations/<timestamp>_spec_notification_001_model/` — 신규 마이그레이션
- `packages/notification/src/schemas.ts` — 신규
- `packages/notification/src/service.ts` — 신규
- `packages/notification/src/hooks.ts` — 신규 (`notificationHooks`)
- `packages/notification/src/config.ts` — 신규
- `packages/notification/src/errors.ts` — 신규
- `packages/notification/src/mention.ts` — 신규 (Slice B)
- `packages/notification/src/index.ts` — 신규 (barrel)
- `packages/comment/src/service.ts` — 수정 (line ~121 인근, `notificationHooks.onCommentCreated` 호출 추가)
- `apps/web/app/(member)/notifications/page.tsx` — 신규
- `apps/web/app/(member)/settings/notifications/page.tsx` — 신규
- `packages/ui/src/components/notification-bell.tsx` — 신규

## Exclusions

1. 실시간 알림 푸시(SSE/WebSocket/폴링) — 인프라 부재, 범위 밖.
2. SMS / 모바일 푸시 채널 — 인프라 부재, 영구 제외.
3. 메일 채널 — SPEC-MAIL-001 소유.
4. 스크랩 / 투표 알림 — REQ-MODBL-013 범위 밖.
5. 관리자 정의 커스텀 알림 타입 — 고정 enum만 지원.
6. 쪽지(SPEC-MESSAGE-001) 실제 구현 — future-hook 표면만 제공.
7. 문서/댓글 단위 개별 구독해제 — 카테고리 레벨만 지원.
8. 알림 읽음 시 자동 리다이렉트 전용 라우트 — 일반 링크 클릭으로 충분.

---

Source: `spec.md` v1.0.0 (status: draft)
