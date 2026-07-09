---
id: SPEC-MENU-001
version: 0.1.0
status: draft
created: 2026-07-09
updated: 2026-07-09
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

---

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
