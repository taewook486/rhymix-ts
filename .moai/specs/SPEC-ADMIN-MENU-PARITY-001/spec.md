---
id: SPEC-ADMIN-MENU-PARITY-001
title: "관리자 메뉴 레거시 parity — 사이드바 6그룹 재배치 + 즐겨찾기 기본 시딩"
version: "0.1.1"
status: completed
created: 2026-08-11
updated: 2026-08-11
author: manager-spec
priority: P1
phase: "Phase 13 — 관리자 메뉴 구조 레거시 parity"
module: "apps/web/components/admin/AdminSidebar.tsx, packages/db/src/install/seed.ts"
lifecycle: spec-anchored
tier: M
tags: "admin, legacy-parity, sidebar, navigation, favorites, install-seed"
depends_on: [SPEC-ADMIN-001, SPEC-ADMIN-EXTRAS-001, SPEC-INSTALL-001]
related_specs: [SPEC-MEMBER-PARITY-001, SPEC-CONTENT-PARITY-001]
---

# SPEC-ADMIN-MENU-PARITY-001 — 관리자 메뉴 레거시 parity

> 레거시 Rhymix(PHP) admin GNB(상단 내비게이션) 6그룹 구조(사이트 제작/편집 → 회원 → 콘텐츠 →
> 즐겨찾기 → 설정 → 고급)를 재설치·Playwright 전수 분석(research.md)으로 확인하고,
> rhymix-ts `AdminSidebar.tsx`의 현재 5섹션 구조(대시보드/콘텐츠/사이트 설정/회원/시스템)를
> 레거시 그룹 순서·귀속에 맞게 재배치한다. '즐겨찾기' 기능 자체(`SPEC-ADMIN-EXTRAS-001`)는
> 이미 레거시 대비 개선된 상태(임의 URL 즐겨찾기, DnD 순서 변경)이므로 재구현하지 않고,
> 격차로 확인된 "설치 시 기본 즐겨찾기 시딩" 1건만 보강한다. PHP 1:1 포팅이 아니다.

## HISTORY

- 2026-08-11 (v0.1.1): plan-auditor 1차 감사(FAIL, ~0.75) 반영. D1(acceptance.md GEARS 키워드
  누락) — acceptance.md 전체 재작성. D2(REQ-AMP-001↔즐겨찾기 조건부 렌더 모순) — REQ-AMP-001을
  5개 고정 그룹으로 재정의하고 즐겨찾기 조건부 렌더를 REQ-AMP-004(State-Driven)로 명시 분리.
  D3(AC-AMP-001 검증 명령 비현실적) — RTL 렌더 테스트 기준으로 교체. D4(AC-AMP-006 count만
  검증) — label/href/listOrder 값 검증으로 보강. D6(SPEC-CONTENT-PARITY-001 크로스-SPEC 충돌) —
  위젯 시스템 재배치 REQ(구 REQ-AMP-003/004) 전면 삭제, depends_on에서 제거하고
  related_specs로 이동(§2에 충돌 배경 기록). D5/D7/D8(경미) — REQ 번호 연속 재정렬(9건→8건),
  헤딩 번호 정정(2→5→6 건너뛰던 것을 1~4 연속으로), Out of Scope 헤딩 컨벤션 통일.
- 2026-08-11 (v0.1.0): 최초 작성. 양쪽 DB 초기화 + 재설치(research.md §0)로 인프라 버그 2건
  발견·수정(레거시 컨테이너 바인드 마운트 tmpfs 오작동, 뉴버전 `MailLogStatus` re-export 누락 +
  마이그레이션 `searchVector` 잘못된 ALTER 구문). Playwright로 레거시 admin GNB 전체 구조를
  실측하여 `AdminMenu.php DEFAULT_MENU_STRUCTURE`와 1:1 일치 확인.

## 1. Why

현재 rhymix-ts 관리자 사이드바는 레거시 사용자가 익숙한 메뉴 위치와 다른 순서·분류로
구성되어 있어(대시보드→콘텐츠→사이트 설정→회원→시스템), 레거시에서 마이그레이션하는
운영자의 학습 비용이 발생한다. 사용자가 명시적으로 요청한 목표는 레거시와 동일한 6그룹
순서(사이트 제작/편집→회원→콘텐츠→즐겨찾기→설정→고급)로 재배치하는 것이며, 이를 위해
레거시 소스 코드(`AdminMenu.php`)와 실제 화면(Playwright)을 대조해 각 그룹의 정확한 하위
항목 구성을 확정했다.

## 2. What

### 재배치 대상 (research.md §3, §4 G1, G2, G4, G5)

1. 사이드바 최상위 그룹을 6개로 재편: 사이트 제작/편집, 회원, 콘텐츠, (즐겨찾기 — 관리자에게
   즐겨찾기가 1건 이상 있을 때만 조건부 렌더, 기존 동작 유지), 설정, 고급.
2. "메뉴 편집"(`/admin/menu`), "디자인"(`/admin/site/design`)을 "사이트 설정"에서
   "사이트 제작/편집"으로 이동.
3. "내보내기"(`/admin/settings/export`), "가져오기"(`/admin/settings/import`)를
   "사이트 설정"에서 "고급"으로 이동.
4. 현재 "시스템" 섹션(관리자 로그/시스템 헬스/캐시 관리)을 "고급" 그룹의 하위 항목으로 편입
   (레거시 6그룹 중 대응 그룹이 없는 rhymix-ts 고유 기능이며, 고급 그룹이 "설치·유지보수성
   기능" 성격과 가장 가까움).
5. 잔여 "설정" 그룹(일반 설정/알림 설정/보안 설정)은 현행 유지.

**"위젯 시스템" 재배치는 본 SPEC 범위에서 제외한다** — plan-auditor 1차 감사(D6)에서 발견된
크로스-SPEC 충돌: `SPEC-CONTENT-PARITY-001` M1이 "위젯 시스템은 rhymix-ts 고유 항목으로 유지"
(콘텐츠 섹션, 게시판 다음 배치)를 이미 명시적으로 결정했다. 레거시의 "설치된 위젯"(고급 그룹)은
다운로드 가능한 위젯 패키지 관리이며, rhymix-ts의 "위젯 시스템"(`/admin/widgets`,
SPEC-WIDGET-001)은 위젯 인스턴스를 레이아웃 슬롯에 배치하는 별개 개념일 가능성이 높아
1:1 대응이 불확실하다. 이미 완료·병합된 결정을 강한 근거 없이 뒤집지 않는다(§4 Out of Scope
참고).

### 즐겨찾기 기본 시딩 (research.md §4 G9)

6. 설치 완료 시 레거시와 동일하게 기본 즐겨찾기 2건을 관리자 계정에 자동 생성
   ("메일·SMS·알림 발송 설정" → `/admin/settings/notification`, "알림 센터" 대응 화면).

### Out of Scope — 레거시 회귀 금지 항목 (research.md §4 G6-G8, G11)

- **즐겨찾기 추가 UI 제거** — 레거시는 추가 UI가 없으나(제거 전용), 뉴버전은 모든 관리자
  화면에 추가 버튼이 있음. 이는 레거시 대비 개선점이므로 절대 제거하지 않는다.
- **즐겨찾기 순서 고정(DnD 제거)** — 레거시는 재정렬 불가하나 뉴버전은 DnD 지원. 유지한다.
- **즐겨찾기 대상을 모듈 단위로 제한** — 레거시는 `module_name` 단위, 뉴버전은 임의
  `/admin/` 하위 URL. 유지한다.
- **무효 즐겨찾기 자동 삭제(`deleteInvalidFavorites` 이식)** — 뉴버전은 REQ-ADMIN-EXTRAS-037에
  따라 404 시에도 자동 삭제하지 않고 사용자 판단에 맡기는 의도적 설계. 변경하지 않는다.
- **다중 사이트 `site_srl` 스코프 이식** — 현재 프로젝트는 단일 사이트 운영을 전제(기존
  코드베이스 관례와 일치). 다중 사이트 지원이 별도로 결정되기 전까지 범위 밖.

## 3. 요구사항 (GEARS)

**REQ-AMP-001 (Ubiquitous)**: The admin sidebar SHALL render five fixed non-conditional top-level
navigation groups in this order: 사이트 제작/편집, 회원, 콘텐츠, 설정, 고급. (대시보드는 별도
랜딩 링크로 유지 — 레거시도 그룹 목록과 별도로 대시보드 링크를 둠. 즐겨찾기는 조건부 렌더 —
REQ-AMP-004 참고.)

**REQ-AMP-002 (Ubiquitous)**: The "사이트 제작/편집" group SHALL contain exactly: 메뉴 편집
(`/admin/menu`), 디자인(`/admin/site/design`).

**REQ-AMP-003 (Ubiquitous)**: The "고급" group SHALL contain: 내보내기
(`/admin/settings/export`), 가져오기(`/admin/settings/import`), 관리자 로그(`/admin/logs`),
시스템 헬스(`/admin/system`), 캐시 관리(`/admin/system/cache`). ("위젯 시스템"은 포함하지
않는다 — §2 참고, `SPEC-CONTENT-PARITY-001`의 기존 결정을 존중하여 "콘텐츠" 그룹에 유지)

**REQ-AMP-004 (State-Driven)**: WHILE the current administrator has one or more `AdminFavorite`
rows, the sidebar SHALL render a "즐겨찾기" section positioned in the DOM between the "콘텐츠"
group and the "설정" group, matching legacy's insertion point (immediately before the
configuration-equivalent group). WHILE the administrator has zero favorites, the system SHALL NOT
render the 즐겨찾기 section (기존 `favorites.length > 0` 동작 유지).

**REQ-AMP-005 (Ubiquitous)**: The "설정" group SHALL contain exactly: 일반 설정
(`/admin/settings/site`), 알림 설정(`/admin/settings/notification`), 보안 설정
(`/admin/settings/security`).

**REQ-AMP-006 (Event-Driven)**: WHEN the install wizard completes successfully, the system SHALL
create exactly two `AdminFavorite` rows for the newly-created administrator: label "메일·SMS·알림
발송 설정" pointing to `/admin/settings/notification` with `listOrder` 0, and label "알림 센터"
pointing to the notification center equivalent route with `listOrder` 1.

**REQ-AMP-007 (Unwanted)**: The system SHALL NOT remove, hide, or otherwise regress the following
rhymix-ts-only favorites capabilities while implementing REQ-AMP-001~006: the per-page favorite-add
control (`AddToFavoritesButton`), drag-and-drop reordering, and arbitrary `/admin/` URL favoriting.

**REQ-AMP-008 (Ubiquitous)**: Every sidebar link present before the regroup SHALL remain present
and reachable after the regroup — REQ-AMP-001~005 change section membership and order only, and
SHALL NOT remove any link (including 위젯 시스템, which stays in 콘텐츠 per §2).

## 4. Out of Scope

### Out of Scope — 즐겨찾기 기능 자체 재구현

즐겨찾기의 데이터 모델·API·UI 컴포넌트는 `SPEC-ADMIN-EXTRAS-001`에서 이미 완료되어 있으며
본 SPEC은 재구현하지 않는다. 오직 REQ-AMP-006(설치 시 기본 시딩) 1건만 추가한다.

### Out of Scope — 다중 사이트 즐겨찾기 스코프

레거시 `site_srl` 컬럼에 대응하는 사이트별 즐겨찾기 스코프는 다루지 않는다(§2 Out of Scope
참고, research.md G10).

### Out of Scope — 레거시 GNB 시각적 스타일(드롭다운/쿠키 기반 펼침 상태)

레거시는 GNB가 상단 가로 드롭다운 + 쿠키 기반 펼침 상태 저장 방식이나, rhymix-ts는 좌측
세로 사이드바 방식을 이미 채택하고 있다(SPEC-ADMIN-001). 레이아웃 패러다임 자체를 레거시와
동일하게 바꾸는 것은 범위 밖 — 그룹 순서·귀속(정보 구조)만 맞춘다.

## §F Phase 4 Mode Selection

- 입력: tier M, scope 2개 파일(AdminSidebar.tsx 구조 변경 + seed.ts 추가), 도메인 1(admin UI),
  언어 TS 단일, 코딩 중심(concurrency benefit LOW)
- 모드 평가: trivial(아님 — 구조 변경 폭 있음), background(아님 — 쓰기 작업), agent-team(RETIRED),
  parallel(아님 — 단일 컴포넌트 순차 편집이 안전), workflow(아님 — 소규모), sub-agent(선택)
- Decision: sub-agent (Mode 5)
- Justification: 파일 수가 적고(2개) 상호 의존이 낮아 순차 위임으로 충분. Implementation
  Kickoff Approval 사용자 승인됨(2026-08-11). plan-auditor 1차 감사 FAIL(D1/D2/D6 must-fix) →
  전건 반영 완료(v0.1.1), 2차 감사 대기.
