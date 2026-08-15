---
id: SPEC-LEGACY-PARITY-001
title: "사이트 제작/편집 영역 레거시 parity — 메뉴 편집 격차 해소 + Slice D 승계 검증"
version: "0.1.0"
status: draft
created: 2026-08-15
updated: 2026-08-15
author: MoAI
priority: P1
phase: "Phase 15 — 관리자 레거시 parity 시리즈"
module: "apps/web/app/admin/menu, apps/web/app/admin/site/design, apps/web/components/admin, packages/db/prisma"
lifecycle: spec-anchored
tier: M
tags: "legacy-parity, admin, menu, site-design, slice-d-succession"
depends_on: [SPEC-LEGACY-PARITY-000]
related_specs: [SPEC-MENU-001, SPEC-ADMIN-MENU-PARITY-001, SPEC-LEGACY-PARITY-004]
---

# SPEC-LEGACY-PARITY-001 — 사이트 제작/편집

> 관리자 레거시 parity 시리즈의 첫 영역 SPEC. 공통 규약은 `SPEC-LEGACY-PARITY-000`을 따른다.
> 전건 판정표(REQ-LGP-003)는 `research.md`에 있다.

## HISTORY

- 2026-08-15 (v0.1.0): 최초 작성. 재크롤(`49e0794`)로 이 영역이 6개 화면이 아니라 **2개**임을
  확정한 뒤 작성했다. 화면 2건은 모두 뉴버전에 대응 화면이 있고, 격차는 화면 부재가 아니라
  `/admin/menu` 안의 기능 4건에서 발생한다. 여기에 `SPEC-MENU-001` Slice D의 미검증 3건을 승계한다.

## 1. Why

레거시에서 옮겨온 운영자가 `사이트 메뉴 편집`에서 하던 일 중 뉴버전에서 **못 하는 일**이 있다.
`research.md` §1.1에서 4건을 식별했다. 화면은 있으나 기능이 빠져 있어, 화면 목록만 보면
parity가 맞은 것처럼 보이는 것이 이 영역의 위험이다.

동시에 `SPEC-MENU-001`이 "코드는 있으나 admin 로그인이 필요해 실행 확인을 못 했다"며 남긴 3건이
그대로 남아 있다. 그 SPEC은 frontmatter가 `completed`인데 본문은 `in-progress`라고 적혀 있어
(`research.md` §3.1), 실제 상태가 두 곳에서 어긋나 있다. 지금은 양쪽 사이트가 동일 계정으로
설치돼 있어 재현이 가능하므로, 이 SPEC이 그 검증을 흡수한다.

## 2. What

### 2.1 범위

| 대상 | 내용 |
|---|---|
| 레거시 화면 | `dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign` (2건, 전건) |
| 뉴버전 대응 | `/admin/menu`, `/admin/site/design` |
| 격차 해소 | G1 메뉴 아이템 복제, G2 버튼 이미지 업로드 UI |
| 승계 검증 | 슬롯 3종 동시 배정, 중첩 트리 렌더, `groupIds` ACL 렌더 제한 |
| 백로그 기록 | G3 다국어 텍스트, G4 메뉴 검색 (§2.3 결정 참조) |

### 2.2 이미 충족된 것 — 재구현 대상 아님

- `dispMenuAdminSiteDesign` → `/admin/site/design`은 **격차 0건**이다. 오히려 뉴버전이 넓다
  (테마 지정, 디자인 토큰 편집). `REQ-LGP-005`에 따라 제거 후보가 아니라 보존 대상이다.
- `SPEC-MENU-001`이 "죽은 코드"로 기록한 `Footer.tsx`/`Utility.tsx` 문제는 **이미 해소돼 있다**.
  `app/layout.tsx:10-11, 69, 73`에서 `Utility`·`FooterMenuSlot`이 import되고 렌더된다.
  승계 대상에서 뺀다.
- 메뉴 순서 DnD, 테마·토큰은 레거시에 없는 뉴버전 고유 기능이다. 유지한다(`REQ-LGP-005`).

### 2.3 Open Question 결정 (기본값 채택 — 이견 있으면 되돌릴 수 있음)

`research.md` §6의 3건을 다음과 같이 정하고 진행한다. 셋 다 범위를 좌우하는 결정이라
근거를 남긴다.

| # | 질문 | 결정 | 사유 |
|---|---|---|---|
| OQ-1 | `/admin/menu`에 디자인 화면 안내를 넣을 것인가 | **넣지 않음** | 사이드바에 `사이트 제작/편집` 그룹으로 두 화면이 나란히 있다. 안내 링크는 화면 간 결합만 늘린다. 범위 절제 |
| OQ-2 | 다국어 텍스트(G3)를 이 SPEC에서 처리할 것인가 | **범위 밖 — 백로그** | `MenuItem.title` 스키마 변경 + 사이트 전역 다국어 정책이 필요하다. 한 영역 SPEC이 감당할 범위가 아니고, 메뉴에만 다국어를 넣으면 반쪽이 된다 |
| OQ-3 | 아이템 복제(G1)를 레거시 클립보드 UX로 옮길 것인가 | **복제 버튼 1개로 단순화** | 레거시의 잘라내기/복사/붙여넣기 3단계 중 "이동"은 이미 DnD가 대체한다. 남는 실질 기능은 복제뿐이므로 클립보드 상태기계를 옮길 이유가 없다 |

G4(메뉴 검색)는 `SPEC-MENU-001` REQ-MENU-051로 이미 사용자 결정에 의해 백로그 유예된 항목이다.
새 격차가 아니므로 이 SPEC에서도 유예를 유지한다.

## 3. 요구사항 (GEARS)

**REQ-SITE-001 (Ubiquitous)**: The `/admin/menu` screen SHALL provide a menu-item duplication
capability equivalent to the legacy clipboard copy+paste flow. 근거: 레거시 submit 버튼
`복사`·`붙여넣기` (`pages/dispMenuAdminSiteMap-*.json`). 복제된 아이템은 원본과 같은 부모 아래
바로 다음 순서에 배치되며, 자식 아이템을 가진 경우 하위 트리 전체가 함께 복제된다.

**REQ-SITE-002 (Ubiquitous)**: The menu-item editor SHALL expose upload and removal controls for
the three button-image states (normal / hover / active). 근거: 레거시 폼
`menu.procMenuAdminButtonUpload` ×3 (`isNormalDelete` / `isHoverDelete` / `isActiveDelete` 필드).
데이터 모델(`MenuItem.normalBtn`/`hoverBtn`/`activeBtn`)과 서버 액션(`actions.ts:89-91, 148-150`)은
이미 존재하므로 요구 범위는 UI와 그 배선이다.

**REQ-SITE-003 (Event-Driven)**: WHEN a menu item's button image is removed, the system SHALL clear
the corresponding JSON field rather than leaving a dangling asset reference. 근거: 레거시가
`is*Delete` 플래그를 별도로 두어 삭제를 명시적으로 구분한다.

**REQ-SITE-004 (State-Driven)**: WHILE a menu item declares a non-empty `groupIds` list, the public
menu renderer SHALL render that item only for members belonging to at least one listed group.
`SPEC-MENU-001` AC-D3 승계 — 스키마(`MenuItem.groupIds Int[]`)는 존재하나 런타임 관찰로
확정된 적이 없다.

**REQ-SITE-005 (Ubiquitous)**: The public menu renderer SHALL render nested parent-child menu trees
to their full depth. `SPEC-MENU-001` AC-D2 승계 — `MenuItem.parentId` 자기참조 관계와
`MenuItemDnDTree.tsx`는 존재하나 다단계 렌더가 확인된 적이 없다.

**REQ-SITE-006 (Ubiquitous)**: The `/admin/menu` screen SHALL support assigning menus to all three
slots (`HEADER_PRIMARY`, footer, utility) concurrently. `SPEC-MENU-001` AC-C1 승계 —
`listSlotAssignments` (`page.tsx:25`)는 존재하나 3종 동시 배정이 확인된 적이 없다.

**REQ-SITE-007 (Unwanted)**: This SPEC SHALL NOT remove or narrow the rhymix-ts-only capabilities of
`/admin/site/design` (theme assignment, design-token editing) or `/admin/menu` (drag-and-drop
ordering) on the grounds that the legacy version lacks them. `REQ-LGP-005` 적용.

**REQ-SITE-008 (Unwanted)**: This SPEC SHALL NOT alter the six-group sidebar order or group
membership defined in `AdminSidebar.tsx`. `REQ-LGP-004` 적용 — 이 영역 작업은 그룹 **안에서만**
이루어진다.

**REQ-SITE-009 (Event-Driven)**: WHEN this SPEC reaches `status: completed`, the system SHALL mark
`SPEC-MENU-001` as `superseded` with a pointer to this SPEC ID. `REQ-LGP-006` 적용. 이때
`SPEC-MENU-001`의 frontmatter/본문 status 불일치(`research.md` §3.1)도 함께 해소된다.

## 4. Out of Scope

### 4.1 Out of Scope — 다국어 텍스트 (G3)

메뉴 아이템 제목의 다국어 지원은 `MenuItem.title` 스키마 변경과 사이트 전역 다국어 정책을
동시에 요구한다. 메뉴에만 넣으면 반쪽 기능이 된다. 별도 SPEC으로 분리한다(§2.3 OQ-2).

### 4.2 Out of Scope — 메뉴 검색 (G4)

`SPEC-MENU-001` REQ-MENU-051로 이미 사용자 결정에 의해 백로그 유예된 항목이다. 유예를 유지한다.

### 4.3 Out of Scope — 즐겨찾기 토글

`admin.procAdminToggleFavorite`는 모든 관리자 화면에 붙는 공통 기능이며
`SPEC-LEGACY-PARITY-004`(즐겨찾기)의 범위다. 여기서 다루면 영역 경계가 무너진다.

### 4.4 Out of Scope — 공통 껍데기 화면·이벤트

`공통(헤더/푸터)` 그룹 4개 화면(Dashboard, `dispMemberAdminInfo`, `dispAdminCleanupList`,
`dispAdminViewServerEnv`)과 푸터 공통 버튼 3종(`doResetAdminMenu`, `doRecompileCacheFile`,
`doClearSession`)은 어느 영역 SPEC의 범위도 아니다(`research.md` §0, §1.3).

### 4.5 Out of Scope — 레거시 클립보드 UX 이식

잘라내기/붙여넣기 상태기계는 옮기지 않는다. 이동은 DnD가 이미 대체하고 있다(§2.3 OQ-3).

## 5. Acceptance Criteria

`acceptance.md` 참조. 요약: AC 8건 — 격차 해소 3건(REQ-SITE-001~003), 승계 검증 3건
(REQ-SITE-004~006), 불변식 보존 2건(REQ-SITE-007~008).

## 6. 근거 강도 (정직 고지)

`research.md` §5를 그대로 승계한다. 레거시 쪽 기능 목록은 1차 근거 직접 인용이라 강하지만,
**뉴버전에 "없다"는 판정은 정적 코드 확인까지가 근거**다. 따라서 G1·G2를 격차로 확정하는 것은
M1의 실측 재확인을 통과한 뒤다. 그 전까지 격차 주장은 가설이다
(`verification-claim-integrity.md` §1.1 surface 3).

## §F Phase 4 Mode Selection

- 입력: tier M, 도메인 2개(admin UI, public renderer), 예상 파일 5-10개, 제품 코드 변경 있음
- 모드 평가: trivial(아님), background(아님 — 쓰기 작업), agent-team(RETIRED),
  parallel(아님 — 코딩 중심, Anthropic coding-task 병렬성 유보), workflow(아님 — 기계적 대량 변환 아님)
- Decision: sub-agent (Mode 5)
- Justification: 코딩 중심 작업이므로 순차 sub-agent가 기본값이다. M1(실측 재확인)만 읽기 전용이라
  병렬 여지가 있으나, 화면 2개 비교라 위임 비용이 작업 비용을 넘는다.
