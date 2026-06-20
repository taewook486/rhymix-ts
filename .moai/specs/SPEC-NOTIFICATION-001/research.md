# SPEC-NOTIFICATION-001 Research

triage 출처: `.moai/specs/SPEC-MODULE-BACKLOG-001/spec.md` REQ-MODBL-013 (ncenterlite KEEP, P2).
범위 경계: 알림 생성(신규 댓글/멘션), 목록, 읽음 처리, 사용자별 알림 설정, 구독 해제. 쪽지(SPEC-MESSAGE-001)가 존재하면 쪽지 도착도 트리거 중 하나여야 하나, 현재 쪽지 도메인은 미존재(역시 KEEP/미착수) — future-ready 훅으로만 설계.

## 1. 레거시 참조 (`/mnt/d/project/rhymix/modules/ncenterlite/`)

**스키마 4종** (`modules/ncenterlite/schemas/`):
- `ncenterlite_notify.xml` — 알림 본체. `notify`(md5 id), `srl`/`target_srl`/`target_p_srl`(문서·댓글·부모댓글), `type`/`target_type`(1문자 이벤트코드), `notify_type`(커스텀 타입 srl), `member_srl`(수신자), `target_member_srl`/`target_nick_name`/`target_user_id`/`target_email_address`(발신자 스냅샷, 익명 시 음수 srl), `target_summary`/`target_body`/`target_url`, `data`(직렬화 longtext), `readed`(Y/N, 인덱스), `regdate`.
- `ncenterlite_notify_type.xml` — 관리자 정의 커스텀 알림 타입.
- `ncenterlite_unsubscribe.xml` — 문서/댓글 단위 개별 구독해제(`member_srl`, `target_srl`, `unsubscribe_type` enum document/comment, `text`).
- `ncenterlite_user_set.xml` — 사용자별 알림 설정. 1인당 1행, 카테고리별 콤마조인 제외목록 컬럼(`comment_notify`, `comment_comment_notify`, `mention_notify`, `vote_notify`, `scrap_notify`, `message_notify`), 각 값은 `!web,!mail` 형태로 비활성 채널 표시.

**트리거 표면** (`ncenterlite.controller.php`):
- `triggerAfterInsertDocument`(340) — 신규 문서 멘션 + 관리자 신규 콘텐츠 알림.
- `triggerAfterInsertComment`(405) — 가장 풍부한 트리거: 댓글 작성, 대댓글, 댓글 내 멘션, "이 문서의 모든 댓글 작성자" fan-out, 관리자 알림, 중복 알림 방지(`notify_member_srls` 배열로 멘션→댓글 중복 차단).
- `triggerAfterSendMessage`(631) — 쪽지 도착, `communication` 모듈의 `enable_message` 설정에 게이트. **레거시 메시지↔알림 결합 패턴**: communication 모듈은 ncenterlite를 전혀 알지 못함 — 결합은 전적으로 Rhymix의 범용 `triggerAfterXxx` 훅 버스를 ncenterlite가 구독하는 단방향 방식. 이는 본 SPEC에서 "쪽지 도착"을 미래 대비 훅으로(하드 의존 없이) 설계하는 근거가 된다.
- `triggerAfterScrap`(676), `triggerAfterDocumentVotedUpdate/Cancel`(717/758), `triggerAfterCommentVotedCount/Cancel`(795/839) — 스크랩/투표 알림(REQ-MODBL-013 범위 밖, 참고용).
- `triggerAfterDeleteMember/Document/Comment`, `triggerAfterMoveToTrashComment` — notify row cascade cleanup.
- `triggerAfterModuleHandlerProc`/`triggerAfterGetComments`(976/1047) — 알림이 가리키는 문서/댓글/쪽지를 사용자가 열람하면 암묵적 읽음 처리(URL 리다이렉트 읽음 + 페이지뷰 읽음).
- `triggerBeforeDisplay`(1072) — 로그인 사용자 모든 페이지에 알림 드롭다운 위젯 렌더(팝업/admin/non-HTML 제외), `getMyNotifyList` 사용, 사용자별 플래그파일/캐시(`Cache::set('ncenterlite:notify_list:{member_srl}')`)로 "신규 알림" 배지, `removeFlagFile`로 무효화.
- `_getMentionTarget`(1532) — `@username`/`@nickname` 정규식 추출(`/(?:^|\s)@([^\pC\pM\pP\pS\pZ]+)/u`), 설정에 따라 닉네임/유저ID로 member_srl 해석, 멘션명 접미사 설정 가능, `mention_limit` 상한, 자기-멘션 제외.
- `_insertNotify`(1381) — 중앙 쓰기 경로: 익명/발신자 스냅샷 해석, 사용자별 web 채널 옵트아웃 시 즉시 `readed='Y'`로 삽입(스킵이 아님), 사이트설정+사용자설정 둘 다 게이트해 `sendPushMessage`/`sendSmsMessage`/`sendMailMessage` 사이드채널 발송.
- `procNcenterliteUserConfig`(66) — 사용자별 설정 갱신, `use[type][method]` 매트릭스(타입×채널)로 `ncenterlite_user_set` row 작성.
- `procNcenterliteInsertUnsubscribe`(155) — 문서/댓글 단위 차단 토글(카테고리 레벨 설정과 별개 — "이 스레드의 답글만 그만 알림" vs "댓글 알림 자체를 끔").
- `procNcenterliteNotifyReadAll`(1293), `updateNotifyRead`/`updateNotifyReadByTargetSrl`/`updateNotifyReadAll`(1258-1291) — 읽음 처리 변형(단건/타겟별/전체).
- `procNcenterliteRedirect`(1305) — 클릭 시: 읽음 처리 후 `target_url`로 302 리다이렉트.

**채널**: 레거시는 카테고리별 4채널(web/mail/sms/push). 본 SPEC의 "인앱 알림 센터"는 **web 채널만** 대응. mail은 SPEC-MAIL-001 별도, sms/push는 rhymix-ts에 대응 인프라 없고 REQ-MODBL-013에도 언급 없음 — 범위 밖.

**`modules/communication/`** (참고): `schemas/member_message.xml`이 메시지 테이블 정의. `communication.controller.php`의 `sendMessage`/`procCommunicationMessageSubmit`이 `triggerAfterSendMessage` 훅을 발火 — ncenterlite가 이를 구독. message 모듈은 ncenterlite를 전혀 import하지 않음(단방향 훅 결합).

## 2. 현재 rhymix-ts 상태

**`notifyMessage` 플래그** — `packages/db/prisma/schema.prisma:714`의 `Document.notifyMessage Boolean @default(false)`. `grep -rn "notifyMessage"` 결과 스키마/마이그레이션 외 어디서도 참조되지 않는 **미사용 컬럼**. 레거시에 동일 이름의 컬럼은 없음(가장 가까운 의미는 `ncenterlite_unsubscribe`의 문서 단위 구독, 혹은 XE의 "이 글 watch" 체크박스 포팅 추정이나 현재 코드는 어느 쪽으로도 소비하지 않음).

**Document 이벤트 버스** — `packages/document/src/events.ts`(261줄 전체 확인): `DocumentEventBus extends EventEmitter` 싱글톤 `documentEvents`, `created`/`updated`/`deleted`/`published` 4종 타입드 이벤트 + `emitDocumentXxx()` 헬퍼. fire-and-forget(구독자 결과 대기 없음, 트랜잭션 보장 없음).

**Comment 이벤트 버스** — `packages/comment/src/events.ts`(166줄 전체 확인): 동일 패턴이나 현재 `'deleted'` 이벤트 **1종만** 존재(`emitCommentDeleted`). **`created`/`updated` 댓글 이벤트는 아직 없음** — 이벤트버스 방식으로 알림을 구독하려면 선행 추가가 필요.

**두 가지 크로스도메인 통합 패턴이 이미 공존**:
1. **Fire-and-forget EventEmitter 버스**(`documentEvents`, `commentEvents`) — 캐시 무효화(SPEC-FEED-001), cascade-delete(SPEC-FILE-001)에 사용. 트랜잭션 커밋 후 발火, 구독자 실패가 쓰기를 롤백하지 않음.
2. **트랜잭션 내 직접 훅 호출**(`pointHooks`) — `packages/point/src/hooks.ts`, `packages/document/src/document.ts:253,282`, `packages/comment/src/service.ts:121`(`createComment` 트랜잭션 내), `packages/auth/src/signup.ts:248`에서 `prisma.$transaction(...)` 안에서 명시적으로 호출. 트리거 쓰기와 사이드이펙트(포인트 지급)가 원자적으로 보장됨.

알림 생성은 사용자가 신뢰할 수 있어야 하는 DB 쓰기이므로(레거시 `_insertNotify`도 동기), **댓글/멘션 알림 생성은 pointHooks 패턴(트랜잭션 내 직접 호출)이 더 적합**. 반면 "쪽지 도착" future-ready 훅은 아직 없는 `packages/message`로부터의 하드 의존을 피하기 위해 느슨한 결합(이벤트버스 또는 named export 훅)이 적합.

**멘션 기능**: `grep -rln "mention" packages/comment packages/board packages/document -i` → **0건**. `@username` 파싱이 rhymix-ts에 전혀 없음 — 완전 신규 기능이며 포팅이 아님.

**스키마/모델 패턴**:
- `model Point`(schema.prisma:544) — 사용자별 활동로그 모델: `id`, `memberId`(FK), `amount`, `reason`, `sourceType`(enum), `sourceId`(nullable 다형 포인터), `boardId`(nullable), `createdAt`. `[memberId, createdAt(sort: Desc)]` 인덱스 — `Notification` 모델(수신자+소스타입/id+읽음상태+createdAt-desc 인덱스)과 직접 유사.
- `model SitePointConfig`(565) — 싱글톤-row 사이트 전역 설정 패턴. **사용자별** 설정에는 부적합.
- 현재 schema.prisma에 사용자별(per-user) 설정 모델 전무(`SiteSetting`(53)은 전역). **`NotificationPreference`가 rhymix-ts 최초의 사용자별 설정 테이블**이 될 것.

**패키지 구조 선례** — `packages/point/`: `schemas.ts`(Zod) + `service.ts`(`PointService` 클래스) + `hooks.ts`(`pointHooks` 크로스모듈 직접호출 객체) + `config.ts` + `errors.ts` + `index.ts`(barrel). `packages/notification`의 가장 가까운 구조적 유사체.

**설정 UI 패턴** — `apps/web/app/admin/boards/[mid]/feed/page.tsx`: Server Component(`headers()`+`auth()`) → Zod `.parse(... ?? {})` 기본값 → `<form action={serverAction}>` → `'use server'` 액션 재검증 → `prisma.$transaction` → `revalidateTag(tag, undefined as any)` → `redirect()`. 이 형태가 알림 설정 페이지의 템플릿이 되어야 하나, 이 예시는 **admin-scoped board-level** 설정이다. `apps/web/app/(member)/`에는 현재 `documents`/`drafts`만 존재 — **회원 본인용 설정 페이지가 전무**, 신규 라우트(`(member)/notifications`, `(member)/settings/notifications` 등)를 처음부터 설계해야 함.

별도로 `apps/web/app/admin/settings/notification/page.tsx`가 존재하나 이는 **admin 전역 SMTP/이메일 발신 설정**(SPEC-ADMIN-002 REQ-ADMIN2-110)이며 본 SPEC의 회원용 인앱 알림 센터와 무관 — 혼동 주의.

**UI 프리미티브** — `packages/ui/src/components/`: `dropdown-menu.tsx`, `badge.tsx`, `button.tsx`, `dialog.tsx`, `sonner.tsx`(toast), `checkbox.tsx`, `input.tsx`, `label.tsx`, `table.tsx`, `textarea.tsx` 존재(shadcn 기반). **벨 아이콘/알림 패널 전용 컴포넌트는 전무** — `dropdown-menu`(패널 컨테이너) + `badge`(미읽음 카운트) + `sonner`(신규 알림 토스트) 조합으로 신규 `NotificationBell` 컴포넌트를 작성해야 함.

## 3. 실시간 전달

`EventSource`/`WebSocket`/`Server-Sent`/폴링 훅(`setInterval`+`fetch`, `refetchInterval`) 전체 검색 — **0건**. rhymix-ts에 실시간 UI 갱신 인프라가 전무. "리로드 없이 즉시 알림 표시"는 신규 인프라(tRPC subscription, SSE 라우트, TanStack Query polling) 도입 없이는 MVP 범위에 부적합. 현실적 MVP: **목록뷰 + 다음 네비게이션/수동 갱신**(페이지 이동 시 Server Component 재렌더, 또는 드롭다운 오픈 시 tRPC 쿼리 재호출) — push 아님.

## 4. 참조 구현

1. **`packages/point`** — 모델 구조(`Point`, schema.prisma:544)와 크로스모듈 훅(`pointHooks`, `packages/point/src/hooks.ts:36-126`, `document.ts:253,282`/`comment/service.ts:121`에서 트랜잭션 내 호출)의 정확한 선례. `notificationHooks.onCommentCreated`/`onMentionDetected` 등이 동일 형태(`async (prisma, event, tx?) => void`)를 따라야 함.
2. **`packages/comment`** — Zod 검증 + `$transaction` + 크로스모듈 훅 호출을 한 함수로 합성하는 패턴(`packages/comment/src/service.ts:70-131`의 `createComment`, line 121에 `pointHooks.onCommentCreated` 호출과 병렬로 알림 훅 호출 위치). 또한 `events.ts`의 EventEmitter 버스 형태(느슨결합 future-hook 후보).
3. **`packages/document/src/events.ts`** — 문서 레벨 멘션 트리거 + 이벤트 구독의 세 번째 참조.

## Recommendations for SPEC Scope (Open Design Questions)

1. **`Notification` 모델/서비스 소유 패키지**: 신규 `packages/notification` 권장(comment/document에 종속 폴딩 금지). `packages/point` 구조(schemas/service/hooks/config/errors/index) 따름. comment/document → notification 방향으로만 의존(역방향 금지, point와 동일 방향).
2. **훅 결합 방식**: (a) 댓글/멘션 알림 생성 = **트랜잭션 내 직접 훅 호출**(`notificationHooks.onCommentCreated`, `pointHooks`와 동일 패턴) — 누락된 알림이 누락된 캐시 무효화보다 더 나쁜 실패 모드이므로 fire-and-forget 부적합. (b) **쪽지 도착 future-hook** = named export 함수(`notificationHooks.onMessageSent(prisma, event, tx?)`) 또는 이벤트버스 — `packages/notification`이 미존재 `packages/message`를 import하지 않아야 함(SPEC에서 결정 필요).
3. **Comment 이벤트버스 갭**: 이벤트버스 방식을 택할 경우 `packages/comment/src/events.ts`에 `created` 이벤트가 없음 — 선행 추가 필요(작은 선결 작업으로 플래그).
4. **멘션 감지 범위 포함 여부**: REQ-MODBL-013이 "신규 댓글/멘션"을 명시하므로 일부 멘션 기능이 암시되나, `@nickname` 정규식 추출 + 멤버 해석 + 자기-멘션 제외 + 상한은 비자명한 신규 로직. SPEC에서 (a) 기본 멘션 파싱을 포함(레거시 최소 동등 슬라이스) 또는 (b) 멘션 감지는 후속 SPEC으로 미루고 `sourceType` enum에 `MENTION` 값만 선반영 — 둘 중 명시적 결정 필요.
5. **실시간 전달**: SSE/WebSocket/폴링 인프라 전무 — **다음 네비게이션/수동 갱신**으로 명시적 범위 한정, 실시간 push는 범위 밖(향후 별도 설계 필요한 인프라 추가로 플래그).
6. **사용자별 설정 모델 형태**: 레거시의 와이드 테이블(`ncenterlite_user_set`, 카테고리당 1컬럼) 그대로 포팅보다 `NotificationPreference` `@@unique([memberId, category])` 정규화 권장(카테고리 추가 시 마이그레이션 불필요). 카테고리: `COMMENT`, `COMMENT_REPLY`, `MENTION`(포함 시), `MESSAGE`(미래 SPEC-MESSAGE-001 훅 자리 선점).
7. **회원용 UI는 그린필드**: `(member)/` 라우트에 설정 페이지 패턴 전무 — `(member)/notifications`(목록+읽음처리), `(member)/settings/notifications`(설정) 신규 라우트 설계 필요. admin feed 설정 페이지의 Zod+서버액션+트랜잭션+캐시무효화 패턴만 재사용.
8. **벨/드롭다운 UI는 그린필드**: `packages/ui` 프리미티브(`dropdown-menu`/`badge`/`sonner`)는 있으나 조합된 `NotificationBell` 컴포넌트는 신규 작성.
9. **`apps/web/app/admin/settings/notification/page.tsx`와 혼동 금지** — 이는 admin SMTP 설정(완료, SPEC-ADMIN-002)이며 본 SPEC과 무관.
10. **`notifyMessage` 필드 처분**: 완전 미사용이므로 (a) 신규 알림/구독해제 도메인의 일부로 재활용(레거시 최근접 의미: "댓글 알림 받기" 토글) 또는 (b) 손대지 않고 deprecated로 유지 — SPEC에서 명시적으로 결정해 구현 모호성 방지.
