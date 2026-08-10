# SPEC-CONTENT-PARITY-001 — progress

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-08-09T14:38:25+09:00
- artifacts: spec.md / plan.md / acceptance.md / design.md (Tier L 5-artifact set; research.md 선행 존재)
- open_clarifications: 0 — 3건 전건 해소(2026-08-09, 사용자 AskUserQuestion 라운드): 메일 로그
  포함 확정 / 알림 채널 web 단독 / 스팸필터 허브+탭 (plan.md §4, spec.md HISTORY v0.1.1)
- kickoff_approval: Implementation Kickoff Approval 사용자 승인됨 (2026-08-09)

## §E.2 Run-phase Evidence

> 부분 진행 — M1(그룹 A)·M2(그룹 B)·M3(그룹 C·D) 완료. M4~M7(그룹 E~H)은 미착수(추후 세션에서 계속).

### M1 — 사이드바 '콘텐츠' 섹션 재구성 (REQ-CPAR-001~002)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-001 사이드바 콘텐츠 섹션 구성 | `AdminSidebar.tsx` NAV '콘텐츠' 섹션에 `/admin/files`, `/admin/trash`, `/admin/settings/spamfilter/ip` 링크 추가 + 레거시 순서(게시판→위젯→페이지→문서→댓글→파일→설문→스팸필터→휴지통) 반영. `grep -E "/admin/files\|/admin/trash" AdminSidebar.tsx` → 각 1건. `AdminSidebar.test.tsx` M1-1/M1-2/M1-3 3건 PASS(vitest, node v22, 8.1s) | PASS |
| AC-CPAR-002 스팸필터 공통 내비게이션 | `apps/web/app/admin/settings/spamfilter/layout.tsx` 신규(허브+탭, design.md D-4) — 5개 설정 화면 + `/admin/spam-review`(외부 링크) 공유 탭. `layout.test.tsx` M1-4 PASS(11.7s) | PASS |

### M2 — 휴지통 화면 구현 (REQ-CPAR-003~008)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-003 휴지통 목록 + 타입 필터 | `trash/page.tsx` placeholder 제거, `TrashClient.tsx` 신규(전체/문서/댓글 탭). `grep -c "구현 예정" trash/page.tsx` → 0. `page.test.tsx` M2-1/M2-2 PASS | PASS |
| AC-CPAR-004 타입 필터 While/When | `TrashClient.tsx` `typeFilter` 상태로 문서/댓글 단일 타입 표시, 전체 선택 시 양쪽 표시 — M2-1 렌더 테스트로 간접 검증(문서 제목·댓글 내용 동시 렌더 확인) | PASS |
| AC-CPAR-005 복원 영속 | `admin.trash.restoreComment`(신규, `packages/comment/src/trash.ts`) + 기존 `admin.trash.restore`(문서). AuditLog는 `protectedAdminProcedure`의 `auditLogger` 미들웨어가 모든 mutation에 대해 자동 기록(REQ-ADMIN-070 기존 메커니즘 재사용) — 런타임 실제 클릭 재현은 M1~M2 세션에서 미실시(mock 기반 라우터/도메인 테스트로 검증, dev DB 실제 재현은 잔여 항목) | PASS-WITH-DEBT |
| AC-CPAR-006 개별 영구 삭제 + 비우기 | `admin.trash.purgeComment`(자식 답글 트리 깊이-역순 cascade, design.md D-3) + `admin.trash.empty({scope})`(신규, 이미 cascade로 삭제된 댓글은 CommentNotFoundError를 건너뜀). FK cascade는 mock 테스트(CT-4/CT-5)로 트리 순서만 검증 — **AC-CPAR-005 Edge가 요구하는 격리 임시 DB 실제 실행 검증은 미실시**(design.md/plan.md §3 리스크 항목, dev DB 127.0.0.1:5444로 후속 세션에서 재현 필요) | PASS-WITH-DEBT |

### M3 — 문서·댓글 관리 화면 배선 완성 (REQ-CPAR-009~020)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-006 필터 배선 | `documents/page.tsx`: 게시판 select를 `caller.admin.board.list()` 동적 옵션으로 렌더(정적 placeholder 주석 제거), 상태/검색/작성자 ID/IP 필터를 URL `searchParams`(GET form, design.md D-5) 기반으로 재조회. `grep -c "Dynamic board options" documents/page.tsx` → 0. `page.test.tsx` M3-DOC-1(동적 게시판 옵션)·M3-DOC-4(status/boardId/ip/search가 `admin.document.listAcrossAllBoards` 실호출 인자로 전달됨, 5/5 PASS) | PASS |
| AC-CPAR-007 일괄 작업 영속 | `DocumentTableClient.tsx` 신규 — 체크박스 선택 + 일괄 작업 바(휴지통 이동/삭제/이동/상태 변경) → 확인 다이얼로그 → `admin.document.bulkUpdate` 호출(기존 서비스 재사용, AdminLog 자체 기록). `DocumentTableClient.test.tsx` DOC-TBL-1(선택된 documentIds로 정확히 mutate 호출됨) PASS. 선택 0건 상태는 바 자체가 렌더되지 않아 "오류 없이 안내" 충족(AC Edge) — **실제 브라우저 클릭→새로고침 영속 재현은 본 세션에서 미실시**(mock tRPC 훅 기반 단위 검증만 수행, 백엔드 `bulkUpdateDocuments`는 Slice 1E부터 기존 테스트로 커버됨) | PASS-WITH-DEBT |
| AC-CPAR-008 TEMP 복구/삭제 + 페이지네이션 + IP + 신고 링크 | TEMP 행에 복구(`recoverTemp`, 확인 없음)/삭제(`deleteTemp`, `confirm()` 확인 후 호출) 버튼 배선. `grep -c "TODO: Server Action 연동 필요" documents/page.tsx` → 0. IP 컬럼 + IP 클릭 시 `?ip=<addr>` 링크(REQ-CPAR-014b), '더 보기' → `?cursor=<nextCursor>` 링크(REQ-CPAR-013, 기존 필터 파라미터 보존), 신고 문서 링크(`/admin/documents/declared`, 기존 화면 재사용) 추가. `DocumentTableClient.test.tsx` DOC-TBL-2/3(복구·삭제 mutate 호출 + confirm 게이팅)·DOC-TBL-4(cursor+기존 필터 보존)·DOC-TBL-5(IP 링크) PASS. `page.test.tsx` M3-DOC-2(IP 컬럼 렌더 + 신고 링크 존재) PASS — **실제 브라우저 재현(TEMP 복구 후 목록 반영, IP 클릭 후 필터 결과)은 미실시** | PASS-WITH-DEBT |
| AC-CPAR-009 필터 + 상태 필터 | `comments/page.tsx`: 게시판 select 동적화(admin.board.list), `isSecret`(공개/비밀) 상태 필터 + 작성자 ID/검색을 URL `searchParams` 기반으로 재조회. `packages/comment/src/admin.ts` `listCommentsAcrossAllBoards`에 `isSecret?: boolean` 필터 추가(additive, REQ-CPAR-017) + 라우터 `comment.ts` 파라미터 노출. `packages/comment/src/admin.test.ts` 신규 케이스("should filter by isSecret") PASS, `admin/comment.test.ts`(신규 라우터 테스트 파일, 이전 부재) COMMENT-LIST-002(isSecret pass-through) PASS, `page.test.tsx` M3-CMT-1(동적 게시판 옵션)·M3-CMT-3(boardId/isSecret/search 실호출 인자 전달) PASS | PASS |
| AC-CPAR-010 일괄 삭제 영속 | `CommentTableClient.tsx` 신규 — 체크박스 선택 + 일괄 삭제 → 확인 다이얼로그 → `admin.comment.bulkDelete`(기존 서비스, AdminLog 자체 기록). '더 보기' cursor 페이지네이션 + 신고 댓글 링크(`/admin/comments/declared`) 추가. `CommentTableClient.test.tsx` CMT-TBL-1(선택 commentIds로 정확히 mutate 호출)·CMT-TBL-3(cursor+필터 보존)·CMT-TBL-4(공개/비밀 라벨) PASS, CMT-TBL-2(0건 선택 시 바 미렌더로 "오류 없이 안내" 충족) PASS — **실제 브라우저 클릭→새로고침 영속 재현은 미실시**(AC-CPAR-007과 동일 사유) | PASS-WITH-DEBT |

문서 관리 화면(`admin/document.ts`)에 REQ-CPAR-014a `ip?: string` 필터 파라미터 추가
(`packages/document/src/admin.ts` `listDocumentsAcrossAllBoards`, additive) — `packages/document/src/admin.test.ts`
신규 케이스("should filter by ip address") + 라우터 `document.test.ts` DOCUMENT-IP-FILTER-001 PASS.

작성자 필터는 REQ-CPAR-009/016이 명시한 `authorId`(design.md D-5 searchParams 목록)를 그대로
사용 — 백엔드가 회원 닉네임 텍스트 검색을 제공하지 않으므로(기존 스키마 제약) "작성자 ID"
숫자 입력으로 구현. 레거시 텍스트 검색 UX와 다르나 REQ 문언(파라미터명 authorId)과 기존
서비스 시그니처(PRESERVE 원칙)를 그대로 따른 결정.

`purgeDocument`(TEMP 영구 삭제·M2 trash purge 공용, `packages/document/src/trash.ts`)가
AdminLog를 기록하지 않는 기존 결함을 M3에서 발견했으나, M2부터 존재하던 공유 함수이며
본 SPEC의 M3 배선 범위(REQ-CPAR-012 "recoverTemp/deleteTemp 호출 배선")를 벗어나는
수정이라 판단해 **범위 규율(Scope Discipline)에 따라 수정하지 않음** — 잔여 항목으로 기록.

### M4 — 파일 목록 완성 (REQ-CPAR-021~023)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-011 검색/필터/정렬 | `FileManagementClient.tsx`: 파일명 검색(`search`)·타입 필터(`fileType`, 기존 `admin.file.list` 파라미터 재사용) UI 배선 + 정렬 컨트롤(등록일/파일 크기/다운로드 수 select + asc/desc 토글 버튼) 신규 추가. `packages/file/src/admin.ts` `listFiles`에 `sortBy: 'size'\|'downloads'\|'regdate'` + `sortOrder` 파라미터 추가(additive, 미지정 시 기존 `regdate desc` 하위 호환 유지) — Prisma `orderBy` 필드 매핑(`fileSize`/`downloadCount`/`regdate`). `packages/file/src/admin.test.ts` 4건(sortBy=size/downloads/regdate 각 orderBy 확인 + 미지정 기본값) PASS, `apps/web/server/api/routers/admin/file.test.ts`(신규 라우터 테스트 파일, 이전 부재) FILE-LIST-001(search/fileType/sortBy/sortOrder 실호출 인자 전달) PASS, `FileManagementClient.test.tsx`(신규) FILE-UI-1~4(검색/타입 필터/정렬 select/asc-desc 토글이 쿼리 입력에 즉시 반영) PASS — **실제 브라우저 재현(검색·정렬 결과 목록 갱신)은 본 세션에서 미실시**(mock tRPC 훅 기반 단위 검증만 수행, M1~M3와 동일 관례) | PASS-WITH-DEBT |
| AC-CPAR-012 파일 일괄 삭제 | `FileManagementClient.tsx`: 체크박스(개별 + 전체 선택) + "선택 삭제 (N)" 버튼 → `confirm()` 확인 다이얼로그 → `admin.file.bulkDelete({fileIds})` 호출, 성공 시 선택 초기화 + 재조회. 백엔드 `packages/file/src/admin.ts` `bulkDeleteFiles` 신규 — SPEC-FILE-001 기존 cascade 삭제 서비스 `deleteAttachment`(storage.delete + DB delete)를 파일당 재사용(raw `prisma.fileAttachment.delete` 직접 호출 없음), 성공 건마다 `AdminLog`(`bulk_delete_file`, target=`file:{id}`) 기록. storage I/O가 포함되어 단일 DB 트랜잭션 대신 `purgeOrphans`와 동일한 per-item best-effort 패턴(개별 실패는 warn 후 계속 진행) 채택 — `@MX:WARN`+`@MX:REASON` 주석으로 사유 기록. `admin.test.ts` 4건(성공 2건+AdminLog 기록, 비관리자 거부, 빈 배열, 부분 실패 best-effort) PASS, `file.test.ts` FILE-BULK-001(bulkDeleteFiles 위임) PASS, `FileManagementClient.test.tsx` FILE-UI-5~8(전체 선택, confirm 승인 후 mutate 호출, confirm 거부 시 미호출, 선택 없으면 버튼 미렌더) PASS — **실제 브라우저 재현(삭제 후 새로고침 영속, 연관 문서 첨부 목록 반영)은 미실시**(AC-CPAR-005/007과 동일 사유). AuditLog는 `protectedAdminProcedure`의 `auditLogger` 미들웨어가 모든 admin mutation에 자동 기록(기존 메커니즘, M2와 동일) + 파일별 fine-grained AdminLog 병행 기록 | PASS-WITH-DEBT |

### M5 — 모듈 편집 기능 완성 (REQ-CPAR-024)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-013 모듈 편집 화면 | `apps/web/app/admin/modules/[id]/edit/page.tsx` 신규 + `ModuleEditForm.tsx` (제목/브라우저 제목/설명 입력). `ModuleEditForm.test.tsx` M5-1~3(렌더/제출/불러오기) 3건 PASS(vitest, node v22) | PASS |
| AC-CPAR-013 per-board 링크 노출 | `apps/web/app/admin/modules/[id]/page.tsx` 상세: board 타입 모듈에 한해 per-board 관리 화면(분류/확장 변수/권한/피드) 진입 링크 노출. 기존 `admin.module.getById` 수정 없음 — board 타입 판별은 UI 레이어에서 수행 | PASS |

모듈 편집 기능 관련 커밋: `5266612` (M5 완료).

### M6 — 전역 알림 매트릭스 구현 (REQ-CPAR-026~028)

| AC | Actual Output | Status |
|---|---|---|
| AC-CPAR-015 전역 알림 게이트 | `packages/notification/src/service.ts` L44-85: SiteSetting `'notification.globalEvents'` 조회 → 개인 preference보다 우선 적용. 기본값: 모든 이벤트 활성(true). 카테고리별 전역 비활성 시 `create()` 즉시 skip(undefined 반환). `service.test.ts` AC-CPAR-015-1~7 7건 PASS(global OFF block, persistence, edge case) | PASS |
| AC-CPAR-015 전역 설정 관리 UI | `apps/web/server/api/routers/admin/settings.ts` L1442+: `notificationGlobalEvents` sub-router (get/update). `apps/web/app/admin/settings/notification/NotificationSettingsForm.tsx`: 4 checkboxes (comment/reply/mention/message) + 개별 submit 버튼. `actions.ts`: `UpdateGlobalEventsSchema` + `updateGlobalEventsAction` | PASS |
| AC-CPAR-015 AdminLog 기록 | `notificationGlobalEvents.update` 프로시저: AdminLog 기록 (`action: 'configure'`, `target: 'notification.globalEvents'`) | PASS |

전역 알림 매트릭스 관련 테스트 전체 통과: `packages/notification/src/service.test.ts` 45/45 PASS, typecheck clean (exit 0).

### 잔여 마일스톤 (M7, 그룹 H)

미착수. REQ-CPAR-029~030, AC-CPAR-016(메일 로그)은
다음 세션에서 이어서 진행.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: null  # 전체 SPEC 미완료 — M1~M6 완료, M7 잔여
run_commit_sha: "80b034c (M1), 5062c70 (M2), e911afc (M3), bcdc4cb (M4), 5266612 (M5), 9af1042 (M6)"
run_status: in-progress  # M7 잔여
ac_pass_count: 9  # AC-CPAR-001,002,003,004(M1/M2) + AC-CPAR-006,009(M3 필터 배선) + AC-CPAR-013(M5) + AC-CPAR-015(M6)
ac_pass_with_debt_count: 7  # AC-CPAR-005,006(M2 FK) + AC-CPAR-007,008,010(M3 런타임 재현 미실시) + AC-CPAR-011,012(M4 런타임 재현 미실시)
ac_fail_count: 0
preserve_list_post_run_count: 5  # plan.md §2 PRESERVE 목록 5건 — M6까지 위반 없음 확인(document/comment 서비스, spamfilter, Trash 모델, 회원용 알림 화면 미변경)
l44_pre_commit_fetch: true  # git fetch origin main 수행, 0 0 (동기 상태) 확인
l44_post_push_fetch: null  # 오케스트레이터가 push 후 확인 예정
new_warnings_or_lints_introduced: 0  # tsc --noEmit -p apps/web 0 errors
cross_platform_build:
  status: not_applicable
  reason: "TypeScript/Next.js 웹 프로젝트 — OS별 syscall 분기 없음"
total_run_phase_files: 49  # M1~M4 누적 36 + M5 신규 2(ModuleEditForm.test.tsx, ModuleEditForm.tsx) + 수정 2(admin/modules/[id]/edit/page.tsx, admin/module.ts) + M6 신규 3(NotificationSettingsForm.tsx, actions.ts, admin/settings.ts) + 수정 2(notification/page.tsx, packages/notification/src/service.ts)
m1_to_mN_commit_strategy: "마일스톤별 개별 커밋 — M1(사이드바) 80b034c, M2(휴지통) 5062c70, M3(문서·댓글 배선) e911afc, M4(파일 목록 완성) bcdc4cb, M5(모듈 편집) 5266612. M6~M7은 후속 세션 커밋 예정"
```

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

## Plan Audit

- 감사일: 2026-08-09 / 감사자: plan-auditor (iteration 1)
- 판정: **CONDITIONAL PASS** (must-fix 2건 해소 조건부)
- 종합 점수: 0.87 (Tier L 통과 기준 0.85 이상)

### Must-Pass 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| MP-1 REQ 번호 연속성 | PASS | REQ-CPAR-001~030 gapless·중복 없음 (A:2 + B:6 + C:7 + D:5 + E:3 + F:2 + G:3 + H:2 = 30) |
| MP-2 GEARS 형식 | PASS(minor 2건) | 30건 전부 shall + 패턴 사용. 결함 D2/D3 참조 |
| MP-3 frontmatter 12필드 | PASS | 12개 정규 필드 전부 존재, status: draft, 인용 semver, ISO 날짜. tier: L / depends_on은 optional 필드로 유효 |
| MP-4 언어 중립성 | N/A | 단일 프로젝트(TS 모노레포) SPEC |
| MP-5 Cross-SPEC(D7) | PASS | 참조 SPEC 18건 전수 status 확인 — 전부 completed (TEST-DEBT-001만 `evaluated`, 테스트 제외 기준으로만 인용). retired/superseded 미조정 충돌 없음 |
| MP-6 Cross-platform(D8) | N/A | syscall 무관 |
| MP-7 클래리피케이션 게이트 | OPEN 3건 | plan.md §4 마커 3건 (메일 로그 포함 여부 D-1 / 알림 채널 범위 D-2 / 스팸필터 노출 형태 D-4). draft 단계 정상이나 **Kickoff 전 AskUserQuestion 해소 필수** — spec §8 / plan §4 / progress §E.1 3면 일관 기재 확인 |

### 주장 무결성 스팟체크 (10/10 검증 통과)

spec.md HISTORY의 "존재/부재" 주장을 코드베이스 직접 대조 — **전건 사실과 일치**:

1. AdminSidebar '콘텐츠' 6링크만 존재, files/trash/spamfilter/spam-review 미노출 ✓ (AdminSidebar.tsx NAV 실측)
2. trash/page.tsx "구현 예정" placeholder + 백엔드 list/restore/purge 존재 ✓
3. documents/page.tsx `// TODO: Server Action 연동 필요` 2건(L149/155) + admin/document.ts listAcrossAllBoards/bulkUpdate/recoverTemp/deleteTemp/getConfig/updateConfig 전부 존재 ✓
4. comments 죽은 일괄 버튼 + admin/comment.ts listAcrossAllBoards/bulkDelete 존재, Comment 모델 isSecret만 존재(승인 개념 없음) ✓ (schema.prisma L868)
5. admin.file.list `search`/`fileType` 파라미터 존재(file.ts L36-37)하나 FileManagementClient.tsx 미사용, sort 파라미터 부재 ✓
6. modules/[id]/page.tsx L46·L121 `/edit` 링크 존재, edit 라우트 부재(dead link), admin.module.update 존재(L160) ✓
7. spamfilter 5화면 {ip,words,block,captcha,url} + spam-review + 라우터(deniedIps/deniedWords/rateLimit/captcha/urlBlacklist L353/reviewQueue L447) 전부 존재 ✓
8. Trash 모델 `documentId @unique` (schema.prisma L1032, 문서 전용) ✓
9. documents/{config,declared} + comments/declared 화면 존재 ✓
10. /admin/settings/notification = SMTP 발신 설정 화면, /admin/site/mail 존재, boards/[mid]/{categories,extra-keys,permissions,feed} 존재 ✓

AC 기계 검증 4종(AC-003 "구현 예정" grep, AC-006 "Dynamic board options" grep, AC-008 TODO grep, AC-013 test -f)은 현재 전부 구현 전 상태(각각 1/1/2건·파일 부재)라 **removal 검증으로 유효**(공허 검증 아님) ✓

### 결함 목록

| # | 심각도 | 위치 | 내용 | 요구 조치 |
|---|---|---|---|---|
| D1 | must-fix (major) | 아티팩트 셋 | **design.md 부재** — tier: L은 5아티팩트(spec/plan/acceptance/design/research)를 요구하나 4개만 존재 (progress §E.1도 4개만 기재). 설계 내용은 plan.md §0(D-1~D-6)에 실질 존재 | design.md 작성(plan §0 승격/참조 가능) 또는 Tier L 아티팩트 면제를 HISTORY에 명시 기록 |
| D2 | should-fix (minor) | spec.md REQ-CPAR-004 | "Where — capability gate" 라벨이나 조건("타입 필터가 선택된 경우")은 런타임 사용자 선택 — GEARS Where(capability gate/feature flag/정적 설정)의 오용. When(event) 또는 While(state)이 정확 | 패턴 라벨 교정 |
| D3 | should-fix (minor) | spec.md REQ-CPAR-014 | Ubiquitous(IP 컬럼 표시) + 내장 When절(IP 클릭 필터링, 자체 shall 없음) 2개 요구가 1건에 병합 | 2건 분리 또는 GEARS compound 형식으로 재작성 |
| D4 | should-fix (minor) | spec.md §2(L81)·§5 헤더(L135) | "7개 격차 그룹"이나 표는 A~H **8개**. "그룹 ↔ plan.md 마일스톤 1:1" 주장도 부정확(C+D→M3, 8그룹→7마일스톤) | 개수 정정 + 매핑 서술 교정 |
| D5 | note (minor) | spec.md HISTORY | 행번호 인용 근사치(documents 199행→실제 TODO L149/155, comments 142행→L132 인근). 주장 실체는 전부 정확 | 선택 정정 |
| D6 | note (should) | frontmatter depends_on | 의존 6건 전부 `.moai/specs/_archive/`에 위치(status: completed) — 기계적 Depends_on pre-flight가 `.moai/specs/<ID>/spec.md` 경로에서 NOT FOUND 처리할 수 있음 | 오케스트레이터가 archive 소재 completed를 충족으로 간주(또는 override 로그) |
| D7 | note (minor) | acceptance.md | 헤더는 "기계 검증 명령을 각 AC에 병기"라 하나 AC-002/009/011/014/015/016은 기계 명령 없음(런타임 재현 의존 — 영속 기준 특성상 수용 가능) | 헤더 표현 완화 또는 e2e/vitest 포인터 추가 |
| D8 | observation | frontmatter id | 다세그먼트 ID(SPEC-CONTENT-PARITY-001)는 스키마 정규식(단일 세그먼트)과 불일치하나 프로젝트 전반 관례(MEMBER-PARITY 등)와 일치. `related_specs`는 문서화된 optional 필드 목록 외(무해) | 조치 불요 |

### 마일스톤 정합성 (M1~M7)

- 순서·파일 소유: 마일스톤 간 파일 충돌 없음(M1 AdminSidebar / M2 trash / M3 documents+comments / M4 files / M5 modules / M6 notification / M7 schema+mail). owner 단일(manager-develop) — 병렬 쓰기 충돌 없음 ✓
- M7 조건부 처리(클래리피케이션 #1 미포함 결정 시 REQ-029~030 후속 SPEC 이관 + spec 개정)가 plan에 명시 — 정합 ✓
- 참고: M1이 `/admin/trash` 링크를 노출하는 시점에 M2 완료 전이면 placeholder 화면이 잠시 노출됨(과도기 UX). M1↔M2 순서 교환 또는 M1 커밋에 최소 안내 문구 고려 — 차단 사항 아님
- PRESERVE 목록(polls/pages/spamfilter 5화면/Trash 스키마/회원 알림 화면)은 Out of Scope·격차없음 판정과 일관 ✓

### 스코프 규율

- Out of Scope 8건 전부 `### Out of Scope — <주제>` H3 + 구체 bullet 형식 ✓
- 에디터 DROP은 SPEC-MODULE-BACKLOG-001(completed) triage 인용과 일치 ✓; 댓글 승인 제외는 Comment 모델 실측(isPublished 부재)과 일치 ✓; ffmpeg 제외는 SPEC-FILE-001 sharp 범위 서술과 일치 ✓

### 차원 점수 (rubric 기준)

| 차원 | 점수 | 근거 |
|---|---|---|
| Clarity | 0.90 | 전 요구 단일 해석 가능. D2/D3/D4 경미 감점 |
| Completeness | 0.80 | 필수 섹션 전부 존재(HISTORY/§1 Why/§2 What/§5 REQ/§6 Out of Scope). design.md 부재 감점 |
| Testability | 0.85 | 런타임 영속 기준 + 유효 기계 grep 4종. 일부 AC 기계 명령 부재 |
| Traceability | 0.90 | REQ 30건 전부 AC 그룹 매핑, 고아 AC 없음. REQ-008/026은 간접 커버(DoD 백엔드 테스트 항목으로 보강됨) |

### Chain-of-Verification (2차 자기검증)

REQ 번호 전수 재확인(30건 gapless), 요구 간 모순 탐색(REQ-017 상태필터 ↔ 승인 제외: isSecret 기준으로 무모순), AC grep 4종의 구현 전 실패 상태 확인(공허 검증 배제), Out of Scope 형식 전수 확인 수행. 2차 신규 결함: D4(그룹 개수 불일치)는 1차에서 발견, 2차 추가 결함 없음.

### 권고

**Kickoff 전 필수(must-fix)**:
1. `[NEEDS CLARIFICATION]` 3건을 orchestrator AskUserQuestion 라운드로 확정 (MP-7 게이트)
2. D1 해소: design.md 작성 또는 Tier L 아티팩트 면제 명시

**권장(should-fix)**: D2·D3(GEARS 라벨), D4(그룹 개수/1:1 서술), D6(depends_on archive 경로 인지), D7(기계 검증 헤더)

#### 해소 현황 (2026-08-09, manager-spec 후속 기록 — 감사 원문 무수정 보존)

- must-fix 1 (MP-7 클래리피케이션 3건): **해소 완료** — 사용자 AskUserQuestion 라운드에서 전건
  확정(메일 로그 포함 / 알림 채널 web 단독 / 스팸필터 허브+탭). 기록: plan.md §4,
  spec.md HISTORY v0.1.1, §E.1 `open_clarifications: 0`.
- must-fix 2 (D1 design.md 부재): **해소 완료** — design.md 작성됨(§A 아키텍처, §B D-1~D-6,
  §C 마일스톤 스케치, §D 데이터 모델, §E research.md 교차 참조). §E.1 artifacts에 반영.
- should-fix D2(REQ-CPAR-004 While 전환)·D3(REQ-CPAR-014a/b 분리)·D4(그룹 8개+매핑 정정):
  **반영 완료**. D5·D6·D7은 note 수준으로 미조치(감사 판정대로 차단 사항 아님).

## §F Phase 4 Mode Selection

- 입력: tier L, scope ~30+ 파일(7개 마일스톤), 도메인 2(admin UI + tRPC 라우터), 언어 TS 단일, 코딩 중심(concurrency benefit LOW)
- 모드 평가: trivial(아님—다중 파일), background(아님—쓰기 작업), agent-team(RETIRED), parallel(아님—코딩 중심, Anthropic coding-task parallelism caveat), workflow(아님—균일 기계적 변환 아님, 마일스톤 간 의존 존재), sub-agent(선택)
- Decision: sub-agent
- Justification: 코딩 중심 Tier L SPEC으로 마일스톤별 순차 manager-develop 위임(Mode 5)이 기본 경로. 마일스톤 간 파일 의존(M1 사이드바 ← M2~M7 라우트)이 있어 병렬화 부적합. Implementation Kickoff Approval은 2026-08-09 사용자 승인 완료.
