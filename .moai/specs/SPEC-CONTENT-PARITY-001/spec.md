---
id: SPEC-CONTENT-PARITY-001
title: "관리자 콘텐츠 메뉴 레거시 parity — 휴지통/파일/스팸필터 노출 + 문서·댓글 관리 배선 + 알림·메일 로그"
version: "0.1.1"
status: draft
created: 2026-08-09
updated: 2026-08-09
author: manager-spec
priority: P1
phase: "Phase 12 — 관리자 콘텐츠 메뉴 레거시 parity"
module: "apps/web/app/admin/{documents,comments,files,trash,modules,settings}, apps/web/server/api/routers/admin, apps/web/components/admin/AdminSidebar"
lifecycle: spec-anchored
tier: L
tags: "content, admin, legacy-parity, trash, files, spamfilter, notification, mail-log, bulk-operations, sidebar"
depends_on: [SPEC-ADMIN-002, SPEC-CONTENT-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001, SPEC-FILE-001, SPEC-SPAM-001]
related_specs: [SPEC-POLL-001, SPEC-NOTIFICATION-001, SPEC-MAIL-001, SPEC-MESSAGE-001, SPEC-MODULE-BACKLOG-001, SPEC-BOARD-CRUD-001, SPEC-FEED-001, SPEC-ADMIN-001, SPEC-MEMBER-PARITY-001]
---

# SPEC-CONTENT-PARITY-001 — 관리자 콘텐츠 메뉴 레거시 parity

> 레거시 Rhymix(PHP) admin '콘텐츠' 메뉴 11개 항목(게시판/페이지/문서/댓글/파일/설문/에디터/
> 스팸필터/휴지통/메일·SMS·푸시/알림 센터)을 재설치·Playwright 전수 분석(research.md)으로
> 인벤토리화하고, rhymix-ts 코드베이스를 직접 대조 검증하여 확인된 격차를 rhymix-ts 아키텍처
> (tRPC + Prisma + App Router)에 맞게 이식한다. PHP 1:1 포팅이 아니다.

## HISTORY

- 2026-08-09 (v0.1.1): 클래리피케이션 3건 전건 해소(사용자, orchestrator AskUserQuestion 라운드).
  (1) 메일 발송 로그(그룹 H/M7) **본 SPEC 포함 확정** — REQ-CPAR-029~030 무조건부 전환,
  MailLog 모델+마이그레이션은 design.md D-1대로. (2) 알림 매트릭스 채널 범위 **web(인앱) 단독**
  확정 — REQ-CPAR-026에서 채널 범위 유보 문구 제거, mail 채널 발송 로직은 범위 밖.
  (3) 스팸필터 노출 형태 **허브+탭** 확정 — 사이드바 단일 링크 + 공유 탭 레이아웃
  (REQ-CPAR-002 고정). 같은 날 Implementation Kickoff Approval 승인됨(progress.md §E.1 참조).
  plan-audit 지적 반영 이력: design.md 신설(Tier L 5-artifact), REQ-CPAR-004 While 전환,
  REQ-CPAR-014 → 014a/014b 분리, §2 그룹 수 8개 정정.
- 2026-08-09 (v0.1.0): 최초 작성. `research.md`(레거시 전 화면 DOM 수집)와 rhymix-ts 코드베이스
  직접 확인(Glob/Grep/Read)을 대조하여 작성. research.md §4의 gap 후보를 그대로 옮기지 않고
  아래 사실을 코드에서 재검증함:
  - `apps/web/components/admin/AdminSidebar.tsx` NAV(68~116행): '콘텐츠' 섹션은
    modules/widgets/pages/documents/comments/polls 6개 링크만 보유.
    `/admin/files`, `/admin/trash`, 스팸필터 5화면, `/admin/spam-review`는 라우트가
    **존재함에도** 사이드바 어디에도 노출되지 않음.
  - `apps/web/app/admin/trash/page.tsx`(31행): "구현 예정 — Prisma 연동 후 활성화" placeholder.
    반면 백엔드 `apps/web/server/api/routers/admin/trash.ts`는 `list`/`restore`/`purge`
    프로시저가 구현되어 있음(문서 전용 — `Trash` 모델은 `documentId @unique`, 댓글 미지원).
  - `apps/web/app/admin/documents/page.tsx`(199행): 필터 4종은 정적 HTML(폼 제출/URL 연동 없음),
    게시판 select는 빈 목록, 일괄 작업 버튼 4종·TEMP 복구/삭제 버튼·'더 보기' 버튼 전부
    핸들러 없음(소스에 `// TODO: Server Action 연동 필요` 주석). 반면 백엔드
    `admin/document.ts`는 `listAcrossAllBoards`(status/search/moduleInstanceId/authorId),
    `bulkUpdate`(delete/trash/move/status), `recoverTemp`/`deleteTemp`,
    `getConfig`/`updateConfig`, alias 관리까지 구현 완료.
  - `apps/web/app/admin/comments/page.tsx`(142행): 동일 패턴 — 필터 정적, 일괄 삭제 버튼 죽어
    있음. 백엔드 `admin/comment.ts`는 `listAcrossAllBoards` + `bulkDelete` 구현 완료.
    `Comment` 모델에 승인(발행 대기) 개념 없음(`isSecret`만 존재).
  - `apps/web/app/admin/files/`: 목록(고아 파일 정리 dry-run 포함) + `settings`
    (업로드/다운로드/기타 3폼) 구현 완료. 단 `admin.file.list`의 `search`/`fileType` 파라미터를
    UI가 사용하지 않고, 정렬·선택 일괄 삭제 없음.
  - 스팸필터: `apps/web/app/admin/settings/spamfilter/{ip,words,block,captcha,url}` 5개 화면 +
    `/admin/spam-review` 검토 큐 + `admin/spamfilter.ts`(deniedIps/deniedWords/rateLimit/
    urlBlacklist/captcha/reviewQueue) 전부 구현 완료 — 격차는 사이드바 미노출뿐.
  - `apps/web/app/admin/modules/[id]/page.tsx` 46·121행: `/admin/modules/${id}/edit` 링크가
    있으나 해당 라우트 **부재**(dead link). `admin.module.update` 프로시저는 존재.
    per-board 관리 화면 `/admin/boards/[mid]/{categories,extra-keys,permissions,feed}`는
    존재하나 모듈 상세에서 진입 링크 없음.
  - 알림: `packages/notification`(SPEC-NOTIFICATION-001 completed)은 회원용 인앱(web 채널) 알림
    + per-user `NotificationPreference`만 제공. 레거시 ncenterlite의 관리자 전역
    이벤트×채널 매트릭스에 해당하는 admin 설정 화면 없음
    (`/admin/settings/notification`은 SMTP 발신 설정 화면임).
  - 메일: `/admin/site/mail`(env 기반 SMTP 상태+테스트), `/admin/settings/notification`
    (DB 기반 SMTP 설정+테스트 메일)만 존재. 발송 내역 로그·예외 도메인·SMS·푸시 인프라 전무.
  - 에디터: `/admin/editor` 라우트·라우터 부재. 본문 에디터는 Tiptap
    (`packages/board/src/components/TiptapEditor.tsx`). SPEC-MODULE-BACKLOG-001 triage에서
    레거시 editor 모듈은 **DROP**(Tiptap 대체) 판정됨 — 본 SPEC은 그 결정을 준수한다.
  - 설문: `/admin/polls`(목록/생성/편집/결과/설정) + `admin/poll.ts` 완전 구현 — 격차 없음 수준.
  - 페이지: `/admin/pages` 목록 + `/admin/pages/[instanceId]/edit` 존재 — 대체로 parity.

## 1. 배경 (Why)

사용자 목표: "레거시 admin '콘텐츠' 메뉴의 기능을 완벽하게 구현". 레거시(Docker `rhymix-app`,
:8080)와 rhymix-ts(:3000)를 동일 조건(초기화 후 첫 설치)으로 재현하고 레거시 11개 메뉴 전
화면을 구조 수집한 결과(research.md), rhymix-ts는 **백엔드가 UI보다 앞서 있는** 상태다:
문서/댓글/휴지통/파일/스팸필터의 tRPC 프로시저는 대부분 존재하지만, (a) 사이드바가 해당
화면을 노출하지 않거나, (b) 화면의 필터·일괄 작업이 배선되지 않은 정적 HTML이거나,
(c) 화면 자체가 placeholder다. 그 외 관리자 전역 알림 매트릭스·메일 발송 로그는 백엔드부터
부재하다.

## 2. 범위 (What)

본 SPEC은 다음 8개 격차 그룹(A~H)을 해소한다. 마일스톤 대응은 A→M1, B→M2, **C·D→M3(통합)**,
E→M4, F→M5, G→M6, H→M7이다 (plan.md §1 참조):

| 그룹 | 격차 | 성격 |
|---|---|---|
| A | 사이드바 '콘텐츠' 섹션 재구성 (파일/휴지통/스팸필터 노출 + 레거시 순서) | UI 배선 |
| B | 휴지통 화면 구현 (placeholder 대체) + 댓글 휴지통·비우기 백엔드 확장 | UI + 백엔드 |
| C | 문서 관리 화면 배선 완성 (필터/일괄/TEMP/페이지네이션/IP/신고 링크) | UI 배선 + 소폭 백엔드 |
| D | 댓글 관리 화면 배선 완성 (필터/일괄 삭제/페이지네이션/신고 링크) | UI 배선 + 소폭 백엔드 |
| E | 파일 목록 검색·필터·정렬·선택 삭제 | UI + 백엔드 확장 |
| F | 모듈 편집 화면(dead link 해소) + per-board 관리 링크 노출 | UI + 기존 프로시저 활용 |
| G | 관리자 전역 알림 이벤트 매트릭스 | 신규 |
| H | 메일 발송 내역 로그 (2026-08-09 포함 확정) | 신규 |

### 2.1 격차 없음 확인 항목 (요구사항 없음)

- **설문**: 확인됨 — 격차 없음. `/admin/polls` 목록·생성·편집·결과·전역 설정이 레거시
  (목록+일괄 삭제뿐)보다 오히려 넓음.
- **페이지**: 확인됨 — 격차 없음(핵심 기준). 목록 + 개별 편집 존재. 복사·다국어 모달은 §6 참조.
- **스팸필터 코어 기능**: 확인됨 — 격차 없음. IP/키워드/자동차단(rate limit)/캡챠/URL 블랙리스트/
  검토 큐 전부 동작. 격차는 노출(그룹 A)뿐.
- **파일 설정 3폼**: 확인됨 — 격차 없음(간소화된 대응). 업로드/다운로드/기타 설정 존재.
  레거시의 ffmpeg 기반 변환 파이프라인 설정은 §6 참조.
- **문서 기본 설정·신고 목록 / 댓글 신고 목록 화면**: 확인됨 — 화면 존재
  (`/admin/documents/config`, `/admin/documents/declared`, `/admin/comments/declared`).
  격차는 목록 화면에서의 진입 링크 부재뿐(그룹 C/D에 포함).

## 3. 현재 상태 요약 (검증된 사실 — 11개 항목 대조표)

| # | 레거시 메뉴 | rhymix-ts 현황 | 판정 |
|---|---|---|---|
| 1 | 게시판 | 모듈 목록+일괄 삭제+상세(읽기 전용). per-board 분류/확장변수/권한/피드 화면 존재. `[id]/edit` dead link | 부분 — 그룹 F |
| 2 | 페이지 | 목록+개별 편집 | 격차 없음 |
| 3 | 문서 | 백엔드 완비, UI 필터·일괄·TEMP·페이지네이션 미배선 | 부분 — 그룹 C |
| 4 | 댓글 | 백엔드 완비(list+bulkDelete), UI 미배선 | 부분 — 그룹 D |
| 5 | 파일 | 목록+고아 정리+설정 3폼. 검색/정렬/선택 삭제 없음. 사이드바 미노출 | 부분 — 그룹 A/E |
| 6 | 설문 | 완전 구현 | 격차 없음 |
| 7 | 에디터 | admin 화면 부재. 선행 triage에서 DROP 판정(Tiptap 대체) | Out of Scope |
| 8 | 스팸필터 | 5개 설정 화면+검토 큐 완비. 사이드바 미노출 | 부분 — 그룹 A |
| 9 | 휴지통 | 백엔드(문서 전용) 존재, UI placeholder, 사이드바 미노출 | 격차 — 그룹 A/B |
| 10 | 메일·SMS·푸시 | SMTP 설정+테스트만. 발송 로그·SMS·푸시 부재 | 격차 — 그룹 H (SMS/푸시는 Out of Scope) |
| 11 | 알림 센터 | 회원용 인앱 알림 완비. 관리자 전역 매트릭스 부재 | 격차 — 그룹 G |

## 4. 재발 방지 기록 ("완료" 마킹의 함정)

[HARD] 본 SPEC의 acceptance는 SPEC-MENU-001 / SPEC-MEMBER-ADMIN-001 / SPEC-MEMBER-PARITY-001의
선례를 따라 **런타임 영속(작업 실행 후 새로고침 또는 재조회 시 결과 유지)** 을 관찰 기준으로
삼는다. "버튼이 렌더된다" / "프로시저가 존재한다"만으로는 완료로 마킹하지 않는다. 본 SPEC의
발단 자체가 "백엔드 프로시저 존재 + UI 버튼 렌더"가 기능 완성으로 오인된 사례(문서/댓글 관리
화면)다.

---

## 5. 요구사항 (GEARS)

> REQ-CPAR 번호는 001~030 연속이며, 014는 감사(plan-audit) 지적에 따라 014a/014b 두 요구사항으로
> 분리되었다(후속 번호 재배열 없음 — AC/plan의 범위 참조 유지 목적). 그룹(A~H) 순서는 사용자
> 가치 순이며 마일스톤 대응은 §2 표를 따른다(C·D는 M3로 통합). 세부 파라미터·구조 설계는
> plan.md §0 핵심 설계 결정과 design.md를 단일 진실 원천으로 삼는다.

### Group A — 사이드바 '콘텐츠' 섹션 재구성

- **REQ-CPAR-001** (Ubiquitous): `AdminSidebar` '콘텐츠' 섹션 **shall** 파일(`/admin/files`),
  휴지통(`/admin/trash`), 스팸필터 진입 링크를 추가하고, 레거시 콘텐츠 메뉴 순서
  (게시판→페이지→문서→댓글→파일→설문→스팸필터→휴지통)를 참고하여 항목을 재배열한다.
  위젯 시스템 링크는 rhymix-ts 고유 항목으로 유지하며 위치는 구현 결정 사항이다.
- **REQ-CPAR-002** (Ubiquitous): 스팸필터 진입점 **shall** 사이드바의 단일 '스팸필터' 링크와,
  기존 5개 설정 화면(`/admin/settings/spamfilter/{ip,words,block,captcha,url}`) 및 검토 큐
  (`/admin/spam-review`)를 잇는 공유 탭 내비게이션(허브+탭 — 2026-08-09 확정, design.md D-4
  안 2)으로 구성된다.

### Group B — 휴지통 화면 구현

- **REQ-CPAR-003** (Ubiquitous): `/admin/trash` **shall** placeholder를 대체하는 실제 목록
  화면을 제공한다. 목록은 최소한 타입(문서/댓글), 제목 또는 내용 요약, 작성자, 삭제한 관리자,
  삭제일, 만료일을 표시한다.
- **REQ-CPAR-004** (While — state-driven): **While** 타입 필터가 문서 또는 댓글로 선택된 상태인
  동안, 화면 **shall** 해당 타입의 항목만 표시한다. **When** 필터를 전체로 되돌리면, 화면
  **shall** 두 타입을 모두 표시한다.
- **REQ-CPAR-005** (Event-Driven): **When** 관리자가 항목 복원을 실행하면, 시스템 **shall**
  원본 콘텐츠를 복원하고 AuditLog를 기록하며, 재조회 후에도 결과가 유지된다.
- **REQ-CPAR-006** (Event-Driven): **When** 관리자가 개별 영구 삭제를 실행하면, 시스템 **shall**
  확인 다이얼로그를 거쳐 해당 항목을 영구 삭제(purge)한다.
- **REQ-CPAR-007** (Event-Driven): **When** 관리자가 휴지통 비우기를 실행하면, 시스템 **shall**
  범위(전체/문서만/댓글만)를 선택받고 확인 다이얼로그를 거쳐 일괄 영구 삭제한다.
- **REQ-CPAR-008** (Ubiquitous): 백엔드 **shall** 댓글 휴지통 조회·복원·영구 삭제와 휴지통
  비우기를 지원하도록 확장된다. 현재 `admin.trash` 라우터는 문서 전용(`Trash` 모델
  `documentId @unique`)이며, 댓글은 `Comment.deletedAt` 소프트 삭제 기반이다 — 통합 방식은
  plan.md §핵심 설계 결정을 따른다.

### Group C — 문서 관리 화면 배선 완성

- **REQ-CPAR-009** (Ubiquitous): `/admin/documents` 필터(게시판/작성자/상태/검색) **shall**
  URL 쿼리 파라미터와 연동되어 실제로 목록을 필터링한다(현재 정적 HTML).
- **REQ-CPAR-010** (Ubiquitous): 게시판 필터 select **shall** 사이트의 게시판 목록에서 동적으로
  채워진다.
- **REQ-CPAR-011** (Event-Driven): **When** 관리자가 행을 선택하고 일괄 작업(휴지통 이동/삭제/
  이동/상태 변경)을 실행하면, 시스템 **shall** 확인 다이얼로그를 거쳐
  `admin.document.bulkUpdate`를 호출하고 결과가 재조회 후에도 유지된다.
- **REQ-CPAR-012** (Event-Driven): **When** TEMP 문서의 복구 또는 삭제 버튼을 실행하면,
  시스템 **shall** `admin.document.recoverTemp` / `deleteTemp`를 호출한다(현재 dead button).
- **REQ-CPAR-013** (Event-Driven): **When** '더 보기'를 클릭하면, 화면 **shall** cursor
  페이지네이션으로 다음 페이지를 로드한다.
- **REQ-CPAR-014a** (Ubiquitous): 문서 목록 **shall** 각 행에 IP 주소 컬럼을 표시하고, 백엔드
  `admin.document.listAcrossAllBoards` **shall** ip 필터 파라미터를 지원하도록 확장된다.
- **REQ-CPAR-014b** (Event-Driven): **When** 관리자가 목록의 IP 주소를 클릭하면, 화면 **shall**
  해당 IP로 필터링된 목록을 표시한다(URL 쿼리 파라미터 연동 — REQ-CPAR-009와 동일 메커니즘).
- **REQ-CPAR-015** (Ubiquitous): 문서 관리 화면 **shall** 신고 목록(`/admin/documents/declared`)
  진입 링크를 제공한다.

### Group D — 댓글 관리 화면 배선 완성

- **REQ-CPAR-016** (Ubiquitous): `/admin/comments` 필터(게시판/작성자/검색) **shall** URL 쿼리
  파라미터와 연동되어 실제로 동작한다.
- **REQ-CPAR-017** (Ubiquitous): 댓글 목록 **shall** 상태 필터(전체/공개/비밀 — `isSecret` 기준)를
  제공한다(백엔드 파라미터 확장 포함).
- **REQ-CPAR-018** (Event-Driven): **When** 관리자가 행을 선택하고 일괄 삭제를 실행하면,
  시스템 **shall** 확인 다이얼로그를 거쳐 `admin.comment.bulkDelete`를 호출하고 결과가
  재조회 후에도 유지된다.
- **REQ-CPAR-019** (Event-Driven): **When** '더 보기'를 클릭하면, 화면 **shall** cursor
  페이지네이션으로 다음 페이지를 로드한다.
- **REQ-CPAR-020** (Ubiquitous): 댓글 관리 화면 **shall** 신고 목록(`/admin/comments/declared`)
  진입 링크를 제공한다.

### Group E — 파일 목록 완성

- **REQ-CPAR-021** (Ubiquitous): `/admin/files` 목록 **shall** 파일명 검색과 파일 타입 필터 UI를
  제공한다(기존 `admin.file.list`의 `search`/`fileType` 파라미터 활용).
- **REQ-CPAR-022** (Ubiquitous): 파일 목록 **shall** 정렬(파일 크기/다운로드 수/등록일)을
  제공한다(백엔드 정렬 파라미터 확장 포함).
- **REQ-CPAR-023** (Event-Driven): **When** 관리자가 파일을 선택하고 일괄 삭제를 실행하면,
  시스템 **shall** 확인 다이얼로그를 거쳐 선택 파일을 삭제하고 AuditLog를 기록한다
  (백엔드 신규 프로시저 — 이름은 plan.md 설계 결정).

### Group F — 게시판(모듈) 관리 보강

- **REQ-CPAR-024** (Ubiquitous): `/admin/modules/[id]/edit` 라우트 **shall** 존재하며
  `admin.module.update`와 연동된 편집 폼(최소: 제목/브라우저 제목/설명)을 제공한다
  (모듈 상세 화면의 dead link 해소).
- **REQ-CPAR-025** (Ubiquitous): board 타입 모듈의 상세 화면 **shall** per-board 관리 화면
  (`/admin/boards/[mid]/{categories,extra-keys,permissions,feed}`) 진입 링크를 노출한다.

### Group G — 관리자 전역 알림 이벤트 매트릭스

- **REQ-CPAR-026** (Ubiquitous): 관리자 **shall** 알림 이벤트별(댓글/대댓글/멘션/쪽지) 사이트
  전역 사용 여부를 설정하는 화면을 제공받는다. 채널 범위는 **web(인앱) 단독**으로 확정한다
  (2026-08-09 사용자 결정 — mail 채널 발송 로직은 본 SPEC 범위 밖). 저장 위치·스키마는
  plan.md §0 D-2 및 design.md D-2를 따른다.
- **REQ-CPAR-027** (While — state-driven): **While** 특정 이벤트가 전역 비활성 상태인 동안,
  알림 서비스 **shall** 해당 이벤트의 알림 생성을 억제한다(개인 설정보다 우선).
- **REQ-CPAR-028** (Ubiquitous): 저장된 전역 매트릭스 **shall** 재조회(새로고침) 후에도
  유지된다.

### Group H — 메일 발송 내역 로그 (2026-08-09 본 SPEC 포함 확정)

- **REQ-CPAR-029** (Event-Driven): **When** 시스템이 메일 발송을 시도하면, 시스템 **shall**
  발송 내역(수신자/제목/성공 여부/오류 메시지/발송 시각)을 기록한다.
- **REQ-CPAR-030** (Ubiquitous): 관리자 **shall** 메일 발송 내역 목록 화면(상태 필터 +
  페이지네이션)을 제공받는다.

---

## 6. Exclusions (What NOT to Build)

### Out of Scope — 에디터 관리 화면

- 레거시 에디터 모듈(스킨/컬러셋/툴바/폰트 19종/컴포넌트 관리) admin 화면은 이식하지 않는다.
  SPEC-MODULE-BACKLOG-001 triage에서 editor 모듈은 DROP(Tiptap 대체) 판정되었고, 본 SPEC은
  그 결정을 준수한다. Tiptap 자체 설정 admin 화면 신설도 본 SPEC 범위 밖이다.

### Out of Scope — SMS / 푸시 알림 인프라

- 레거시 advanced_mailer의 SMS·푸시 발송/테스트/로그 기능은 이식하지 않는다. rhymix-ts에는
  SMS·푸시 발송 인프라 자체가 없으며, 도입 시 별도 SPEC이 필요하다. 본 SPEC의 그룹 H는
  메일 발송 로그만 다룬다.

### Out of Scope — 이미지/비디오 변환 파이프라인 설정

- 레거시 파일 업로드 설정의 ffmpeg/magick 기반 변환 옵션(gif→mp4, 비디오 변환/썸네일,
  EXIF 제거, 재인코딩 등)은 이식하지 않는다. rhymix-ts는 sharp 기반 이미지 리사이즈만
  지원(SPEC-FILE-001)하며 현행 업로드 설정 폼이 그 범위를 이미 커버한다.

### Out of Scope — 댓글 승인(대기/발행) 워크플로

- 레거시 댓글 관리의 대기/발행 필터와 발행 일괄 처리는 이식하지 않는다. `Comment` 모델에
  승인 개념이 없고(`isSecret`만 존재), 승인제 도입은 스키마·작성 플로 전반에 걸친 별도
  SPEC 사안이다.

### Out of Scope — 모듈 일괄 설정 3탭 및 모듈 복사

- 레거시 게시판 목록의 일괄 기본/추가/권한 설정 3탭과 모듈 복사 팝업은 이식하지 않는다.
  1인 운영 규모에서 사용 빈도 대비 구현 비용이 크며, 모듈 개별 편집(REQ-CPAR-024)과
  기존 일괄 삭제로 핵심 운영이 가능하다.

### Out of Scope — 다국어 텍스트 모달

- 레거시 페이지 관리의 다국어 텍스트 설정 모달(#g11n)은 이식하지 않는다. rhymix-ts에
  다국어 콘텐츠 시스템이 없다.

### Out of Scope — 스팸필터 히트 카운트·회원 제외 플래그

- 레거시 스팸 IP/키워드 목록의 히트 수/최근 히트/회원 제외 컬럼은 이식하지 않는다.
  `SpamDeniedWord`/`SpamDeniedIp` 모델에 해당 필드가 없으며 차단 기능 자체는 동작한다.

### Out of Scope — 설문 목록 검색·일괄 삭제, 페이지 복사

- 설문 관리는 이미 레거시 대비 동등 이상이므로 목록 검색·일괄 삭제는 추가하지 않는다.
  페이지 모듈 복사도 동일 사유로 제외한다.

---

## 7. 의존 / 관련 SPEC

| SPEC | 관계 |
|---|---|
| SPEC-ADMIN-002 | 문서/댓글/파일/스팸필터/설문 admin 백엔드·화면의 원 구현. 본 SPEC은 그 UI 미배선 부분을 완성 |
| SPEC-CONTENT-001 / SPEC-DOCUMENT-001 / SPEC-COMMENT-001 | 문서·댓글 도메인 서비스. bulkUpdate/bulkDelete/trash 서비스 재사용 |
| SPEC-FILE-001 | 파일 업로드/삭제 cascade. 파일 일괄 삭제 시 이 서비스 경유 |
| SPEC-SPAM-001 | 스팸필터·검토 큐 원 구현. 본 SPEC은 노출(사이드바/허브)만 추가 |
| SPEC-POLL-001 | 설문 — 격차 없음 확인의 근거 |
| SPEC-NOTIFICATION-001 | 회원용 알림 센터(완료). REQ-CPAR-026~028은 그 위에 전역 게이트를 추가 |
| SPEC-MAIL-001 | SmtpMailDispatcher. REQ-CPAR-029는 dispatcher에 로그 훅 추가 |
| SPEC-MODULE-BACKLOG-001 | 에디터 DROP triage 결정의 출처 |
| SPEC-BOARD-CRUD-001 / SPEC-FEED-001 | per-board 관리 화면(분류/확장변수/권한/피드)의 원 구현 |
| SPEC-MEMBER-PARITY-001 | 직전 섹션(회원) parity SPEC — 문서 규약·acceptance 기준 선례 |

## 8. 미해결 질문 (전건 해소 — 2026-08-09)

클래리피케이션 3건(메일 로그 포함 여부 → **포함**, 알림 매트릭스 채널 범위 → **web 단독**,
스팸필터 노출 형태 → **허브+탭**)은 2026-08-09 orchestrator AskUserQuestion 라운드에서
사용자가 모두 확정했다. 상세 기록은 plan.md §4, HISTORY v0.1.1 참조. 미해결 질문 없음.
