# SPEC-LEGACY-PARITY-001 — plan

> Tier M. 마일스톤 4개. 방법론은 TDD(RED-GREEN-REFACTOR) — 뉴버전 커버리지가 10% 이상이다.

## A.1 마일스톤

### M1 — 가설 실측 재확인 + 모순 기록 회귀 확인 (제품 코드 변경 없음)

`research.md`의 격차 판정은 정적 코드 확인까지가 근거다. 구현 전에 실제 화면으로 확정한다.
**이 마일스톤이 통과하지 못하면 M2~M3의 전제가 무너진다.** 승계 3건은 전임 기록이 모순
(spec.md §1, `research.md` §3.0)이므로, 관찰 **전에** 두 가지를 모두 기록해 둔 상태로 임한다 —
관찰은 어느 가지를 확정했는지와 함께 기록한다.

**사전 작업 0 — 시드 (감사 D5).** 현재 dev DB(2026-08-16 직접 조회)에는 관찰 대상이 없다:
`menus` 1행, `menu_items` 3행(전부 `parentId` NULL, `groupIds` `{}`), `menu_slot_assignments` 1건
(`HEADER_PRIMARY`). 이 상태로 아래 3~5행을 실행하면 아무것도 관찰되지 않고, 빈 관찰을 "결함
확인"으로 오기록할 수 있다. 다음 형태를 시드한다:

- 3단계 이상 메뉴 트리(부모→자식→손자) 1세트
- `groupIds`에 특정 그룹이 지정된 아이템 1건 + 그 그룹 밖 사용자 계정 1개
- `HEADER_PRIMARY`/`FOOTER`/`UTILITY` 3슬롯에 각각 배정된 메뉴 3개 (`MenuSlot` enum —
  `MenuRenderer.tsx:139`)

시드 방식: **SPEC-local 스크립트** — 기존 패턴 `apps/web/e2e/support/seed-*.ts`
(`seed-board-fixtures.ts` 등)를 따라 작성한다(스키마 변경 없이 데이터만 삽입). UI 경유가
필요한 과정에는 `loginAsAdmin` 헬퍼(`apps/web/e2e/admin-2fa-enforcement.spec.ts:117`)가 있음을
참고한다. 철거: 확인 후 시드 항목을 삭제해 원상 복구한다(`SPEC-MENU-001` v0.2.4의 "검증용
항목은 확인 후 삭제" 전례). 시드 스크립트는 제품 코드가 아니므로 M1의 "제품 코드 변경 없음"
기준과 충돌하지 않는다.

양쪽 사이트를 나란히 띄우고 확인한다.

| 확인 항목 | 레거시 | 뉴버전 | 기대 |
|---|---|---|---|
| 메뉴 아이템 복제 (G1) | `localhost:8080` 사이트맵 → 복사/붙여넣기 | `localhost:3000/admin/menu` | 복제 경로 부재 확인 (DnD **이동**은 존재 — 혼동 주의) |
| 버튼 이미지 업로드·제거 (G2) | 메뉴 아이템 편집 → 버튼 이미지 3종 **파일 업로드** + 상태별 제거 체크 | `MenuItemEditor` | **판별 관찰**: 이미지 파일 업로드 입력(`type="file"`/업로드 액션)과 상태별 제거 컨트롤의 부재 확인. "버튼 상태" JSON 텍스트영역(`MenuItemEditor.tsx:260-295`, `d03caf0`)은 **이미 존재하는 별개 물건**이다 — 그 존재를 "UI 있음"/"UI 없음" 어느 쪽 근거로도 쓰지 않는다. 아울러 텍스트영역의 운명(교체/공존)을 이 관찰로 정한다 |
| 슬롯 3종 동시 배정 (REQ-SITE-006) | — | `/admin/menu` 슬롯 배정 | 시드된 3배정의 저장·렌더 여부 — 전임 기록의 어느 가지와 일치하는지 기록 |
| 중첩 트리 렌더 (REQ-SITE-005) | — | 공개 페이지 | 시드된 3단계 렌더 여부 — 전임 기록의 어느 가지와 일치하는지 기록 |
| `groupIds` ACL 렌더 (REQ-SITE-004) | — | 공개 페이지 (그룹 밖 사용자 로그인/비로그인) | 미소속 시 숨김 여부 — 전임 기록의 어느 가지와 일치하는지 기록 |

산출물: `progress.md §E.2`에 (a) 항목별 관찰 결과, (b) 승계 3건은 전임 기록의 어느 가지를
확정했는지(`research.md` §3.0의 두 가지 대비), (c) G2 텍스트영역 운명 결정을 기록. 격차가
실제로는 없었다면(뉴버전에 이미 경로가 있었다면) 해당 REQ를 즉시 철회하고 그 사실을 기록한다 —
없는 결함을 구현하지 않는다.

> 이 절차의 근거: 과거 3회 연속으로 "미구현"이라 기록된 항목이 실제로는 이미 해소돼 있었다.
> 오래된 판정 문서를 믿지 말고 값싸게 먼저 확인한다. 이번 감사의 D1(거짓 grep 주장)·D2(모순
> 문서의 stale 가지만 읽음)가 같은 실패의 연장이었다 — 문서 주장은 비교 대상일 뿐, 관찰만이
> 기록 근거다.

### M2 — 버튼 이미지 업로드·제거 컨트롤 (REQ-SITE-002, REQ-SITE-003)

가장 얕은 격차부터 처리한다. 데이터 모델과 서버 액션이 이미 있으므로 UI와 배선만 남았다.

**사전 작업 — characterization 테스트 (감사 D4).** 메뉴 UI 컴포넌트·서버 액션에는 기존 테스트가
없다(2026-08-16 확인 — 존재하는 것은 `AdminSidebar.test.tsx`, site-design `SelectorPane`·
`TokenEditor`·`actions.test.ts`, tRPC 라우터 `admin/menu*.test.ts`뿐). `MenuItemEditor.tsx`를
건드리기 전에 현재 동작(폼 제출 → 액션 파싱 → 저장 왕복)을 고정하는 최소 테스트를 먼저 둔다.

- `MenuItemEditor.tsx`에 normal / hover / active 3종 **이미지 파일 업로드** 컨트롤과 **상태별
  제거** 컨트롤 추가 — 기존 "버튼 상태" JSON 텍스트영역(`:260-295`, `d03caf0`)의 운명은 M1
  판별 관찰이 정한 대로 따른다(기본 방향은 교체; M1 관찰이 JSON 텍스트 편집이 이미지 외 스타일
  값을 담당하고 있음을 보이면 공존으로 바꾸고 사유를 spec.md HISTORY에 기록)
- 제거 시 해당 JSON 필드를 명시적으로 비움 (REQ-SITE-003)
- 서버 액션(`actions.ts:148-194`)의 기존 파싱 경로 재사용 — 새 액션을 만들지 않는다

RED: `MenuItemEditor` 렌더 테스트는 **파일 업로드 입력(또는 업로드 액션)과 상태별 제거 컨트롤의
존재**를 주장해야 한다 — "3종 입력 컨트롤 존재"는 기존 텍스트영역으로도 통과하는 거짓 통과라
금지(AC-SITE-002) + `updateMenuItemAction`의 버튼 필드 왕복 테스트

### M3 — 메뉴 아이템 복제 (REQ-SITE-001)

**사전 작업 — characterization 테스트 (감사 D4).** M2와 같은 이유로, `MenuItemDnDTree.tsx`·
`MenuTable.tsx`·서버 액션을 건드리기 전에 건드릴 동작 경로(DnD 페이로드 계약, 목록 로드)의 최소
테스트를 먼저 둔다.

- `duplicateMenuItemAction` 신설 (`apps/web/app/admin/menu/actions.ts`)
- 복제 규칙: 같은 부모, 원본 바로 다음 `listOrder`, 자식 트리 전체 재귀 복제
- `MenuItemDnDTree.tsx` 또는 `MenuTable.tsx`에 복제 버튼 노출
- 클립보드 상태기계는 만들지 않는다 (spec.md §2.3 OQ-3)

RED: 자식 2단계를 가진 아이템 복제 시 트리 전체가 복제되고 `listOrder`가 충돌하지 않는지

### M4 — 승계 회귀 확인 고정 + 수명주기 마감 (REQ-SITE-004~009)

M1에서 관찰한 승계 3건을 회귀 테스트로 고정한다. 관찰만으로 끝내면 다음 변경에서 다시 깨진다.
대상은 "전임자가 남긴 미검증 3건"이 아니라 **모순 기록에 대한 회귀 확인**이다(spec.md §1) —
M1이 어느 가지를 확정했든, 고정된 테스트가 그 답의 현재 진실이 된다.

- 슬롯 3종 동시 배정 테스트
- 중첩 트리 다단계 렌더 테스트
- `groupIds` ACL 렌더 제한 테스트 (그룹 소속/미소속 2케이스)
- `SPEC-MENU-001` Open Question Q3(ACL 서버 컴포넌트 캐싱 경계) 확정 또는 **명시적 유예** —
  유예 시 절차(감사 D10): spec.md HISTORY에 `Q3-DEFER:` 항목으로 유예 사유·재개 조건·재개
  주체(사용자 또는 후속 영역 SPEC)를 남긴다. 기록 없는 유예(사실상의 누락)는 허용하지 않는다.
  AC-SITE-004 검증이 캐싱 경계 서술을 포함하므로 확정이 원칙, 유예는 예외
- **AC-SITE-009 실행 준비**: 이 SPEC이 `completed`로 전환될 때 manager-spec이
  `.moai/specs/_archive/SPEC-MENU-001/spec.md` frontmatter를 `status: superseded` + 이 SPEC ID
  포인터로 전환한다(Status Transition Ownership Matrix — 전환 소유 manager-spec, 실행 시점
  sync phase). M4는 이 전환의 입력(완료 판정 근거)을 progress.md에 정리해 둔다

## A.2 의존 관계

```
M1 (실측 재확인) ──┬──► M2 (버튼 이미지 업로드·제거)
                   ├──► M3 (아이템 복제)
                   └──► M4 (승계 회귀 확인 고정 + 수명주기 마감)
```

M1은 나머지 전부의 선행이다. M2·M3·M4는 서로 독립이나 같은 파일
(`actions.ts`, `MenuItemEditor.tsx`)을 건드리므로 순차 실행한다.

**depends_on 상태 (감사 D8 — run 킥오프 전에 알아야 함).** 부모 `SPEC-LEGACY-PARITY-000`의
`status`는 현재 **draft**다. depends_on 사전 점검은 `completed`만 충족으로 보므로, 현 상태에서
`/moai run SPEC-LEGACY-PARITY-001`을 실행하면 킥오프가 차단된다(wait/override/abort 분기).
해결 경로(권장 순): (1) run 진입 전 부모 SPEC을 완료 처리 — 부모는 제품 코드 변경 없는 문서형
Tier S 규약 SPEC이므로 완료 판정 자체는 저비용이다(완료 여부 판정은 오케스트레이터·사용자
몫); (2) 불가 시 사전 점검 게이트에서 사용자 override. run 시점에 처음 발견되는 일을 막기 위해
여기에 남긴다.

## A.3 영향 파일 (예상)

| 파일 | 변경 |
|---|---|
| `apps/web/components/admin/MenuItemEditor.tsx` | 버튼 이미지 업로드·제거 컨트롤 추가 (M2) — 기존 JSON 텍스트영역 운명은 M1 결정 반영 |
| `apps/web/app/admin/menu/actions.ts` | `duplicateMenuItemAction` 신설 (M3) |
| `apps/web/components/admin/MenuItemDnDTree.tsx` 또는 `MenuTable.tsx` | 복제 버튼 노출 (M3) |
| `apps/web/components/layout/MenuRenderer.tsx` | 변경 없음 예상 — 테스트만 추가 (M4) |
| `apps/web/e2e/support/seed-menu-parity-fixtures.ts` (신규 — M1 시드·철거용 툴링) | 제품 코드 아님. 스키마 변경 없이 데이터만 삽입/삭제 |
| 테스트 파일 | M2/M3 사전 characterization + M2/M3/M4 각각 신규 |

**스키마 변경 없음.** `MenuItem.normalBtn`/`hoverBtn`/`activeBtn`/`groupIds`/`parentId`가
모두 이미 존재한다. 마이그레이션이 필요해지면 그 자체가 범위 이탈 신호다.

## A.4 PRESERVE — 건드리지 않을 것

- `AdminSidebar.tsx`의 `NAV` 배열 (REQ-SITE-008 / REQ-LGP-004)
- `/admin/site/design` 전체 — 격차 0건이므로 이 SPEC은 이 화면의 코드를 수정하지 않는다
- `apps/web/components/layout/Utility.tsx`, `FooterMenuSlot.tsx`, `GlobalFooter.tsx` —
  이미 정상 배선돼 있다 (spec.md §2.2)
- DnD 순서 변경, 테마 지정, 디자인 토큰 (REQ-SITE-007)
- `.moai/reports/legacy-admin-map/` — 근거 자료. 이 SPEC은 읽기만 한다
- 다른 SPEC 디렉터리, `.moai/state/`, `.claude/settings.json`

## A.5 위험

| 위험 | 완화 |
|---|---|
| M1에서 격차가 실재하지 않는 것으로 드러남 | 해당 REQ 즉시 철회 + 기록. 없는 결함을 구현하지 않는다 |
| 버튼 이미지 JSON 스키마 미확정 (`SPEC-MENU-001` Q4) | M2에서 기존 서버 액션의 파싱 형태를 SSOT로 삼고 그 형태를 문서화 |
| 복제 시 `listOrder` 충돌 | RED 단계에서 형제 다수 + 중첩 케이스를 먼저 실패시킨다 |
| ACL 렌더 검증이 서버 컴포넌트 캐싱에 가려짐 | Q3와 직결. M4에서 캐싱 경계를 명시적으로 확정하거나 유예를 기록 |
| 레거시 사이트가 내려가 M1 불가 | Docker 컨테이너 3종 기동 확인이 M1 진입 조건 |
| AC-SITE-007/008 검증의 거짓 통과 — 앵커 없는 `git diff`는 커밋 적립 후 빈 출력으로 무조건 통과 (감사 D4) | run 킥오프 시 base SHA(M1 착수 직전 `git rev-parse HEAD`)를 progress.md §E 첫 기록으로 남기고, 검증은 `git diff <base>..HEAD -- <PRESERVE 경로>`로 수행 |
| 전임 기록 모순을 어느 쪽으로든 "문서 읽기"로 확정하려는 유혹 (감사 D2의 역방향) | M1은 오직 새 실측만 기록 근거로 삼는다. 문서의 두 가지는 비교 대상일 뿐 |

## A.6 커밋 전략

Hybrid Trunk 1-person OSS — Tier M이므로 main 직접 푸시(PR 없음).
마일스톤별 커밋: `feat(SPEC-LEGACY-PARITY-001): M{N} <내용>`.

**base SHA 기록 절차 (감사 D4).** run 킥오프 시 — M1 착수 직전 — `git rev-parse HEAD` 값을
progress.md §E 섹션 첫 줄에 base SHA로 남긴다. AC-SITE-007/008의 PRESERVE 검증은 그 이후
항상 `git diff <base>..HEAD -- <PRESERVE 경로>` 형태로 수행한다. 앵커 없는 `git diff`는
작업 트리가 clean해진 시점(=커밋 적립 후)부터 빈 출력을 내므로 검증 수단이 아니다.
