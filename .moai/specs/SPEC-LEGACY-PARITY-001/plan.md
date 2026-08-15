# SPEC-LEGACY-PARITY-001 — plan

> Tier M. 마일스톤 4개. 방법론은 TDD(RED-GREEN-REFACTOR) — 뉴버전 커버리지가 10% 이상이다.

## A.1 마일스톤

### M1 — 격차 가설 실측 재확인 (읽기 전용, 구현 없음)

`research.md`의 격차 판정은 정적 코드 확인까지가 근거다. 구현 전에 실제 화면으로 확정한다.
**이 마일스톤이 통과하지 못하면 M2~M3의 전제가 무너진다.**

양쪽 사이트를 나란히 띄우고 확인한다.

| 확인 항목 | 레거시 | 뉴버전 | 기대 |
|---|---|---|---|
| 메뉴 아이템 복제 (G1) | `localhost:8080` 사이트맵 → 복사/붙여넣기 | `localhost:3000/admin/menu` | 뉴버전에 경로 없음 확인 |
| 버튼 이미지 업로드 (G2) | 메뉴 아이템 편집 → 버튼 이미지 3종 | `MenuItemEditor` | 뉴버전 UI 없음 확인 |
| 슬롯 3종 동시 배정 (REQ-SITE-006) | — | `/admin/menu` 슬롯 배정 | 3종 동시 배정 동작 여부 |
| 중첩 트리 렌더 (REQ-SITE-005) | — | 공개 페이지 | 2단계 이상 렌더 여부 |
| `groupIds` ACL 렌더 (REQ-SITE-004) | — | 공개 페이지 (로그인/비로그인) | 그룹 미소속 시 숨김 여부 |

산출물: `progress.md §E.2`에 항목별 관찰 결과 기록. 격차가 실제로는 없었다면(뉴버전에 이미
경로가 있었다면) 해당 REQ를 즉시 철회하고 그 사실을 기록한다 — 없는 결함을 구현하지 않는다.

> 이 절차의 근거: 과거 3회 연속으로 "미구현"이라 기록된 항목이 실제로는 이미 해소돼 있었다.
> 오래된 판정 문서를 믿지 말고 값싸게 먼저 확인한다.

### M2 — 버튼 이미지 업로드 UI (REQ-SITE-002, REQ-SITE-003)

가장 얕은 격차부터 처리한다. 데이터 모델과 서버 액션이 이미 있으므로 UI와 배선만 남았다.

- `MenuItemEditor.tsx`에 normal / hover / active 3종 업로드 + 제거 컨트롤 추가
- 제거 시 해당 JSON 필드를 명시적으로 비움 (REQ-SITE-003)
- 서버 액션(`actions.ts:148-194`)의 기존 파싱 경로 재사용 — 새 액션을 만들지 않는다

RED: `MenuItemEditor` 렌더 테스트 + `updateMenuItemAction`의 버튼 필드 왕복 테스트

### M3 — 메뉴 아이템 복제 (REQ-SITE-001)

- `duplicateMenuItemAction` 신설 (`apps/web/app/admin/menu/actions.ts`)
- 복제 규칙: 같은 부모, 원본 바로 다음 `listOrder`, 자식 트리 전체 재귀 복제
- `MenuItemDnDTree.tsx` 또는 `MenuTable.tsx`에 복제 버튼 노출
- 클립보드 상태기계는 만들지 않는다 (spec.md §2.3 OQ-3)

RED: 자식 2단계를 가진 아이템 복제 시 트리 전체가 복제되고 `listOrder`가 충돌하지 않는지

### M4 — 승계 검증 고정 + 마무리 (REQ-SITE-004~006)

M1에서 관찰한 승계 3건을 회귀 테스트로 고정한다. 관찰만으로 끝내면 다음 변경에서 다시 깨진다.

- 슬롯 3종 동시 배정 테스트
- 중첩 트리 다단계 렌더 테스트
- `groupIds` ACL 렌더 제한 테스트 (그룹 소속/미소속 2케이스)
- `SPEC-MENU-001` Open Question Q3(ACL 서버 컴포넌트 캐싱 경계) 확정 또는 명시적 유예

## A.2 의존 관계

```
M1 (실측 재확인) ──┬──► M2 (버튼 이미지 UI)
                   ├──► M3 (아이템 복제)
                   └──► M4 (승계 검증 고정)
```

M1은 나머지 전부의 선행이다. M2·M3·M4는 서로 독립이나 같은 파일
(`actions.ts`, `MenuItemEditor.tsx`)을 건드리므로 순차 실행한다.

## A.3 영향 파일 (예상)

| 파일 | 변경 |
|---|---|
| `apps/web/components/admin/MenuItemEditor.tsx` | 버튼 이미지 3종 UI 추가 (M2) |
| `apps/web/app/admin/menu/actions.ts` | `duplicateMenuItemAction` 신설 (M3) |
| `apps/web/components/admin/MenuItemDnDTree.tsx` 또는 `MenuTable.tsx` | 복제 버튼 노출 (M3) |
| `apps/web/components/layout/MenuRenderer.tsx` | 변경 없음 예상 — 테스트만 추가 (M4) |
| 테스트 파일 | M2/M3/M4 각각 신규 |

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

## A.6 커밋 전략

Hybrid Trunk 1-person OSS — Tier M이므로 main 직접 푸시(PR 없음).
마일스톤별 커밋: `feat(SPEC-LEGACY-PARITY-001): M{N} <내용>`.
