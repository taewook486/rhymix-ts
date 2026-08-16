# SPEC-LEGACY-PARITY-001 — acceptance

> AC 9건. 각 AC는 실행 가능한 검증 수단을 갖는다. "코드가 있다"는 통과 근거가 아니다.

## AC-SITE-001 — 메뉴 아이템 복제 (REQ-SITE-001)

**Given** 자식 아이템 2단계를 가진 메뉴 아이템이 있고
**When** 관리자가 `/admin/menu`에서 그 아이템을 복제하면
**Then** 하위 트리 전체가 복제되고, 복제본은 원본과 같은 부모 아래 원본 바로 다음 순서에 배치된다.

검증: `duplicateMenuItemAction` 단위 테스트 — 형제 3개 + 2단계 중첩 픽스처로
`listOrder` 충돌 0건과 자식 개수 일치를 확인.
추가로 dev 서버에서 실제 복제 후 **새로고침 뒤에도 유지**되는지 직접 확인한다.

## AC-SITE-002 — 버튼 이미지 파일 업로드 (REQ-SITE-002)

**Given** 메뉴 아이템 편집 화면에서
**When** normal / hover / active 3종 버튼 이미지를 **파일로** 각각 업로드하면
**Then** 세 값이 모두 저장되고 재진입 시 그대로 표시된다.

검증: `MenuItemEditor` 렌더 테스트는 **이미지 파일 업로드 입력(`type="file"` 또는 업로드 서버
액션)의 존재**를 주장해야 한다 + `updateMenuItemAction` 왕복 테스트(저장 → 재조회 시 3필드
일치). **"3종 입력 컨트롤 존재" 같은 표현 금지** — 이미 존재하는 "버튼 상태" JSON
텍스트영역(`MenuItemEditor.tsx:260-295`, `d03caf0`)으로도 통과하는 거짓 통과다(감사 D1).
기존 텍스트영역의 운명(교체/공존)은 M1 판별 관찰이 정하며 그 결정은 spec.md HISTORY에
기록된다.

## AC-SITE-003 — 버튼 이미지 제거 (REQ-SITE-003)

**Given** 버튼 이미지가 설정된 메뉴 아이템에서
**When** 관리자가 특정 상태의 이미지를 **제거 컨트롤**로 제거하면
**Then** 해당 JSON 필드가 비워지고, 나머지 두 상태의 값은 영향받지 않는다.

검증: 3종 중 1종만 제거하는 테스트 — 제거 대상은 `null`, 나머지 2종은 값 유지. "제거"는
명시적 제거 컨트롤의 동작이며, 텍스트영역 내용을 지우는 것과 구별된다.

## AC-SITE-004 — groupIds ACL 렌더 제한 (REQ-SITE-004, SPEC-MENU-001 AC-D3 승계 — 모순 기록 회귀 확인)

**Given** `groupIds`가 특정 그룹으로 지정된 메뉴 아이템이 있고
**When** 그 그룹에 속하지 않은 사용자가 공개 페이지를 열면
**Then** 해당 아이템이 렌더되지 않는다. 그룹에 속한 사용자에게는 렌더된다.

검증: 소속/미소속 2케이스 렌더 테스트. **추가로 실제 브라우저에서 로그인/비로그인 양쪽을
직접 확인한다** — 서버 컴포넌트 캐싱이 결과를 가릴 수 있어 단위 테스트만으로는 부족하다.
캐싱 경계 서술 포함(`SPEC-MENU-001` Q3 확정 또는 `Q3-DEFER:` 기록). M1의 회귀 확인
관찰(progress.md §E.2)이 전임 기록의 어느 가지(`research.md` §3.0)와 일치했는지 기록돼
있어야 한다.

## AC-SITE-005 — 중첩 트리 다단계 렌더 (REQ-SITE-005, SPEC-MENU-001 AC-D2 승계 — 모순 기록 회귀 확인)

**Given** 부모-자식-손자 3단계 메뉴 트리가 있고
**When** 공개 페이지가 렌더되면
**Then** 3단계가 모두 렌더된다.

검증: 3단계 픽스처 렌더 테스트 + 공개 페이지 실측(M1 시드 트리 재사용 가능). M1 관찰이 전임
기록의 어느 가지와 일치했는지 기록돼 있어야 한다.

## AC-SITE-006 — 슬롯 3종 동시 배정 (REQ-SITE-006, SPEC-MENU-001 AC-C1 승계 — 모순 기록 회귀 확인)

**Given** 메뉴 3개가 있고
**When** 각각을 `HEADER_PRIMARY` / `FOOTER` / `UTILITY` 슬롯에 동시에 배정하면
**Then** 3종 배정이 모두 저장되고 공개 페이지의 해당 위치에 각각 렌더된다.

검증: `listSlotAssignments` 결과에 3종이 모두 존재 + `@@unique([domainId, slot])` 제약 위반 0건.
공개 페이지에서 헤더·푸터·유틸리티 3곳 실측. M1 관찰이 전임 기록의 어느 가지와 일치했는지
기록돼 있어야 한다.

## AC-SITE-007 — 뉴버전 고유 기능 보존 (REQ-SITE-007)

**Given** 이 SPEC의 모든 변경이 적용된 뒤
**Then** `/admin/site/design`의 테마 지정·디자인 토큰 편집과 `/admin/menu`의 DnD 순서 변경이
모두 이전과 동일하게 동작한다.

검증: (1) "기존 테스트"의 범위는 다음으로 한정한다(2026-08-16 확인 — 메뉴 컴포넌트·메뉴
액션에는 애초에 기존 테스트가 없다): `AdminSidebar.test.tsx`, site-design
`SelectorPane.test.tsx`·`TokenEditor.test.tsx`·`app/admin/site/design/actions.test.ts`, tRPC
라우터 `admin/menu*.test.ts`. M2/M3의 사전 characterization 테스트도 이 조항의 대상에
합류한다. (2) `git diff <base>..HEAD -- apps/web/app/admin/site/design/` 변경 **0줄** —
`<base>`는 plan.md §A.6 절차대로 run 킥오프 시 progress.md §E에 기록한 base SHA. **앵커 없는
`git diff --stat` 금지**(감사 D4) — 커밋 적립 후 작업 트리가 clean하면 무조건 빈 출력이 나와
거짓 통과한다.

## AC-SITE-008 — 사이드바 그룹 불변 (REQ-SITE-008)

**Given** 이 SPEC의 모든 변경이 적용된 뒤
**Then** `AdminSidebar.tsx`의 `NAV` 배열이 변경되지 않았다.

검증:
```bash
git diff <base>..HEAD --stat -- apps/web/components/admin/AdminSidebar.tsx
# 기대: 출력 없음 (변경 0줄)
# <base> = plan.md §A.6 절차대로 run 킥오프 시 progress.md §E에 기록한 base SHA
```

## AC-SITE-009 — SPEC-MENU-001 수명주기 마감 (REQ-SITE-009 / REQ-LGP-006)

**Given** 이 SPEC의 구현이 완료되고
**When** `.moai/specs/_archive/SPEC-MENU-001/spec.md`의 frontmatter를 읽으면
**Then** `status: superseded`이고 이 SPEC ID를 가리키는 전환 표시가 있다.

검증(기계적):
```bash
grep -n "^status:\|^superseded_by:" .moai/specs/_archive/SPEC-MENU-001/spec.md
# 기대: status: superseded + 이 SPEC ID 포인터 (아카이브 경로 — 원본 디렉터리가 아님, 감사 D3)
```
전환 소유: manager-spec(오케스트레이터 중재 — Status Transition Ownership Matrix의
`completed → superseded`). 실행 시점: sync phase. 아카이브 문서의 본문(stale §8.3·§8.5·Status
푸터) 수리는 이 AC의 범위가 아니다(spec.md §4.6 — 별도 후속).

## 완료 조건 (Definition of Done)

- [ ] AC-SITE-001 ~ AC-SITE-009 전건 통과
- [ ] M1 실측 결과가 `progress.md §E.2`에 항목별로 기록됨 — 승계 3건은 전임 기록의 어느
      가지를 확정했는지 포함, G2 텍스트영역 운명 결정 포함
- [ ] M1에서 격차가 실재하지 않는 것으로 드러난 REQ가 있다면, 철회 사실과 근거가 기록됨
- [ ] base SHA가 run 킥오프 시 progress.md §E에 기록됨 (plan.md §A.6 — AC-SITE-007/008의
      diff 앵커)
- [ ] `SPEC-MENU-001` Q3을 유예했다면 `Q3-DEFER:` 항목(사유·재개 조건·재개 주체)이 spec.md
      HISTORY에 남아 있음 — 기록 없는 유예 없음 (감사 D10)
- [ ] `research.md` 판정표의 모든 항목이 대응있음 / 격차 / 의도적제외 중 하나로 남아 있음 (REQ-LGP-003)
- [ ] 스키마 마이그레이션 0건 (plan.md §A.3)
- [ ] `SPEC-MENU-001`이 `superseded`로 마킹되고 이 SPEC ID를 가리킴 (REQ-SITE-009 / REQ-LGP-006)
- [ ] `pnpm typecheck` 신규 오류 0건
