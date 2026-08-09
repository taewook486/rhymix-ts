# SPEC-CONTENT-PARITY-001 — 설계 문서 (design)

> Tier L 5-artifact 세트의 설계 문서. plan.md §0(D-1~D-6)의 결정 요약을 본 문서가 상세화한다.
> **결정의 채택/기각 상태는 plan.md §0이 레지스트리이며**, 본 문서는 구조·컴포넌트·데이터 모델
> 수준의 설계 근거와 스케치를 담는다. 레거시 기능 인벤토리의 원자료는 research.md §2를 참조한다.

## A. 아키텍처 배치 (전체 그림)

본 SPEC의 모든 작업은 기존 rhymix-ts 3-계층 admin 아키텍처 안에서 이루어진다. 신규 계층·신규
패키지는 도입하지 않는다 (그룹 H의 MailLog 모델만 예외적 스키마 추가 — D-1).

```
apps/web/components/admin/AdminSidebar.tsx     ← 그룹 A: NAV 배열이 IA의 SSOT (@MX:NOTE 준수)
        │  (링크)
        ▼
apps/web/app/admin/**/page.tsx                 ← Server Component: 세션 가드 + getServerCaller()
        │                                         초기 데이터 조회 + searchParams 해석
        ▼
apps/web/app/admin/**/<Feature>Client.tsx      ← Client Component: 체크박스/다이얼로그/뮤테이션만
        │  (trpc.admin.* 훅 또는 Server Action)
        ▼
apps/web/server/api/routers/admin/*.ts         ← protectedAdminProcedure + AuditLog 기록
        │
        ▼
packages/{document,comment,file,notification}  ← 도메인 서비스 (시그니처 보존, additive 확장만)
packages/db/prisma/schema.prisma               ← 스키마 (본 SPEC 변경: MailLog 1건, 조건부)
```

설계 원칙 3가지:

1. **필터 상태는 URL이 진실** (D-5): 목록 필터/정렬/페이지는 전부 `searchParams` 기반 서버
   컴포넌트 재조회. 클라이언트 상태는 "선택된 체크박스 집합"과 "다이얼로그 열림"만 가진다.
   선례: SPEC-MEMBER-PARITY-001 REQ-MPAR-004 확정안(`apps/web/app/admin/members/page.tsx` 20~74행).
2. **파괴적 작업은 확인 다이얼로그 + AuditLog** 를 라우터 계층에서 보장한다 (UI 생략 불가).
3. **도메인 서비스 경유**: 라우터에서 Prisma를 직접 조작하는 신규 삭제 경로를 만들지 않는다.
   파일 삭제는 SPEC-FILE-001 cascade 서비스, 문서/댓글은 packages/document·comment 서비스 경유.

## B. 설계 결정 상세 (D-1 ~ D-6)

### D-1. 메일 발송 로그 데이터 모델 (그룹 H / M7 — 2026-08-09 포함 확정)

- 모델 스케치 (채택 시 `packages/db/prisma/schema.prisma`에 추가):

  ```prisma
  model MailLog {
    id        Int          @id @default(autoincrement())
    siteId    Int?
    recipient String       @db.Citext
    subject   String       @db.VarChar(300)
    status    MailLogStatus            // enum: SENT | FAILED
    error     String?                  // 실패 시 오류 메시지 (스택 아닌 message만)
    createdAt DateTime     @default(now()) @db.Timestamptz

    @@index([status, createdAt])
    @@map("mail_logs")
  }
  ```

- 기록 지점: `SmtpMailDispatcher.send()` 경로를 감싸는 로깅 데코레이터(또는 dispatcher 내부
  try/catch/finally). **실패 경로에서도 반드시 기록**되어야 하므로 성공 return 뒤가 아니라
  finally 블록에서 상태 판정 후 insert. 로그 insert 실패가 메일 발송 자체를 실패시키지 않도록
  로그 기록은 fail-open(try/catch 무시 + console.error).
- 레거시 대응: research.md §2.10 `procAdvanced_mailerAdminInsertConfig`의 발송 로그 6종
  select(성공/오류 각각 mail/sms/push) 중 mail 2종만 이식. 예외 도메인·SPF/DKIM 안내 탭은
  이식하지 않는다(§Out of Scope 아님 — 설정 화면 성격이 다르며 SMTP 설정은 기존 화면이 커버).
- 조회 프로시저: `admin.mailLog.list({ status?, cursor?, limit })` — 기존 admin 라우터의
  cursor 페이지네이션 패턴(`admin.file.list`와 동일) 재사용.
- **확정(2026-08-09, 사용자 결정)**: 본 SPEC 포함. 본 절은 확정 설계이며 M7은 무조건부
  마일스톤이다 (plan.md §4-1).

### D-2. 관리자 전역 알림 매트릭스 저장 (그룹 G / M6)

- 저장 위치: 신규 모델 없이 `SiteSetting`(key: `notification.globalEvents`) JSON.
  선례: `admin/spamfilter.ts`의 captcha 설정이 동일 패턴
  (`siteId_key` unique upsert + AuditLog `action: 'configure'`)을 이미 사용 중 — 그대로 복제.
- 값 스키마 (zod):

  ```ts
  const GlobalNotificationEventsSchema = z.object({
    comment: z.boolean().default(true),   // 내 문서에 댓글
    reply:   z.boolean().default(true),   // 내 댓글에 대댓글
    mention: z.boolean().default(true),   // @멘션
    message: z.boolean().default(true),   // 쪽지 수신
  });
  ```

  레거시 ncenterlite는 이벤트 8종×채널 4종(research.md §2.11)이나, rhymix-ts에 존재하는
  이벤트는 위 4종(packages/notification hooks.ts 기준)이므로 4종으로 축소 매핑한다.
  vote/scrap/admin_content/custom 이벤트는 대응 기능 부재로 제외.
- 게이트 위치: `packages/notification/src/service.ts`의 `NotificationService.create` **진입부**.
  전역 비활성 → 즉시 no-op return (개인 `NotificationPreference` 검사보다 앞). 이렇게 하면
  훅 호출부(comment/message 서비스) 수정이 0건이다.
- 설정 조회 캐싱: create는 고빈도 경로이므로 SiteSetting 조회를 요청 단위로 memoize
  (기존 site-context 패턴) — 상세는 run-phase 구현 재량.
- 채널 축 **확정(2026-08-09, 사용자 결정)**: **web(인앱) 단독**. 위
  `GlobalNotificationEventsSchema`(이벤트별 boolean 4종)를 그대로 사용하며, mail 채널 발송
  로직은 본 SPEC 범위 밖이다 (plan.md §4-2). 향후 mail 채널 도입 시
  `{ [event]: { web, mail } }` 형태로의 값 마이그레이션 경로만 열어 둔다(후속 SPEC 사안).

### D-3. 댓글 휴지통 통합 (그룹 B / M2) — Trash.documentId @unique의 함의

- **제약 사실**: `Trash` 모델(schema.prisma 1030행)은 `documentId Int @unique` + FK로 문서에
  하드 결합되어 있다. 댓글을 이 테이블에 넣으려면 polymorphic 개편(마이그레이션 + 기존
  SPEC-DOCUMENT-001 서비스 개정)이 필요하다 → **기각**.
- **채택안: 통합 뷰(가상 휴지통)**. 휴지통 화면은 두 데이터 소스를 타입 필터로 오간다:

  | 타입 | 데이터 소스 | 복원 | 영구 삭제 |
  |---|---|---|---|
  | 문서 | `Trash` 모델 (`admin.trash.list/restore/purge` 기존) | 기존 restore | 기존 purge |
  | 댓글 | `Comment.deletedAt IS NOT NULL` 조회 (신규) | `deletedAt = null` (신규 restoreComment) | hard delete (신규 purgeComment) |

- 라우터 확장 스케치 (`admin/trash.ts`, additive):

  ```ts
  listComments: protectedAdminProcedure  // deletedAt 기준, cursor 페이지네이션
  restoreComment: protectedAdminProcedure.input({ commentId })
  purgeComment: protectedAdminProcedure.input({ commentId })
  empty: protectedAdminProcedure.input({ scope: 'all'|'document'|'comment' })
  ```

- 댓글 purge cascade 순서: CommentReport → CommentVoteLog → FileAttachment(CommentFiles) →
  replies(자식 대댓글 처리 정책: 자식이 있으면 purge 거부 또는 함께 삭제 — run-phase에서
  `packages/comment` 기존 삭제 정책을 따름) → Comment. FK 검증은 격리 임시 DB 실제 실행
  (acceptance AC-CPAR-005 Edge, 선례 feedback-fk-constraints-need-real-db-verify).
- 만료(`expiresAt`) 개념은 문서 휴지통에만 존재 — 댓글 탭에는 만료일 컬럼을 "—"로 표시.
- 레거시 대응: research.md §2.9 (필터 전체/문서/댓글, `procTrashAdminEmptyTrash`의
  is_type radio → `empty({ scope })` 매핑).

### D-4. 스팸필터 노출 형태 (그룹 A / M1) — 안 2(허브+탭) 확정

- **확정(2026-08-09, 사용자 결정)**: 안 2(단일 링크 + 허브 탭) 채택 (plan.md §4-3).
  아래 비교표는 채택 근거로 보존한다:

  | | 안 1: 개별 링크 나열 | 안 2(권장): 단일 링크 + 허브 탭 |
  |---|---|---|
  | 사이드바 항목 수 | 콘텐츠 섹션 +6 (총 14) | +1 (총 9) |
  | 신규 파일 | 0 | `settings/spamfilter/layout.tsx` (탭 네비) + 허브 리다이렉트 |
  | 레거시 유사도 | 낮음 (레거시는 단일 메뉴+탭, research.md §2.8) | 높음 |

- 채택안 구성: `apps/web/app/admin/settings/spamfilter/layout.tsx`가 5개 하위 경로 공유 탭을
  렌더하고, `/admin/spam-review`는 별도 경로이므로 탭 목록에 외부 링크로 포함한다(레이아웃
  중첩 불가 — App Router 세그먼트가 다름). 사이드바 링크는 `/admin/settings/spamfilter/ip`
  (첫 탭)로 연결.

### D-5. 문서/댓글 목록 필터·일괄 작업 구조 (그룹 C·D / M3)

- 서버/클라이언트 분리 스케치 (문서·댓글 동일 패턴, 파일명만 다름):

  ```
  documents/page.tsx            (Server) searchParams {status,boardId,authorId,ip,search,cursor}
    ├─ DocumentFilterForm       (Server-rendered <form method="GET">) — 게시판 select는
    │                            admin.board.list 결과로 동적 렌더 (REQ-CPAR-010)
    └─ DocumentTableClient      ('use client') — 행 체크박스 상태 + Check All +
         ├─ BulkActionBar       일괄 작업 4종 → confirm 다이얼로그 → trpc.admin.document.bulkUpdate
         ├─ TempActions         TEMP 행 복구/삭제 → recoverTemp/deleteTemp
         └─ LoadMore            nextCursor → router.push(cursor 파라미터) 또는 클라이언트 append
  ```

- 일괄 작업 매핑 (기존 `bulkUpdate` action enum과 1:1, 백엔드 무변경):
  휴지통 이동→`trash`, 삭제→`delete`, 이동→`move`(+targetBoardId select), 상태 변경→`status`
  (+targetStatus select). 이동/상태 변경은 BulkActionBar에서 대상 선택 UI가 함께 열린다.
- 백엔드 additive 확장 2건: `document.listAcrossAllBoards`에 `ip?: string`(REQ-CPAR-014a),
  `comment.listAcrossAllBoards`에 `isSecret?: boolean`(REQ-CPAR-017).
- IP 클릭(REQ-CPAR-014b)은 `<Link href="?ip=...">` — 별도 상태 없음.
- 레거시 대응: research.md §2.3(문서 — 일괄 `procDocumentManageCheckedDocument` 분기, IP 클릭
  검색), §2.4(댓글 — `procCommentAdminDeleteChecked`). 쪽지 통보 옵션(send_message)은 이식하지
  않음(Out of Scope 아님 — bulk 다이얼로그 단순화; 필요 시 후속).

### D-6. 파일 목록 정렬·일괄 삭제 (그룹 E / M4)

- `admin.file.list` additive 확장: `sortBy: z.enum(['size','downloads','regdate']).optional()`,
  `sortOrder: z.enum(['asc','desc']).default('desc')`. 미지정 시 기존 기본 정렬 유지(하위 호환).
  cursor 페이지네이션과 정렬 조합 시 cursor 기준 컬럼이 정렬 컬럼과 일치해야 함 —
  `(정렬값, id)` 복합 cursor 방식은 run-phase 구현 결정.
- 신규 `admin.file.bulkDelete({ fileIds: z.array(z.number()).min(1).max(100) })`:
  SPEC-FILE-001의 cascade 삭제 서비스(문서 첨부 목록·디스크 정리 포함)를 파일별 호출 후
  집계 결과 반환. AuditLog `action: 'bulk_delete'`, `target: 'file'`, diff에 fileIds.
- UI: `FileManagementClient.tsx`에 검색 input + 타입 select(기존 파라미터 배선), 정렬 헤더
  (SPEC-MEMBER-PARITY-001 sortable header 패턴 재사용), 행 체크박스 + 일괄 삭제 버튼.
- 레거시 대응: research.md §2.5 (목록 필터·정렬 3종·`procFileAdminDeleteChecked`).

## C. 마일스톤별 설계 스케치 (M1~M7 요약표)

| M | 신규 파일 | 수정 파일 | 신규/확장 프로시저 | 스키마 |
|---|---|---|---|---|
| M1 | spamfilter/layout.tsx (안 2 확정) | AdminSidebar.tsx, layout.test.tsx | — | — |
| M2 | trash/TrashClient.tsx | trash/page.tsx, admin/trash.ts, packages/comment service | listComments/restoreComment/purgeComment/empty | 없음 (D-3) |
| M3 | Document·CommentTableClient 등 | documents·comments page.tsx, admin/document.ts, admin/comment.ts | ip·isSecret 필터 파라미터 (additive) | 없음 |
| M4 | — | FileManagementClient.tsx, admin/file.ts | list 정렬 파라미터, bulkDelete | 없음 |
| M5 | modules/[id]/edit/page.tsx + 폼 | modules/[id]/page.tsx | — (admin.module.update 기존) | 없음 |
| M6 | (선택) 전역 알림 섹션 컴포넌트 | settings/notification 화면, admin/settings.ts, notification service | globalEvents get/update | 없음 (SiteSetting, D-2) |
| M7 | 발송 내역 화면 | mail dispatcher | admin.mailLog.list | **MailLog 신규** (D-1, 확정) |

마이그레이션이 발생하는 마일스톤은 M7뿐이다(2026-08-09 포함 확정). 다른 마일스톤과
파일·스키마 접점이 없는 독립 구조는 그대로 유지한다(실행 순서 유연성 확보 목적).

## D. 데이터 모델 노트 (요약)

- **Trash.documentId @unique**: 문서 전용 하드 결합 — 댓글 휴지통은 모델 확장이 아닌
  `Comment.deletedAt` 기반 가상 뷰로 해결 (D-3). 본 SPEC의 스키마 보존 원칙의 핵심 근거.
- **Comment에 승인 개념 부재**: `isSecret`만 존재, `isPublished` 없음 → 레거시 대기/발행
  워크플로는 Out of Scope (spec.md §6).
- **알림 전역 설정**: 신규 모델 없이 `SiteSetting` JSON (D-2). `NotificationPreference`
  (per-user)와 층이 다름 — 전역 게이트가 개인 설정보다 선행.
- **MailLog**: 본 SPEC 유일의 신규 모델(2026-08-09 포함 확정, D-1).
- **SpamDeniedWord/Ip**: 히트 카운트·회원 제외 필드 부재 — 기능 추가 없이 현행 유지
  (spec.md §6 Out of Scope).

## E. research.md §2 교차 참조 (레거시 인벤토리 ↔ 설계)

| research.md | 레거시 화면 | 본 문서 대응 |
|---|---|---|
| §2.1 | 게시판 목록·개별 설정 8탭 | §C M5 (편집 폼 + per-board 링크; 일괄 3탭·복사는 spec.md §6) |
| §2.2 | 페이지 | 격차 없음 (spec.md §2.1) — 설계 없음 |
| §2.3 | 문서 목록·기본 설정·신고 | D-5 (기본 설정·신고 화면은 기존 존재, 링크만 M3) |
| §2.4 | 댓글 목록·신고 | D-5 (승인 필터는 Out of Scope) |
| §2.5 | 파일 4탭 | D-6 (설정 3탭은 기존 존재 — 격차 없음) |
| §2.6 | 설문 | 격차 없음 — 설계 없음 |
| §2.7 | 에디터 | Out of Scope (SPEC-MODULE-BACKLOG-001 DROP 준수) |
| §2.8 | 스팸필터 5탭 | D-4 (기능 기존 완비, 노출만) |
| §2.9 | 휴지통 | D-3 |
| §2.10 | 메일·SMS·푸시 9탭 | D-1 (mail 로그만; SMS/푸시 Out of Scope) |
| §2.11 | 알림 센터 8탭 | D-2 (이벤트 4종×web로 축소 매핑) |
| §3 | 공통 UI 패턴 (검색/일괄/페이지네이션) | §A 설계 원칙 1·2 (URL 상태 + 다이얼로그/AuditLog) |
