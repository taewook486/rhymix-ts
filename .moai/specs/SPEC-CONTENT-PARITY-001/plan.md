# SPEC-CONTENT-PARITY-001 — 구현 계획 (plan)

- status: draft (spec.md frontmatter를 SSOT로 함)
- owner: manager-develop (전 마일스톤)
- 방법론: TDD (quality.yaml development_mode 기준) — 백엔드 확장은 테스트 선행,
  UI 배선은 기존 라우터 테스트 + Playwright/수동 런타임 영속 검증 병행

## 0. 핵심 설계 결정 (변경 가능성 높은 결정 먼저 — 리뷰 우선순위)

> Rule 1(Approach-First) 부속 원칙에 따라 데이터 모델 → 신규 인터페이스 → UX 흐름 →
> 기계적 배선 순으로 배열한다. 아래 D-1~D-6이 사람 리뷰가 필요한 결정이고, 그 아래
> 마일스톤 상세는 대부분 기계적이다.

### D-1. 메일 발송 로그 데이터 모델 (그룹 H) — 신규 Prisma 모델

- 안: `MailLog { id, siteId?, recipient, subject, status(enum sent|failed), error?, createdAt }`
  + `SmtpMailDispatcher` 발송 경로에 기록 훅. 마이그레이션 1건 발생.
- **결정(2026-08-09, 사용자 AskUserQuestion 라운드)**: 본 SPEC에 **포함**. M7은 무조건부
  마일스톤으로 확정. MailLog 모델 + 마이그레이션은 design.md D-1 스케치대로 진행.

### D-2. 관리자 전역 알림 매트릭스 저장 위치 (그룹 G)

- 안: 신규 모델 없이 `SiteSetting`(key: `notification.globalEvents`) JSON 값으로 저장 —
  `{ comment: true, reply: true, mention: true, message: true }`. `NotificationService.create`
  진입부에서 전역 게이트 검사(개인 설정보다 선행). 마이그레이션 불필요.
- **결정(2026-08-09, 사용자 AskUserQuestion 라운드)**: **web(인앱) 채널 단독**. mail 채널 발송
  로직은 본 SPEC 범위 밖. 매트릭스는 이벤트×1채널(이벤트별 on/off 목록)로 확정 —
  design.md D-2의 `GlobalNotificationEventsSchema`(boolean 4종) 그대로 사용.

### D-3. 댓글 휴지통 통합 방식 (그룹 B, REQ-CPAR-008)

- 안(권장): `Trash` 모델을 확장하지 않고, 휴지통 화면을 **통합 뷰**로 구성 —
  문서 탭은 기존 `admin.trash.list/restore/purge`(Trash 모델), 댓글 탭은
  `Comment.deletedAt IS NOT NULL` 조회 + `restoreComment`(deletedAt null 처리) +
  `purgeComment`(hard delete) 신규 프로시저. 스키마 변경 없음, 마이그레이션 0건.
- 대안: `Trash` 모델을 polymorphic(originType+originId)으로 개편 — 마이그레이션 필요, 리스크
  높음. 채택하지 않음(사유: 기존 문서 휴지통 서비스 SPEC-DOCUMENT-001을 보존).
- 비우기(`emptyTrash`): 신규 프로시저 `admin.trash.empty({ scope: 'all'|'document'|'comment' })`.

### D-4. 스팸필터 노출 형태 (그룹 A, REQ-CPAR-002)

- **결정(2026-08-09, 사용자 AskUserQuestion 라운드)**: **허브 + 탭** 채택(권장안/design.md D-4
  안 2). 사이드바에는 단일 '스팸필터' 링크만 추가하고, 공유 탭 레이아웃
  (`/admin/settings/spamfilter/layout.tsx`)이 기존 5개 화면 + 검토 큐를 잇는다.

### D-5. 문서/댓글 목록 필터 상태 관리 (그룹 C/D)

- 안: SPEC-MEMBER-PARITY-001 REQ-MPAR-004에서 확정한 선례를 그대로 따름 — URL
  searchParams 기반(서버 컴포넌트 재조회). 클라이언트 상태 아님. 필터 폼은 GET 제출.
  일괄 작업 체크박스만 클라이언트 컴포넌트로 분리.

### D-6. 파일 목록 정렬·일괄 삭제 API (그룹 E)

- 안: `admin.file.list`에 `sortBy: 'size'|'downloads'|'regdate'` + `sortOrder` 파라미터 추가
  (기존 호출부 하위 호환 — optional). 일괄 삭제는 신규 `admin.file.bulkDelete({ fileIds })`,
  SPEC-FILE-001의 cascade 삭제 서비스 경유 + AuditLog.

## 1. 마일스톤 (사용자 가치 순)

### M1 — 사이드바 '콘텐츠' 섹션 재구성 (REQ-CPAR-001~002)

- 대상 파일: `apps/web/components/admin/AdminSidebar.tsx`,
  (D-4 채택 시) `apps/web/app/admin/settings/spamfilter/layout.tsx` 신규
- 내용: 파일/휴지통/스팸필터 링크 추가 + 레거시 순서 재배열. 스팸필터 허브/탭 구성.
- 리스크: 낮음. layout.test.tsx 등 사이드바 스냅샷 테스트 갱신 필요.

### M2 — 휴지통 화면 구현 (REQ-CPAR-003~008)

- 대상 파일: `apps/web/app/admin/trash/page.tsx`(placeholder 대체),
  `apps/web/app/admin/trash/TrashClient.tsx` 신규,
  `apps/web/server/api/routers/admin/trash.ts`(댓글 프로시저 + empty 확장),
  `packages/comment/src/service.ts`(restore/purge 서비스 — 기존 소프트 삭제 역연산)
- 내용: D-3 통합 뷰. 타입 필터/복원/개별 purge/비우기 + AuditLog.
- 리스크: 중간. 댓글 hard delete cascade(투표 로그/신고/파일) 확인 필요.

### M3 — 문서·댓글 관리 화면 배선 완성 (REQ-CPAR-009~020)

- 대상 파일: `apps/web/app/admin/documents/page.tsx` + 신규 클라이언트 컴포넌트
  (`DocumentBulkActions.tsx` 등), `apps/web/app/admin/comments/page.tsx` + 동일 패턴,
  `apps/web/server/api/routers/admin/document.ts`(ip 필터 파라미터),
  `apps/web/server/api/routers/admin/comment.ts`(isSecret 필터 파라미터)
- 내용: D-5 URL searchParams 방식으로 필터 배선, 게시판 select 동적화, 일괄 작업/
  TEMP 복구·삭제/페이지네이션/신고 링크/IP 컬럼 배선.
- 리스크: 중간. 기존 백엔드 재사용이라 로직 리스크는 낮으나 배선 범위가 넓음.

### M4 — 파일 목록 완성 (REQ-CPAR-021~023)

- 대상 파일: `apps/web/app/admin/files/FileManagementClient.tsx`,
  `apps/web/server/api/routers/admin/file.ts`(sort 파라미터 + bulkDelete)
- 내용: D-6. 검색/타입 필터 UI 배선(백엔드 기존), 정렬, 체크박스+일괄 삭제.
- 리스크: 낮음~중간. 삭제는 SPEC-FILE-001 cascade 서비스 경유 필수(직접 Prisma delete 금지).

### M5 — 모듈 편집 + per-board 링크 (REQ-CPAR-024~025)

- 대상 파일: `apps/web/app/admin/modules/[id]/edit/page.tsx` 신규(+폼 컴포넌트),
  `apps/web/app/admin/modules/[id]/page.tsx`(per-board 링크 추가)
- 내용: dead link 해소. `admin.module.update` 연동 편집 폼. board 타입이면
  분류/확장변수/권한/피드 링크 카드 노출.
- 리스크: 낮음. update 프로시저 입력 스키마 확인 후 폼 필드 확정.

### M6 — 관리자 전역 알림 매트릭스 (REQ-CPAR-026~028)

- 대상 파일: `apps/web/app/admin/settings/notification/page.tsx`(전역 이벤트 섹션 추가
  또는 신규 하위 페이지), `apps/web/server/api/routers/admin/settings.ts`(get/update),
  `packages/notification/src/service.ts`(전역 게이트 검사)
- 내용: D-2. SiteSetting JSON 저장 + create 진입부 게이트.
- 리스크: 중간. 알림 생성 억제 로직은 기존 notification 테스트로 회귀 확인.

### M7 — 메일 발송 내역 로그 (REQ-CPAR-029~030)

- 대상 파일: `packages/db/prisma/schema.prisma`(+마이그레이션),
  `packages/auth`(SmtpMailDispatcher 로그 훅) 또는 `apps/web/lib/mail/dispatcher.ts`,
  `apps/web/app/admin/site/mail/` 하위 발송 내역 화면, admin 라우터 신규 프로시저
- 내용: D-1 확정안. 본 SPEC 포함으로 확정됨(2026-08-09 사용자 결정) — 무조건부 마일스톤.
- 리스크: 중간. 발송 실패 경로(예외)에서도 로그가 남아야 함(try/finally).

## 2. PRESERVE 목록 (수정 금지)

- `packages/document`, `packages/comment`의 기존 서비스 시그니처(확장은 additive만)
- `apps/web/app/admin/settings/spamfilter/*` 5개 화면의 기능 로직(허브/탭 래핑만 허용)
- `/admin/polls`, `/admin/pages` 전체(격차 없음 판정 — 본 SPEC에서 수정하지 않음)
- `Trash` 모델 스키마(D-3 채택안은 스키마 무변경)
- 회원용 알림 화면 `(member)/notifications`, `(member)/settings/notifications`

## 3. 리스크 및 완화

| 리스크 | 완화 |
|---|---|
| 댓글 hard delete cascade 누락(신고/투표/파일 잔존) | M2에서 격리 임시 DB 실행 검증(FK 검증 선례: feedback-fk-constraints-need-real-db-verify) |
| 사이드바 스냅샷/기존 테스트 파손 | M1에서 layout.test.tsx 등 관련 테스트 동반 갱신 |
| 일괄 작업 오조작(대량 삭제) | 모든 파괴적 일괄 작업에 확인 다이얼로그 + AuditLog (acceptance D 참조) |
| 알림 전역 게이트가 개인 설정 회귀 유발 | packages/notification 기존 테스트 전체 재실행 |
| Playwright 상호작용 신뢰성(연구 중 관찰된 radio/submit 이슈) | e2e 스크립트에서 `el.click()`/`form.requestSubmit()` 우회 패턴 사용 (research.md §0) |

## 4. 클래리피케이션 해소 기록 (2026-08-09 — 전건 해소 완료)

세 건 모두 2026-08-09 orchestrator AskUserQuestion 라운드에서 사용자가 결정했다.
미해소 `[NEEDS CLARIFICATION]` 마커는 더 이상 없다.

1. 메일 발송 로그(M7): **본 SPEC 포함** (무조건부 마일스톤 확정) — D-1
2. 알림 매트릭스 채널 범위: **web(인앱) 단독** (mail 채널 발송 로직 범위 밖) — D-2
3. 스팸필터 사이드바 노출: **허브 + 탭** (단일 링크 + 공유 탭 레이아웃) — D-4
