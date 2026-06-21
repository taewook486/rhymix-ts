# SPEC-NOTIFICATION-001 인수 기준 (Acceptance Criteria)

본 문서는 `spec.md`의 EARS 요구사항(REQ-NOTIF-001~065)을 검증 가능한 Given-When-Then 시나리오로 확장한다. 최소 2개 이상의 시나리오와 엣지 케이스를 포함한다.

---

## 1. 핵심 시나리오 (Given-When-Then)

### AC-NOTIF-A1 — 댓글 작성 시 알림 생성

```
GIVEN 회원 A가 게시판 "notice"에 문서 D를 작성했다
  AND 회원 A의 NotificationPreference에 COMMENT 카테고리 설정이 없다(기본값 = enabled)
WHEN 회원 B가 문서 D에 댓글 C를 작성한다
THEN Notification 테이블에 recipientId=A.id, category=COMMENT, sourceType=COMMENT, sourceId=C.id 행이 1건 생성된다
  AND 해당 행의 read=false이다
  AND 회원 A가 (member)/notifications 에 접속하면 해당 알림이 미읽음으로 표시된다
```

EARS coverage: REQ-NOTIF-001, 002, 005, 010, 020, 022.

### AC-NOTIF-A2 — 자기-알림 배제 (self-notification 차단)

```
GIVEN 회원 A가 게시판 "notice"에 문서 D를 작성했다
WHEN 회원 A가 자신의 문서 D에 직접 댓글을 작성한다
THEN Notification 테이블에 어떤 행도 생성되지 않는다
  AND 회원 A의 미읽음 카운트는 변화하지 않는다
```

EARS coverage: REQ-NOTIF-004.

### AC-NOTIF-A3 — preference 비활성 시 알림 미생성

```
GIVEN 회원 A가 게시판 "notice"에 문서 D를 작성했다
  AND 회원 A가 (member)/settings/notifications 에서 COMMENT 카테고리를 비활성화했다(NotificationPreference.enabled=false)
WHEN 회원 B가 문서 D에 댓글을 작성한다
THEN Notification 테이블에 회원 A를 recipientId로 하는 행이 생성되지 않는다
  AND 댓글 C 자체는 정상적으로 생성된다(알림 비활성화가 댓글 작성을 막지 않는다)
```

EARS coverage: REQ-NOTIF-008, 032, 033, 034.

### AC-NOTIF-A4 — 읽음 처리 및 회원 간 격리

```
GIVEN 회원 A에게 미읽음 Notification 2건이 있다(N1, N2)
  AND 회원 B에게는 미읽음 Notification 1건이 있다(N3)
WHEN 회원 A가 "전체 읽음" 액션을 실행한다
THEN N1, N2의 read=true, readAt이 설정된다
  AND 회원 A의 미읽음 카운트는 0이 된다
  AND 회원 B의 N3는 영향받지 않는다(여전히 미읽음)

WHEN 회원 B가 N1.id로 markNotificationRead를 호출한다(타인 알림에 대한 시도)
THEN 요청이 거부된다(NotificationForbiddenError 또는 등가 403)
  AND N1의 read 상태는 변경되지 않는다
```

EARS coverage: REQ-NOTIF-021, 023, 024, 025, 062.

### AC-NOTIF-B1 — 멘션 알림 생성 (Slice B)

```
GIVEN 게시판에 닉네임 "bob"인 등록 회원이 존재한다
  AND 회원 A가 작성한 문서 D가 존재한다
WHEN 회원 C(A도 bob도 아님)가 문서 D에 "@bob 확인해주세요 @bob"라는 본문으로 댓글을 작성한다
THEN bob에게 category=MENTION 알림이 정확히 1건 생성된다(동일 댓글 내 중복 멘션은 1건으로 합쳐짐)
  AND 회원 A에게는 category=COMMENT 알림이 별도로 1건 생성된다(멘션과 댓글 알림은 서로 다른 수신자에게 독립적으로 생성됨)
```

EARS coverage: REQ-NOTIF-007.

### AC-NOTIF-B2 — 자기-멘션 배제 (Slice B)

```
GIVEN 회원 A의 닉네임이 "alice"이다
  AND 회원 A가 작성한 문서 D가 존재한다
WHEN 회원 A가 자신의 문서 D에 "@alice 참고용 메모"라는 본문으로 댓글을 작성한다
THEN MENTION 카테고리 알림이 생성되지 않는다(자기-멘션)
  AND COMMENT 카테고리 알림도 생성되지 않는다(자기 문서에 자기 댓글, AC-NOTIF-A2와 동일 규칙)
```

EARS coverage: REQ-NOTIF-004, 007.

---

## 2. 엣지 케이스

### EC-1 — 답글(대댓글)의 이중 알림

```
GIVEN 회원 A가 문서 D에 댓글 C1을 작성했다
  AND 회원 A가 작성한 문서 D를 회원 B가 소유하지 않는다(B는 문서 작성자가 아님)
WHEN 회원 B가 C1에 대한 답글 C2를 작성한다
THEN 문서 D의 작성자에게 category=COMMENT 알림 1건
  AND C1의 작성자(회원 A)에게 category=COMMENT_REPLY 알림 1건
  AND 두 알림의 recipientId가 다르면 모두 생성된다(중복 억제는 동일 recipientId에 대해서만 적용)
```

EARS coverage: REQ-NOTIF-002, 003.

### EC-2 — 동일인이 문서 작성자이자 부모댓글 작성자인 경우

```
GIVEN 회원 A가 문서 D를 작성했고, 자신의 문서 D에 댓글 C1도 작성했다(자기 문서에 자기 댓글 — 이 댓글 자체는 알림 미생성, AC-NOTIF-A2)
WHEN 회원 B가 C1에 대한 답글 C2를 작성한다
THEN 회원 A는 "문서 작성자"와 "부모댓글 작성자" 두 가지 자격을 모두 가지지만, 동일 recipientId(A)에 대해 중복 알림이 아닌 1건만 생성된다
```

EARS coverage: REQ-NOTIF-002, 003 (중복 방지 — 동일 댓글에서 동일 recipientId로 향하는 알림은 1건).

### EC-3 — 탈퇴/비활성 회원에게 알림 생성 시도

```
GIVEN 문서 D의 작성자가 이미 탈퇴(soft-delete 또는 계정 비활성화)한 회원이다
WHEN 다른 회원이 문서 D에 댓글을 작성한다
THEN 시스템은 해당 수신자에 대한 Notification 행을 생성하지 않고 건너뛴다(알림 행 insert 직전 수신자 존재/활성 확인, 실패 시 예외 없이 no-op 분기)
  AND 댓글 작성 트랜잭션은 정상적으로 완료된다(알림 건너뜀이 댓글 작성을 실패시키지 않는다)
  AND "생성하되 조회 불가" 대안은 채택하지 않는다(spec.md Implementation Notes Q11 — dead row 누적 및 미읽음 카운트 정합성 훼손 방지)
```

EARS coverage: REQ-NOTIF-005 (원자성이 댓글 작성의 가용성을 해치지 않아야 함). 결정 근거: spec.md Implementation Notes Q11.

### EC-4 — preference 행이 전혀 없는 신규 회원

```
GIVEN 신규 가입 회원 A가 NotificationPreference 행을 단 하나도 가지고 있지 않다
WHEN 회원 A가 작성한 문서에 다른 회원이 댓글을 작성한다
THEN 알림이 정상적으로 생성된다(부재 = 옵트아웃 아님, 기본값 enabled)
```

EARS coverage: REQ-NOTIF-032.

### EC-5 — 멘션 대상이 존재하지 않는 닉네임 (Slice B)

```
GIVEN 게시판에 "nonexistent"라는 닉네임을 가진 회원이 존재하지 않는다
WHEN 누군가 "@nonexistent 안녕하세요"라는 본문으로 댓글을 작성한다
THEN MENTION 알림이 생성되지 않는다(해석 실패는 무시, 에러를 던지지 않는다)
  AND 댓글 작성 자체는 정상적으로 완료된다
```

EARS coverage: REQ-NOTIF-007.

### EC-6 — 빈 알림 목록 / 페이지네이션 경계

```
GIVEN 회원 A에게 알림이 0건이다
WHEN 회원 A가 (member)/notifications 에 접속한다
THEN 빈 목록 상태가 정상적으로 렌더링된다(에러 없음)
  AND 미읽음 카운트는 0이다

GIVEN 회원 A에게 알림이 100건 존재한다
WHEN 회원 A가 listNotifications(cursor=undefined, limit=20)를 호출한다
THEN 정확히 20건이 newest-first로 반환되고 다음 cursor가 제공된다
```

EARS coverage: REQ-NOTIF-020, 025.

---

## 3. Quality Gate 기준

본 SPEC의 구현은 다음 게이트를 모두 통과해야 `status: completed`로 전환 가능하다(SPEC-FEED-001 sync 단계 패턴과 동일):

1. `pnpm tsc --noEmit` — `packages/notification`, `packages/comment`, `apps/web` 0 type errors.
2. `pnpm vitest run` — 신규 테스트 파일 전체 통과, 커버리지 80%+ (REQ-NOTIF-060).
3. `pnpm test:e2e` — REQ-NOTIF-065 시나리오(AC-NOTIF-A1, A4) 통과. (2026-06-21 실제 실행 PASS 확인, 상세는 §4 참조)
4. expert-security 독립 리뷰 — IDOR(회원 간 알림 격리, AC-NOTIF-A4 후반부) CRITICAL/HIGH 0건.
5. `packages/notification`이 `packages/message`를 import하지 않음을 정적 검증(의존성 그래프 확인, REQ-NOTIF-009/051).

## 4. Definition of Done

- [x] Slice A(Milestone 1~6) 전체 작업 항목 완료
- [x] AC-NOTIF-A1~A4 전체 통과 (단위/통합 테스트로 검증, e2e는 항목 3 참조)
- [x] EC-1~EC-4, EC-6 전체 통과 (단위 테스트, EC-5는 Slice B 범위)
- [x] Quality Gate §3 항목 1/2/4/5 통과
- [x] Slice B(멘션, Milestone 7) 완료 — AC-NOTIF-B1, B2, EC-5 단위테스트로 검증(`packages/notification/src/hooks.test.ts`, `mention.test.ts`)
- [x] Quality Gate §3 항목 3(e2e, REQ-NOTIF-065 + AC-NOTIF-B1 확장) — `apps/web/e2e/notification.spec.ts` 2개 테스트 모두 실제 PASS 확인(2026-06-21, Postgres 가용 환경에서 cold-start 포함 재현 검증). 검증 과정에서 SPEC 범위 밖의 사전 존재 결함 6건을 발견·수정(상세는 spec.md HISTORY 참조): (1) `packages/board/src/feed/*.ts`의 `.js` 확장자 relative import가 Turbopack ESM에서 dev 서버 전체를 깨뜸, (2) `document.ts`/`comment/service.ts`의 `sanitizeHtml`이 `require()`를 사용해 동일한 ESM 문제로 문서/댓글 생성이 전부 실패, (3) `isomorphic-dompurify`(jsdom)가 Turbopack 번들링 시 `__dirname`을 가상 경로로 치환해 ENOENT 발생 → `serverExternalPackages`로 외부화, (4) `apps/web/server/api/trpc.ts`의 `requireAuth`가 `session.user.id`(NextAuth JWT, 항상 string)를 `typeof === 'number'`로 검사해 실제 사용자의 모든 `protectedProcedure` 호출을 401 처리, (5) `notifications`/`notification_preferences.id`가 마이그레이션에서 SERIAL이 아닌 plain INTEGER로 생성되어 모든 INSERT가 NOT NULL 위반(신규 마이그레이션 `20260625000000_fix_notification_id_sequence`로 수정), (6) `(member)/notifications/page.tsx`가 'use server' 없는 inline closure를 `<form action>`에 전달해 페이지 전체가 500. 부가로 `comment.ts` 라우터가 인증된 사용자의 닉네임을 조회하지 않고 항상 `nickName: null`을 전달하던 것도 수정(알림 표시 텍스트 정확성). 이 6+1건 모두 기존 단위 테스트(전부 mock 기반)로는 발견 불가능했던 항목 — 본 e2e 작업이 최초의 실제 스택 검증.
- [ ] `spec.md` HISTORY 절에 sync 완료 보고 추가(SPEC-FEED-001 패턴과 동일) — `/moai sync` 단계에서 처리

---

Version: 1.0.0
Status: in-progress (Slice A+B 구현+단위테스트 완료, e2e 작성 완료 — Postgres 가용 환경에서 실행 확인 후 completed 전환)
