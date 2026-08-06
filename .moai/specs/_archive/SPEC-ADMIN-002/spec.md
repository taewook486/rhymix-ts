---
id: SPEC-ADMIN-002
title: 관리자 패널 미구현 기능 완성 (레거시 분석 기반)
version: 1.3.0
status: completed
created: 2026-06-14
updated: 2026-06-20
author: MoAI manager-spec
priority: P1
phase: 6
parent: MASTER-PLAN-002
depends-on: [SPEC-ADMIN-001, SPEC-ADMIN-EXTRAS-001, SPEC-AUTH-001, SPEC-CONTENT-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001, SPEC-FILE-001, SPEC-POINT-001, SPEC-MAIL-001, SPEC-LAYOUT-001, SPEC-PAGE-001, SPEC-WIDGET-001, SPEC-THEME-001, SPEC-THEME-POLISH-001]
issue_number: TBD
related-research: SPEC-ADMIN-002/research.md
language: ko
---

# SPEC-ADMIN-002 — 관리자 패널 미구현 기능 완성 (Phase 6 / P1)

## HISTORY

- 2026-06-20 (M3 Slice 3C 점검 완료): Slice 3C(회원 부가 설정, REQ-ADMIN2-049/028) 점검 결과 — REQ-ADMIN2-028은 Slice 3D 커밋 `accc895`에서 이미 구현·테스트(EDIT-8/EDIT-9) 완료되어 추가 작업 불필요함을 확인. REQ-ADMIN2-049는 "기존에 구성된 소셜 프로바이더 토글"을 전제하지만, 코드베이스 전체(Prisma 스키마, 서버 라우터, research.md)에 소셜 로그인 프로바이더 설정 자체가 존재하지 않아 토글할 대상이 없음을 발견. 사용자 확인 후 REQ-ADMIN2-049를 **DEFERRED**로 재분류하고 SSO/OIDC 연동(Exclusions §5)과 함께 백로그로 이동. 코드 변경 없음 — SPEC 문서(본 항목, REQ-049 본문, Slice 3C 라인, Exclusions §5)만 갱신. M3 잔여 항목: Slice 3G(REQ-161, 선택적 개선)는 사용자가 이번 세션에서 비채택을 선택해 범위에서 제외.
- 2026-06-20 (M2 Slice 2D~2H 구현 완료): Slice 2D(SEO `/admin/settings/seo` · 고급 설정 `/admin/settings/advanced`[157/158 포함] · 비동기/큐 `/admin/settings/async`[154, v1.2.1 범위로 6필드 한정] · 사이트 잠금 런타임 `/admin/settings/sitelock`) · 2E(스팸필터 — 금지어/IP 관리 `/admin/settings/spamfilter/{words,ip}`, 차단 규칙 `/admin/settings/spamfilter/block`, `comment.ts`/`document.ts` 제출 경로에 필터 가드 연동, 신규 Prisma 모델 `SpamDeniedWord`/`SpamDeniedIp`/`SpamRule`) · 2F(통계 `/admin/stats`, 대시보드 업데이트 알림 위젯 + 요약 카운터 strip을 `DashboardWidgets.tsx`에 확장, 도메인 관리 `/admin/domains`[신규 `domain` tRPC 라우터], 모듈 상세 `/admin/modules/[id]`; 비차단 방문 카운팅[141/142]은 기존 `ip-hasher.ts` 해시 경로로 충족 확인) · 2G(보안 IP 허용/차단 목록을 `/admin/settings/security`에 연동, 알림 설정에 테스트 메일 발송 액션 추가) · 2H(admin 메뉴 캐시 초기화 + 만료 세션 정리를 신규 `AdminFooter.tsx`에 연동, admin 레이아웃에 배치)를 모두 구현·커밋(`127f0e6`, 후속 범위 수정 `2f8b242`). 품질 근거: `pnpm --filter @rhymix-ts/admin typecheck` clean, `pnpm --filter @rhymix-ts/admin test` 117/117 통과, 관련 `apps/web` 라우터 테스트 39/39 통과, SPEC-ADMIN-002 대상 파일 `apps/web` typecheck clean(잔존 40건의 typecheck 오류는 `app/admin/members/page.tsx`, `app/admin/pages/[instanceId]/edit/*`, `app/admin/site/design/*`, `components/admin/site-design/*`, `components/theme/*`, `lib/theme/token-form-builder.*`에 위치한 본 SPEC과 무관한 기존 결함이며 본 세션에서 손대지 않았다). 알려진 갭 4건을 정직하게 기록한다 — (1) 신규 테이블 3종(SpamDeniedWord/SpamDeniedIp/SpamRule)에 대한 Prisma 마이그레이션 파일이 아직 없음. `prisma generate`는 실행해 클라이언트 타입은 확보했으나, 이 환경에 로컬 Postgres가 없어 `prisma migrate dev`를 실행하지 못했다 — 실제 dev DB가 있는 환경에서 마이그레이션 생성 전까지는 배포 차단 요인이다. (2) `acceptance.md`에 REQ-ADMIN2-111/115/004/005/006/125/146에 대응하는 AC 항목이 없다 — 본 세션 이전부터 존재하던 SPEC 문서화 갭이며 본 세션이 만든 것은 아니나, 차후 manager-spec 패스에서 보강이 필요함을 표시한다. (3) 신규 UI 페이지(advanced/async/seo/sitelock/spamfilter/stats/domains/modules[id])에는 페이지 단위 단위 테스트가 없다 — 기존 프로젝트 관행과 동일(대부분의 설정 페이지가 페이지 레벨에서는 미테스트 상태이며 `settings/site/page.test.tsx`만 예외)이므로 회귀는 아니지만 기록해 둔다. (4) 구현 커밋이 환경의 worktree 격리 한계로 인해 비원자적으로 묶였다 — `127f0e6` 1건에 2D+2E+2F+2G+2H가 모두 포함된 뒤 범위 수정 커밋 `2f8b242`가 뒤따랐다. 이는 투명성을 위해 기록하며 git history를 재작성하지 않는다. M3(Slice 3A~3G)는 여전히 미착수다.
- 2026-06-19 (v1.2.1 전체 재검토): evaluator-active 문서 전체(96개 REQ 전수) 독립 재검토에서 Medium 결함 3건 신규 발견·수정 — (1) REQ-ADMIN2-004/005(대시보드 업데이트 알림 위젯, v1.0.0부터 존재)가 어떤 Slice에도 미배치된 고아 REQ였음을 발견, Slice 2F로 편입. (2) REQ-ADMIN2-146(P2)이 Slice 2F와 Slice 3F(P3)에 이중 배치되어 우선순위와 모순됐음을 발견, Slice 3F에서 제거. (3) REQ-ADMIN2-161이 157~160과 같은 라운드에서 추가됐음에도 영문 SHALL EARS 템플릿 통일에서 누락(한국어 산문 잔존)되었음을 발견·수정. 그 외 EARS 키워드/Pn·Phase 태그/커밋해시 10건/116·117 footnote/버전 태그는 전수 검증 결과 결함 없음.
- 2026-06-19 (v1.2.1 보완): evaluator-active 독립 검토에서 발견된 Medium 결함 2건 수정 — (1) REQ-157/158/159/160의 본문을 다른 REQ와 동일한 영문 SHALL EARS 템플릿으로 통일(기존엔 한국어 산문 혼용), (2) plan.md REQ-161 설명의 "이메일 큐와 동일 저장소 재사용" 가정이 미검증임을 명시(드라이버=미사용/DB 선택형이라 큐 테이블 존재 보장 안 됨, 161 채택 시 선확인 필요). Low 결함(REQ-160 "경고" 표현 출처)은 legacy 화면 라디오 레이블 표기를 근거로 본문에 주석 추가. 추가로 acceptance.md의 AC-18(REQ-154)이 폐기된 "큐 즉시실행" 주장을 그대로 담고 있던 결함을 발견해 정정하고, AC-23(157/158)·AC-24(159/160)·AC-25(161, 선택·DoD 제외) 신규 추가(기존 AC-20 태그 번호와 충돌 방지를 위해 23부터 부여).
- 2026-06-19 (v1.2.1): research.md 06-19 Playwright 재실측(설정 8탭 중 미확인 5탭: 알림/고급/디버그/비동기/사이트잠금에 실제 진입) 결과를 spec.md에 반영. REQ-ADMIN2-116(고급 설정)·117(디버그 설정)이 레거시 실제 필드의 일부만 커버하던 것을 보강 — 신규 REQ-ADMIN2-157(고급: 라우팅/지역화), 158(고급: 성능/캐시), 159(디버그: 임계값/표시), 160(디버그: 쿼리 진단) 4건 추가. Slice 2D(157/158 병합), Slice 3E(159/160 병합) 갱신. 정정: REQ-ADMIN2-154(비동기 작업)의 "legacy: 큐 상태 모니터링" 근거가 부정확했음을 확인 — 레거시에는 큐 모니터링 UI가 없고 설정 6필드(사용여부/드라이버/웹크론키/오류표시/호출간격/프로세스갯수)만 존재함. REQ-154 범위를 이 6필드로 정정하고, 큐 모니터링+즉시실행 기능은 레거시에 없는 선택적 개선으로 분리해 신규 REQ-ADMIN2-161(P3, Slice 3G)로 이동. 기존 REQ-ADMIN2-001~156은 재번호 없이 그대로 유지.
- 2026-06-18 (M2 Slice 2A~2C 구현 완료): Slice 2A(레이아웃 인스턴스 관리)·2B(파일 관리)·2C(신고 관리 + 회원 설정 확장(051/052/054/055) + 문서 설정(074)) 구현 및 커밋(`3614ae3`, `a6416e7`, `9e6bc5e`, `412d2b6`, `97d0b55`, `7c1fa42`, `83de4cf`, `11410ea`, `e23235d`). 신규 procedure에 대한 vitest 테스트 17건 추가. M2 Slice 2D~2H, M3는 미착수. 상세는 `## Implementation Notes` M2 절 참조.
- 2026-06-18 (M1 구현 완료): Phase 1(M1) 구현 완료 — Slice 1A~1F(대시보드 위젯, 페이지 편집, 회원 그룹·직접등록, 회원 설정 핵심 탭, 전체 문서/댓글 관리, 알림·보안 설정) 전체 구현 및 커밋(`fa42d4e`). 독립 보안 리뷰에서 발견된 4건의 이슈(SMTP 비밀번호 평문 노출, 회원 그룹 `isAdmin` 권한 상승 경로, 설정 비원자적 쓰기, 대시보드 위젯 순차 fetch로 인한 장애 전파 위험)를 sync 전에 모두 수정함. status를 `planned`→`in-progress`로 전환(M1 완료, M2/M3 대기). 상세는 `## Implementation Notes` 절 참조.
- 2026-06-18 (v1.1.0): Playwright 실사 기반 `research.md` 추가 후 갱신. 레거시 admin(http://localhost:8080, Rhymix 2.1.33)을 7개 카테고리(대시보드/사이트 제작·편집/회원/콘텐츠/즐겨찾기/설정/고급) 순서로 실제 화면 단위 재조사하고 rhymix-ts 코드와 직접 대조. 신규 REQ-ADMIN2-150~156(7건) 추가 — 관리자 메뉴 초기화(150), 세션 정리(151), 회원 목록 상태 필터 탭(152), 문서 "임시" 상태 필터 보강(153), 비동기 작업 설정(154), 사이트 잠금 런타임 UI(155), 태그 구분 방법 설정(156). REQ-ADMIN2-053(회원 디자인 설정)을 P3→P2로 상향(레거시 사이트 디자인 설정의 1차 탭). "쉬운 설치"(원격 마켓플레이스, 13개 카테고리) 영구 제외 확정. 정정: `/admin/trash`는 이미 구현되어 있음(1차 탐색의 "휴지통 누락" 보고는 오류). 기존 REQ-ADMIN2-001~149는 재번호 없이 그대로 유지.
- 2026-06-14 (v1.0.0): 최초 작성. 사용자가 브라우저에서 rhymix-ts 관리자 패널을 열었을 때 다수의 메뉴가 "준비중"으로 표시되는 문제를 해결하기 위한 마스터 플랜. 레거시 Rhymix PHP 관리자(http://localhost:8080/)의 전체 admin 디스패치 함수(disp*) 인벤토리와 현재 rhymix-ts `apps/web/app/admin/` 구현을 1:1 대조한 gap 분석 기반. SPEC-ADMIN-001(기반 관리자 기능)과 SPEC-ADMIN-EXTRAS-001(export/import + 잔여 REQ)이 모두 구현 완료된 상태를 전제하며, 그 위에 레거시 대비 누락된 관리자 기능을 6개 섹션으로 구조화하여 완성한다.

---

## 1. Overview

### 1.1 목적

본 SPEC은 **레거시 Rhymix PHP 관리자 패널과 동등한 수준의 기능 완결성**을 rhymix-ts 관리자 패널에 부여한다. 현재 `apps/web/app/admin/`은 기반 골격(대시보드, 게시판, 회원 목록/상세, 메뉴, 모듈, 사이트 설정, export/import, 캐시, 휴지통, 위젯)은 구현되어 있으나, 레거시의 다수 관리 화면(회원 그룹·가입/로그인/약관 설정, 전체 문서/댓글 관리, 파일 관리, 설문, 알림·보안·SEO·스팸필터 설정, 통계·쪽지·서버환경 등)이 미구현 상태이거나 "준비중"으로 표시된다.

이 SPEC은 레거시 admin의 전체 디스패치 함수(`dispAdmin*`, `dispMemberAdmin*`, `dispBoardAdmin*`, `dispDocumentAdmin*`, `dispCommentAdmin*`, `dispFileAdmin*`, `dispLayoutAdmin*`, `dispModuleAdmin*`, `dispPageAdmin*`, `dispPointAdmin*`, `dispMenuAdmin*`, `dispPollAdmin*`, `dispSpamfilterAdmin*`, `dispCommunicationAdmin*`, `dispCounterAdmin*`, `dispAutoinstallAdmin*`, `dispTagAdmin*`)를 현재 구현과 대조한 gap 분석을 단일 마스터 플래닝 문서로 통합한다.

### 1.2 범위 요약

| 섹션 | 도메인 | 레거시 대응 모듈 | 우선순위 |
|---|---|---|---|
| 섹션 1 | 대시보드 개선 | admin, counter, document, comment, autoinstall | P1 |
| 섹션 2 | 사이트 제작/편집 완성 | layout, page, menu | P2 |
| 섹션 3 | 회원 설정 완성 | member | P1 |
| 섹션 4 | 콘텐츠 관리 완성 | document, comment, file, poll, tag | P1/P2/P3 |
| 섹션 5 | 사이트 설정 완성 | admin(config), spamfilter, communication | P1/P2 |
| 섹션 6 | 고급 기능 | counter, communication, admin(serverenv/cleanup), module | P2/P3 |

### 1.3 대상 (Audience)

- expert-backend agent — tRPC 라우터·Server Action·Prisma 쿼리·도메인 서비스 구현 (회원 설정 직렬화, 문서/댓글 일괄 처리, 파일 GC, 통계 집계, 스팸필터 매칭)
- expert-frontend agent — 관리자 화면 UI 구현 (설정 탭, 목록/필터/일괄선택 테이블, 통계 차트, 폼)
- expert-security agent — 보안 설정(비밀번호 정책·IP 차단·세션), 스팸필터, 약관 처리에 대한 검토 추천
- 운영자 — "준비중" 표시 없이 모든 좌측 메뉴가 동작하는 관리자 패널을 검증하는 최종 사용자

---

## 2. Scope Exclusions (이미 구현된 범위)

[HARD] 다음 항목은 **이미 구현되었으므로 본 SPEC의 범위에서 제외**한다. 중복 구현을 금지한다.

### 2.1 SPEC-ADMIN-001 (기반 관리자 기능, status: completed)

- 관리자 인증 가드 (`requireAdmin`), AdminLog 미들웨어
- 사이트(Site)/도메인(Domain) 기본 관리
- 모듈 인스턴스(ModuleInstance) CRUD 기본 골격 — `/admin/modules`
- 메뉴 트리 편집 기본 — `/admin/menu`, `/admin/menu/[id]`, `/admin/menu/new`
- 사이트 기본 정보 설정 — `/admin/settings/site` (레거시 `dispAdminConfigGeneral`)
- 관리자 로그 조회 — `/admin/logs`
- 캐시 관리 — `/admin/system/cache`

### 2.2 SPEC-ADMIN-EXTRAS-001 (export/import + 잔여 REQ, status: completed)

- 운영 데이터 JSON export/import — `/admin/settings/export`, `/admin/settings/import`
- admin 그룹 2FA enforcement gate — `/admin/2fa/*` (레거시에는 없던 신규 보안 기능)
- cross-level 메뉴 DnD, WidgetInstance 프리셋, AdminLog IP/CIDR 필터, 모듈 일괄 작업 UI
- 관리자별 즐겨찾기(AdminFavorite) 사이드바
- 사이트잠금(Sitelock, 레거시 `dispAdminConfigSitelock`)

### 2.3 기타 Phase 1~5 완료 SPEC

- 게시판 관리 (목록/카테고리/추가변수/권한) — SPEC-BOARD-CRUD-001 / `/admin/boards/[mid]/*` (레거시 `dispBoardAdmin*`)
- 휴지통 — SPEC-DOCUMENT-001 / `/admin/trash` (레거시 `dispDocumentAdminTrashList`)
- 회원 목록/상세, 회원 포인트 — SPEC-AUTH-001 + SPEC-POINT-001 / `/admin/members`, `/admin/members/[id]`, `/admin/members/[id]/points`
- 포인트 설정 — SPEC-POINT-001 / `/admin/site/points` (레거시 `dispPointAdminConfig`/`dispPointAdminActConfig`)
- 메일 설정 — SPEC-MAIL-001 / `/admin/site/mail`
- 테마/레이아웃/스킨 3-pane 디자인 에디터 — SPEC-THEME-POLISH-001 / `/admin/site/design`
- 위젯 관리 — SPEC-WIDGET-001 / `/admin/widgets/*` (레거시 `dispWidgetAdmin*`)
- 애드온/패키지 마켓 — SPEC-ADDON-001 + addons / `/admin/addons` (레거시 `dispAutoinstallAdminIndex`)
- FTP 설정 — **영구 제외**. 컨테이너/서버리스 배포 모델에서 무의미 (레거시 `dispAdminConfigFtp`)
- 쉬운 설치(원격 마켓플레이스 모듈/애드온/위젯/스킨 다운로드·설치, 13개 카테고리) — **영구 제외**. Next.js/npm 패키지 아키텍처에서는 PHP의 런타임 파일 설치 모델이 성립하지 않음 (레거시: `dispAutoinstallAdminIndex`). 로컬에 선언된 애드온의 활성/비활성 토글은 `/admin/addons`(SPEC-ADDON-001)에서 이미 제공됨.

전체 Out-of-Scope은 본 SPEC 마지막의 `## Exclusions (What NOT to Build)` 절 참조.

---

## 3. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. REQ ID는 `REQ-ADMIN2-XXX`이며, 각 요구사항에는 우선순위(P1/P2/P3)와 전달 단계(Phase 1/2/3)를 명시한다. 레거시 대응 디스패치 함수는 `(legacy: dispXxx)` 형태로 표기한다.

> 우선순위 정의:
> - **P1 (Phase 1, Critical)** — 사용자가 즉시 누락을 인지하는 핵심 기능. "준비중" 제거 1순위.
> - **P2 (Phase 2, Important)** — 운영에 중요하나 즉시 차단되지 않는 기능.
> - **P3 (Phase 3, Nice-to-have)** — 보조 기능. 레거시 호환을 위해 후순위로 완결.

---

### 섹션 1: 대시보드 개선 (REQ-ADMIN2-001 ~ 010)

**REQ-ADMIN2-001** (Ubiquitous) — *P1 / Phase 1*: The admin dashboard at `/admin` SHALL display a 방문자 통계 위젯 showing daily and monthly visit counts for the current site, rendered as a line/bar chart. (legacy: `dispCounterAdminIndex` 요약본)

**REQ-ADMIN2-002** (Event-Driven) — *P1 / Phase 1*: WHEN the dashboard loads, the system SHALL fetch the 10 most recent documents across all board module instances and render them as a "최근 문서" 위젯 with title, author nickname, board name, and relative timestamp, each linking to the document.

**REQ-ADMIN2-003** (Event-Driven) — *P1 / Phase 1*: WHEN the dashboard loads, the system SHALL fetch the 10 most recent comments and render them as a "최근 댓글" 위젯 with excerpt, author, parent document title, and timestamp.

**REQ-ADMIN2-004** (Ubiquitous) — *P2 / Phase 2*: The dashboard SHALL display a 업데이트 알림 위젯 indicating whether a newer rhymix-ts core version or any installed addon/module update is available, comparing the current version against a configured update manifest source. (legacy: 코어/모듈 업데이트 알림)

**REQ-ADMIN2-005** (State-Driven) — *P2 / Phase 2*: WHILE no update is available, the 업데이트 알림 위젯 SHALL render a "최신 버전" status WITHOUT making the administrator believe an action is required.

**REQ-ADMIN2-006** (Ubiquitous) — *P2 / Phase 2*: The dashboard SHALL display a 요약 카운터 strip showing total member count, total document count, total comment count, and total file count for the current site.

**REQ-ADMIN2-007** (Event-Driven) — *P1 / Phase 1*: WHEN dashboard widget data fetch fails for any single widget, the system SHALL render that widget in an error state WITHOUT blocking the rendering of other widgets (graceful degradation per widget).

**REQ-ADMIN2-008** (Ubiquitous) — *P3 / Phase 3*: The dashboard SHALL allow the administrator to toggle visibility of individual widgets, persisting the preference per admin account.

**REQ-ADMIN2-009** (Ubiquitous) — *P2 / Phase 2*: The 방문자 통계 위젯 SHALL be backed by aggregated daily counters (not per-request scans) to keep dashboard load within acceptable latency on large sites.

**REQ-ADMIN2-010** (Unwanted) — *P1 / Phase 1*: The dashboard SHALL NOT execute unbounded full-table scans on the document or comment tables; recent-item queries SHALL be bounded by index-backed `ORDER BY ... LIMIT` clauses.

#### 1.A admin 전역 유틸리티 (레거시 footer 대응, v1.1.0 추가)

**REQ-ADMIN2-150** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator triggers "관리자 메뉴 초기화" from the admin layout global footer, the system SHALL invalidate the cached admin menu/navigation structure and rebuild it on the next request, recording the action in AdminLog. (legacy: 관리자 메뉴 초기화)

**REQ-ADMIN2-151** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator triggers "세션 정리" from the admin layout global footer, the system SHALL purge expired sessions in a bounded batch operation and report the number of removed sessions WITHOUT terminating the current administrator's active session. (legacy: 세션 정리)

---

### 섹션 2: 사이트 제작/편집 완성 (REQ-ADMIN2-020 ~ 039)

#### 2.A 레이아웃 관리 UI

**REQ-ADMIN2-020** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 레이아웃 관리 page at `/admin/site/layouts` listing installed layouts with name, type (PC/mobile), and the number of module instances using each. (legacy: `dispLayoutAdminInstalledList`)

**REQ-ADMIN2-021** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL list layout instances (configured copies of a layout with assigned variables) and allow creating a new instance from an installed layout. (legacy: `dispLayoutAdminInstanceList`, `dispLayoutAdminInsert`)

**REQ-ADMIN2-022** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator edits a layout instance, the system SHALL present an editor for the layout's declared variables (logo, menu binding, colors) and persist them to the `ThemeAssignment`/layout config store defined in SPEC-LAYOUT-001. (legacy: `dispLayoutAdminEdit`, `dispLayoutAdminModify`)

**REQ-ADMIN2-023** (Optional) — *P3 / Phase 3*: Where a layout supports preview, the admin SHALL provide a 미리보기 rendering the layout with sample content WITHOUT persisting changes. (legacy: `dispLayoutAdminPreview`)

**REQ-ADMIN2-024** (Optional) — *P3 / Phase 3*: Where an administrator requests duplication, the system SHALL copy a layout instance including its variable values under a new name. (legacy: `dispLayoutAdminCopyLayout`)

#### 2.B 페이지 모듈 완성

**REQ-ADMIN2-025** (Ubiquitous) — *P1 / Phase 1*: The 페이지 관리 page at `/admin/pages` SHALL list page module instances WITHOUT showing a "준비중" placeholder, replacing the current stub. (legacy: `dispPageAdminContent`)

**REQ-ADMIN2-026** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator edits a page at `/admin/pages/[instanceId]/edit`, the system SHALL provide a content editor for the page's `mcontent` (widget-tokenized HTML) per SPEC-PAGE-001, with save and revert. (legacy: `dispPageAdminContentModify`)

**REQ-ADMIN2-027** (Ubiquitous) — *P2 / Phase 2*: The page editor SHALL expose basic page settings: title, browser title, layout binding, and permission (grant) settings. (legacy: `dispPageAdminInfo`, `dispPageAdminSkinInfo`, `dispPageAdminGrantInfo`)

**REQ-ADMIN2-028** (Optional) — *P3 / Phase 3*: Where a page has a distinct mobile variant, the admin SHALL allow editing mobile page content separately. (legacy: `dispPageAdminMobileContent`)

**REQ-ADMIN2-029** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator deletes a page instance, the system SHALL confirm and remove the instance and its content, recording the action in AdminLog. (legacy: `dispPageAdminDelete`)

#### 2.C 사이트맵 편집기 개선

**REQ-ADMIN2-030** (Ubiquitous) — *P2 / Phase 2*: The 메뉴/사이트맵 editor at `/admin/menu` SHALL support drag-and-drop reordering and nesting of menu items, building on the cross-level DnD delivered in SPEC-ADMIN-EXTRAS-001. (legacy: `dispMenuAdminSiteMap`)

**REQ-ADMIN2-031** (Optional) — *P3 / Phase 3*: Where the site design entry exists, the admin SHALL surface a 사이트 디자인 shortcut linking menu structure to layout/theme assignment. (legacy: `dispMenuAdminSiteDesign`)

---

### 섹션 3: 회원 설정 완성 (REQ-ADMIN2-040 ~ 069)

#### 3.A 회원 그룹 관리

**REQ-ADMIN2-040** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide a 회원 그룹 관리 page at `/admin/members/groups` listing all member groups with title, member count, and default-group flag, replacing any "준비중" placeholder. (legacy: `dispMemberAdminGroupList`)

**REQ-ADMIN2-041** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator creates or edits a member group, the system SHALL persist title, description, and the "신규 가입자 자동 배정" flag, ensuring exactly one default group exists at all times.

**REQ-ADMIN2-042** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator deletes a member group that has assigned members, the system SHALL reassign those members to the default group before deletion and record the operation in AdminLog.

**REQ-ADMIN2-043** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator changes a member's group from the member detail page, the system SHALL update the assignment and reflect it in permission checks on next request.

#### 3.B 회원 직접 등록

**REQ-ADMIN2-044** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator submits the 회원 등록 form at `/admin/members/new`, the system SHALL create a member with email, password (hashed via the SPEC-AUTH-001 hasher), nickname, and group, bypassing the public sign-up email verification flow. (legacy: `dispMemberAdminInsert`)

**REQ-ADMIN2-045** (Unwanted) — *P1 / Phase 1*: Admin-created member registration SHALL NOT store the password in plaintext nor log it; the password SHALL only appear in the request body and be discarded after hashing.

#### 3.C 회원 설정 탭 (가입/로그인/약관/기능/디자인)

**REQ-ADMIN2-046** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide a 회원 설정 page at `/admin/members/settings` with tabbed sections: 일반 / 가입 / 로그인 / 약관 / 기능 / 디자인. (legacy: `dispMemberAdminConfig` and its sub-screens)

**REQ-ADMIN2-047** (Ubiquitous) — *P1 / Phase 1*: The 가입 설정 tab SHALL persist: 가입 허용 여부, 이메일 인증 필수 여부, 관리자 승인 필요 여부, 가입 시 기본 그룹, 중복 닉네임 허용 여부. (legacy: `dispMemberAdminSignUpConfig`)

**REQ-ADMIN2-048** (Ubiquitous) — *P1 / Phase 1*: The 로그인 설정 tab SHALL persist: 자동 로그인 허용 및 유지 기간, 로그인 실패 잠금 임계값, 로그인 후 리디렉션 정책. (legacy: `dispMemberAdminLoginConfig`)

**REQ-ADMIN2-049** (Optional, **DEFERRED**) — *P3 / Phase 3*: Where social login is configured, the 로그인 설정 tab SHALL allow enabling/disabling configured social providers WITHOUT requiring credentials to be re-entered in plaintext. *(2026-06-20: 전제 조건 불충족 — 코드베이스 전체에 소셜 로그인 프로바이더 설정 자체가 존재하지 않음[Prisma 스키마/서버 라우터/research.md 모두 미확인]. 토글할 대상이 없어 구현 불가. SSO/OIDC 연동[Exclusions §5]과 함께 백로그로 재분류. 사용자 확인 완료.)*

**REQ-ADMIN2-050** (Ubiquitous) — *P1 / Phase 1*: The 약관 설정 tab SHALL persist editable 이용약관 and 개인정보처리방침 documents (markdown/HTML), shown during sign-up, with required-consent flags. (legacy: `dispMemberAdminAgreementsConfig`)

**REQ-ADMIN2-051** (Event-Driven) — *P2 / Phase 2*: WHEN the 약관 content changes, the system SHALL record a version/timestamp so consent records can reference the agreement version in effect at sign-up time.

**REQ-ADMIN2-052** (Ubiquitous) — *P2 / Phase 2*: The 기능 설정 tab SHALL persist member feature toggles (프로필 이미지 허용, 서명 허용, 회원 검색 노출 등). (legacy: `dispMemberAdminFeaturesConfig`)

**REQ-ADMIN2-053** (Ubiquitous) — *P2 / Phase 2*: The 디자인 설정 tab SHALL persist member-area skin/template selections. (legacy: `dispMemberAdminDesignConfig`) [v1.1.0: P3→P2 — 레거시에서 "준비중"이 아니라 사이트 디자인 설정의 1차 탭(회원 스킨 슬롯)으로 노출되므로 우선순위 상향.]

#### 3.D 가입 양식 커스터마이징

**REQ-ADMIN2-054** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 가입 양식 editor at `/admin/members/joinform` allowing administrators to add, reorder, mark required/optional, and remove sign-up form fields backed by `member.extra_vars` (JSONB) per SPEC-AUTH-001. (legacy: `dispMemberAdminInsertJoinForm`)

**REQ-ADMIN2-055** (Unwanted) — *P2 / Phase 2*: The 가입 양식 editor SHALL NOT permit removal or renaming of the system-reserved fields (email, password, nickname) in a way that breaks authentication.

#### 3.E 닉네임 변경 이력

**REQ-ADMIN2-056** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide a 닉네임 변경 이력 view at `/admin/members/nickname-log` listing past nickname changes with member, old/new nickname, and timestamp. (legacy: `dispMemberAdminNickNameLog`)

**REQ-ADMIN2-057** (Event-Driven) — *P3 / Phase 3*: WHEN a member's nickname changes (by the member or an admin), the system SHALL append a row to the nickname change log.

#### 3.F 회원 목록 상태 필터 (v1.1.0 추가)

**REQ-ADMIN2-152** (Ubiquitous) — *P2 / Phase 2*: The 회원 목록 page at `/admin/members` SHALL provide status filter tabs (전체 / 최고 관리자 / 승인 / 거부 / 미인증) that scope the listed members to the selected registration/approval state, building on the existing member list. (legacy: 회원 목록 상단 필터 탭)

---

### 섹션 4: 콘텐츠 관리 완성 (REQ-ADMIN2-070 ~ 109)

#### 4.A 전체 문서 관리

**REQ-ADMIN2-070** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide a 전체 문서 관리 page at `/admin/documents` listing documents across all board instances with filters for module instance (mid), author, status, and full-text search on title/content. The status filter SHALL include 전체 / 공개 / 비밀 / 임시(완료되지 않은 자동저장본) / 신고. (legacy: `dispDocumentAdminList`)

**REQ-ADMIN2-153** (State-Driven) — *P2 / Phase 2*: WHILE the 전체 문서 관리 status filter is set to "임시", the system SHALL list only temporary/auto-saved draft documents (`document.status = TEMP` 등), allowing the administrator to delete or recover them, so abandoned drafts do not accumulate undetected. (legacy: 문서 목록 상태 필터 "임시")

**REQ-ADMIN2-071** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator selects multiple documents and chooses a bulk action (삭제 / 휴지통 이동 / 이동(다른 게시판) / 상태 변경), the system SHALL apply the action in a transaction and record it in AdminLog.

**REQ-ADMIN2-072** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 신고 문서 관리 view at `/admin/documents/declared` listing reported documents with report count and reporter, allowing dismiss or delete. (legacy: `dispDocumentAdminDeclared`)

**REQ-ADMIN2-073** (Optional) — *P3 / Phase 3*: Where document aliases are used, the admin SHALL list and manage 문서 별칭 (URL aliases). (legacy: `dispDocumentAdminAlias`)

**REQ-ADMIN2-074** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 문서 설정 page persisting global document defaults (정렬 기준, 페이지당 개수, 비회원 작성 허용 등). (legacy: `dispDocumentAdminConfig`)

#### 4.B 전체 댓글 관리

**REQ-ADMIN2-075** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide a 전체 댓글 관리 page at `/admin/comments` listing comments across all instances with filters for module instance, author, and content search. (legacy: `dispCommentAdminList`)

**REQ-ADMIN2-076** (Event-Driven) — *P1 / Phase 1*: WHEN an administrator selects multiple comments and chooses bulk delete, the system SHALL delete them and their replies (cascade) in a transaction and record it in AdminLog.

**REQ-ADMIN2-077** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 신고 댓글 관리 view at `/admin/comments/declared` listing reported comments with dismiss/delete actions. (legacy: `dispCommentAdminDeclared`)

#### 4.C 파일 관리

**REQ-ADMIN2-078** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 파일 관리 page at `/admin/files` listing uploaded files with name, size, uploader, attached document, and download count, with filters and search. (legacy: `dispFileAdminList`)

**REQ-ADMIN2-079** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator triggers 고아 파일 정리, the system SHALL identify files no longer referenced by any document/comment (per SPEC-FILE-001 cascade rules) and offer them for deletion with a dry-run preview before applying.

**REQ-ADMIN2-080** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide 파일 업로드 설정 persisting allowed extensions, max file size, max attachments per post, and image auto-resize dimensions. (legacy: `dispFileAdminUploadConfig`)

**REQ-ADMIN2-081** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide 파일 다운로드 설정 persisting download permission policy (회원만 / 포인트 차감 / 무제한) and hotlink protection toggle. (legacy: `dispFileAdminDownloadConfig`)

**REQ-ADMIN2-082** (Optional) — *P3 / Phase 3*: Where additional file options exist, the admin SHALL expose 기타 설정 (썸네일 생성 방식, 저장 경로 전략). (legacy: `dispFileAdminOtherConfig`)

#### 4.D 설문 (Poll)

**REQ-ADMIN2-083** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide a 설문 목록 page at `/admin/polls` listing polls with title, status, vote count, and period. (legacy: `dispPollAdminList`)

**REQ-ADMIN2-084** (Event-Driven) — *P3 / Phase 3*: WHEN an administrator creates or edits a poll, the system SHALL persist question(s), options, multiple-choice flag, and voting period. (legacy: poll create/edit)

**REQ-ADMIN2-085** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL display 설문 결과 with per-option vote counts and percentages. (legacy: `dispPollAdminResult`)

**REQ-ADMIN2-086** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide 설문 설정 for global poll defaults (비회원 투표 허용, 중복 투표 방지 방식). (legacy: `dispPollAdminConfig`)

#### 4.E 태그

**REQ-ADMIN2-087** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide 태그 설정 persisting tag display options (태그 클라우드 노출 개수, 정렬 기준). (legacy: `dispTagAdminConfig`)

**REQ-ADMIN2-156** (Ubiquitous) — *P3 / Phase 3*: The 태그 설정 SHALL persist the 태그 구분 방법 (쉼표 / 해시(#) / 공백, multiple selectable) used to parse tag input when documents are saved. (legacy: 태그 구분 방법 설정)

---

### 섹션 5: 사이트 설정 완성 (REQ-ADMIN2-110 ~ 139)

#### 5.A 알림 설정

**REQ-ADMIN2-110** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide 알림 설정 at `/admin/settings/notification` persisting default email sender name/address and SMTP connection settings, integrating with the SmtpMailDispatcher from SPEC-MAIL-001. (legacy: `dispAdminConfigNotification`)

**REQ-ADMIN2-111** (Event-Driven) — *P2 / Phase 2*: WHEN an administrator clicks "테스트 메일 발송", the system SHALL send a test email to the administrator's address and report success/failure WITHOUT persisting partial settings on failure.

**REQ-ADMIN2-112** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide 이메일 큐 설정 persisting queue mode (즉시 발송 / 큐 적재) and batch size. (legacy: `dispAdminConfigQueue`)

#### 5.B 보안 설정

**REQ-ADMIN2-113** (Ubiquitous) — *P1 / Phase 1*: The admin SHALL provide 보안 설정 at `/admin/settings/security` persisting password policy (최소 길이, 복잡도 요구), session lifetime, and login attempt lockout settings. (legacy: `dispAdminConfigSecurity`)

**REQ-ADMIN2-114** (Unwanted) — *P1 / Phase 1*: Security settings SHALL NOT allow disabling password hashing or setting a session lifetime that bypasses authentication entirely; out-of-range values SHALL be rejected with validation errors.

**REQ-ADMIN2-115** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide an IP 접근 제어 view persisting allow/deny IP and CIDR rules for the admin area, reusing the IP/CIDR matcher from SPEC-ADMIN-EXTRAS-001.

#### 5.C 고급 설정

**REQ-ADMIN2-116** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide 고급 설정 at `/admin/settings/advanced` persisting site timezone, default language, and cache driver selection. (legacy: `dispAdminConfigAdvanced`) [v1.2.1: 06-19 Playwright 재실측 결과 레거시 화면에 본 REQ가 다루지 않는 11개 추가 필드가 존재함을 확인 — REQ-ADMIN2-157(라우팅/지역화)·158(성능/캐시) 참고.]

**REQ-ADMIN2-117** (Optional) — *P3 / Phase 3*: Where debug tooling is enabled, the admin SHALL provide 디버그 설정 persisting debug display level and target audience (관리자만 / 비활성). (legacy: `dispAdminConfigDebug`) [v1.2.1: 06-19 Playwright 재실측 결과 레거시 화면에 본 REQ가 다루지 않는 10개 추가 필드가 존재함을 확인 — REQ-ADMIN2-159(임계값/표시)·160(쿼리 진단) 참고.]

**REQ-ADMIN2-157** (Ubiquitous) — *P2 / Phase 2* (v1.2.1 추가): The admin SHALL provide 고급 설정 fields for routing/localization, persisting 짧은 주소 사용 정책 (사용안함 / XE 호환 주소만 / 모든 주소 형태), 모바일 뷰 사용 여부, 태블릿을 모바일로 취급할지 여부, 언어 자동 선택 여부 + 지원 언어 다중 선택 (13개 언어) + 기본 언어, and 모바일 viewport 설정. (legacy: `dispAdminConfigAdvanced`, 06-19 재실측)

**REQ-ADMIN2-158** (Ubiquitous) — *P2 / Phase 2* (v1.2.1 추가): The admin SHALL provide 고급 설정 fields for performance/cache, persisting 인증 세션 DB 사용 여부, 세션 시작 지연 여부, 템플릿 변환 지연 여부, 썸네일 생성 대상 (첨부 이미지 / 모든 이미지 / 생성 안 함) 및 생성 방식, 캐시 사용 여부 + 기본 TTL + 캐시 삭제 방식 (폴더 삭제 / 내용만 삭제), HTTP Cache-Control 옵션 (no-cache / no-store / must-revalidate 다중 선택), 관리자 화면 표시에 사용할 레이아웃 (해당 모듈 레이아웃 / 관리자 레이아웃), JS/CSS 압축 정책 (압축 안 함 / 공통 파일만 / 모든 파일) 및 병합 정책 (합치지 않음 / CSS만 / JS만 / CSS+JS), and jQuery 버전 선택 (2.2.4 / 3.7.1). JS/CSS 압축·병합 옵션의 Next.js 빌드 타임 번들링과의 양립 가능 여부는 Open Question Q5에서 별도 결정한다. (legacy: `dispAdminConfigAdvanced`, 06-19 재실측)

**REQ-ADMIN2-159** (Optional) — *P3 / Phase 3* (v1.2.1 추가): Where debug tooling is enabled, the admin SHALL provide 디버그 설정 threshold/display fields, persisting 느린 쿼리 / 느린 트리거 / 느린 위젯 / 느린 외부 요청 임계값 (초 단위 숫자, 각각 독립), 디버그 정보 표시 방법 (HTML 소스 주석 / 화면 패널 / 파일 기록 다중 선택), 디버그 정보 표시 내용 (요청·응답 정보 / 디버그 메시지 / 에러 / 쿼리 / 느린 쿼리 / 느린 트리거 / 느린 위젯 / 느린 외부 요청 — 8종 다중 선택), 디버그 로그 기록 파일 경로 (날짜별 분리 패턴 지원), 디버그 정보 표시 대상 (관리자에게만 / 지정 IP의 방문자에게만 / 모두에게), and 디버그 허용 IP 목록. (legacy: `dispAdminConfigDebug`, 06-19 재실측)

**REQ-ADMIN2-160** (Optional) — *P3 / Phase 3* (v1.2.1 추가): Where debug tooling is enabled, the admin SHALL provide 디버그 설정 query-diagnostics fields, persisting 쿼리에 주석 (쿼리명 + IP) 추가 여부, 쿼리 콜 스택 전체 표시 여부, 동일 위치에서 반복 발생하는 오류/쿼리의 중복 항목 정리 여부, and 에러 로그 기록 수준 (모든 에러와 경고를 기록 / 치명적인 에러만 기록 — legacy 화면 원문에는 "치명적인 에러만 기록"이 기본값이며 "경고" 포함 옵션은 라디오 버튼 레이블 자체에 표기됨). (legacy: `dispAdminConfigDebug`, 06-19 재실측)

#### 5.D SEO 설정

**REQ-ADMIN2-118** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide SEO 설정 at `/admin/settings/seo` persisting default meta title/description, Open Graph defaults, and canonical URL policy. (legacy: `dispAdminConfigSEO`)

**REQ-ADMIN2-119** (Event-Driven) — *P2 / Phase 2*: WHEN SEO settings are saved with sitemap generation enabled, the system SHALL expose a `sitemap.xml` reflecting public documents and pages.

#### 5.E 스팸 필터

**REQ-ADMIN2-120** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 차단 IP 관리 view at `/admin/settings/spamfilter/ip` listing denied IPs/CIDRs with add/remove. (legacy: `dispSpamfilterAdminDeniedIPList`)

**REQ-ADMIN2-121** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 금지어 관리 view listing denied words used to reject document/comment submissions. (legacy: `dispSpamfilterAdminDeniedWordList`)

**REQ-ADMIN2-122** (Event-Driven) — *P2 / Phase 2*: WHEN a document or comment submission contains a denied word OR originates from a denied IP, the system SHALL reject the submission with a spam-filtered error WITHOUT persisting the content.

**REQ-ADMIN2-123** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide 차단 설정 persisting per-action submission rate limits (도배 방지: 동일 사용자 N초당 M회). (legacy: `dispSpamfilterAdminConfigBlock`)

**REQ-ADMIN2-124** (Optional) — *P3 / Phase 3*: Where captcha is enabled, the admin SHALL provide 캡챠 설정 persisting captcha provider and trigger conditions. (legacy: `dispSpamfilterAdminConfigCaptcha`)

#### 5.F 도메인 관리

**REQ-ADMIN2-125** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 도메인 관리 view listing configured domains (multisite) with default-domain flag and per-domain default module, building on the Domain table from SPEC-ADMIN-001.

#### 5.G 비동기 작업 (v1.1.0 추가)

**REQ-ADMIN2-154** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 비동기 작업 page at `/admin/settings/async` persisting 비동기 작업 사용 여부, 비동기 드라이버 선택(미사용 / DB), 웹크론 인증키(자동 생성) 및 웹크론 오류 표시 여부, 호출 간격(분), 프로세스 갯수, and SHALL display crontab/webcron/systemd timer 설정 안내(실행 명령 예시 포함). (legacy: 시스템 설정 > 비동기 작업 탭, `dispAdminConfigQueue`) [v1.2.1 정정: 06-19 Playwright 재실측 결과 레거시 화면에는 큐 항목의 대기/처리중/실패 건수를 보여주는 모니터링 UI가 없음 — 이전 버전(v1.1.0)의 "큐 상태 모니터링 + 즉시 실행 버튼" 서술은 레거시에 없는 기능을 legacy parity로 잘못 표기한 오류였다. 본 REQ는 위 6개 설정 필드로 범위를 정정한다. 모니터링 기능 자체는 REQ-ADMIN2-161 참고.]

**REQ-ADMIN2-161** (Optional) — *P3 / Phase 3* (v1.2.1 추가, 레거시에 없는 선택적 개선 — 사용자 확인 후 채택 여부 결정): Where the operator wants async task queue visibility, `/admin/settings/async` SHALL display queue status (대기 / 처리중 / 실패 건수) and SHALL provide a control to trigger immediate processing of pending tasks. This is NOT legacy parity but a rhymix-ts self-improvement proposal.

#### 5.H 사이트 잠금 런타임 UI (v1.1.0 추가)

**REQ-ADMIN2-155** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a runtime 사이트 잠금 page at `/admin/settings/sitelock` allowing the administrator to toggle maintenance mode and manage the allowed-IP list during operation, not only at install time. This extends the install-time sitelock configuration (`app/install/admin-config/`) and the Sitelock asset delivered in SPEC-ADMIN-EXTRAS-001 with a runtime admin surface. (legacy: 시스템 설정 > 사이트 잠금 탭, `dispAdminConfigSitelock`)

> 참고: SPEC-ADMIN-EXTRAS-001이 사이트잠금 *기능*(미들웨어 차단 + 허용 IP)을 제공하나, 운영 중 토글 가능한 admin UI는 없었다. 본 REQ는 그 런타임 UI 갭만 채운다(기능 재구현 아님).

---

### 섹션 6: 고급 기능 (REQ-ADMIN2-140 ~ 169)

#### 6.A 방문자 통계 (Counter)

**REQ-ADMIN2-140** (Ubiquitous) — *P2 / Phase 2*: The admin SHALL provide a 방문자 통계 page at `/admin/stats` with daily/monthly visit charts, unique vs total visitors, and referrer breakdown. (legacy: `dispCounterAdminIndex`)

**REQ-ADMIN2-141** (Event-Driven) — *P2 / Phase 2*: WHEN a public page is requested, the system SHALL increment visit counters via a low-overhead aggregation path that does not block page rendering.

**REQ-ADMIN2-142** (Unwanted) — *P2 / Phase 2*: Visit counting SHALL NOT store personally identifying raw IP addresses beyond what is required for unique-visitor de-duplication within a day; raw IPs SHALL be hashed or truncated per privacy policy.

#### 6.B 쪽지 (Communication)

**REQ-ADMIN2-143** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide 쪽지 설정 at `/admin/settings/communication` persisting whether private messaging is enabled and per-member inbox limits. (legacy: `dispCommunicationAdminConfig`)

#### 6.C 서버 환경

**REQ-ADMIN2-144** (Ubiquitous) — *P3 / Phase 3*: The admin SHALL provide a 서버 환경 view at `/admin/system/server-env` displaying read-only runtime info (Node version, Next.js version, database version, environment flags). (legacy: `dispAdminViewServerEnv`)

**REQ-ADMIN2-145** (Unwanted) — *P3 / Phase 3*: The 서버 환경 view SHALL NOT expose secrets (DB password, API keys, session secret) in any form; environment variables containing secret material SHALL be masked.

#### 6.D 모듈 상세 관리

**REQ-ADMIN2-146** (Ubiquitous) — *P2 / Phase 2*: The 모듈 관리 area SHALL provide a module detail/info view per module instance showing its config, grant settings, and category assignment, extending the existing `/admin/modules` skeleton. (legacy: `dispModuleAdminInfo`, `dispModuleAdminSetup`, `dispModuleAdminGrantSetup`)

**REQ-ADMIN2-147** (Optional) — *P3 / Phase 3*: Where module categories are used, the admin SHALL manage 모듈 카테고리 for grouping module instances. (legacy: `dispModuleAdminCategory`)

**REQ-ADMIN2-148** (Optional) — *P3 / Phase 3*: Where language code overrides are supported, the admin SHALL provide 언어코드 editing for module-scoped translations. (legacy: `dispModuleAdminLangcode`)

#### 6.E 코어 파일 정리

**REQ-ADMIN2-149** (Optional) — *P3 / Phase 3*: Where stale generated/cache files accumulate, the admin SHALL provide a 코어파일 정리 action listing removable generated artifacts with a dry-run preview before deletion. (legacy: `dispAdminCleanupList`)

---

## 4. Implementation Priority Summary

| Priority | 의미 | REQ 개수(대표) | 대표 기능 |
|---|---|---|---|
| **P1 (Phase 1)** | 즉시 누락 인지, "준비중" 제거 1순위 | ~22 | 대시보드 위젯, 페이지 편집, 회원 그룹, 회원 직접 등록, 회원 설정 탭(가입/로그인/약관), 전체 문서/댓글 관리, 알림 설정, 보안 설정 |
| **P2 (Phase 2)** | 운영 중요, 비차단 | ~31 | 레이아웃 관리, 가입 양식, 파일 관리, 신고 관리, SEO, 스팸필터, 통계, 도메인 관리, 모듈 상세, 회원 디자인 설정(053, P3→P2), admin 전역 유틸(메뉴 초기화·세션 정리), 회원 목록 상태 필터, 문서 "임시" 필터, 비동기 작업, 사이트 잠금 런타임 UI |
| **P3 (Phase 3)** | 보조/레거시 호환 | ~15 | 설문, 태그(구분 방법 포함), 닉네임 이력, 디버그/캡챠/언어코드, 쪽지, 서버환경, 코어파일 정리 |

> [HARD] 시간 추정(일/주)은 사용하지 않는다. 우선순위 라벨과 Phase 순서로만 진행 순서를 정의한다.
>
> v1.1.0 신규 REQ 배치: REQ-ADMIN2-150/151(P2, 섹션 1.A) → Slice 1A에 인접한 운영 유틸로 Phase 2 신설 슬라이스, 152(P2)·153(P2)·156(P3)은 각 도메인 슬라이스에 병합, 154/155(P2)는 Slice 2D에 병합.

---

## 5. Phased Delivery Plan

본 SPEC은 규모가 크므로 슬라이스 단위 분할 구현을 권장한다. 각 Phase는 독립적으로 사용자 가치를 제공한다.

### Phase 1 — Critical Visibility (P1)

목표: 사용자가 가장 먼저 마주치는 "준비중" 화면을 제거하고 핵심 운영 기능을 완성한다.

1. **Slice 1A — 대시보드 위젯**: REQ-ADMIN2-001~003, 007, 010 (방문자 통계 요약, 최근 문서/댓글, graceful degradation)
2. **Slice 1B — 페이지 모듈 완성**: REQ-ADMIN2-025, 026 (페이지 목록 + 편집기, "준비중" stub 교체)
3. **Slice 1C — 회원 그룹 + 직접 등록**: REQ-ADMIN2-040~045
4. **Slice 1D — 회원 설정 탭(핵심)**: REQ-ADMIN2-046~048, 050 (일반/가입/로그인/약관)
5. **Slice 1E — 전체 문서/댓글 관리**: REQ-ADMIN2-070, 071, 075, 076
6. **Slice 1F — 알림 + 보안 설정**: REQ-ADMIN2-110, 113, 114

### Phase 2 — Operational Completeness (P2)

목표: 운영자가 사이트를 본격 운영하는 데 필요한 설정·관리 기능을 채운다.

1. **Slice 2A — 레이아웃/페이지 설정 확장**: REQ-ADMIN2-020~022, 027, 029, 030
2. **Slice 2B — 파일 관리**: REQ-ADMIN2-078~081
3. **Slice 2C — 신고 관리 + 문서/회원 설정**: REQ-ADMIN2-072, 074, 077, 051, 052, 053, 054, 055, 152, 153 *(053 P3→P2 회원 디자인 설정, 152 회원 목록 상태 필터, 153 문서 "임시" 필터 추가)*
4. **Slice 2D — SEO + 고급 설정 + 큐 + 비동기/사이트잠금**: REQ-ADMIN2-112, 116, 157, 158, 118, 119, 154, 155 *(154 비동기 작업[v1.2.1 범위 정정], 155 사이트 잠금 런타임 UI 병합, 157/158 고급 설정 세부 필드 보강 v1.2.1)*
5. **Slice 2E — 스팸필터**: REQ-ADMIN2-120~123
6. **Slice 2F — 통계 + 도메인 + 모듈 상세**: REQ-ADMIN2-004, 005, 006, 009, 140~142, 125, 146 *(004/005 대시보드 업데이트 알림 위젯 — v1.2.1 재검토에서 미배치 발견, 본 슬라이스로 편입)*
7. **Slice 2G — 보안 IP 제어 + 테스트 메일**: REQ-ADMIN2-111, 115
8. **Slice 2H — admin 전역 유틸리티**: REQ-ADMIN2-150, 151 *(관리자 메뉴 초기화, 세션 정리 — admin 레이아웃 footer)*

### Phase 3 — Nice-to-have & Legacy Parity (P3)

목표: 레거시 호환을 위한 보조 기능을 완결하여 "준비중"을 완전히 제거한다.

1. **Slice 3A — 설문(Poll)**: REQ-ADMIN2-083~086
2. **Slice 3B — 태그 + 문서 별칭 + 닉네임 이력**: REQ-ADMIN2-087, 156, 073, 056, 057 *(156 태그 구분 방법 설정 추가)*
3. **Slice 3C — 회원 부가 설정** (완료, 2026-06-20): REQ-ADMIN2-049(**DEFERRED** — 전제 조건인 소셜 프로바이더 설정이 코드베이스에 부재해 구현 불가, 백로그 재분류), 028(Slice 3D 커밋 `accc895`에서 이미 구현·테스트 완료, 본 Slice에서 추가 작업 불필요) *(053은 P2로 상향되어 Slice 2C로 이동)*
4. **Slice 3D — 레이아웃 미리보기/복사**: REQ-ADMIN2-023, 024, 031
5. **Slice 3E — 디버그/캡챠/기타 파일 설정**: REQ-ADMIN2-117, 159, 160, 124, 082, 008 *(159/160 디버그 설정 세부 필드 보강 v1.2.1)*
6. **Slice 3F — 쪽지 + 서버환경 + 모듈 카테고리/언어코드 + 코어정리**: REQ-ADMIN2-143~145, 147~149 *(146은 P2이므로 Slice 2F로 이전 — v1.2.1 재검토에서 이중 배치 발견·수정)*
7. **Slice 3G — 비동기 작업 큐 모니터링 (선택, v1.2.1 추가)**: REQ-ADMIN2-161 *(레거시 동등 기능 아님 — 사용자 확인 후 채택 여부 결정)*

### Phase 진입 조건

- Phase 2는 Phase 1의 모든 P1 REQ가 acceptance를 통과한 후 시작한다.
- Phase 3은 Phase 2의 P2 REQ가 acceptance를 통과한 후 시작한다.
- 각 Slice는 독립 PR로 분리하며, 좌측 메뉴에서 해당 항목의 "준비중" 표기를 제거하는 것을 완료 신호로 삼는다.

---

## 6. Expert Consultation Recommendations

본 SPEC은 다음 도메인 전문가 검토를 권장한다 (구현 단계에서 MoAI 오케스트레이터가 필요 시 호출):

- **expert-security** — 섹션 5.B 보안 설정(비밀번호 정책·세션·IP 차단), 섹션 5.E 스팸필터, 섹션 3.C 약관/개인정보 처리, REQ-ADMIN2-142/145 PII·시크릿 마스킹
- **expert-backend** — 섹션 4 일괄 처리 트랜잭션·파일 GC, 섹션 6.A 통계 집계 경로, 회원 설정 직렬화
- **expert-frontend** — 대시보드 차트, 설정 탭 UI, 필터·일괄선택 테이블, 사이트맵 DnD
- **expert-performance** — REQ-ADMIN2-009/010/141 대시보드·통계의 인덱스 기반 쿼리 및 비차단 카운팅

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 **구현하지 않는다**. 범위 확장(scope creep)을 방지한다.

1. **FTP 설정** (legacy `dispAdminConfigFtp`) — 컨테이너/서버리스 배포 모델에서 무의미. 영구 제외.
2. **이미 구현된 기능 재작성** — SPEC-ADMIN-001 / SPEC-ADMIN-EXTRAS-001 / Phase 1~5 완료 SPEC이 제공한 export/import, 2FA, 게시판 CRUD, 휴지통, 회원 목록/상세, 포인트 설정, 메일 설정, 테마 디자인, 위젯, 애드온, 캐시, 사이트잠금은 재구현하지 않는다 (섹션 2 참조).
3. **회원/그룹/차단 목록 export-import** — PII 위험으로 별도 정책 SPEC에서 다룸 (SPEC-ADMIN-EXTRAS-001 Non-Goals 계승).
4. **자동 스케줄 백업 / 시점 복원(PITR) / DB 레벨 백업** — DBA·인프라 책임 영역. 본 SPEC은 application-layer만.
5. **SSO / OIDC 연동** — 백로그. REQ-ADMIN2-049는 *기존에 구성된* 소셜 프로바이더 토글만 다루며 신규 연동 구현은 제외. (2026-06-20: 코드베이스에 소셜 프로바이더 설정이 전혀 존재하지 않아 REQ-ADMIN2-049 자체가 DEFERRED 처리됨 — Slice 3C 참조)
6. **Admin UI 다국어(i18n)** — SPEC-ADMIN-001 Open Question 3 계승, 백로그.
7. **모듈 간 콘텐츠 마이그레이션 도구**(게시판→위키 변환 등) — 백로그.
8. **패키지 마켓 신규 패키지 설치/배포 파이프라인** — SPEC-ADDON-001 범위. 본 SPEC은 패키지 마켓 화면을 재구현하지 않는다.
9. **레거시 PHP 스킨/레이아웃 파일 포맷 그대로의 호환 로딩** — rhymix-ts는 React 기반 레이아웃(SPEC-LAYOUT-001)을 사용. 레거시 `.html` 스킨 파서는 제외.
10. **감사 로그 보존/파티셔닝 정책** — SPEC-ADMIN-001 Open Question 2 계승, 백로그.
11. **실시간 통계(WebSocket 라이브 카운터)** — 본 SPEC의 통계는 일/월 집계 기반. 실시간 스트리밍 제외.
12. **쉬운 설치 — 원격 마켓플레이스(13개 카테고리)** (legacy `dispAutoinstallAdminIndex`) — **영구 제외** (v1.1.0 사용자 확정). 레거시의 "쉬운 설치"는 원격 서버에서 모듈/애드온/위젯/스킨 등 13개 카테고리의 PHP 파일을 런타임에 다운로드·설치하는 모델로, Next.js/npm 패키지 아키텍처(빌드 타임 의존성, 코드 선언 기반)와 근본적으로 양립하지 않는다. FTP 설정과 동일한 사유로 직접 포팅하지 않는다. 로컬에 선언된 애드온의 활성/비활성·우선순위 토글은 `/admin/addons`(SPEC-ADDON-001)에서 이미 제공된다.

> 정정(v1.1.0): 1차 탐색 보고서의 "휴지통 누락"은 오류였다. `/admin/trash`(SPEC-DOCUMENT-001)는 이미 구현되어 있으며 섹션 2.3 "이미 구현된 기능"에 명시되어 있다. 본 SPEC에는 휴지통 관련 갭 REQ가 없으며, 이는 의도된 정확한 상태다.

---

## Open Questions

- Q1. 통계(Counter) 데이터의 보존 기간 및 집계 단위(일별 영구 보관 vs N개월 후 월별 롤업) 정책 — 운영 정책 결정 필요.
- Q2. 약관 버전 관리(REQ-ADMIN2-051)에서 기존 동의 회원에 대한 재동의 요구 트리거 정책 — 법무/운영 판단 필요.
- Q3. 스팸필터 rate-limit(REQ-ADMIN2-123)의 저장소(메모리 vs Redis vs DB) 선택 — 배포 환경에 따라 결정.
- Q4. 파일 고아 GC(REQ-ADMIN2-079)의 안전 마진(업로드 직후 미연결 파일을 즉시 삭제 대상으로 볼지, grace period를 둘지).
- Q5 (v1.2.1 추가). REQ-ADMIN2-158의 JS/CSS 압축·병합 정책 설정이 Next.js 빌드 파이프라인(정적 빌드 타임 번들링)과 충돌하는지 — 레거시는 런타임 PHP 압축이지만 rhymix-ts는 Next.js가 빌드 타임에 처리하므로, 이 설정을 그대로 admin UI 토글로 노출할 수 있는지 또는 안내성 표시로 대체해야 하는지 아키텍처 결정 필요.

---

## Implementation Notes

### M1 (Phase 1 / P1) — 구현 완료 (2026-06-18, 커밋 `fa42d4e`)

plan.md의 마일스톤 정의(M1: Slice 1A~1F)에 따라 Phase 1의 모든 P1 REQ를 구현했다.

| Slice | 구현 범위 | 대응 REQ |
|---|---|---|
| 1A — 대시보드 위젯 | 방문자 통계 요약, 최근 문서 10건/최근 댓글 10건 위젯, 위젯별 장애 격리 | REQ-ADMIN2-001~003, 007, 010 |
| 1B — 페이지 모듈 완성 | `/admin/pages` 목록 + `/admin/pages/[instanceId]/edit` mcontent 편집기, "준비중" stub 제거 | REQ-ADMIN2-025, 026 |
| 1C — 회원 그룹 + 직접 등록 | `/admin/members/groups` CRUD, 기본 그룹 단일성 보장, `/admin/members/new` 직접 등록 | REQ-ADMIN2-040~045 |
| 1D — 회원 설정 핵심 탭 | `/admin/members/settings` 가입/로그인/약관 탭 | REQ-ADMIN2-046~048, 050 |
| 1E — 전체 문서/댓글 관리 | `/admin/documents`, `/admin/comments` 목록·필터·일괄 작업(트랜잭션) | REQ-ADMIN2-070, 071, 075, 076 |
| 1F — 알림 + 보안 설정 | `/admin/settings/notification`, `/admin/settings/security` | REQ-ADMIN2-110, 113, 114 |

신규 라우터: `apps/web/server/api/routers/admin/{dashboard,document,comment,group,settings}.ts`. 신규 화면: `apps/web/app/admin/{page.tsx, pages/, comments/, documents/, members/groups/, members/new/, members/settings/, settings/notification/, settings/security/}`. `packages/admin/src/settings.ts`, `packages/document/src/admin.ts`, `packages/comment/src/admin.ts`에 도메인 서비스 로직 추가. Prisma 마이그레이션 1건 포함(`schema.prisma` +23 lines).

### 독립 보안 리뷰 후속 수정 (sync 전 적용, 미커밋 → 본 SPEC 동기화와 함께 반영)

Phase 1 구현 완료 후 독립 보안 리뷰에서 4건의 이슈가 발견되어 sync 전에 모두 수정했다.

1. **SMTP 비밀번호 평문 노출** (`packages/admin/src/settings.ts`) — `getNotificationSettings()`가 `smtpPassword`를 평문으로 RSC 페이로드에 포함시키던 문제. `NotificationSettingsView` 타입을 신설하여 `smtpPassword` 필드를 제거하고 저장 여부만 `hasPassword: boolean`으로 전달하도록 수정. `NotificationSettingsForm.tsx`도 write-only 비밀번호 입력 필드로 변경(서버에서 받은 값을 다시 표시하지 않음).
2. **회원 그룹 `isAdmin` 권한 상승 경로** (`apps/web/server/api/routers/admin/group.ts`) — `group.create`/`group.update` mutation의 입력 스키마에 `isAdmin: z.boolean()`이 포함되어 있어, 클라이언트가 그룹을 `isAdmin=true`로 생성하고 임의 회원을 배정하는 것만으로 관리자 권한을 획득할 수 있는 권한 상승 경로가 존재했음. `isAdmin`을 입력 스키마에서 완전히 제거하고 항상 `false`로 고정하도록 수정. 관리자 권한 부여 그룹 지정은 별도 SPEC으로 분리.
3. **설정 비원자적 쓰기** (`apps/web/server/api/routers/admin/settings.ts`) — 알림/보안 설정 저장이 여러 개의 개별 쓰기로 분리되어 있어 일부 실패 시 설정이 부분 적용되는 위험이 있었음. 트랜잭션으로 묶어 원자적 쓰기로 변경.
4. **대시보드 순차 fetch로 인한 장애 전파** (`apps/web/app/admin/page.tsx`) — REQ-ADMIN2-007(위젯별 장애 격리)이 `try/catch` 순차 `await`로 구현되어 있어, 의도는 격리였으나 한 위젯의 지연이 다른 위젯 fetch 시작을 막는 형태였음. `Promise.allSettled`로 병렬 fetch + 위젯별 격리를 동시에 satisfy하도록 수정.

영향받은 파일: `apps/web/app/admin/page.tsx`, `apps/web/app/admin/settings/notification/NotificationSettingsForm.tsx`, `apps/web/server/api/routers/admin/group.ts`, `apps/web/server/api/routers/admin/settings.ts`, `packages/admin/src/settings.ts`.

### M2 (Phase 2 / P2) — Slice 2A~2C 구현 완료 (2026-06-18)

| Slice | 구현 범위 | 대응 REQ | 커밋 |
|---|---|---|---|
| 2A — 레이아웃/페이지 설정 확장 | `/admin/site/layouts` 목록, 레이아웃 인스턴스 생성/단건 조회(`getInstance`)/변수 편집, `LayoutInstanceForm`의 server action 분리 | REQ-ADMIN2-020~022, 027, 029, 030 | `3614ae3`, `412d2b6`(후속 수정) |
| 2B — 파일 관리 | `/admin/files` 목록·고아 파일 정리·업로드/다운로드 설정 | REQ-ADMIN2-078~081 | `a6416e7`, `97d0b55`(후속 수정) |
| 2C — 신고 관리 + 문서/회원 설정 | 신고 문서/댓글 관리(`/admin/documents/declared`, `/admin/comments/declared`), 회원 디자인 설정, 회원 목록 상태 필터, 문서 "임시" 필터, 약관 버전 기록, 기능 설정 탭, 가입 양식 커스터마이징(`/admin/members/joinform`), 문서 설정(`/admin/documents/config`) | REQ-ADMIN2-072, 074, 077, 051~055, 152, 153 | `9e6bc5e`, `7c1fa42`, `83de4cf`, `11410ea`, `e23235d` |

2C는 두 차례에 걸쳐 구현되었다: 1차로 신고 관리(072/077)만 구현되었고, 053/152/153은 그 이전 작업에서 이미 존재함이 확인되어 별도 구현 없이 완료로 처리했다. 나머지 5건(051/052/054/055/074)은 본 sync 직전 세션에서 회원 설정 확장(051 약관 버전, 052 기능 탭, 054/055 가입 양식 에디터)과 문서 설정 페이지(074)로 나누어 병렬 구현했다. `SiteSetting` 키 기반 저장 패턴(`getSiteSetting`/`setSiteSetting` + 트랜잭션 + AdminLog)을 `settings.ts`와 `document.ts` 양쪽에 일관되게 적용했으며, `document.ts`는 파일 충돌 방지를 위해 동일 헬퍼를 로컬로 의도적으로 중복시켰다(기존 `packages/admin/src/settings.ts` ↔ `apps/web/.../settings.ts` 간 중복 패턴과 동일한 전례).

신규/수정 파일: `apps/web/app/admin/{comments,documents}/declared/*`, `apps/web/app/admin/members/joinform/*`, `apps/web/app/admin/documents/config/*`, `apps/web/app/admin/members/settings/{page.tsx,forms.tsx,actions.ts}`, `apps/web/server/api/routers/admin/{settings.ts,document.ts,moderation.ts}`, `apps/web/app/admin/site/layouts/instances/actions.ts`(신규), `apps/web/app/admin/files/FileManagementClient.tsx`, `apps/web/server/api/routers/admin/file.ts`, `packages/file/src/index.ts`, `packages/admin/src/settings.ts`. 테스트: `apps/web/server/api/routers/admin/{settings,document}.test.ts` 신규(17건, `createCallerFactory` + mocked Prisma 패턴).

### M2 (Phase 2 / P2) — Slice 2D~2H 구현 완료 (2026-06-20, 커밋 `127f0e6`, 범위 수정 `2f8b242`)

| Slice | 구현 범위 | 대응 REQ |
|---|---|---|
| 2D — SEO + 고급 설정 + 큐 + 비동기/사이트잠금 | `/admin/settings/seo`, `/admin/settings/advanced`(157/158 라우팅·지역화·성능·캐시 필드 포함), `/admin/settings/async`(154, v1.2.1 범위로 6필드 한정), `/admin/settings/sitelock` 런타임 UI | REQ-ADMIN2-112, 116, 157, 158, 118, 119, 154, 155 |
| 2E — 스팸필터 | `/admin/settings/spamfilter/{words,ip}` 금지어·IP 관리, `/admin/settings/spamfilter/block` 차단 규칙, `comment.ts`/`document.ts` 제출 경로 필터 가드 연동. 신규 Prisma 모델 `SpamDeniedWord`/`SpamDeniedIp`/`SpamRule` | REQ-ADMIN2-120~123 |
| 2F — 통계 + 도메인 + 모듈 상세 | `/admin/stats`(일간 필터), 대시보드 업데이트 알림 위젯 + 요약 카운터 strip(`DashboardWidgets.tsx` 확장), `/admin/domains`(신규 `domain` tRPC 라우터), `/admin/modules/[id]` | REQ-ADMIN2-004, 005, 006, 009, 140~142, 125, 146 |
| 2G — 보안 IP 제어 + 테스트 메일 | `/admin/settings/security`에 IP 허용/차단 목록 연동, 알림 설정 테스트 메일 발송 액션 | REQ-ADMIN2-111, 115 |
| 2H — admin 전역 유틸리티 | 관리자 메뉴 캐시 초기화 + 만료 세션 정리, 신규 `AdminFooter.tsx` 컴포넌트로 admin 레이아웃에 연동 | REQ-ADMIN2-150, 151 |

품질 근거: `pnpm --filter @rhymix-ts/admin typecheck` clean, `pnpm --filter @rhymix-ts/admin test` 117/117 통과, 관련 `apps/web` 라우터 테스트 39/39 통과. SPEC-ADMIN-002 대상 파일의 `apps/web` typecheck는 clean하며, 잔존 40건의 typecheck 오류는 `app/admin/members/page.tsx`, `app/admin/pages/[instanceId]/edit/*`, `app/admin/site/design/*`, `components/admin/site-design/*`, `components/theme/*`, `lib/theme/token-form-builder.*`에 위치한 본 SPEC과 무관한 기존 결함이다.

신규/수정 파일(대표): `apps/web/app/admin/settings/{advanced,async,seo,sitelock,spamfilter}/`, `apps/web/app/admin/{stats,domains}/`, `apps/web/app/admin/modules/[id]/`, `apps/web/server/api/routers/admin/{admin-utils,security-ip,spamfilter,stats}.ts`, `apps/web/server/api/routers/content/{comment,document}.ts`(스팸필터 가드 연동), `packages/admin/src/{admin-utils.ts,security/ip-control.ts,spamfilter/,stats/}`, `packages/db/prisma/schema.prisma`(`SpamDeniedWord`/`SpamDeniedIp`/`SpamRule` 추가). 테스트: `admin-utils.test.ts`, `security-ip.test.ts`, `spamfilter.test.ts`, `stats.test.ts`(라우터 + 패키지 양쪽).

알려진 갭 (정직하게 기록, 은폐하지 않음):

1. **Prisma 마이그레이션 미생성** — ~~신규 테이블 3종...~~ **(2026-06-20 해소)** `packages/db/prisma/migrations/20260620000000_spec_admin_002_slice2e_spamfilter/`에 마이그레이션 파일이 생성되어 있음을 확인. 배포 차단 요인 해소.
2. **acceptance.md AC 공백** — REQ-ADMIN2-111, 115, 004, 005, 006, 125, 146에 대응하는 AC 항목이 `acceptance.md`에 없다. 본 세션 이전부터 존재하던 SPEC 문서화 갭으로, 본 세션이 신규로 만든 것은 아니나 차후 manager-spec 패스에서 보강이 필요하다.
3. **페이지 레벨 단위 테스트 부재** — 신규 UI 페이지(advanced/async/seo/sitelock/spamfilter/stats/domains/modules[id])에는 페이지 단위 테스트가 없다. 기존 프로젝트 관행(대부분의 설정 페이지가 페이지 레벨 미테스트, `settings/site/page.test.tsx`만 예외)과 동일하므로 회귀는 아니다.
4. **커밋 비원자성** — 환경의 worktree 격리 한계로 2D+2E+2F+2G+2H 구현이 커밋 `127f0e6` 1건에 모두 묶였고, 이후 범위 수정 커밋 `2f8b242`가 별도로 추가됐다. git history는 재작성하지 않는다.

### M3 (Phase 3 / P3) — 완료 (2026-06-20)

plan.md 마일스톤 정의에 따른 M3(Slice 3A~3G)의 최종 상태:

- Slice 3A(설문), 3B(태그/별칭/닉네임 이력), 3D(레이아웃 미리보기/복제·메뉴 단축·페이지 모바일 콘텐츠), 3E(디버그/캡챠/쪽지), 3E2(파일 기타설정/대시보드 위젯), 3F(서버환경/코어정리) — 모두 구현·테스트·커밋 완료(`40ec2af`, `7523006`, `accc895`, `ae1214f`, `7f13866`, `f00953a`).
- Slice 3C(회원 부가 설정, REQ-ADMIN2-049/028) — REQ-028은 Slice 3D에서 기구현 확인(추가 작업 불필요), REQ-049는 전제 조건(기존 구성된 소셜 프로바이더)이 코드베이스에 부재하여 사용자 확인 후 DEFERRED·백로그 재분류. 코드 변경 없음.
- Slice 3G(비동기 작업 큐 모니터링, REQ-161, 선택) — 사용자가 비채택을 결정하여 본 SPEC 범위에서 제외.

M3을 포함해 SPEC-ADMIN-002의 모든 Phase(P1~P3)가 종료 상태에 도달했다.
