# SPEC-LEGACY-PARITY-001 — research: 사이트 제작/편집 영역 전건 판정

> REQ-LGP-003에 따라 `사이트 제작/편집` 그룹에 배정된 레거시 화면 **전건**을
> 대응있음 / 격차 / 의도적제외 중 하나로 판정한다. 판정하지 않고 남긴 화면이 있으면
> 이 SPEC은 완료로 표시할 수 없다.
>
> 근거 자료: `.moai/reports/legacy-admin-map/` (crawledAt `2026-08-15T07:31:08.680Z` — `index.json` 값 그대로 인용. 화면 164개)

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
| **버튼 이미지 업로드 (normal/hover/active)** | 폼 `menu.procMenuAdminButtonUpload` ×3 — `type: file` 입력 `menu_normal_btn`/`menu_hover_btn`/`menu_active_btn` + 상태별 제거 플래그 `isNormalDelete`/`isHoverDelete`/`isActiveDelete` | **JSON 텍스트영역은 이미 있음** — `MenuItemEditor.tsx:260-295` "버튼 상태 (일반/호버/활성)" 3종 (`d03caf0`, 2026-07-10). 이미지 **파일 업로드**·**제거 컨트롤**은 없음 | **격차 G2 (v0.2.0 재정의)** |
| **메뉴 아이템 다국어 텍스트** | 폼 `getModuleAdminMultilingualHtml`, submit `다국어 텍스트 해제` ×8 | 없음 | **격차 G3** |
| **메뉴 검색** | 폼 `dispMenuAdminSiteMap` (필드 `keyword`), submit `찾기`·`다음` | 없음 | **격차 G4** |
| 즐겨찾기 토글 | 폼 `admin.procAdminToggleFavorite` ×2 | (SPEC-LEGACY-PARITY-004 소관) | **의도적 제외 X1** |

### 1.2 격차 상세

**G1 — 잘라내기/복사/붙여넣기**
레거시는 메뉴 아이템을 클립보드 방식으로 이동·복제한다. 뉴버전은 DnD로 **이동**만 지원하며
**복제**에 해당하는 경로가 없다. 이동은 DnD로 대체 가능하므로 실질 격차는 "아이템 복제"다.

**G2 — 버튼 이미지 업로드·제거 (v0.2.0 재정의 — 최초 판정 오류 정정)**

> 최초 작성본은 "스키마·서버액션만 존재, UI 없음"이라 적고 "`MenuItemEditor.tsx`에 해당 입력이
> 없음을 grep으로 확인했다"고 했다. 이것은 사실이 아니었다 — plan-audit 1차 감사(D1,
> `.moai/reports/plan-audit/SPEC-LEGACY-PARITY-001-review-1.md`)와 오케스트레이터 독립 재확인으로
> 정정한다. 아래가 현재 판정이다.

뉴버전에는 이미 **버튼 상태 편집 UI가 존재한다**. `MenuItemEditor.tsx:260-295`에
"버튼 상태 (일반/호버/활성)" 라벨의 `<Textarea>` 3종이 `normalBtn`/`hoverBtn`/`activeBtn`에
바인딩돼 있고(커밋 `d03caf0`, 2026-07-10 "feat(menu): Slice A"), `defaultValue`가 JSON 왕복을
하며 placeholder가 `'{"color": "..."}'`다. 즉 뉴버전은 버튼 상태를 **스타일 JSON 원문 텍스트로**
편집한다.

레거시는 다르다. 크롤 산출물(`pages/dispMenuAdminSiteMap-1uyf29d.json`)의 폼
`menu.procMenuAdminButtonUpload` ×3은 각각 `type: file` 입력(`menu_normal_btn`/`menu_hover_btn`/
`menu_active_btn`)을 가지고, 상태별 제거 플래그(`isNormalDelete`/`isHoverDelete`/`isActiveDelete`)를
별도로 둔다. 즉 레거시는 **이미지 파일 업로드 + 명시적 상태별 제거**다.

따라서 실질 격차는 "UI 없음"이 아니라 두 가지다: **(a) 이미지 파일 업로드 경로 부재,
(b) 상태별 제거 컨트롤 부재.** 기존 JSON 텍스트영역의 운명(업로드·제거 컨트롤로 교체할지,
공존할지)은 M1의 판별 관찰 뒤에 정한다 — 그 관찰은 JSON 텍스트영역을 이미지 업로드 컨트롤과
혼동하지 않는 것이어야 한다(plan.md M1 2행, AC-SITE-002).
`SPEC-MENU-001` Open Question Q4("버튼상태 JSON 정확한 스키마")는 이 지점과 여전히 맞물려 있다.
데이터 모델(`MenuItem.normalBtn`/`hoverBtn`/`activeBtn`, `Json?`)과 서버 액션
(`actions.ts:89-91`, `148-150`, `188-194`)은 변함없이 이미 존재한다.

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

## 3. `SPEC-MENU-001` Slice D 잔여분 — 모순 기록에 대한 회귀 확인 (v0.2.0 재구성)

`SPEC-LEGACY-PARITY-000` §2.3은 이 SPEC이 `SPEC-MENU-001` Slice D 잔여분을 흡수한다고 정했다.
잔여분 목록을 **그대로 믿지 않고** 현재 코드로 재검증했다. 최초 작성본은 아카이브 문서의
§8.3/Status/Next Action(미검증 서술)만 읽고 3건을 "런타임 검증 필요"로 승계 분류했으나, 그
문서는 **내부 모순** 상태라 한쪽 가지만 읽으면 잘못 승계한다(plan-audit D2). 양쪽 가지를 모두
기록한다.

### 3.0 전임 문서의 두 가지 — 인용

| 가지 | 위치 | 주장 |
|---|---|---|
| **미검증 서술 (stale 의심)** | `.moai/specs/_archive/SPEC-MENU-001/spec.md` §8.3 "부분 검증 (admin 로그인 필요)" (~:320-327) / §8.5 / 본문 말미 Status 블록(`Status: in-progress`) / Next Action | AC-C1·AC-D2·AC-D3은 "런타임 관찰로 확정되지 않았다" |
| **실측 완료 서술** | 같은 문서 HISTORY **v0.2.1**(2026-07-18): "admin 로그인 후 실 DB/실 렌더링으로 Footer/Utility 슬롯 배정(AC-C1), groupIds ACL(AC-D3), 중첩 트리 렌더링(AC-D2) …를 재현 확인". 실측 세션의 실재는 커밋 `107c0d4`(2026-07-18, `MenuItemDnDTree.tsx` +3/−2, DnD 페이로드 계약 불일치 수정)로 상응. **v0.3.0**(같은 날): "사용자 확인 후 status를 `completed`로 전환. Slice A~E의 전 AC … 검증됨" | AC-C1·AC-D2·AC-D3 실측 확인됨 |

어느 가지가 참인지 **문서 읽기로 확정하지 않는다** — 전임 기록을 그대로 믿은 잘못을 이번에
반복하지 않는다(반대 방향으로 뒤집는 것도 같은 잘못이다). 2026-07-18 이후 코드도 변했다.
따라서 3건은 **모순 기록에 대한 회귀 확인**으로 승계하고, M1의 새 실측이 어느 쪽을 확정하는지
관찰로 정한다. 참고로 현재 코드는 실측 완료 가지와 양립한다 — `MenuRenderer.tsx:47-48`
groupIds 필터, `:52` 하위 재귀, `app/layout.tsx:9-11, 69, 73`의 슬롯 배선. 코드 정합성은
확인을 대신하지 않는다.

| SPEC-MENU-001이 기록한 잔여분 | 재검증 결과 | 승계 여부 |
|---|---|---|
| `Footer.tsx`/`Utility.tsx`가 어디서도 import 안 되는 죽은 코드 (spec.md:52) | **이미 해소됨** — `Footer.tsx`는 존재하지 않고 `FooterMenuSlot.tsx`로 대체됨. `app/layout.tsx:10-11, 69, 73`에서 `Utility`·`FooterMenuSlot` 모두 import + 렌더 확인 | 승계 불필요 |
| AC-C1: 3종 슬롯 동시 배정 (전임 기록: 미검증 서술 ↔ v0.2.1 실측 서술) | 코드 존재 — `page.tsx:25` `listSlotAssignments`, `initialAssignments` 전달. `app/layout.tsx:9-11, 69, 73`이 슬롯 렌더 배선 | **승계 — 모순 기록 회귀 확인 (§3.0)** |
| AC-D2: 중첩(부모-자식) 트리 다단계 렌더 (전임 기록: 미검증 서술 ↔ v0.2.1 실측 서술) | 코드 존재 — `MenuItem.parentId` 자기참조 + `MenuItemDnDTree.tsx`(관리자) · `MenuRenderer.tsx:52` 재귀(공개) | **승계 — 모순 기록 회귀 확인 (§3.0)** |
| AC-D3: `groupIds` ACL 렌더 제한 (전임 기록: 미검증 서술 ↔ v0.2.1 실측 서술) | 코드 존재 — `MenuItem.groupIds Int[]` + `MenuRenderer.tsx:47-48` 필터 | **승계 — 모순 기록 회귀 확인 (§3.0)** |
| Open Question Q3 (ACL 서버 컴포넌트 캐싱 경계) | 미확정 유지 | 승계 |
| Open Question Q4 (버튼상태 JSON 스키마) | 미확정 유지 — G2와 동일 지점 | 승계 (G2로 통합) |

승계 3건의 성격은 이제 "전임자가 못 한 검증을 처음 수행한다"가 아니라 **"전임 기록의 두 주장
어긋남을 지금 코드로 재확인한다"**다. 양쪽 사이트가 동일 계정(`admin` / `Rhymix!2026`)으로
설치돼 있어 재현은 가능하다. 단 현재 dev DB에는 관찰 가능한 형태가 없다(2026-08-16 직접 조회:
`menus` 1행, `menu_items` 3행 전부 `parentId` NULL·`groupIds` `{}`, `menu_slot_assignments` 1건
`HEADER_PRIMARY`) — M1은 시드 사전 작업을 수반한다(plan.md M1 사전 작업 0).

### 3.1 `SPEC-MENU-001` 상태 표기 모순 (별건 발견)

`SPEC-MENU-001`은 frontmatter가 `status: completed`(spec.md:4)인데 본문은
`Status: in-progress`(spec.md:353)이며, 본문이 그 이유를 명시한다("Slice D 일부가 부분 검증
상태이므로 SPEC 전체 status는 `in-progress`를 유지한다", spec.md:278). 두 표기가 어긋나 있다.

이 불일치는 §3.0의 stale 가지가 몸통에도 그대로 남은 것이다. 이 SPEC이 완료되면
`REQ-LGP-006`·REQ-SITE-009에 따라 frontmatter `status`를 `superseded`로 전환하므로(전환 소유
manager-spec — Status Transition Ownership Matrix) **상태 축의** 불일치는 그때 해소된다. 본문
§8.3·§8.5·Status/Next Action의 stale 서술을 정리하는 본문 수리는 별도 후속으로 기록한다(이 SPEC
범위 밖 — `spec.md` §4.6).

## 4. 판정 집계

| 판정 | 건수 | 항목 |
|---|---:|---|
| 화면 — 대응 있음 | 2 | `dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign` |
| 화면 — 격차 | 0 | (없음) |
| 화면 — 의도적 제외 | 0 | (없음) |
| 기능 — 격차 | 4 | G1 아이템 복제 / G2 버튼 이미지 업로드·제거 컨트롤 / G3 다국어 / G4 검색 |
| 기능 — 의도적 제외 | 1 | X1 즐겨찾기 토글 (004 소관) |
| 승계 — 모순 기록 회귀 확인 | 3 | 슬롯 동시 배정 / 중첩 트리 / groupIds ACL |
| 뉴버전 초과 기능 (보존 대상) | 3 | 테마 지정 / 디자인 토큰 / DnD 순서 변경 |

## 5. 증거 강도 고지

정직하게 구분해 둔다. 이 문서의 판정은 두 종류의 근거를 섞어 쓴다.

- **강함 (1차 근거 직접 인용)**: 레거시 쪽 기능 목록 전부. 크롤 산출물의 폼 `module`/`act` 값과
  submit 버튼 텍스트를 그대로 인용했다.
- **중간 (코드 정적 확인)**: 뉴버전 대응 여부. 서버 액션 존재·스키마 필드·import 관계를
  읽어서 판정했다. 화면을 띄워 동작시킨 것은 아니다.
- **없음 (미검증 → 회귀 확인 대상)**: §3의 승계 3건(전임 기록 자체가 모순 — §3.0), 그리고
  §1.1에서 "대응 있음"으로 판정한 항목들이 실제로 **동작하는지**. 코드 존재 ≠ 동작이다.
- **정정 이력 (v0.2.0)**: 최초 판정의 두 서술 — G2 "스키마·서버액션만 존재, UI 없음"(§1.1·§1.2)과
  §3 승계 3건의 "런타임 검증 필요" 단순 분류 — 은 plan-audit 1차 감사
  (`.moai/reports/plan-audit/SPEC-LEGACY-PARITY-001-review-1.md`, D1·D2)에서 결함으로 지목돼 이
  판에 정정했다. G2의 뉴버전 쪽 근거는 이제 grep 주장이 아니라 파일 직접 열람이다.

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
