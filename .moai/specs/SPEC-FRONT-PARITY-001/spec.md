---
id: SPEC-FRONT-PARITY-001
title: "방문자 화면 레거시 parity 1단계 — 인덱스 모듈 정책 + 중복 마크업 해소"
version: "0.1.1"
status: draft
created: 2026-08-11
updated: 2026-08-11
author: manager-spec
priority: P1
phase: "Phase 14 — 방문자 화면 레거시 parity"
module: "packages/db/src/install/seed.ts, apps/web/app/layout.tsx, themes/default/layouts/default.tsx, packages/board/src/routes/index-page.tsx"
lifecycle: spec-anchored
tier: M
tags: "frontend, legacy-parity, install-seed, index-module, layout, markup, accessibility"
depends_on: [SPEC-INSTALL-001, SPEC-LAYOUT-001, SPEC-PAGE-001]
related_specs: [SPEC-THEME-001, SPEC-BOARD-CRUD-001, SPEC-ADMIN-MENU-PARITY-001]
---

# SPEC-FRONT-PARITY-001 — 방문자 화면 레거시 parity 1단계

> 레거시 Rhymix(XEDITION 테마)와 rhymix-ts의 방문자 화면을 재설치·Playwright 전수 대조
> (research.md)하여 확인된 격차 중 **구조·버그 영역**을 마감한다. 히어로 캐러셀·섹션 디자인·
> 웹폰트 등 **디자인 자산 제작 영역은 본 SPEC 범위 밖**(후속 SPEC)이며, 작업 성격이 달라
> 의도적으로 분리했다. PHP 1:1 포팅이 아니다.

## HISTORY

- 2026-08-12 (v0.1.1): plan-auditor 1차 감사(FAIL, 0.72) 반영. **D1(critical)** —
  `seed.test.ts:406,469`가 `indexModuleInstanceId === board`를 단언, REQ-FP-001이 뒤집는
  불변식임을 실측 확인 → plan.md M2 산출물 추가 + acceptance.md에 "의도된 변경 carve-out"
  신설(회귀와 구분). **D2(critical)** — `Footer.tsx:20`이 `MenuSlotRenderer slot="FOOTER"`의
  유일 렌더러(SPEC-MENU-001), `GlobalFooter.tsx`가 SPEC-INSTALL-003 REQ-INSTALL3-040~042
  이행임을 실측 확인 → REQ-FP-006을 (a)(b)(c) 3항으로 확장, plan.md M1에 결정 입력 3종 표
  추가, PRESERVE 보강. **D3(major)** — `<main>` 실제 영향 22개 파일(계획서 3개로 오기)
  실측 확인 → "방문자 화면" 범위 정의 신설, 범위 밖 라우트를 Out of Scope로 분리.
  **D4** — REQ-FP-007 2절을 측정 규정에서 행위 규정으로 재작성. **D5** — AC-FP-005에
  다크모드 토글 검증 추가, AC-FP-006 위임 해소. **D6** — 메뉴슬롯 시드 출처를
  `30acfeb`로 정정(2곳). **D7** — AC-FP-002 검증 리터럴 고정. **D8/D9** — 중첩 표현
  통일, Out of Scope bullet 형식화.
- 2026-08-11 (v0.1.0): 최초 작성. 양쪽 DB 초기화 + 재설치 후 Playwright로 방문자 화면 대조
  (research.md). 선행 조건으로 연결 버그 3건이 이미 수정됨(`30acfeb`) — 그 수정 없이
  비교했다면 "메뉴/레이아웃 없음"이 디자인 격차로 오분류되었을 것이므로, 본 SPEC의 격차
  목록은 **정상 기준선** 위에서 도출되었다. 사용자 결정 2건 반영: (1) 인덱스 모듈을 레거시와
  동일하게 page로 확정, (2) 범위를 구조·버그로 한정하고 디자인은 후속 분리.

## 1. Why

설치 직후 방문자가 보는 첫 화면이 레거시와 근본적으로 다르다. 레거시는 디자인된 소개
페이지를 보여주는 반면 rhymix-ts는 (샘플 글 1건이 든) 게시판 목록을 보여준다. 이는 기능
부재가 아니라 **설치 시드가 인덱스 모듈로 board를 선택**한 결과이며, page 모듈은 이미
구현되어 있다(SPEC-PAGE-001).

또한 대조 과정에서 디자인과 무관한 마크업 결함 2건이 확인되었다: 푸터가 3중 렌더되고
(`GlobalFooter` / `Footer` / DefaultLayout 각각), `<main>`이 3개 렌더되어 2단 중첩된다
(`app/layout.tsx` / DefaultLayout / board 모듈). HTML 명세상 `<main>`은 문서당 1개여야 하며,
중복 푸터는 사용자에게 동일 문구를 2회 노출한다.

## 2. What

### 인덱스 모듈 정책 (research.md §1, G1)

1. 설치 시 **page 모듈 인스턴스를 생성**하고 이를 도메인의 인덱스 모듈로 지정한다
   (현재는 board가 인덱스). 게시판은 헤더 메뉴(Board/Notice/Q&A)로 접근한다 — 메뉴 슬롯
   연결은 `30acfeb`(독립 커밋 `fix(install): 설치 시 레이아웃·메뉴 연결 누락 수정`)로 이미
   정상 동작한다.
2. 해당 page에 **환영 콘텐츠**(제목 + 소개 문단 + 관리자 진입 안내)를 시딩한다. 레거시의
   히어로 캐러셀·6카드 가이드·4카드 커뮤니티 섹션을 그대로 재현하지 않는다(§4 Out of Scope).

### 중복 마크업 해소 (research.md §4, G4·G5)

3. 푸터를 **문서당 1개**로 정리한다. 현재 3개 컴포넌트가 모두 렌더되며 그중 2개가
   "Powered by Rhymix-TS"로 동일 문구를 중복 노출한다.
4. `<main>`을 **문서당 1개**로 정리한다. 현재 `app/layout.tsx` → DefaultLayout → board 모듈
   3단계가 각각 `<main>`을 렌더해 2단 중첩이 발생한다.

## 3. 요구사항 (GEARS)

**REQ-FP-001 (Event-Driven)**: WHEN the install wizard completes successfully, the system SHALL
create a `page` module instance and SHALL set it as the domain's index module
(`domains.indexModuleInstanceId`), replacing the current `board` assignment.

**REQ-FP-002 (Event-Driven)**: WHEN the install wizard completes successfully, the system SHALL
populate the index page instance with welcome content containing at minimum a heading, an
introductory paragraph, and a link to the admin dashboard (`/admin`).

> **"방문자 화면"의 정의 (REQ-FP-003·004의 적용 범위)**: 인증이 필요하지 않은 공개 라우트 —
> 인덱스(`/`), 게시판 라우트(`/board`, `/notice`, `/qna` 및 그 하위 글 보기). `/admin/**`,
> `/install/**`, `(member)` 그룹 라우트는 **본 SPEC의 적용 범위 밖**이다. 이들 라우트도
> 동일한 `<main>` 중첩 문제를 갖지만(현황 22개 파일이 `<main>`을 렌더, plan.md §1 참고),
> 범위를 한정하지 않으면 Tier M을 벗어나며 관리자/설치 화면 회귀 위험이 커진다. 전역 정리는
> 후속 SPEC으로 분리한다.

**REQ-FP-003 (Ubiquitous)**: Any rendered visitor-facing page (as defined above) SHALL contain
exactly one `<footer>` element, and SHALL NOT display the same footer text more than once.

**REQ-FP-004 (Ubiquitous)**: Any rendered visitor-facing page (as defined above) SHALL contain
exactly one `<main>` element, and SHALL NOT nest a `<main>` element inside another `<main>`
element.

**REQ-FP-005 (Ubiquitous)**: The board module SHALL remain reachable at its own route
(`/board`, `/notice`, `/qna`) and via the header menu after the index module changes, and its list
view SHALL retain its current columns, sorting, and card-view controls.

**REQ-FP-006 (Unwanted)**: The system SHALL NOT remove or regress the following capabilities while
implementing REQ-FP-001~005:
(a) the dark-mode toggle, the board list sort controls (최신순 / 추천순 / 조회순), the card-view
toggle, and the 추천수 column (rhymix-ts-only advantages over legacy);
(b) **the FOOTER menu slot rendering path** — `MenuSlotRenderer slot="FOOTER"` is currently
rendered by exactly one component (`apps/web/components/layout/Footer.tsx`), fulfilling
`SPEC-MENU-001` REQ-MENU-030~034. WHERE footer consolidation removes that component, the system
SHALL relocate the FOOTER slot rendering to the surviving footer, so that a FOOTER slot assignment
made in the admin UI (`SlotAssignmentTable`) continues to render;
(c) **the always-rendered attribution footer** — `apps/web/components/layout/GlobalFooter.tsx`
fulfills `SPEC-INSTALL-003` REQ-INSTALL3-040~042 (온보딩 해제 여부와 무관하게 항상 렌더) and is
covered by dedicated tests. WHERE footer consolidation removes it, the surviving footer SHALL
satisfy the same always-render obligation.

**REQ-FP-007 (State-Driven)**: WHILE an authenticated administrator views the index page, the
system SHALL continue to render the operator onboarding panel above the page content
(existing SPEC-INSTALL-003 behavior), AND the onboarding panel SHALL NOT render a `<main>` or
`<footer>` element of its own.

## 4. Out of Scope

### Out of Scope — 디자인 자산 제작 (후속 SPEC)

- 히어로 캐러셀 — 레거시 `div.visual.swiper-container`, 슬라이드 6개
- 메인 콘텐츠 섹션 — `section.intro` / `section.guide`(카드 6개) / `section.connect`(카드 4개)
- 웹폰트 — 레거시 `webfont.css`
- 모듈별 스킨 CSS 계층 — 레거시 `modules/board/skins/xedition/board.default.css`

실제 디자인 자산 제작이 필요한 영역으로, 구조·버그 수정과 작업 성격 및 검증 방식이 다르다
(research.md §5 판정 참고). 본 SPEC은 그 작업이 올라갈 **구조적 토대**만 마련한다.

### Out of Scope — 방문자 화면 외 라우트의 `<main>` 정리

- `/admin/**` — 현재 `<main>` 3중 렌더(`app/layout.tsx` + `admin/layout.tsx` + 페이지)
- `/install/**` — 5개 파일이 자체 `<main>` 렌더
- `(member)` 그룹 — 6개 파일이 자체 `<main>` 렌더

전역 `<main>` 정리는 22개 파일에 영향을 주어 Tier M을 벗어나고 관리자/설치 화면 회귀 위험이
크다. spec.md §3의 "방문자 화면" 정의에 따라 인덱스·게시판 라우트로 한정하며, 전역 정리는
후속 SPEC으로 분리한다.

### Out of Scope — 게시판 목록 컬럼 변경

레거시 6컬럼(번호/제목/글쓴이/날짜/조회 수/+)과 뉴버전 6컬럼(번호/제목/작성자/작성일/
조회수/추천수)은 이미 동등하다(research.md G6). 라벨 표기 차이만 있으며 변경하지 않는다.

### Out of Scope — 레거시 회귀 금지 항목

다크모드 토글(레거시는 `color_scheme_light` 고정), 정렬 컨트롤, 카드형 보기는 뉴버전 우위
항목이다(research.md G12). REQ-FP-006으로 보호하며 레거시에 맞춰 제거하지 않는다.

### Out of Scope — 로그인 위젯 메인 노출

레거시는 메인에 `section.login_widget`을 노출하나(research.md G9), 뉴버전은 헤더 로그인
링크 방식을 채택하고 있다. 우선순위가 낮아 본 SPEC에서 다루지 않는다.

### Out of Scope — 관리자 바

레거시 하단 고정 관리자 바는 뉴버전의 온보딩 패널과 성격이 다른 설계 선택이며 격차로
분류하지 않는다(research.md G11).

## §F Phase 4 Mode Selection

- 입력: tier M, scope 4~5개 파일(seed.ts + layout.tsx + default.tsx + index-page.tsx),
  도메인 1(프론트엔드), 언어 TS 단일, 코딩 중심(concurrency benefit LOW)
- 모드 평가: trivial(아님 — 시드 구조 변경 포함), background(아님 — 쓰기), agent-team(RETIRED),
  parallel(아님 — 파일 간 렌더 트리 의존), workflow(아님 — 소규모), sub-agent(선택)
- Decision: sub-agent (Mode 5)
- Justification: 푸터·main 정리는 렌더 트리 상하 관계가 있어 순차 판단이 안전하다.
  Implementation Kickoff Approval은 미승인 — plan-audit 후 사용자 승인 필요.
