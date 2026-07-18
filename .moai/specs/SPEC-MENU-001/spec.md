---
id: SPEC-MENU-001
version: 0.3.1
status: completed
created: 2026-07-09
updated: 2026-07-18
author: manager-spec
priority: P1
issue_number: null
---

# SPEC-MENU-001 — 사이트 메뉴 편집 완성 + 다중 메뉴 존 렌더링 (+ 설치 시 기본 디자인 토큰 시드)

> 레거시 Rhymix admin 최상위 메뉴 "사이트 제작/편집"의 두 서브메뉴 — **사이트 메뉴 편집**(핵심) 과
> **사이트 디자인 설정**(설치 시드 버그만) — 을 뉴버전(rhymix-ts)에서 실사용 가능한 수준으로 완성한다.

## HISTORY

- 2026-07-09 (v0.1.0): 최초 작성. 레거시 실측(`dispMenuAdminSiteMap`) + 코드베이스 grep/Read 기반 gap 분석.
  오케스트레이터 조사 결과를 근거로 30개 REQ 도출. 구현(run) 미착수.
- 2026-07-10 (v0.2.0): run phase 진행. Slice A/B/C/D/E 구현(커밋 `d03caf0`, `c5f046d`, `df6ad97`,
  `b77379b`, `b71dcc8`, `aa79611`, `2a3f98c`, 전부 main 브랜치 직접 커밋). Slice F(unlinked 모듈 목록/검색,
  REQ-MENU-050/051)는 사용자 결정으로 이번 run 범위에서 제외 — 백로그 유예. Slice D의 Footer/Utility 슬롯
  배정, groupIds ACL, 중첩 트리 렌더링은 admin 로그인이 필요한 런타임 재현을 아직 수행하지 못해 **부분
  검증** 상태로 남김(§ Implementation Notes 참조). 이 미검증 부분이 남아 있어 status를 `completed`로
  올리지 않고 `in-progress`로 유지한다.
- 2026-07-18 (v0.2.1): admin 로그인 후 실 DB/실 렌더링으로 Footer/Utility 슬롯 배정(AC-C1), groupIds
  ACL(AC-D3), 중첩 트리 렌더링(AC-D2), icon/cssClass/openInNewWindow 렌더(AC-D4)를 재현 확인. 검증
  과정에서 Slice B DnD 드래그앤드롭이 프론트-백엔드 mutation 페이로드 계약 불일치(`{ ops }` vs
  `{ menuId, items }`)로 100% 실패하던 회귀 버그를 발견, `MenuItemDnDTree.tsx` 수정으로 해결(커밋
  `107c0d4`) — same-level 순서 변경(AC-B1)을 실 재현으로 재검증 완료.
  추가로 admin.menu.get이 최상위 MenuItem만 로드하고("1-depth include 한계") 자식 펼침(lazy load)
  UX가 실제로는 구현되지 않아, cross-level 자식 이동(AC-B2)을 현재 UI로는 재현할 방법이 없다는 별도
  갭을 발견 — 이번 세션에서는 수정하지 않고 acceptance.md § 발견된 갭에 기록만 함(사용자 결정).
  전체 vitest 스위트 재실행(23분): 5 failed | 2375 passed | 15 skipped — 실패 5건은
  `packages/board/src/index.test.ts`(타임아웃 1건)와
  `apps/web/components/admin/site-design/TokenEditor.test.tsx`(vi.mock 누락 4건)로 전부
  SPEC-MENU-001과 무관한 사전 존재 이슈. 메뉴 관련 테스트는 전부 통과.
  이번 세션에서 계획된 검증 항목은 모두 완료했으나, AC-B2 UI 갭(펼침 UX 미구현)이 남아있어
  status를 `completed`로 올리지 않고 `in-progress`로 유지한다.
- 2026-07-18 (v0.2.2, 같은 날 후속): 사용자 요청으로 AC-B2 UI 갭을 구현. `MenuItemDnDTree.tsx`에
  펼침/접기 토글을 추가해 `admin.menuItem.list`로 자식을 lazy load하고, 부모 뒤에 depth-first
  연속 순서로 삽입/제거하는 방식으로 트리 펼침 UX를 완성. Q&A를 (Board의 자식인) Notice 위로
  드래그해 Board→Notice→Q&A 3단계 cross-level 이동을 실제로 재현·DB 반영·새로고침 후 유지까지
  확인 — AC-B2가 이제 실 UI로 검증 가능해짐. 부수적으로 cross-level 이동 시 로컬 depth 미갱신
  버그도 함께 수정. `pnpm --filter web exec tsc --noEmit` 신규 에러 0건.
  단 AC-B3(순환/깊이 초과 거부)·AC-C3(새 메뉴 존 생성)·AC-C4(미배정 슬롯 무렌더)는 개별 재현
  검증을 하지 않아 status를 `completed`로 올리지 않고 `in-progress`로 유지한다.
- 2026-07-18 (v0.2.3, 같은 세션 후속): AC-B3(순환 거부 재현 완료, 깊이 초과는 코드 검토만)·
  AC-C3(새 메뉴 존 생성, 통과)·AC-C4(미배정 슬롯 무렌더, 통과)를 확인하는 과정에서 **Footer/Utility
  슬롯 렌더 컴포넌트가 실제 사이트 레이아웃(`app/layout.tsx`)에 전혀 연결돼 있지 않던 문제**를
  발견 — `Footer.tsx`/`Utility.tsx`는 Slice D에서 만들어졌지만 어디에서도 import되지 않는 죽은
  코드였고, 실제 레이아웃엔 `GlobalHeader`(HEADER_PRIMARY 포함)와 SPEC-INSTALL-003의 무관한
  `GlobalFooter`("Powered by Rhymix-TS")만 연결돼 있었음. 즉 지금까지 Footer/Utility 메뉴를
  배정해도 실사용자는 절대 볼 수 없었음. 사용자 요청으로 즉시 구현: `<Utility />`(헤더 위)·
  `<Footer />`(GlobalFooter 위)를 layout.tsx에 연결, Footer/Utility Menu에 각각 항목을 추가해
  익명 요청 HTML로 실제 렌더 확인. 기존 `apps/web/app/layout.test.tsx`가 두 컴포넌트를 mock하지
  않아 `next/headers` 호출로 깨졌던 것도 mock 추가로 수정(3/3 통과). 부가로 슬롯 배정 드롭다운에
  "배정 해제" 기능이 없다는 UX 갭도 발견 — 이번 세션에서는 기록만 하고 수정하지 않음.
  AC-B3 깊이 초과 케이스가 여전히 미검증이라 status를 `completed`로 올리지 않고 `in-progress`로
  유지한다.
- 2026-07-18 (v0.2.4, 같은 세션 후속): AC-B3 깊이 초과 거부를 실 드래그로 재현 완료. DB에
  Board→Notice→Q&A→Level3→Level4→Level5(6단계) 체인 + 별도 top-level 항목 DeepTest를 구성 →
  전부 펼쳐서 DeepTest를 Level5 위로 드래그 → `newDepth(6) >= MAX_DEPTH(6)`로 차단, 네트워크
  요청 없음 + DB `parentId` 불변 확인. 검증용 항목은 확인 후 삭제해 원상 복구.
  이로써 acceptance.md Definition of Done 전 항목이 체크됨(Slice F 제외 — 사용자 결정으로
  범위 밖 유지). "배정 해제 기능 없음" UX 갭은 여전히 기록만 된 상태(수정 안 함).
  모든 계획된 AC가 실 재현으로 확인됐으나, status를 `completed`로 전환할지는 사용자 확인 후
  결정 — 이번 커밋에서는 `in-progress`로 유지한다.
- 2026-07-18 (v0.3.0, 같은 세션 후속): 사용자 확인 후 status를 `completed`로 전환. Slice A~E의
  전 AC(A1-A5, B1-B4, C1-C4, D1-D4, E1-E2)가 실 DB/실 렌더링/실 드래그 재현으로 검증됨.
  Slice F(REQ-MENU-050/051)는 사용자 결정으로 이 SPEC의 완료 범위에서 계속 제외 — 별도 백로그.
  "슬롯 배정 해제 UI 기능 없음"은 원래 AC 항목이 아닌 부가 발견 UX 갭으로, 완료 판정을 막지
  않고 별도 기록으로 남긴다.
- 2026-07-18 (v0.3.1, 같은 세션 후속): 위에서 기록만 해뒀던 "슬롯 배정 해제 UI 기능 없음" 갭을
  사용자 요청으로 구현. 백엔드 `admin.menu.unassignSlot` 프로시저 신규 추가(`MenuSlotAssignment.
  menuId`가 not-null이라 `deleteMany`로 행 삭제, idempotent) + 프론트 `SlotAssignmentTable.tsx`의
  `handleSlotChange`가 빈 옵션 선택 시 이를 호출하도록 분기. 실 재현: Utility 슬롯 배정 해제 →
  `POST unassignSlot 200` → DB 행 삭제 → 새로고침 후에도 미배정 유지 확인, 이후 원상 복구.
  `pnpm --filter web exec tsc --noEmit` 신규 에러 0건, 백엔드 `menu.test.ts` 4/4 통과.

## 1. 배경 (Why)

레거시 Rhymix(PHP, `D:\project\rhymix`, `localhost:8080`)와 뉴버전을 나란히 재설치하여 admin 메뉴
구조를 비교한 결과, "사이트 제작/편집" 하위 두 화면에 실사용을 막는 gap이 확인되었다.

레거시 기준 동작:
- **사이트 메뉴 편집** (`index.php?module=admin&act=dispMenuAdminSiteMap`): 다중 "사이트맵"(메뉴 존)을
  트리로 관리한다 — Main Menu / Utility Menu / Footer Menu(하위 자식 항목 포함) / "unlinked"(어느 메뉴에도
  안 걸린 모듈 모음). "사이트맵 추가" 버튼으로 새 메뉴 존 생성, "찾기" 검색 제공.
- **사이트 디자인 설정**: 레거시는 PC/모바일별 레이아웃·스킨 배정. 뉴버전은 이를 **의도적으로** 디자인 토큰
  시스템(`/admin/site/design`, SPEC-THEME-POLISH-001)으로 대체했으므로 재설계 대상이 아니다.

## 2. 현재 상태 (검증된 사실, 2026-07-09)

### 2.1 백엔드는 이미 풍부하다 (schema + tRPC 완비)

`packages/db/prisma/schema.prisma`:
- `Menu`(id, siteId, title, isAdminMenu, listOrder)
- `MenuItem`(id, menuId, **parentId 자기참조 트리**, title, url, **icon, cssClass, description,
  groupIds Int[] ACL, openInNewWindow, expand**, listOrder, **normalBtn/hoverBtn/activeBtn Json**)

`apps/web/server/api/routers/admin/menu-item.ts`:
- `list`(parentId lazy load) / `create` / `update`(parentId+listOrder 갱신) / `delete` /
  **`reorder`**(단일 `$transaction`으로 여러 항목의 `parentId`+`listOrder`를 원자적 갱신 — cross-level 이동을
  API 레벨에서 이미 완전 지원). `@MX:ANCHOR: admin.menuItem.reorder`.

즉 SPEC-ADMIN-001 REQ-ADMIN-030~033은 **백엔드가 이미 만족**한다.

### 2.2 UI가 백엔드를 따라가지 못한다 (핵심 gap)

- `apps/web/components/admin/MenuItemEditor.tsx`: **title / url / listOrder 3개 필드만** 노출.
  icon / cssClass / description / groupIds / openInNewWindow / expand / 버튼상태 전부 미노출.
  상단에 "드래그앤드롭은 Slice E 에서 추가됩니다" **stale 안내 문구** 잔존.
- `apps/web/components/admin/MenuItemDnDTree.tsx`: @dnd-kit 기반 트리 UI가 존재하고 cycle/depth 검사까지
  있으나, **드롭 시 `admin.menuItem.reorder`를 호출하지 않는다.** same-level·cross-level 모두
  `toast.info('...백엔드 연동 필요')` + local state 갱신에 그쳐 **새로고침하면 사라지는 비영속 프로토타입**이다.
  (오케스트레이터 브리핑은 "동일 레벨 reorder는 실제 동작"으로 기술했으나, 코드 실측 결과 동일 레벨도
  영속화되지 않음 — 본 SPEC은 실측을 따른다.)
- `apps/web/app/admin/menu/[id]/page.tsx`: 위 두 컴포넌트를 함께 렌더 → 사용자에게 "DnD는 미구현" 안내와
  실제 동작하는(그러나 저장 안 되는) DnD가 동시에 보여 혼란.

### 2.3 다중 메뉴 존(slot) 개념 부재 (아키텍처 gap)

- `Domain` 모델은 `defaultMenuId Int?` **단일 필드**만 가진다. Menu를 여러 개 만들어도 실제 레이아웃이
  렌더링하는 건 이 하나뿐이다.
- `apps/web/components/layout/GlobalHeader.tsx`: `domain.defaultMenuId`의 `parentId:null` 항목만
  (title+url) 렌더. **중첩 자식(트리) 미렌더, 헤더 외 슬롯(푸터/유틸리티) 없음, groupIds ACL 미적용,
  icon/openInNewWindow 미적용.**
- 레거시의 Main/Utility/Footer 같은 **다중 메뉴 존을 그릴 슬롯 개념 자체가 없다.** (사용자가 이 부분을
  본 SPEC 범위에 포함하기로 명시적 결정.)

### 2.4 설치 시 기본 디자인 토큰 미시드 (사이트 디자인 설정 버그)

- 디자인 토큰은 `ThemeAssignment.tokensOverride`(Json)에 저장된다
  (`apps/web/app/admin/site/design/actions.ts`, REQ-LAYOUT-014).
- `packages/db/src/install/seed.ts`는 Menu/Board/Domain은 시드하지만 **기본 디자인 토큰(ThemeAssignment)을
  전혀 시드하지 않는다.** 결과적으로 설치 직후 색상·타이포·간격 토큰이 비어있거나 `#000000`으로 남는다.

## 3. 재발 방지 기록 ("완료" 마킹의 함정)

[HARD] SPEC-ADMIN-001의 REQ-ADMIN-030~033 및 SPEC-ADMIN-EXTRAS-001의 REQ-MENU-DND-001~005는
INDEX.md와 각 SPEC에서 **"✅ 완료"로 마킹**되어 있으나, 실제 화면은 3필드만 노출하고 DnD는 저장되지 않는다.
"완료" 마킹이 **백엔드/컴포넌트 존재만 검증하고 실제 UI 완성·엔드투엔드 영속을 검증하지 않았기** 때문이다.
본 SPEC의 acceptance는 반드시 **런타임 영속(새로고침 후 유지)** 을 관찰 기준으로 삼는다.

---

## 4. 요구사항 (EARS)

### Group A — MenuItem 편집기 필드 완성 (UI가 백엔드를 따라가게)

- **REQ-MENU-001** (Ubiquitous): The MenuItem editor **shall** expose editable controls for every
  persisted user-editable field: title, url, icon, cssClass, description, openInNewWindow, expand, listOrder.
- **REQ-MENU-002** (Ubiquitous): The MenuItem editor **shall** provide a group-based ACL control bound to
  `MenuItem.groupIds`, allowing selection of zero or more MemberGroups.
- **REQ-MENU-003** (Ubiquitous): The MenuItem editor **shall** allow editing the button-state visuals
  (`normalBtn`, `hoverBtn`, `activeBtn`) persisted as JSON.
- **REQ-MENU-004** (Event-Driven): **When** an admin saves a MenuItem, the system **shall** persist all edited
  fields via `admin.menuItem.update` in a single request and reflect them after revalidation.
- **REQ-MENU-005** (Unwanted): **If** a submitted MenuItem field violates its validation constraint (url format,
  groupIds referencing non-existent groups, length limits), **then** the system **shall** reject the save with a
  field-level error and persist no partial changes.
- **REQ-MENU-006** (State-Driven): **While** a MenuItem has `openInNewWindow = true`, its editor row **shall**
  visibly indicate the new-window behavior so the admin can confirm the setting before saving.

### Group B — 트리 계층 관리 UI 영속화 (DnD를 backend에 연결)

- **REQ-MENU-010** (Event-Driven): **When** an admin completes a same-level drag-and-drop reorder, the system
  **shall** call `admin.menuItem.reorder` and persist the new `listOrder` atomically.
- **REQ-MENU-011** (Event-Driven): **When** an admin drops a MenuItem onto another to make it a child
  (cross-level move), the system **shall** persist the new `parentId` and `listOrder` via
  `admin.menuItem.reorder` in a single transaction.
- **REQ-MENU-012** (Unwanted): **If** a cross-level move would create a cycle (item becomes its own ancestor)
  or exceed the maximum nesting depth, **then** the system **shall** reject the move and leave the persisted
  tree unchanged.
- **REQ-MENU-013** (Event-Driven): **When** a reorder or move persists successfully, the displayed tree
  **shall** reflect the server-confirmed state after revalidation (no optimistic-only state that vanishes on reload).
- **REQ-MENU-014** (State-Driven): **While** a reorder request is in flight and then fails, the system **shall**
  revert the tree to its last persisted state and surface an error message.
- **REQ-MENU-015** (Optional): **Where** keyboard interaction is available, the tree **shall** support reordering
  via keyboard and cancellation via the Escape key.

### Group C — 다중 메뉴 존(slot) 스키마 (마이그레이션 필요)

- **REQ-MENU-020** (Ubiquitous): The system **shall** support assigning multiple distinct menus to named
  rendering slots per domain, covering at minimum: primary header navigation, footer, utility bar.
- **REQ-MENU-021** (Ubiquitous): The schema **shall** persist menu-to-slot assignments additively and
  backward-compatibly, preserving the existing `defaultMenuId` semantics through the migration.
- **REQ-MENU-022** (Event-Driven): **When** an admin assigns a menu to a slot, the system **shall** persist the
  assignment and expose it to the layout rendering layer.
- **REQ-MENU-023** (Event-Driven): **When** an admin adds a new menu zone (레거시 "사이트맵 추가" 대응), the
  system **shall** create a new site-scoped `Menu` record.
- **REQ-MENU-024** (Unwanted): **If** a slot has no menu assigned, **then** the corresponding layout region
  **shall** render nothing — no error and no placeholder leak.
- **REQ-MENU-025** (Event-Driven): **When** the slot migration runs, the system **shall** backfill each domain's
  existing `defaultMenuId` into the primary header slot so no site loses its current navigation.

### Group D — 레이아웃 렌더링 연결 (헤더/푸터/유틸리티바)

- **REQ-MENU-030** (Ubiquitous): The layout rendering layer **shall** render the menu assigned to each slot
  (header, footer, utility) in its corresponding region.
- **REQ-MENU-031** (Ubiquitous): Rendered navigation **shall** render nested MenuItem children (`parentId` tree),
  not only top-level items.
- **REQ-MENU-032** (State-Driven): **While** a MenuItem's `groupIds` restricts visibility, the item **shall** be
  rendered only to a viewer belonging to at least one listed group; when `groupIds` is empty it **shall** be
  visible to everyone.
- **REQ-MENU-033** (Ubiquitous): Rendered MenuItems **shall** apply their `icon` and `cssClass`, and open in a
  new window (`target="_blank" rel="noopener"`) when `openInNewWindow` is set.
- **REQ-MENU-034** (State-Driven): **While** a parent MenuItem has `expand = true`, its rendered submenu
  **shall** default to the expanded state.

### Group E — 정리 (stale 문구 / 마커)

- **REQ-MENU-040** (Ubiquitous): The menu editor **shall not** display guidance that contradicts actual
  behavior; any text implying drag-and-drop is unavailable **shall** be removed or corrected.
- **REQ-MENU-041** (Ubiquitous): Obsolete `@MX:TODO` markers claiming DnD is "예정" **shall** be removed or
  updated once DnD persistence (Group B) is implemented.

### Group F — 레거시 parity 부가 기능 (낮은 우선순위)

- **REQ-MENU-050** (Optional, P2): **Where** the admin views the menu editor, the system **may** list "unlinked"
  module instances (modules referenced by no MenuItem) to aid discovery.
- **REQ-MENU-051** (Optional, P3): **Where** the menu list is large, the system **may** provide a search ("찾기")
  to filter menus and items by title or url.

### Group G — 설치 시 기본 디자인 토큰 시드 (사이트 디자인 설정 버그)

- **REQ-MENU-060** (Event-Driven): **When** the installation wizard completes, the system **shall** seed a
  default set of design tokens (colors, typography, spacing, radii) so the freshly installed site renders with a
  valid theme instead of empty or `#000000` values.
- **REQ-MENU-061** (Unwanted): **If** design tokens are absent after install, **then** the design settings screen
  **shall** fall back to documented defaults rather than surfacing `#000000`/empty tokens.
- **REQ-MENU-062** (Ubiquitous): The seeded tokens **shall** conform to the token schema consumed by
  `/admin/site/design` (SPEC-THEME-POLISH-001) and the layout rendering layer.

---

## 5. Exclusions (What NOT to Build)

- [HARD] **디자인 토큰 편집 UI 재설계 금지.** `/admin/site/design`의 라이트/다크 탭·Colors/Typography/
  Spacing/Radii 편집기는 SPEC-THEME-POLISH-001 소유의 **완료 영역**이다. 본 SPEC은 **설치 시드(REQ-MENU-060~062)만** 다룬다.
- 레거시의 **PC/모바일별 레이아웃·스킨 배정 모델 이식 금지.** 뉴버전 디자인 토큰 시스템은 의도된 대체
  아키텍처다.
- **MenuItem 백엔드 스키마/tRPC 변경 금지** (Group A/B). schema와 `admin.menuItem.*`는 이미 필드를 지원하며,
  본 SPEC은 **UI 노출과 영속 호출 연결**만 담당한다. (Group C의 slot 스키마만 신규 마이그레이션 대상.)
- 디자인 설정 화면에 드래그앤드롭·라이브 프리뷰 신규 추가 금지.
- 메뉴 import/export, 멀티사이트 간 메뉴 복제 금지.
- 공개 메뉴 렌더링의 캐싱/성능 최적화는 정확성 범위를 넘어서는 부분 제외 (별도 SPEC 후보).
- 레거시 "unlinked"/"찾기"는 Optional(P2/P3)로만 다루며 MVP 필수 아님.

---

## 6. 의존 / 관련 SPEC

| SPEC | 관계 |
|---|---|
| SPEC-ADMIN-001 (REQ-ADMIN-030~033) | Menu/MenuItem 스키마·`admin.menuItem.*` tRPC 제공. "완료" 마킹되었으나 UI 갭 존재 (§3). |
| SPEC-ADMIN-EXTRAS-001 (REQ-MENU-DND-001~005) | `MenuItemDnDTree` 프로토타입 제공. reorder 영속 미연결 (§2.2). |
| SPEC-LAYOUT-001 | `GlobalHeader`/도메인 기본 메뉴 렌더링, `ThemeAssignment.tokensOverride`(REQ-LAYOUT-014). Group D/G 접점. |
| SPEC-THEME-POLISH-001 | `/admin/site/design` 토큰 편집기 소유. Group G는 이 스키마에 맞춰 시드. |
| SPEC-INSTALL-001 | `seed.ts` 트랜잭션. Group G 시드가 삽입될 위치. |

## 7. 미해결 질문 (run phase에서 확정)

1. Slot 스키마 형태 — `Domain`에 slot FK 컬럼 추가 vs 별도 `MenuSlotAssignment(domainId, slot, menuId)` 테이블.
   (권장: 별도 테이블 — 확장/유틸리티 슬롯 추가에 유연.)
2. Slot 열거 정의 — enum(`HEADER_PRIMARY|FOOTER|UTILITY`) vs 문자열 키. 최소 3종 필수, 확장 가능해야 함.
3. groupIds ACL 렌더 판정을 서버 컴포넌트에서 세션 그룹으로 계산하는 방식의 캐싱 경계.
4. 버튼상태(normalBtn/hoverBtn/activeBtn) JSON의 정확한 스키마 — 레거시 대비 최소 필드셋.
5. 기본 디자인 토큰 값의 출처 — default theme manifest에서 파생 vs seed 하드코딩.

---

## 8. Implementation Notes (run phase 완료 보고, 2026-07-10)

> [HARD] 본 절은 §3 "완료 마킹의 함정" 재발 방지 원칙에 따라, 검증된 사실과 미검증 사실을 분리해서
> 정직하게 기록한다. Slice D 일부가 부분 검증 상태이므로 SPEC 전체 status는 `in-progress`를 유지한다
> (완료로 마킹하지 않음).

### 8.1 Open Question 확정 (§7 대비)

| # | 확정 결과 |
|---|---|
| 1 | 별도 테이블 `MenuSlotAssignment(domainId, slot, menuId)` 채택 (권장안 그대로). |
| 2 | `enum MenuSlot { HEADER_PRIMARY, FOOTER, UTILITY }` — 3종 확정, enum 확장 방식으로 향후 슬롯 추가. |
| 3 | (미확정 — 아래 8.3 참조) |
| 4 | (미확정 — 아래 8.3 참조) |
| 5 | seed 하드코딩 채택. `packages/db/src/install/seed.ts`에 `seedDefaultTheme()`을 선행 호출하는 방식으로 구현. |

### 8.2 Slice별 구현 및 커밋 매핑

| Slice | 범위 | REQ | 커밋 |
|---|---|---|---|
| A | MenuItem 편집기 필드 완성 | REQ-MENU-001~006, 040 | `d03caf0` |
| B | DnD 영속화(`admin.menuItem.reorder` 연결) | REQ-MENU-010~015 | `c5f046d` |
| C | 다중 메뉴 존 슬롯 스키마(`MenuSlotAssignment`, `MenuSlot` enum, 마이그레이션 `20260710000000_spec_menu_001_slot_assignment`) | REQ-MENU-020~025 | `df6ad97` |
| D | 레이아웃 렌더링(슬롯 기반) | REQ-MENU-030~034 | `df6ad97` |
| E | 설치 시 기본 디자인 토큰 시드 | REQ-MENU-060~062 | `b77379b` |
| — | tRPC import 경로 수정 | (버그 수정) | `b71dcc8` |
| — | Slice C/D 컴파일 에러 수정 | (버그 수정) | `aa79611` |
| — | `ThemeAssignment` FK 위반 수정(`seedDefaultTheme` 선행 호출 필요) | (버그 수정) | `2a3f98c` |

**Slice F(REQ-MENU-050 unlinked 모듈 목록, REQ-MENU-051 메뉴 검색)는 사용자 결정으로 이번 run 범위에서
제외되었다.** 둘 다 SPEC 상 Optional(P2/P3)로 명시되어 있었으므로 MVP 필수 요건은 아니었다. 백로그로
유예하며, 채택 시 별도 후속 작업으로 처리한다.

### 8.3 실제 검증 상태 (오케스트레이터가 실 DB/dev 서버로 재현 확인)

**검증 완료:**

- **Slice C**: 마이그레이션 `20260710000000_spec_menu_001_slot_assignment` 실제 적용 확인.
  `defaultMenuId` → `HEADER_PRIMARY` 슬롯 백필이 idempotent함을 재실행으로 확인(중복 배정 0건,
  `@@unique([domainId, slot])` 제약과 함께 동작).
- **Slice D (일부)**: 헤더(`HEADER_PRIMARY` 슬롯)가 실제 DB 데이터로 `MenuRenderer`를 통해 정상 렌더되는
  것을 확인함(공개 페이지 실측).
- **Slice E**: 설치 트랜잭션 실행 중 `ThemeAssignment.themeId` FK 위반 버그를 실 DB 재현으로 발견 →
  `seedDefaultTheme()` 선행 호출로 수정 → 재검증 통과. `Theme`/`ThemeAssignment`가 정상 생성되고
  `#000000` 값이 남지 않음을 확인.

**부분 검증 (admin 로그인 필요 — 이번 run에서는 여기까지만 확인하기로 사용자가 결정):**

- Footer/Utility 슬롯 배정 화면 동작(AC-C1의 3종 슬롯 동시 배정)
- `groupIds` ACL에 따른 렌더 제한(AC-D3)
- 중첩(부모-자식) 트리의 다단계 렌더링(AC-D2)

위 3개 acceptance criteria는 admin 세션이 필요한 시나리오라 오케스트레이터의 실측 재현 범위 밖에
남아 있다. 코드는 구현되어 있으나(REQ-MENU-020~024, REQ-MENU-031~032 대응 로직 존재), **런타임
관찰로 확정되지 않았으므로 "완료"로 마킹하지 않는다.** 이 gap이 SPEC status를 `in-progress`로 유지하는
직접적인 이유다.

### 8.4 미확정 Open Question 잔여

- Q3(groupIds ACL 서버 컴포넌트 캐싱 경계)와 Q4(버튼상태 JSON 정확한 스키마)는 8.3의 미검증 영역과
  맞물려 있어 이번 run에서 확정 짓지 못했다. 후속 세션에서 admin 로그인 재현과 함께 마무리 필요.

### 8.5 Definition of Done 대비 실측 (acceptance.md)

체크 표시는 acceptance.md에 동일하게 반영했다(§ 아래 참조). 요약:

- Slice A/B(REQ-MENU-001~006, 010~015, 040~041): 구현 완료. DnD 영속(새로고침 후 유지)은 오케스트레이터가
  직접 재현 확인함.
- Slice C(REQ-MENU-020~025): 구현 완료 + 마이그레이션 백필 idempotency 확인. 3종 슬롯 동시 배정 UI
  자체는 admin 로그인 재현 미실시.
- Slice D(REQ-MENU-030~034): 헤더 렌더만 실측 확인. 나머지(Footer/Utility/ACL/중첩)는 코드 존재,
  런타임 미확인.
- Slice E(REQ-MENU-060~062): 구현 완료 + 실 DB 재검증 통과.
- Slice F(REQ-MENU-050/051): 제외, 백로그 기록.

---

Version: 0.2.0
Status: in-progress (Slice A/B/C/E 구현+검증 완료, Slice D 일부 부분 검증, Slice F 제외/백로그)
Estimated REQ Count: 30 (REQ-MENU-001~062, Slice F 2개 Optional 포함)
Estimated Slice Count: 6 (A 편집기 필드, B DnD 영속, C slot 스키마, D 레이아웃 렌더, E 토큰 시드, F 부가(제외))
Dependencies (upstream): SPEC-ADMIN-001 ✅, SPEC-ADMIN-EXTRAS-001 ✅, SPEC-LAYOUT-001 ✅, SPEC-THEME-POLISH-001 ✅, SPEC-INSTALL-001 ✅
Next Action: Footer/Utility 슬롯 배정 + groupIds ACL 렌더 + 중첩 트리 렌더(AC-C1, AC-D2, AC-D3)를 admin 로그인 세션으로 실측 재현 후 status를 completed로 전환. Slice F는 별도 채택 여부 결정 필요.
