# SPEC-LEGACY-PARITY-001 — plan

> Tier L(v0.3.0 재판정 — §A.0). 마일스톤 4개. 방법론은 TDD(RED-GREEN-REFACTOR) — 뉴버전 커버리지가 10% 이상이다.

## A.0 티어 판정 (v0.3.0 — M→L 재판정)

v0.2.0까지 Tier M(300-1000 LOC·5-15 파일)이었으나, 사용자의 전체 범위 결정(업로드+제거+
**공개 렌더링**+**저장 형태 3귀속 정합화**)으로 추정 규모가 M 상한을 넘는다:

- 제품 코드 추정 560-970 LOC(편집기 업로드·제거 컨트롤, 렌더러 상태별 렌더링, 서버 액션·tRPC
  조정, `packages/admin` export/import 정합화, 복제 액션, 시드 스크립트) + 테스트 추정
  560-890 LOC(특성화 3종, 편집기·액션 왕복, 렌더, 스키마 왕복, 복제) → 합계 1,120-1,860 LOC.
- 파일 추정 12-17개 — `MenuItemEditor.tsx`, `actions.ts`, `menu-item.ts`(tRPC),
  `MenuRenderer.tsx`, `serializer.ts`·`bundle-schema.ts`·`apply.ts`, 시드 스크립트,
  테스트 7-9개.
- 정성 축: 3패키지(`apps/web`·`packages/admin`·`packages/file`)에 걸친 데이터 형태 결정은
  export 번들 하위호환을 좌우한다 — design.md에 결정 기록을 남길 가치가 있다.

**판정: Tier L.** 귀결: 산출물 세트가 5종으로 확장(design.md 추가 — `research.md`는 이미 존재),
plan-audit 통과 기준 0.80 → **0.85**, 커밋 전략은 직접 main push에서 **PR 흐름**으로 변경
(§A.6). 과소/과대 판정 모두 감사 결함이므로 근거를 여기에 남긴다.

## A.1 마일스톤

### M1 — 가설 실측 재확인 + 모순 기록 회귀 확인 (제품 코드 변경 없음) — **실행 완료 (2026-08-16)**

**상태: 실행 완료.** 계획 수정 중 오케스트레이터가 사전 실행했고(시드 포함), 결과가 논쟁
항목을 확정했다. 관찰 기록은 `research.md` §3.0·§1.2에 편입했다(progress.md는 run-phase
산출물 — 계획 수정 중 사전 실행된 특수 사례로서 관찰 근거는 research.md가 보관한다).

**관찰 결과 (2026-08-16):**

| 확인 항목 | 결과 |
|---|---|
| 메뉴 아이템 복제 (G1) | **격차 실재 확인** — admin 로그인 후 `/admin/menu`·`/admin/menu/1` 어디에도 복제/clone 경로 없음. 항목 편집 화면 버튼은 저장·삭제(항목별)·항목 추가 + 공통 크롬(로그아웃·관리자 메뉴 초기화·세션 정리)뿐. REQ-SITE-001 확정 |
| 버튼 이미지 업로드·제거 (G2) | **재정의된 대로 확인** — `/admin/menu/[id]`의 모든 항목에 `normalBtn`/`hoverBtn`/`activeBtn` `<textarea>` 3종(placeholder `{"color": "..."}`)이 렌더되나, 메뉴 관리 화면 전체에 `type="file"` 입력 없음(렌더 DOM·소스 grep 양쪽), 상태별 제거 컨트롤 없음. 텍스트영역은 편집 라우트에만 있고 목록 `/admin/menu`에는 없음 |
| 슬롯 3종 동시 배정 (REQ-SITE-006) | **정상 동작** — 3슬롯 배정이 모두 저장되고 공개 페이지에서 동시 렌더 |
| 중첩 트리 렌더 (REQ-SITE-005) | **정상 동작** — 시드 3단계 트리가 전 단계 렌더(로그인·비로그인 양쪽) |
| `groupIds` ACL 렌더 (REQ-SITE-004) | **정상 동작** — 비로그인 시 미소속 아이템 숨김·대조 아이템 표시, 관리자(그룹 1) 로그인 시 표시. **캐싱이 결과를 가리지 않았다**(Q3 관찰 근거 — spec.md §2.3) |

승계 3건의 모순 기록 논쟁은 이 관찰로 해소됐다 — 이후 어느 문서 가지에도 의존하지 않는다
(spec.md §1). 텍스트영역 운명(교체/공존)은 M1이 정한 것이 아니라 **Q4 저장 형태 정착(M3)과
함께** 정한다(v0.2.0 서술에서 정정 — spec.md HISTORY v0.3.0 (6)).

**시드 절차 (재현성을 위해 보존 — 감사 D5).** 관찰은 다음 픽스처로 수행됐다(2026-08-16
dev DB 직접 시드):

- 3단계 트리: Board(id=1) → M1-child(id=4) → M1-grandchild(id=5)
- ACL 쌍: `M1-admin-only`(`groupIds` `{1}`) vs 대조 `M1-public`(`{}`) + 그룹 밖 관찰 경로
- 3슬롯 배정: `HEADER_PRIMARY`=Main Menu, `FOOTER`=M1 Footer Menu, `UTILITY`=M1 Utility Menu

시드 방식은 **SPEC-local 스크립트**(기존 패턴 `apps/web/e2e/support/seed-*.ts` — 스키마 변경
없이 데이터만 삽입)를 따르고, 확인 후 시드 항목을 삭제해 원상 복구한다(`SPEC-MENU-001`
v0.2.4 전례). UI 경유 과정에는 `loginAsAdmin` 헬퍼(`apps/web/e2e/admin-2fa-enforcement.spec.ts:117`)
참조. 픽스처의 철거 여부는 관찰 당시 확인되지 않았다 — run-phase 착수 시점에 점검하고
필요하면 재시드한다(§A.5 위험).

### M2 — 관찰된 승계 동작 특성화 고정 (REQ-SITE-004~006 — M3 렌더러 변경 전 필수 선행)

M1이 관찰로 확인한 3동작(슬롯 3종 동시 배정, 중첩 트리 전 깊이 렌더, `groupIds` ACL 렌더
제한)을 회귀 테스트로 고정한다. **이 마일스톤은 M3보다 반드시 먼저 적립된다**(§A.2 구조 제약).

- `groupIds` ACL 렌더 2케이스 테스트(소속 표시 / 미소속·비로그인 숨김) — M1의 ACL 쌍
  픽스처 형태 재사용(`M1-admin-only` `groupIds` `{1}` vs 대조 `M1-public` `{}`)
- 중첩 트리 3단계 전 깊이 렌더 테스트 — M1의 3단계 트리 픽스처 형태 재사용
- 슬롯 3종 동시 배정 저장·렌더 테스트 — M1의 3슬롯 픽스처 형태 재사용
- **Q3 캐싱 경계 처리**: Q3은 M1 관찰로 **확정**됐다(캐싱이 ACL 결과를 가리지 않음 —
  spec.md §2.3). 이 특성화 테스트가 곧 경계의 회귀 지킴이다 — 이후 캐싱 구성 변경으로 ACL이
  가려지면 실패한다. 별도 유예 절차 불필요

이 테스트들은 RED가 아니다 — 관찰된 동작을 그대로 통과시키는 **특성화 테스트**다. 적립 시점에
실패한다면 그것은 테스트 결함이 아니라 M1 관찰(2026-08-16) 이후 동작이 깨졌다는 신호다 —
조용히 고치지 않고 보고한다.

> 순서가 하중을 받는 이유: M3가 `MenuRenderer.tsx`를 변경한다. 렌더러를 먼저 바꾸고 테스트를
> 나중에 쓰면 그 테스트는 변경 **후** 동작을 묘사할 뿐이어서 M3가 도입한 회귀를 구조적으로
> 잡지 못한다. 나중에 이 순서를 되돌리는 재배열은 금지다(§A.2).

### M3 — 버튼 이미지 전체 범위: 업로드 + 제거 + 공개 렌더링 + 형태 정합화 (REQ-SITE-002·003·010·011)

사용자 결정(2026-08-16, 전체 범위)을 구현한다. 범위를 정당화하는 발견 2건: 버튼 필드는
현재 **쓰기 전용**이다(`MenuRenderer.tsx`가 읽지 않음 — 소비자 전수 목록 `research.md`
§1.4) — 업로드만 구현하면 어디에도 표시되지 않는 데이터를 저장한다. 저장 형태가 3곳에서
상호 모순이라(편집기 스타일 JSON / `bundle-schema.ts:29-34` `{label,href,icon,target}` /
레거시 `varchar(255)` 파일명) 편집기로 쓴 값이 export/import 왕복을 살리지 못한다(**현재
결함**).

**사전 작업 — characterization 테스트 (감사 D4).** 메뉴 UI 컴포넌트·서버 액션에는 기존
테스트가 없다(2026-08-16 확인 — 존재하는 것은 `AdminSidebar.test.tsx`, site-design
`SelectorPane`·`TokenEditor`·`actions.test.ts`, tRPC 라우터 `admin/menu*.test.ts`뿐).
`MenuItemEditor.tsx`·쓰기 경로를 건드리기 전에 현재 동작(폼 제출 → 액션 파싱 → 저장 왕복)을
고정하는 최소 테스트를 먼저 둔다.

- normal / hover / active 3종 **이미지 파일 업로드** 컨트롤 + **상태별 제거** 컨트롤
  (`MenuItemEditor.tsx` — 기존 텍스트영역은 `/admin/menu/[id]` 편집 라우트에만 렌더됨에 주의)
- 업로드는 **기존 `packages/file/src/` 인프라 재사용**(`image-pipeline.ts`·
  `storage/factory.ts`·`server/actions.ts`·`attachment.ts`) — 신규 업로드 엔드포인트·저장
  추상을 만들면 범위 이탈이다(spec.md §4.7)
- 제거 시 해당 필드를 명시적으로 비움 (REQ-SITE-003)
- **공개 렌더링**: `MenuRenderer.tsx`가 상태별 버튼 이미지를 렌더(normal 기본 표시,
  hover/active 해당 상호작용 상태 — REQ-SITE-010, `design.md` D3)
- **형태 정합화 (Q4 정착)**: 저장 형태를 정하고 호출처를 맞춘다 — 편집기, 서버
  액션(`actions.ts`), tRPC(`menu-item.ts`), `serializer.ts`·`bundle-schema.ts`·`apply.ts`.
  기본 방향은 이미지 참조형(렌더링에 필요하고 레거시 `varchar(255)` 파일명 의미론과 양립).
  후보 비교·하위호환(레거시 번들의 파일명 값 수용)은 `design.md` D1 — 레거시 실사용이
  0이므로(`research.md` §1.4) 이전 비용이 낮다
- 텍스트영역 운명: Q4 정착과 함께 결정 — 기본 방향은 교체(스타일 값 실사용이 발견되면
  공존으로 전환 + spec.md HISTORY 기록)

RED: (1) `MenuItemEditor` 렌더 테스트는 **파일 업로드 입력(또는 업로드 액션)과 상태별 제거
컨트롤의 존재**를 주장 — "3종 입력 컨트롤 존재"는 기존 텍스트영역으로도 통과하는 거짓 통과라
금지(AC-SITE-002), (2) `updateMenuItemAction` 버튼 필드 왕복 테스트, (3) 렌더러 상태별 이미지
렌더(AC-SITE-010), (4) 편집기로 쓴 값의 export→import 왕복 생존(AC-SITE-011 — 현재 결함의
재현 테스트가 곧 RED)

### M4 — 메뉴 아이템 복제 + 수명주기 마감 (REQ-SITE-001, REQ-SITE-009)

**사전 작업 — characterization 테스트 (감사 D4).** M3와 같은 이유로, `MenuItemDnDTree.tsx`·
`MenuTable.tsx`·서버 액션을 건드리기 전에 건드릴 동작 경로(DnD 페이로드 계약, 목록 로드)의 최소
테스트를 먼저 둔다.

- `duplicateMenuItemAction` 신설 (`apps/web/app/admin/menu/actions.ts`)
- 복제 규칙: 같은 부모, 원본 바로 다음 `listOrder`, 자식 트리 전체 재귀 복제
- `MenuItemDnDTree.tsx` 또는 `MenuTable.tsx`에 복제 버튼 노출
- 클립보드 상태기계는 만들지 않는다 (spec.md §2.3 OQ-3)

RED: 자식 2단계를 가진 아이템 복제 시 트리 전체가 복제되고 `listOrder`가 충돌하지 않는지

**수명주기 마감 — AC-SITE-009 실행 준비**: 이 SPEC이 `completed`로 전환될 때 manager-spec이
`.moai/specs/_archive/SPEC-MENU-001/spec.md` frontmatter를 `status: superseded` + 이 SPEC ID
포인터로 전환한다(Status Transition Ownership Matrix — 전환 소유 manager-spec, 실행 시점
sync phase). M4는 이 전환의 입력(완료 판정 근거)을 progress.md에 정리해 둔다.

## A.2 의존 관계

```
M1 (관찰 — 실행 완료) ──► M2 (승계 동작 특성화 고정) ──► M3 (버튼 이미지 전체 범위)
                                                               │
                               M4 (복제 + 수명주기 마감) ◄────┘ 순차 실행
```

- **M2 → M3 순서는 하중을 받는 구조적 제약이다**: M3가 `MenuRenderer.tsx`를 변경하므로,
  승계 3동작의 특성화 테스트는 렌더러 변경 **전에** 적립되어야 한다. 먼저 바꾸고 나중에 쓴
  테스트는 변경 후 동작을 묘사할 뿐이어서 M3가 도입한 회귀를 잡지 못한다. 이 순서를
  되돌리는 재배열은 금지다.
- M3 → M4는 순서 제약이 없으나 같은 파일군(`actions.ts` 등)을 공유하므로 순차 실행한다.
- M1은 완료됐다(2026-08-16 관찰 — §A.1).

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
| `apps/web/components/admin/MenuItemEditor.tsx` | 업로드·제거 컨트롤 추가 (M3) — 텍스트영역 운명은 Q4 정착과 함께 결정 |
| `apps/web/app/admin/menu/actions.ts` | 버튼 필드 쓰기 경로 조정 (M3) + `duplicateMenuItemAction` 신설 (M4) |
| `apps/web/server/api/routers/admin/menu-item.ts` | 버튼 필드 쓰기 형태 조정 (M3 — 정합화 3귀속 중 1) |
| `packages/admin/src/export/serializer.ts`, `bundle-schema.ts`, `import/apply.ts` | 저장 형태 정합화 (M3 — REQ-SITE-011) |
| `apps/web/components/layout/MenuRenderer.tsx` | **상태별 버튼 이미지 렌더링 추가 (M3, REQ-SITE-010)** — 기존 중첩 트리·ACL·슬롯 동작은 M2 특성화 테스트로 보존 강제 |
| `apps/web/components/admin/MenuItemDnDTree.tsx` 또는 `MenuTable.tsx` | 복제 버튼 노출 (M4) |
| `packages/file/src/*` | **변경 없음 — 재사용만** (M3 업로드 경로, spec.md §4.7) |
| `apps/web/e2e/support/seed-menu-parity-fixtures.ts` (신규 — M1 시드·철거용 툴링) | 제품 코드 아님. 스키마 변경 없이 데이터만 삽입/삭제 |
| 테스트 파일 | M2 특성화 3종 + M3/M4 사전 characterization + M3/M4 각각 신규 |

**스키마(컬럼 정의) 변경 없음.** `MenuItem.normalBtn`/`hoverBtn`/`activeBtn`(`Json?`)·
`groupIds`·`parentId`가 모두 이미 존재한다. Q4 정합화는 컬럼이 아니라 **값 해석**을 맞추는
작업이다(`Json?`는 정합화된 어떤 형태든 담을 수 있다). 마이그레이션이 필요해지면 그 자체가
범위 이탈 신호다.

## A.4 PRESERVE — 건드리지 않을 것

- `AdminSidebar.tsx`의 `NAV` 배열 (REQ-SITE-008 / REQ-LGP-004)
- `/admin/site/design` 전체 — 격차 0건이므로 이 SPEC은 이 화면의 코드를 수정하지 않는다
- `apps/web/components/layout/Utility.tsx`, `FooterMenuSlot.tsx`, `GlobalFooter.tsx` —
  이미 정상 배선돼 있다 (spec.md §2.2)
- DnD 순서 변경, 테마 지정, 디자인 토큰 (REQ-SITE-007)
- `MenuRenderer.tsx`는 **더 이상 PRESERVE가 아니다** — M3가 변경한다(상태별 버튼 이미지
  렌더링). 대신 그 파일의 관찰된 동작 3종(중첩 트리·ACL·슬롯 렌더)은 M2 특성화 테스트가
  보존을 강제한다. v0.2.0의 "변경 없음 예상" 서술에서 정정 — no-diff 주장으로 지킬 수 없는
  것을 테스트로 지킨다
- `.moai/reports/legacy-admin-map/` — 근거 자료. 이 SPEC은 읽기만 한다
- 다른 SPEC 디렉터리, `.moai/state/`, `.claude/settings.json`

## A.5 위험

| 위험 | 완화 |
|---|---|
| M3 렌더러 변경이 승계 3동작(중첩 트리·ACL·슬롯)을 조용히 깨뜨림 | M2 특성화 테스트가 M3보다 먼저 적립(§A.2 구조 제약) — 회귀 시 즉시 실패 |
| 정합화된 저장 형태가 기존 export 번들 하위호환을 깨짐 | `design.md` D1의 레거시 파일명 수용 규칙 + 왕복 테스트(AC-SITE-011)가 파수 |
| 업로드 구현이 신규 인프라로 비대해짐 | `packages/file` 재사용 강제(spec.md §4.7) — 새 엔드포인트·저장 추상 등장 시 범위 이탈 신호 |
| 복제 시 `listOrder` 충돌 | RED 단계에서 형제 다수 + 중첩 케이스를 먼저 실패시킨다 |
| M1 시드 픽스처 철거 여부 미확인 — 잔여 픽스처가 이후 관찰·테스트를 오염 | run-phase 착수 시점에 시드 항목 존재 여부 점검 + 필요 시 재시드/철거(M1 절차) |
| 텍스트영역이 이미지 외 스타일 값(색상 등)을 실제 담고 있어 교체가 데이터 손실 | M3 착수 시 편집기의 현재 저장값 확인(`design.md` D1 입력) — 실사용이 보이면 공존으로 전환하고 사유를 spec.md HISTORY에 기록 |
| 레거시 재확인이 다시 필요해질 때 사이트가 내려가 있음 | M1은 완료(2026-08-16). 재확인 시 Docker 컨테이너 3종 기동이 진입 조건 |
| AC-SITE-007/008 검증의 거짓 통과 — 앵커 없는 `git diff`는 커밋 적립 후 빈 출력으로 무조건 통과 (감사 D4) | run 킥오프 시 base SHA(M1 착수 직전 `git rev-parse HEAD`)를 progress.md §E 첫 기록으로 남기고, 검증은 `git diff <base>..HEAD -- <PRESERVE 경로>`로 수행 |
| 전임 기록 모순을 어느 쪽으로든 "문서 읽기"로 확정하려는 유혹 (감사 D2의 역방향) | M1은 오직 새 실측만 기록 근거로 삼는다. 문서의 두 가지는 비교 대상일 뿐 |

## A.6 커밋 전략

**Tier L(v0.3.0 재판정) — PR 흐름으로 변경.** CLAUDE.md §4에 따라 Tier L은 manager-git가 PR을
생성한다(직접 main push가 아니다). 마일스톤별 커밋: `feat(SPEC-LEGACY-PARITY-001): M{N}
<내용>` — 브랜치·PR 운영은 manager-git 소관이고 이 문서는 커밋 단위만 정의한다.

**base SHA 기록 절차 (감사 D4).** run 킥오프 시 — M1 착수 직전 — `git rev-parse HEAD` 값을
progress.md §E 섹션 첫 줄에 base SHA로 남긴다. AC-SITE-007/008의 PRESERVE 검증은 그 이후
항상 `git diff <base>..HEAD -- <PRESERVE 경로>` 형태로 수행한다. 앵커 없는 `git diff`는
작업 트리가 clean해진 시점(=커밋 적립 후)부터 빈 출력을 내므로 검증 수단이 아니다.
