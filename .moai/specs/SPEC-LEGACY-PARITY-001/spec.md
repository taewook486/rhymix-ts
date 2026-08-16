---
id: SPEC-LEGACY-PARITY-001
title: "사이트 제작/편집 영역 레거시 parity — 메뉴 편집 격차 해소 + Slice D 승계 검증"
version: "0.4.0"
status: draft
created: 2026-08-15
updated: 2026-08-16
author: MoAI
priority: P1
phase: "Phase 15 — 관리자 레거시 parity 시리즈"
module: "apps/web/app/admin/menu, apps/web/app/admin/site/design, apps/web/components/admin, packages/admin, packages/file, packages/db/prisma"
lifecycle: spec-anchored
tier: L
tags: "legacy-parity, admin, menu, site-design, slice-d-succession"
---

# SPEC-LEGACY-PARITY-001 — 사이트 제작/편집

> 관리자 레거시 parity 시리즈의 첫 영역 SPEC. 공통 규약은 `SPEC-LEGACY-PARITY-000`을 따른다.
> 전건 판정표(REQ-LGP-003)는 `research.md`에 있다.

## HISTORY

- 2026-08-16 (v0.4.0): 세 번째 교정 — plan-audit 2차 **PASS(0.94 ≥ 0.85)** 이후 수술적 수정
  4건(감사 선택 결함 3건 + 감사가 놓친 의존성 순환 1건). (1) **`depends_on`에서 부모
  `SPEC-LEGACY-PARITY-000` 제거 — 순환 교착 판명.** depends_on 사전 점검은 `completed`만
  충족으로 보는데, 부모를 이 시리즈(REQ-LGP-001: 6개 영역 SPEC 001~006 — 현재 000·001만
  존재)가 끝나기 전에 completed로 표시할 수 없으므로, 001은 000이 끝나야 시작 가능하고 000은
  001~006이 끝나야 완료 가능한 대기 사이클이 된다. 부모는 완료 게이트 의존성의 형태가 아니라
  시리즈 전체에 시효 없이 시행되는 **통치 문서**다 — 관계는 규약 준수로 §7에 보존하고, 분석과
  경위(감사 D8 서술의 정정 포함)는 plan.md §A.2에 기록한다. (2) 감사 D1: HISTORY 항목 순서를
  최신순으로 정렬(v0.4.0 → v0.3.0 → v0.2.0 → v0.1.0). (3) 감사 D2: AC-SITE-009 기계적 검증이
  스키마 SSOT에 없는 프론트매터 필드 `^superseded_by:`를 그리던 것을 문서화된 메커니즘(정식
  전환 커밋 서식의 `git log` 검증 + 아카이브 문서 HISTORY 행 보조)으로 교체. (4) 감사 D3: Q4
  서술 정렬 — 저장 형태는 계획 시점에 `design.md` D1이 결정(이미지 참조형)했고 M3까지 유보되는
  것은 필드 수준 스키마뿐임을 명시하며, 경성 제약(참조의 공개 URL 해석 가능 — REQ-SITE-010/
  AC-SITE-010)을 핀한다.
- 2026-08-16 (v0.3.0): 두 번째 교정 — **M1 실측 실행 결과 + 사용자 M2 범위 결정 반영.**
  (1) M1이 오케스트레이터에 의해 실행 관측됨(시드 포함): G1 복제 경로 부재 **실재 확인**,
  G2 **재정의된 대로 확인**(이미지 파일 입력·상태별 제거 컨트롤 없음; 텍스트영역은
  `/admin/menu/[id]` 편집 라우트에만 렌더), 승계 3건(REQ-SITE-004~006)은 **전부 정상
  동작 관찰** — 서버 컴포넌트 캐싱이 ACL 결과를 가리지 않았다(Q3 관찰 근거). 모순 기록
  논쟁은 1차 관찰로 해소되었고, 이후 어느 문서 가지에도 의존하지 않는다(§1).
  (2) 사용자가 M2(현 M3)를 **전체 범위**로 결정: 이미지 업로드 3종 + 상태별 제거 +
  **공개 렌더링** + 저장 형태 3귀속 정합화(REQ-SITE-010·011 신설). 근거 발견: 버튼 필드는
  현재 **쓰기 전용**(공개 렌더러가 읽지 않음), 저장 형태가 3곳에서 상호 모순(편집기
  placeholder JSON / `bundle-schema.ts:29-34` `{label,href,icon,target}` / 레거시
  `varchar(255)` 파일명) — export/import 왕복이 **현재 결함**. 레거시 실사용은 0(참조
  설치 전 행 NULL). 업로드 인프라는 `packages/file/src/` 재사용(신규 금지).
  (3) 마일스톤 재배열: 특성화 테스트(M2)가 렌더러 변경(M3)보다 **먼저** 적립되어야
  한다(plan.md §A.2 근거 서술). (4) **티어 M→L 재판정** — LOC·파일 수·3패키지 정합화
  범위로 L 기준 충족. design.md 추가, plan-audit 통과 기준 0.85, 커밋 전략 PR 흐름으로
  변경(plan.md §A.6). (5) PRESERVE에서 `MenuRenderer.tsx` 제외 — 동작 보존은 특성화
  스위트로 강제한다(§2.2, plan.md §A.4). (6) 기존 "텍스트영역 운명은 M1이 정한다" 서술
  정정 — M1 관찰은 텍스트영역의 존재와 내용 성격을 확인했고, 운명 결정은 Q4 저장 형태
  정착(M3)과 함께 이루어진다.

- 2026-08-16 (v0.2.0): plan-audit 1차 감사 FAIL(0.69 < 0.80,
  `.moai/reports/plan-audit/SPEC-LEGACY-PARITY-001-review-1.md`)에 따른 교정. **D1**: G2 전제 정정 —
  뉴버전에 버튼 상태 JSON 텍스트영역(`MenuItemEditor.tsx:260-295`, `d03caf0`)이 이미 존재함이
  확인돼, 격차를 "이미지 파일 업로드 + 상태별 제거 컨트롤 부재"로 재정의하고 AC-SITE-002의
  거짓 통과를 차단. **D2**: 승계 3건을 "미검증 승계"에서 "모순 기록 회귀 확인"으로 재구성 —
  전임 문서의 양쪽 가지를 §1과 `research.md` §3.0에 인용. **D3**: REQ-SITE-009에 AC-SITE-009·
  전환 소유자(manager-spec)·대상 경로(`_archive`)를 연결. **D4**: AC-SITE-007/008 검증을 base SHA
  앵커 diff로 교체 + 메뉴 컴포넌트 characterization 테스트 선행 조건 신설. **D5**: M1 시드 사전
  작업 추가. 선택 반영: D6(crawledAt `index.json` 값으로 정정), D7(`SPEC-LEGACY-PARITY-004` 계획
  표기), D9(`related_specs` 프론트매터 필드 본문 이동 — §7), D10(Q3 유예 기록 절차). D8(부모
  draft 의존)는 plan.md §A.2에 기록.
- 2026-08-15 (v0.1.0): 최초 작성. 재크롤(`49e0794`)로 이 영역이 6개 화면이 아니라 **2개**임을
  확정한 뒤 작성했다. 화면 2건은 모두 뉴버전에 대응 화면이 있고, 격차는 화면 부재가 아니라
  `/admin/menu` 안의 기능 4건에서 발생한다. 여기에 `SPEC-MENU-001` Slice D의 미검증 3건을 승계한다.

## 1. Why

레거시에서 옮겨온 운영자가 `사이트 메뉴 편집`에서 하던 일 중 뉴버전에서 **못 하는 일**이 있다.
`research.md` §1.1에서 4건을 식별했다. 화면은 있으나 기능이 빠져 있어, 화면 목록만 보면
parity가 맞은 것처럼 보이는 것이 이 영역의 위험이다.

나머지 반쪽은 `SPEC-MENU-001`에서 승계하는 3건(슬롯 3종 배정, 중첩 트리 렌더, `groupIds` ACL)이다.
전임 문서의 기록은 **내부 모순** 상태였다 — 본문 §8.3·§8.5·Status 블록·Next Action은 3건을
"admin 로그인 필요로 미검증"이라 적지만, 같은 문서의 HISTORY v0.2.1(2026-07-18)은 정확히 그
3건을 "admin 로그인 후 실 DB/실 렌더링으로 재현 확인"이라 기록한다(양쪽 가지 전문 인용 —
`research.md` §3.0). v0.2.0까지 이 SPEC은 어느 가지도 채택하지 않고 3건을 "모순 기록 회귀
확인"로 두고 M1 실측으로 확정하기로 했는데, **M1이 2026-08-16 실행돼 확정됐다**: 시드
픽스처로 3건 모두 정상 동작을 관찰했다(비로그인 시 `groupIds` 미소속 아이템 숨김·소속 시
표시 — 캐싱이 결과를 가리지 않음, 3단계 트리 전 단계 렌더, 3슬롯 동시 배정·동시 렌더 —
`research.md` §3.0 관찰 기록). 이 판정은 **1차 관찰에 근거하며 어느 쪽 문서 가지에도
의존하지 않는다**. 전임 문서의 실측 서술 가지(HISTORY v0.2.1)와 결과가 일치했음은 기록으로
남기되, 아카이브 문서 자체는 여전히 자기모순 상태다 — 후속 독자가 stale 가지(§8.3)를 다시
물려받지 않도록 이 대조는 보존한다. 아카이브 본문 수리는 후속 작업이지 이 SPEC의 범위가
아니다(§4.6).

이 SPEC은 여기에 **쓰기 전용 버튼 필드** 문제를 더해 다룬다: `normalBtn`/`hoverBtn`/`activeBtn`의
현재 소비자는 관리자 폼·쓰기 경로·export/import뿐이며 공개 렌더러(`MenuRenderer.tsx`)는 이
필드를 읽지 않는다(`research.md` §1.4). 저장 형태도 3곳에서 상호 모순이라 편집기로 입력한 값이
export/import 왕복을 살리지 못한다(**현재 결함** — `research.md` §1.4, REQ-SITE-011). 이것이
버튼 이미지 격차를 "업로드+제거"에 머물지 않고 **공개 렌더링과 형태 정합화까지** 포함하게 된
사용자 결정(2026-08-16, 전체 범위)의 근거다.

## 2. What

### 2.1 범위

| 대상 | 내용 |
|---|---|
| 레거시 화면 | `dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign` (2건, 전건) |
| 뉴버전 대응 | `/admin/menu`, `/admin/site/design` |
| 격차 해소 | G1 메뉴 아이템 복제(관찰로 실재 확인 — `research.md` §1.2), G2 버튼 이미지 파일 업로드·상태별 제거 컨트롤 + **공개 렌더링** + 저장 형태 3귀속 정합화 (사용자 전체 범위 결정 — REQ-SITE-002·010·011) |
| 승계 — 관찰 확인·회귀 고정 | 슬롯 3종 동시 배정, 중첩 트리 렌더, `groupIds` ACL 렌더 제한 — 2026-08-16 M1 관찰로 **3건 모두 정상 동작 확인**. 재구현 대상이 아니라 특성화 테스트로 고정하는 대상 (§1, `research.md` §3.0) |
| 백로그 기록 | G3 다국어 텍스트, G4 메뉴 검색 (§2.3 결정 참조) |

### 2.2 이미 충족된 것 — 재구현 대상 아님

- `dispMenuAdminSiteDesign` → `/admin/site/design`은 **격차 0건**이다. 오히려 뉴버전이 넓다
  (테마 지정, 디자인 토큰 편집). `REQ-LGP-005`에 따라 제거 후보가 아니라 보존 대상이다.
- `SPEC-MENU-001`이 "죽은 코드"로 기록한 `Footer.tsx`/`Utility.tsx` 문제는 **이미 해소돼 있다**.
  `app/layout.tsx:10-11, 69, 73`에서 `Utility`·`FooterMenuSlot`이 import되고 렌더된다.
  승계 대상에서 뺀다.
- 메뉴 순서 DnD, 테마·토큰은 레거시에 없는 뉴버전 고유 기능이다. 유지한다(`REQ-LGP-005`).
- 승계 3건(슬롯 3종·중첩 트리·groupIds ACL)은 **2026-08-16 관찰로 동작이 확인됐다**(§1) —
  재구현 대상이 아니다. M3가 `MenuRenderer.tsx`를 변경하므로, 이 3동작의 보존은 "파일을
  안 건드린다"가 아니라 **M2 특성화 테스트가 먼저 적립되는 순서**로 강제한다(plan.md §A.2).

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

시리즈에서 물려받은 Open Question 2건은 다음과 같이 갱신한다(`research.md` §6 갱신 참조):

| # | 질문 | 결정 | 사유 |
|---|---|---|---|
| Q3 (SPEC-MENU-001) | ACL 서버 컴포넌트 캐싱 경계 | **관찰로 확정** — 현재 렌더 경로는 요청마다 ACL을 계산한다 | 2026-08-16 M1 관찰: 비로그인/로그인 양쪽에서 groupIds 필터 결과가 정확히 갈렸다(캐싱이 가리지 않음). M2 특성화 테스트가 이 경계를 회귀로 지킨다. 다른 캐싱 구성으로 바뀌면 테스트가 실패한다 |
| Q4 (SPEC-MENU-001) | 버튼 필드 저장 형태 | **계획 시점에 결정, M3에서 구현** — 저장 형태 자체는 `design.md` D1이 결정했다(선택: A 이미지 참조형). "스키마가 미정"이 아니라 **3개의 상호 모순 형태가 동시에 출하돼 있는 상태**가 문제였다: 편집기 placeholder 스타일 JSON / `bundle-schema` `{label,href,icon,target}` / 레거시 `varchar(255)` 파일명. export/import 왕복 불능은 현재 결함이다 | 사용자 결정(전체 범위)에 따라 3귀속 호출처를 정합화한다(REQ-SITE-011). M3까지 유보되는 것은 **필드 수준 스키마뿐**이다 — 정확한 필드명과 `<file-storage 참조>`가 담을 값(attachment id / 저장 키 / URL 중 무엇), 결정 틀은 `design.md` D1. 경성 제약(유보 대상 아님): 저장된 참조는 `MenuRenderer`가 공개 URL로 해석할 수 있어야 한다(REQ-SITE-010 / AC-SITE-010) |

## 3. 요구사항 (GEARS)

**REQ-SITE-001 (Ubiquitous)**: The `/admin/menu` screen SHALL provide a menu-item duplication
capability equivalent to the legacy clipboard copy+paste flow. 근거: 레거시 submit 버튼
`복사`·`붙여넣기` (`pages/dispMenuAdminSiteMap-*.json`). 복제된 아이템은 원본과 같은 부모 아래
바로 다음 순서에 배치되며, 자식 아이템을 가진 경우 하위 트리 전체가 함께 복제된다.

**REQ-SITE-002 (Ubiquitous)**: The menu-item editor SHALL expose image-file upload controls and
explicit per-state removal controls for the three button-image states (normal / hover / active).
근거: 레거시 폼 `menu.procMenuAdminButtonUpload` ×3 — `type: file` 입력(`menu_normal_btn`/
`menu_hover_btn`/`menu_active_btn`) + 상태별 제거 플래그(`isNormalDelete`/`isHoverDelete`/
`isActiveDelete`). 뉴버전 관찰(2026-08-16, M1): `/admin/menu/[id]` 편집 라우트에
"버튼 상태" JSON **텍스트영역** 3종(`MenuItemEditor.tsx:260-295`, `d03caf0`)이 렌더되나 —
placeholder `{"color": "..."}` — 메뉴 관리 화면 전체에 `type="file"` 입력이 없고(렌더 DOM·
소스 grep 양쪽 확인) 상태별 제거 컨트롤도 없다. 텍스트영역은 목록 `/admin/menu`가 아니라
편집 라우트에만 나타난다. 기존 텍스트영역의 운명(교체 또는 공존)은 Q4 저장 형태 정착(M3)과
함께 결정된다 — v0.2.0의 "M1이 정한다" 서술에서 정정(HISTORY v0.3.0 (6)). 업로드 구현은
**기존 `packages/file/src/` 인프라를 재사용한다**(신규 업로드 엔드포인트·저장 추상 금지 —
§4.7). 데이터 모델(`MenuItem.normalBtn`/`hoverBtn`/`activeBtn`)과 서버
액션(`actions.ts:89-91, 148-150`)은 이미 존재한다.

**REQ-SITE-003 (Event-Driven)**: WHEN a menu item's button image is removed, the system SHALL clear
the corresponding JSON field rather than leaving a dangling asset reference. 근거: 레거시가
`is*Delete` 플래그를 별도로 두어 삭제를 명시적으로 구분한다.

**REQ-SITE-004 (State-Driven)**: WHILE a menu item declares a non-empty `groupIds` list, the public
menu renderer SHALL render that item only for members belonging to at least one listed group.
`SPEC-MENU-001` AC-D3 승계 — **2026-08-16 M1 관찰로 정상 동작 확인**(비로그인 시 미소속
아이템 숨김, 관리자(그룹 1) 로그인 시 표시, 캐싱이 결과를 가리지 않음 — Q3 관찰 근거).
요구의 성격은 검증이 아니라 **보존**: M2 특성화 테스트로 고정해 이후 변경(특히 M3의 렌더러
변경)이 조용히 깨뜨리지 못하게 한다.

**REQ-SITE-005 (Ubiquitous)**: The public menu renderer SHALL render nested parent-child menu trees
to their full depth. `SPEC-MENU-001` AC-D2 승계 — **2026-08-16 M1 관찰로 정상 동작 확인**(시드
3단계 트리의 전 단계 렌더, 로그인·비로그인 양쪽). REQ-SITE-004와 같은 이유로 보존 대상이며
M2 특성화 테스트로 고정한다.

**REQ-SITE-006 (Ubiquitous)**: The `/admin/menu` screen SHALL support assigning menus to all three
slots (`HEADER_PRIMARY`, `FOOTER`, `UTILITY`) concurrently. `SPEC-MENU-001` AC-C1 승계 —
**2026-08-16 M1 관찰로 정상 동작 확인**(3슬롯 배정이 모두 저장되고 공개 페이지에서 동시
렌더). REQ-SITE-004와 같은 이유로 보존 대상이며 M2 특성화 테스트로 고정한다.

**REQ-SITE-007 (Unwanted)**: This SPEC SHALL NOT remove or narrow the rhymix-ts-only capabilities of
`/admin/site/design` (theme assignment, design-token editing) or `/admin/menu` (drag-and-drop
ordering) on the grounds that the legacy version lacks them. `REQ-LGP-005` 적용.

**REQ-SITE-008 (Unwanted)**: This SPEC SHALL NOT alter the six-group sidebar order or group
membership defined in `AdminSidebar.tsx`. `REQ-LGP-004` 적용 — 이 영역 작업은 그룹 **안에서만**
이루어진다.

**REQ-SITE-009 (Event-Driven)**: WHEN this SPEC reaches `status: completed`, the system SHALL mark
`SPEC-MENU-001` as `superseded` with a pointer to this SPEC ID. `REQ-LGP-006` 적용. 전환 대상은
**아카이브 경로** `.moai/specs/_archive/SPEC-MENU-001/spec.md`의 frontmatter다(활성 `.moai/specs/`
경로가 아님). `completed → superseded` 전환의 소유자는 Status Transition Ownership Matrix에 따라
**manager-spec**이고 실행 시점은 sync phase다(AC-SITE-009, plan.md M4). frontmatter `status` 축의
불일치(`research.md` §3.1)는 이 전환으로 해소된다. 본문 §8.3·Status 블록의 stale 서술 정리는
별도 후속이다(§4.6).

**REQ-SITE-010 (Ubiquitous)**: The public menu renderer SHALL render a menu item's uploaded button
image for the corresponding state (normal as the default presentation, hover / active on their
respective interaction states). 근거: 버튼 필드는 현재 **쓰기 전용**이다 — 공개 렌더러
`MenuRenderer.tsx`는 `normalBtn`/`hoverBtn`/`activeBtn`을 읽지 않는다(소비자 전수 목록 —
`research.md` §1.4). 업로드만 구현하면 "어디에도 표시되지 않는 데이터를 저장하는" 반쪽
기능이 되므로, 사용자 결정(2026-08-16)으로 렌더링을 범위에 포함했다. 사용자 결정이 이
REQ의 1차 근거다.

**REQ-SITE-011 (Ubiquitous)**: The stored representation of the button-image fields SHALL be
consistent across all write and serialization paths — the admin form, the server action
(`apps/web/app/admin/menu/actions.ts`), the tRPC write router
(`apps/web/server/api/routers/admin/menu-item.ts`), and the export/import round-trip
(`packages/admin/src/export/serializer.ts`, `bundle-schema.ts`, `import/apply.ts`) — such that a
value written through the editor survives an export/import round-trip. 근거: **현재 결함** — 저장
형태가 3곳에서 상호 모순이다(편집기 placeholder는 스타일 JSON `{"color": ...}` /
`bundle-schema.ts:29-34`는 `menuItemButtonSchema` `{label, href, icon, target}` / 레거시
`rx_menu_item.normal_btn` 등은 `varchar(255)` 업로드 **파일명**). export/import가
`bundle-schema`로 검증하므로 편집기로 입력한 값은 왕복을 살리지 못한다. Q4 재서술(§2.3)의
요구사항화.

## 4. Out of Scope

### 4.1 Out of Scope — 다국어 텍스트 (G3)

메뉴 아이템 제목의 다국어 지원은 `MenuItem.title` 스키마 변경과 사이트 전역 다국어 정책을
동시에 요구한다. 메뉴에만 넣으면 반쪽 기능이 된다. 별도 SPEC으로 분리한다(§2.3 OQ-2).

### 4.2 Out of Scope — 메뉴 검색 (G4)

`SPEC-MENU-001` REQ-MENU-051로 이미 사용자 결정에 의해 백로그 유예된 항목이다. 유예를 유지한다.

### 4.3 Out of Scope — 즐겨찾기 토글

`admin.procAdminToggleFavorite`는 모든 관리자 화면에 붙는 공통 기능이며
`SPEC-LEGACY-PARITY-004`(즐겨찾기)의 범위다 — 004는 시리즈 구성상 예약된 **계획 ID로, 아직
작성 전**이다(`SPEC-LEGACY-PARITY-000` §2.3; 본 리포지토리에 해당 디렉터리 없음, 2026-08-16
확인). 여기서 다루면 영역 경계가 무너진다.

### 4.4 Out of Scope — 공통 껍데기 화면·이벤트

`공통(헤더/푸터)` 그룹 4개 화면(Dashboard, `dispMemberAdminInfo`, `dispAdminCleanupList`,
`dispAdminViewServerEnv`)과 푸터 공통 버튼 3종(`doResetAdminMenu`, `doRecompileCacheFile`,
`doClearSession`)은 어느 영역 SPEC의 범위도 아니다(`research.md` §0, §1.3).

### 4.5 Out of Scope — 레거시 클립보드 UX 이식

잘라내기/붙여넣기 상태기계는 옮기지 않는다. 이동은 DnD가 이미 대체하고 있다(§2.3 OQ-3).

### 4.6 Out of Scope — 아카이브된 `SPEC-MENU-001` 본문 수리

- `_archive/SPEC-MENU-001/spec.md`의 stale 서술(§8.3 "부분 검증" / §8.5 / 본문 말미 Status·Next
  Action 블록이 HISTORY v0.2.1·v0.3.0과 어긋남 — §1, `research.md` §3.0)을 본문 수준으로 정리하는
  작업. 이 SPEC이 하는 일은 frontmatter `superseded` 전환(REQ-SITE-009)과 이 문서 자체에 양쪽
  가지를 남겨 후속 독자가 stale 가지만 물려받지 않게 하는 것까지다. 본문 수리는 M4/sync 시점의
  별도 후속으로 기록한다.

### 4.7 Out of Scope — 신규 업로드 인프라

- 새 업로드 엔드포인트, 새 저장소 추상화, 새 이미지 처리 파이프라인. `packages/file/src/`가
  이미 `image-pipeline.ts`·`storage/factory.ts`·`server/actions.ts`·`attachment.ts`를
  제공한다 — M3는 이를 **재사용**한다. 계획이 새 인프라를 요구한다면 그 자체가 범위 이탈
  신호다. (스키마 마이그레이션 금지와 구별: 버튼 필드의 저장 **형태** 정합화는 범위 **안**에
  있으나 컬럼 추가·타입 변경은 여전히 §A.3의 이탈 신호다 — 값 해석의 정합화가 본 요구다.)

## 5. Acceptance Criteria

`acceptance.md` 참조. 요약: AC 11건 — 격차 해소 3건(REQ-SITE-001~003), 공개 렌더링 1건
(REQ-SITE-010 — AC-SITE-010 신설), 저장 형태 정합화 1건(REQ-SITE-011 — AC-SITE-011 신설),
관찰 동작 고정 3건(REQ-SITE-004~006 — 2026-08-16 관찰 완료, 특성화 테스트로 고정), 불변식
보존 2건(REQ-SITE-007~008), 수명주기 마감 1건(REQ-SITE-009 — AC-SITE-009, 감사 D3).

## 6. 근거 강도 (정직 고지)

`research.md` §5를 승계하되 v0.3.0 관측으로 갱신한다. **M1이 2026-08-16 실행됐다**: G1(복제
경로 부재)과 G2(이미지 파일 입력·상태별 제거 부재, 텍스트영역은 편집 라우트 한정)는 이제
관찰 근거 격차로 확정됐고, 승계 3건은 관찰 근거 동작 확인으로 확정됐다 — v0.2.0의 "가설"
한정은 해제된다(관찰 기록 — `research.md` §3.0). 남는 미검증 축: (a) §1.1 "대응 있음"
항목들의 런타임 동작(코드 존재 ≠ 동작 — M2 특성화가 일부를, run-phase가 나머지를 점진적으로
고정), (b) `research.md` §1.4의 쓰기 전용·형태 모순 발견 — 소비자 목록은 코드 전수 확인이나
왕복 불능은 아직 재현 테스트로 기록돼 있지 않다(AC-SITE-011이 run-phase에 요구한다),
(c) 편집기 텍스트영역의 현재 **저장값** 사용 여부(레거시 실사용 0은 확인됐으나 뉴버전 DB의
현재값 점검은 M3 착수 확인 사항 — `design.md` D1).

## 7. 관련 SPEC

- `SPEC-LEGACY-PARITY-000` — 부모(공통 규약). 이 SPEC이 **준수**하는 시리즈 규약
  (REQ-LGP-001~008)의 소유 문서다. v0.3.0까지 `depends_on`에 실려 있었으나 v0.4.0에서 제거했다 —
  부모의 완료 조건이 이 SPEC과 형제 002~006의 완료에 달려 있어, `completed`-게이트 의존성으로
  모델링하면 어느 쪽도 시작할 수 없는 순환이 되기 때문이다(HISTORY v0.4.0, 분석은 plan.md
  §A.2). 관계는 **규약 준수(conformance)이지 완료 의존(dependency)이 아니며**, 이 SPEC이 소비하는
  산물 — 크롤 기준선 `.moai/reports/legacy-admin-map/` — 은 부모의 frontmatter status와 무관하게
  이미 디스크에 존재하는 파일 산출물이다.
- `SPEC-MENU-001` — 승계 원천. `.moai/specs/_archive/` 소재, `status: completed`. REQ-SITE-009의
  supersede 전환 대상.
- `SPEC-ADMIN-MENU-PARITY-001` — 6그룹 사이드바 불변식(REQ-SITE-008)의 원천. `completed`.
- `SPEC-LEGACY-PARITY-004` — 즐겨찾기 영역. **계획 ID — 아직 작성 전**(`SPEC-LEGACY-PARITY-000`
  §2.3; 디렉터리 없음 — 감사 D7).

> v0.1.0까지 이 목록은 프론트매터 비정규 필드 `related_specs:`로 실려 있었다. 감사 D9에 따라
> 정규 12필드 프론트매터 밖으로 옮겨 본문에 둔다.

## §F Phase 4 Mode Selection

- 입력: tier L(v0.3.0 재판정), 도메인 3개(admin UI, public renderer, packages/admin·file),
  예상 파일 12-17개, 제품 코드 변경 있음
- 모드 평가: trivial(아님), background(아님 — 쓰기 작업), agent-team(RETIRED),
  parallel(아님 — 마일스톤 간 순서 제약이 강력하다: M2→M3 특성화 선행, 같은 파일군 순차 편집),
  workflow(아님 — 기계적 대량 변환 아님)
- Decision: sub-agent (Mode 5)
- Justification: 코딩 중심 작업이므로 순차 sub-agent가 기본값이다. M1(실측 재확인)은 이미
  실행 완료됐다. M2~M4는 `MenuRenderer.tsx`·`actions.ts` 등 같은 파일군을 공유하므로 병렬
  편집은 파일 쓰기 경합을 만든다 — 순차 실행이 구조적 요구다.
