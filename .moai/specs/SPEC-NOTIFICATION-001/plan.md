# SPEC-NOTIFICATION-001 구현 계획

본 문서는 `spec.md`의 요구사항(REQ-NOTIF-001~065)을 구현 가능한 작업 단위로 분해한다. 시간 추정은 포함하지 않으며 우선순위(Priority)와 단계 순서(Phase ordering)로만 표현한다.

---

## 1. 기술 스택

- **언어/런타임**: TypeScript 5.9, Node.js (rhymix-ts 모노레포 공통)
- **DB**: PostgreSQL + Prisma ORM — 신규 모델 `Notification`, `NotificationPreference` + enum `NotificationCategory`, `NotificationSourceType`
- **검증**: Zod (기존 `boardFeedConfigSchema` 등과 동일 컨벤션)
- **프레임워크**: Next.js 16 App Router — Server Component + Server Action (`(member)/notifications`, `(member)/settings/notifications`)
- **UI 프리미티브**: `packages/ui`의 `dropdown-menu`, `badge`, `sonner`(toast), `checkbox` — 신규 조합 컴포넌트 `NotificationBell`
- **테스트**: Vitest(단위) + Playwright(e2e, 기존 `apps/web/e2e/feed.spec.ts` 패턴 재사용)
- **참조 패키지**: `packages/point`(구조 선례) — `schemas.ts`/`service.ts`/`hooks.ts`/`config.ts`/`errors.ts`/`index.ts`

---

## 2. 패키지/파일 구조 (예정)

```
packages/notification/
  src/
    schemas.ts        # Zod: Notification 생성 입력, NotificationPreference 입력
    service.ts         # NotificationService: create/list/markRead/markAllRead/countUnread/upsertPreference
    hooks.ts            # notificationHooks: onCommentCreated, onMentionDetected(Slice B), onMessageSent(future-hook)
    config.ts           # NotificationCategory 기본값(opt-out 매핑) 등 상수
    errors.ts            # NotificationNotFoundError, NotificationForbiddenError 등
    mention.ts          # (Slice B) @nickname 정규식 추출 + 멤버 해석
    index.ts              # barrel export
  __tests__/
    hooks.test.ts
    service.test.ts
    mention.test.ts      # (Slice B)

apps/web/app/(member)/notifications/
  page.tsx               # 목록 + 읽음처리 서버 액션
apps/web/app/(member)/settings/notifications/
  page.tsx               # 카테고리별 on/off (구독해제)

packages/ui/src/components/
  notification-bell.tsx  # dropdown-menu + badge + sonner 조합 (신규)

packages/db/prisma/migrations/
  <timestamp>_spec_notification_001_model/  # additive: Notification, NotificationPreference, enum 2종
```

---

## 3. 마일스톤 (우선순위 기반, 시간 추정 없음)

### Milestone 1 — 데이터 모델 (Priority: High)

- `packages/db/prisma/schema.prisma`에 `NotificationCategory` enum(`COMMENT`, `COMMENT_REPLY`, `MENTION`, `MESSAGE`), `NotificationSourceType` enum(`COMMENT`, `MENTION`, `MESSAGE`), `Notification` 모델, `NotificationPreference` 모델 추가.
- additive 마이그레이션 생성(기존 컬럼 변경 없음, SPEC-FEED-001 `Board.feedConfig` 마이그레이션과 동일 원칙).
- 인덱스: `Notification`은 `[recipientId, createdAt(sort: Desc)]` + `[recipientId, read]`(미읽음 카운트 쿼리용). `NotificationPreference`는 `@@unique([memberId, category])`.

완료 조건: `prisma migrate dev` 성공, `pnpm tsc --noEmit` 0 errors(schema 변경만으로는 타입 영향 없음을 확인).

### Milestone 2 — `packages/notification` 패키지 (Priority: High)

- `schemas.ts`: `createNotificationSchema`, `notificationPreferenceSchema` 등 Zod 스키마.
- `service.ts`: `NotificationService` 클래스 — `create`, `listNotifications`, `countUnreadNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `upsertPreference`, `getPreferences`. 모든 read/write는 `recipientId`/`memberId` 스코핑 검증 포함(REQ-NOTIF-021).
- `config.ts`: opt-out 기본값(REQ-NOTIF-032, preference 부재 = enabled) 헬퍼.
- `errors.ts`: `NotificationForbiddenError`(타인 알림 접근 시도) 등.
- `hooks.ts`: `notificationHooks.onCommentCreated`(REQ-NOTIF-002/003/004/005/008), `notificationHooks.onMessageSent`(REQ-NOTIF-009/051/052 future-hook, 본문 구현 없이 시그니처+TODO만).
- `index.ts`: barrel export.

완료 조건: `pnpm test packages/notification` 통과, 자기-알림 배제/preference 게이트/recipient 격리 단위 테스트 포함.

### Milestone 3 — comment 통합 (Priority: High)

- `packages/comment/src/service.ts:121` 인근(`pointHooks.onCommentCreated` 호출 병렬 위치)에 `notificationHooks.onCommentCreated(prisma, event, tx)` 호출 추가.
- 댓글 작성자/문서 작성자/부모댓글 작성자 정보를 이벤트 페이로드로 전달.
- 기존 `pointHooks` 호출과의 트랜잭션 원자성 유지(같은 `tx` 객체 공유).

완료 조건: `pnpm test packages/comment` 회귀 없음 + 신규 통합 테스트(댓글 작성 → 알림 생성) 통과.

### Milestone 4 — 회원용 UI: 목록 + 읽음처리 (Priority: Medium)

- `apps/web/app/(member)/notifications/page.tsx`: Server Component, 세션에서 `recipientId` 도출 → `listNotifications` 호출 → 목록 렌더(읽음/미읽음 시각 구분).
- 서버 액션: `markNotificationRead`, `markAllNotificationsRead` — admin feed 페이지의 Zod+서버액션+트랜잭션 패턴 재사용(가드는 `isAdmin` 대신 본인 `recipientId` 스코핑).

완료 조건: `pnpm test:e2e`(REQ-NOTIF-065 시나리오) 통과.

### Milestone 5 — 회원용 UI: 설정/구독해제 (Priority: Medium)

- `apps/web/app/(member)/settings/notifications/page.tsx`: 카테고리별 체크박스 폼 → 서버 액션 → `upsertPreference` 트랜잭션.
- `fullContent`/`excerptLength` 토글과 유사한 UX 패턴(SPEC-FEED-001 §5.4 disabled 토글)은 본 SPEC에는 해당 없음 — 단순 on/off 체크박스 목록.

완료 조건: 설정 저장 → 이후 댓글 알림 생성 시 preference 반영 확인(단위 테스트로 검증, e2e 불필요).

### Milestone 6 — `NotificationBell` 컴포넌트 (Priority: Medium)

- `packages/ui/src/components/notification-bell.tsx`: `dropdown-menu` + `badge`(미읽음 카운트) + `sonner` 조합.
- 헤더/네비게이션에 통합(어느 레이아웃 파일에 삽입할지는 구현 단계에서 기존 헤더 컴포넌트 위치 확인 후 결정).

완료 조건: 컴포넌트 단위 테스트(렌더 + 카운트 표시) 통과.

### Milestone 7 — Slice B: 멘션 감지 (Priority: Low, Slice A 완료 후 착수)

- `packages/notification/src/mention.ts`: `@nickname` 정규식 추출 + 멤버 닉네임 해석 + 자기-멘션 제외 + REQ-NOTIF-002/003과의 중복 억제.
- `notificationHooks.onMentionDetected` 추가, comment 생성 트랜잭션 내 `onCommentCreated`와 병행 호출.
- 단위 테스트: 다중 멘션, 존재하지 않는 닉네임, 자기-멘션, 중복 억제.

완료 조건: `pnpm test packages/notification`(mention.test.ts) 통과, e2e 멘션 시나리오 추가.

### Milestone 8 — 품질 게이트 (Priority: High, 전체 Slice 완료 후)

- `pnpm tsc --noEmit`(packages/notification, packages/comment, apps/web) 0 errors.
- `pnpm vitest run` 신규 테스트 전체 통과, 커버리지 80%+ 확인.
- expert-security 독립 리뷰: recipient 격리(IDOR) 검증 집중.
- e2e 전체 통과(REQ-NOTIF-065).

---

## 4. 작업 분해 원칙

- Milestone 1~3은 순차 의존(모델 → 패키지 → comment 통합). 병렬화 불가.
- Milestone 4와 5는 Milestone 3 완료 후 병렬 가능(다른 라우트, 파일 충돌 없음).
- Milestone 6은 Milestone 4와 독립적으로 착수 가능(컴포넌트 자체는 데이터 의존 없음, 통합만 4 완료 후).
- Milestone 7(Slice B)은 Milestone 1~6(Slice A) 전체 완료 후 착수 — Slice 경계를 명확히 유지.

---

## 5. 리스크 분석

상세 리스크/완화는 `spec.md` §6 참조. 구현 단계에서 추가로 주의할 기술적 포인트:

- **트랜잭션 합성**: `createComment` 트랜잭션 내부에 `pointHooks.onCommentCreated`와 `notificationHooks.onCommentCreated`를 모두 호출하게 되므로, 두 훅 중 하나가 예외를 던지면 전체 댓글 작성이 롤백된다 — 이는 의도된 동작(원자성)이나, `notificationHooks.onCommentCreated`가 절대 댓글 작성을 막을 만큼 깐깐한 검증을 하지 않도록 주의(예: preference 조회 실패 시 댓글 작성 자체가 실패하면 안 됨 — try/catch로 알림 실패를 로그만 하고 댓글은 성공시킬지 여부는 구현 단계에서 명확히 결정 필요. spec.md REQ-NOTIF-005는 원자성을 요구하므로 기본 입장은 "알림도 트랜잭션의 일부로 실패 시 함께 롤백"이나, 운영 영향이 크면 운영자 확인 후 조정 가능).
- **N+1 방지**: `listNotifications`가 `actorNickname`을 denormalized 컬럼에서 읽으므로(REQ-NOTIF-010) 목록 렌더 시 멤버 테이블 추가 조인이 필요 없다 — 구현 시 이 비정규화를 깨지 않도록 주의.
- **마이그레이션 네이밍**: 기존 컨벤션(`packages/db/prisma/migrations/`의 `<timestamp>_spec_<id>_<slice>_<설명>` 패턴, 예: `20260624000000_spec_feed_001_board_feedconfig`)을 따른다.

---

## 6. 품질 기준 (TRUST 5 매핑)

- **Tested**: Milestone 2/3/7 단위 테스트 + Milestone 4 e2e, 커버리지 80%+(REQ-NOTIF-060).
- **Readable**: `packages/point` 네이밍 컨벤션 그대로 준수(`xxxHooks`, `xxxService`, `xxxSchema`).
- **Unified**: 기존 admin feed 페이지의 서버 액션 패턴 재사용으로 스타일 일관성 유지.
- **Secured**: recipient 격리(IDOR) 전용 테스트(REQ-NOTIF-062) + expert-security 독립 리뷰.
- **Trackable**: 커밋 메시지에 `SPEC-NOTIFICATION-001 REQ-NOTIF-NNN` 참조 포함(git_commit_messages: ko 설정에 따라 한국어 메시지 + REQ ID 영문 그대로).

---

Version: 1.0.0
Status: draft (Slice A 미착수)
