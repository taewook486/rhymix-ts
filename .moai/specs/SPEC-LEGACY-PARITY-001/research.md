# SPEC-LEGACY-PARITY-001 — research: 사이트 제작/편집 영역 전건 판정

> REQ-LGP-003에 따라 `사이트 제작/편집` 그룹에 배정된 레거시 화면 **전건**을
> 대응있음 / 격차 / 의도적제외 중 하나로 판정한다. 판정하지 않고 남긴 화면이 있으면
> 이 SPEC은 완료로 표시할 수 없다.
>
> 근거 자료: `.moai/reports/legacy-admin-map/` (crawledAt 2026-08-15T07:21:43Z, 화면 164개)

## 0. 그룹 범위 확정 — 6개에서 2개로

이 영역의 범위는 재크롤로 **바뀌었다**. 이전 크롤(2026-08-13)에서 이 그룹은 6개 화면이었으나,
그중 4개는 헤더·푸터 공통 링크가 "가장 먼저 순회한 그룹"에 잘못 귀속된 것이었다.

| 화면 | 이전 귀속 | 실제 |
|---|---|---|
| `dispMenuAdminSiteMap` | 사이트 제작/편집 | ✅ 사이트 제작/편집 |
| `dispMenuAdminSiteDesign` | 사이트 제작/편집 | ✅ 사이트 제작/편집 |
| `(act 없음)` Dashboard | 사이트 제작/편집 | ❌ 공통(헤더/푸터) |
| `dispMemberAdminInfo` | 사이트 제작/편집 | ❌ 공통(헤더/푸터) — 헤더 "내 계정" |
| `dispAdminCleanupList` | 사이트 제작/편집 | ❌ 공통(헤더/푸터) — 푸터 "시스템 설정" |
| `dispAdminViewServerEnv` | 사이트 제작/편집 | ❌ 공통(헤더/푸터) — 푸터 "시스템 설정" |

크롤러 수정 2건(`e2c6724` detectChrome + `158a718` 로그아웃 차단)으로 확정했다.
따라서 **이 SPEC의 판정 대상은 2건**이며, 제외된 4건은 어느 영역 SPEC의 범위도 아니다.

### 0.1 화면 단위 판정 (REQ-LGP-003)

| # | 레거시 화면 | 제목 | 뉴버전 대응 | 판정 |
|---|---|---|---|---|
| 1 | `dispMenuAdminSiteMap` | 사이트 메뉴 편집 | `/admin/menu` | **대응 있음** (기능 격차 있음 — §1) |
| 2 | `dispMenuAdminSiteDesign` | 사이트 디자인 설정 | `/admin/site/design` | **대응 있음** (기능 격차 없음 — §2) |

화면 2건 모두 뉴버전에 동등 화면이 존재한다. 격차는 화면 부재가 아니라 **화면 안의 기능 단위**에서
발생하므로, 아래 §1~§2에서 기능 단위로 다시 판정한다.

## 1. `dispMenuAdminSiteMap` → `/admin/menu`

근거 파일: `.moai/reports/legacy-admin-map/pages/dispMenuAdminSiteMap-*.json`
(폼 10개, 이벤트 85건, 링크 95개)

### 1.1 기능 단위 판정

| 레거시 기능 | 근거 (REQ-LGP-002) | 뉴버전 | 판정 |
|---|---|---|---|
| 사이트맵(메뉴) 추가 | submit 버튼 `사이트맵 추가` | `createMenuAction` (`actions.ts:33`) | 대응 있음 |
| 메뉴 삭제 | submit 버튼 `삭제` | `deleteMenuAction` (`actions.ts:60`) | 대응 있음 |
| 메뉴 아이템 추가 | — | `createMenuItemAction` (`actions.ts:94`) | 대응 있음 |
| 메뉴 아이템 수정 · 이름 변경 | submit 버튼 `이름 변경` | `updateMenuItemAction` (`actions.ts:153`) | 대응 있음 |
| 메뉴 아이템 삭제 | submit 버튼 `삭제` | `deleteMenuItemAction` (`actions.ts:238`) | 대응 있음 |
| 계층(부모-자식) 구조 | 중첩 `<ul>` 트리 | `MenuItem.parentId` + `MenuItemDnDTree.tsx` | 대응 있음 (렌더 미검증 — §3) |
| 순서 변경 | — | DnD (`MenuItemDnDTree.tsx`), `listOrder` | 대응 있음 (뉴버전 개선) |
| PC/모바일 스킨 설정 | 폼 `skin_vars` + `use_mobile` | `assignSkin` (`site/design/actions.ts:324`) | 대응 있음 (위치 다름 — §2.2) |
| **잘라내기 / 복사 / 붙여넣기** | submit 버튼 `잘라내기`·`복사`·`붙여넣기` | 없음 | **격차 G1** |
| **버튼 이미지 업로드 (normal/hover/active)** | 폼 `menu.procMenuAdminButtonUpload` ×3 (`isNormalDelete`/`isHoverDelete`/`isActiveDelete`) | 스키마·서버액션만 존재, UI 없음 | **격차 G2** |
| **메뉴 아이템 다국어 텍스트** | 폼 `getModuleAdminMultilingualHtml`, submit `다국어 텍스트 해제` ×8 | 없음 | **격차 G3** |
| **메뉴 검색** | 폼 `dispMenuAdminSiteMap` (필드 `keyword`), submit `찾기`·`다음` | 없음 | **격차 G4** |
| 즐겨찾기 토글 | 폼 `admin.procAdminToggleFavorite` ×2 | (SPEC-LEGACY-PARITY-004 소관) | **의도적 제외 X1** |

### 1.2 격차 상세

**G1 — 잘라내기/복사/붙여넣기**
레거시는 메뉴 아이템을 클립보드 방식으로 이동·복제한다. 뉴버전은 DnD로 **이동**만 지원하며
**복제**에 해당하는 경로가 없다. 이동은 DnD로 대체 가능하므로 실질 격차는 "아이템 복제"다.

**G2 — 버튼 이미지 업로드**
데이터 모델은 이미 있다 — `MenuItem.normalBtn` / `hoverBtn` / `activeBtn` (`Json?`,
`packages/db/prisma/schema.prisma`). 서버 액션도 값을 받는다
(`actions.ts:89-91`, `148-150`, `188-194`). 빠진 것은 **업로드 UI**뿐이다.
`MenuItemEditor.tsx`에 해당 입력이 없음을 grep으로 확인했다.
`SPEC-MENU-001` Open Question Q4("버튼상태 JSON 정확한 스키마")가 미확정으로 남은 것과 같은 지점이다.

**G3 — 다국어 텍스트**
레거시는 메뉴 아이템 제목에 다국어 값을 붙일 수 있다(`$user_lang` 방식). 뉴버전은
`MenuItem.title`이 단일 `String`이며, 코드베이스 전체에 `multilingual` 관련 구현이 없다(grep 0건).
데이터 모델 변경이 필요한 유일한 격차다.

**G4 — 메뉴 검색**
`SPEC-MENU-001` REQ-MENU-051로 이미 식별되어 **백로그 유예**된 항목이다(Slice F, 사용자 결정으로 제외).
새로 발견한 격차가 아니라 기존 유예 항목의 재확인이다.

### 1.3 공통 껍데기 이벤트 — 이 영역 소관 아님

이 화면의 onclick 핸들러 4종(`doChangeLangType`, `doResetAdminMenu`, `doRecompileCacheFile`,
`doClearSession`)은 **모든 관리자 화면 푸터에 공통으로 붙는다.** `detectChrome()`이 걸러낸 것은
링크뿐이고 푸터 버튼은 페이지 레코드에 남아 있으므로, 개수만 보고 이 영역의 기능으로
집계하면 안 된다. 판정 대상에서 제외한다(공통(헤더/푸터) 소관).

## 2. `dispMenuAdminSiteDesign` → `/admin/site/design`

근거 파일: `.moai/reports/legacy-admin-map/pages/dispMenuAdminSiteDesign-*.json`
(폼 5개, 이벤트 29건, 링크 53개)

### 2.1 기능 단위 판정

| 레거시 기능 | 근거 | 뉴버전 | 판정 |
|---|---|---|---|
| PC 설정 / 모바일 설정 저장 | 폼 `skin_vars` + `use_mobile`, submit `PC 설정 모바일 설정 저장` | `assignSkin` (`actions.ts:324`) | 대응 있음 |
| 레이아웃 지정 | 폼 필드 `skin_vars` | `assignLayout` (`actions.ts:224`) | 대응 있음 |
| 테마 지정 | — | `assignTheme` (`actions.ts:135`) | 대응 있음 (뉴버전 개선) |
| 디자인 토큰 편집 | — | `loadTokens` / `saveTokens` (`actions.ts:82`, `385`) | 대응 있음 (뉴버전 개선) |
| 즐겨찾기 토글 | 폼 `admin.procAdminToggleFavorite` ×2 | (004 소관) | 의도적 제외 X1 |

**격차 없음.** 뉴버전이 레거시보다 넓다(테마·토큰은 레거시에 없는 기능).
`REQ-LGP-005`에 따라 이 초과분은 제거 후보가 아니라 **개선점으로 기록**한다.

### 2.2 스킨 설정의 위치 차이 — 격차 아님

레거시는 스킨 설정 폼이 `dispMenuAdminSiteMap`과 `dispMenuAdminSiteDesign` **양쪽에** 있다.
뉴버전은 `/admin/site/design` 한 곳에 모았다. 기능은 보존되고 진입 경로만 통합된 것이므로
격차로 판정하지 않는다. 다만 레거시 사용자가 메뉴 편집 화면에서 스킨을 찾을 수 있으므로
`/admin/menu`에서 `/admin/site/design`으로 가는 안내가 필요한지는 판단이 필요하다(OQ-1).

## 3. `SPEC-MENU-001` Slice D 잔여분 — 승계 대상 재검증

`SPEC-LEGACY-PARITY-000` §2.3은 이 SPEC이 `SPEC-MENU-001` Slice D 잔여분을 흡수한다고 정했다.
잔여분 목록을 **그대로 믿지 않고** 현재 코드로 재검증했다.

| SPEC-MENU-001이 기록한 잔여분 | 재검증 결과 | 승계 여부 |
|---|---|---|
| `Footer.tsx`/`Utility.tsx`가 어디서도 import 안 되는 죽은 코드 (spec.md:52) | **이미 해소됨** — `Footer.tsx`는 존재하지 않고 `FooterMenuSlot.tsx`로 대체됨. `app/layout.tsx:10-11, 69, 73`에서 `Utility`·`FooterMenuSlot` 모두 import + 렌더 확인 | 승계 불필요 |
| AC-C1: 3종 슬롯 동시 배정 UI (admin 로그인 필요로 미검증) | 코드 존재 — `page.tsx:25` `listSlotAssignments`, `initialAssignments` 전달 | **승계 — 런타임 검증 필요** |
| AC-D2: 중첩(부모-자식) 트리 다단계 렌더 (미검증) | 코드 존재 — `MenuItem.parentId` 자기참조 + `MenuItemDnDTree.tsx` | **승계 — 런타임 검증 필요** |
| AC-D3: `groupIds` ACL 렌더 제한 (미검증) | 스키마 존재 — `MenuItem.groupIds Int[]` | **승계 — 런타임 검증 필요** |
| Open Question Q3 (ACL 서버 컴포넌트 캐싱 경계) | 미확정 유지 | 승계 |
| Open Question Q4 (버튼상태 JSON 스키마) | 미확정 유지 — G2와 동일 지점 | 승계 (G2로 통합) |

승계 항목 3건은 모두 "코드는 있는데 admin 로그인이 필요해 실행 확인을 못 한 것"이다.
이번에는 양쪽 사이트가 동일 계정(`admin` / `Rhymix!2026`)으로 설치돼 있어 재현이 가능하다.

### 3.1 `SPEC-MENU-001` 상태 표기 모순 (별건 발견)

`SPEC-MENU-001`은 frontmatter가 `status: completed`(spec.md:4)인데 본문은
`Status: in-progress`(spec.md:353)이며, 본문이 그 이유를 명시한다("Slice D 일부가 부분 검증
상태이므로 SPEC 전체 status는 `in-progress`를 유지한다", spec.md:278). 두 표기가 어긋나 있다.

이 SPEC이 완료되면 `REQ-LGP-006`에 따라 `SPEC-MENU-001`을 `superseded`로 마킹하게 되므로
모순은 그때 해소된다. 지금 별도로 고칠 필요는 없다.

## 4. 판정 집계

| 판정 | 건수 | 항목 |
|---|---:|---|
| 화면 — 대응 있음 | 2 | `dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign` |
| 화면 — 격차 | 0 | (없음) |
| 화면 — 의도적 제외 | 0 | (없음) |
| 기능 — 격차 | 4 | G1 아이템 복제 / G2 버튼 이미지 UI / G3 다국어 / G4 검색 |
| 기능 — 의도적 제외 | 1 | X1 즐겨찾기 토글 (004 소관) |
| 승계 — 런타임 검증 | 3 | 슬롯 동시 배정 / 중첩 트리 / groupIds ACL |
| 뉴버전 초과 기능 (보존 대상) | 3 | 테마 지정 / 디자인 토큰 / DnD 순서 변경 |

## 5. 증거 강도 고지

정직하게 구분해 둔다. 이 문서의 판정은 두 종류의 근거를 섞어 쓴다.

- **강함 (1차 근거 직접 인용)**: 레거시 쪽 기능 목록 전부. 크롤 산출물의 폼 `module`/`act` 값과
  submit 버튼 텍스트를 그대로 인용했다.
- **중간 (코드 정적 확인)**: 뉴버전 대응 여부. 서버 액션 존재·스키마 필드·import 관계를
  읽어서 판정했다. 화면을 띄워 동작시킨 것은 아니다.
- **없음 (미검증)**: §3의 승계 3건, 그리고 §1.1에서 "대응 있음"으로 판정한 항목들이 실제로
  **동작하는지**. 코드 존재 ≠ 동작이다.

따라서 격차 4건(G1~G4)은 "뉴버전 코드에 해당 경로가 없다"는 정적 확인까지가 근거이며,
구현 착수 전 M1에서 실제 화면으로 재확인한다. `verification-claim-integrity.md` §1.1 surface 3에
따라, 지금 단계의 격차 주장은 **가설**이지 확정된 결함이 아니다.

## 6. Open Questions

- **OQ-1**: 레거시는 메뉴 편집 화면에도 스킨 설정 폼이 있다(§2.2). 뉴버전 `/admin/menu`에서
  `/admin/site/design`으로 가는 안내를 넣을 것인가, 아니면 사이드바 탐색으로 충분한가?
- **OQ-2**: G3(다국어 텍스트)는 `MenuItem.title` 스키마 변경이 필요하다. 이 SPEC 범위에서
  처리할 것인가, 사이트 전역 다국어 SPEC으로 분리할 것인가?
- **OQ-3**: G1(아이템 복제)은 레거시의 클립보드 UX를 그대로 옮길 것인가, "복제" 버튼 한 개로
  단순화할 것인가?
