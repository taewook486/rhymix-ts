# SPEC-LEGACY-PARITY-001 — acceptance

> AC 11건. 각 AC는 실행 가능한 검증 수단을 갖는다. "코드가 있다"는 통과 근거가 아니다.

## AC-SITE-001 — 메뉴 아이템 복제 (REQ-SITE-001)

**Given** 자식 아이템 2단계를 가진 메뉴 아이템이 있고
**When** 관리자가 `/admin/menu`에서 그 아이템을 복제하면
**Then** 하위 트리 전체가 복제되고, 복제본은 원본과 같은 부모 아래 원본 바로 다음 순서에 배치된다.

검증: `duplicateMenuItemAction` 단위 테스트 — 형제 3개 + 2단계 중첩 픽스처로
`listOrder` 충돌 0건과 자식 개수 일치를 확인.
추가로 dev 서버에서 실제 복제 후 **새로고침 뒤에도 유지**되는지 직접 확인한다.

## AC-SITE-002 — 버튼 이미지 파일 업로드 (REQ-SITE-002)

**Given** `/admin/menu/[id]` 편집 화면에서
**When** normal / hover / active 3종 버튼 이미지를 **파일로** 각각 업로드하면
**Then** 세 값이 모두 저장되고 재진입 시 그대로 표시된다.

검증: `MenuItemEditor` 렌더 테스트는 **이미지 파일 업로드 입력(`type="file"` 또는 업로드 서버
액션)의 존재**를 주장해야 한다 + `updateMenuItemAction` 왕복 테스트(저장 → 재조회 시 3필드
일치). **"3종 입력 컨트롤 존재" 같은 표현 금지** — 이미 존재하는 "버튼 상태" JSON 텍스트영역
(`MenuItemEditor.tsx:260-295`, `d03caf0` — M1 관찰 2026-08-16: 편집 라우트에만 렌더되며
DOM·소스 어디에도 `type="file"`이 없다)으로도 통과하는 거짓 통과다(감사 D1). 텍스트영역의
운명(교체/공존)은 M1이 정한 것이 아니라 **Q4 저장 형태 정착(M3)**과 함께 결정되며 그 결정은
spec.md HISTORY에 기록된다.

## AC-SITE-003 — 버튼 이미지 제거 (REQ-SITE-003)

**Given** 버튼 이미지가 설정된 메뉴 아이템에서
**When** 관리자가 특정 상태의 이미지를 **제거 컨트롤**로 제거하면
**Then** 해당 상태의 값이 비워지고, 나머지 두 상태의 값은 영향받지 않는다.

검증: 3종 중 1종만 제거하는 테스트 — 제거 대상은 `null`, 나머지 2종은 값 유지. "제거"는
명시적 제거 컨트롤의 동작이며, 텍스트영역 내용을 지우는 것과 구별된다. 저장 표현은 Q4
정합화 결과(REQ-SITE-011)를 따른다 — 제거의 관찰 가능성은 "값이 없음"이지 특정 인코딩이
아니다.

## AC-SITE-004 — groupIds ACL 렌더 제한 (REQ-SITE-004 — 2026-08-16 M1 관찰 정상 확인, M2 특성화 고정)

**Given** `groupIds`가 특정 그룹으로 지정된 메뉴 아이템이 있고
**When** 그 그룹에 속하지 않은 사용자가 공개 페이지를 열면
**Then** 해당 아이템이 렌더되지 않는다. 그룹에 속한 사용자에게는 렌더된다.

검증: M2 특성화 테스트(소속/미소속 2케이스 — M1의 ACL 쌍 픽스처 형태 재사용). M1 관찰로
**Q3도 확정**됐다 — 캐싱이 ACL 결과를 가리지 않는다(요청마다 계산, spec.md §2.3). 이
테스트가 경계의 회귀 지킴이며, 이후 캐싱 구성 변경으로 ACL이 가려지면 실패한다. 아카이브
문서가 이 동작을 두 가지로 자기모순 기술했다는 사실은 `research.md` §3.0에 보존된다(관찰이
확정한 것은 동작이지, 문서의 어느 가지가 '문서적으로 옳았는지'가 아니다).

## AC-SITE-005 — 중첩 트리 다단계 렌더 (REQ-SITE-005 — 2026-08-16 M1 관찰 정상 확인, M2 특성화 고정)

**Given** 부모-자식-손자 3단계 메뉴 트리가 있고
**When** 공개 페이지가 렌더되면
**Then** 3단계가 모두 렌더된다.

검증: M2 특성화 테스트(3단계 전 깊이 — M1의 3단계 트리 픽스처 형태 재사용). 아카이브 문서의
자기모순 기록은 `research.md` §3.0에 보존된다.

## AC-SITE-006 — 슬롯 3종 동시 배정 (REQ-SITE-006 — 2026-08-16 M1 관찰 정상 확인, M2 특성화 고정)

**Given** 메뉴 3개가 있고
**When** 각각을 `HEADER_PRIMARY` / `FOOTER` / `UTILITY` 슬롯에 동시에 배정하면
**Then** 3종 배정이 모두 저장되고 공개 페이지의 해당 위치에 각각 렌더된다.

검증: M2 특성화 테스트 — `listSlotAssignments` 결과에 3종이 모두 존재 +
`@@unique([domainId, slot])` 제약 위반 0건, 공개 페이지에서 헤더·푸터·유틸리티 3곳 확인
(M1의 3슬롯 픽스처 형태 재사용). 아카이브 문서의 자기모순 기록은 `research.md` §3.0에
보존된다.

## AC-SITE-007 — 뉴버전 고유 기능 보존 (REQ-SITE-007)

**Given** 이 SPEC의 모든 변경이 적용된 뒤
**Then** `/admin/site/design`의 테마 지정·디자인 토큰 편집과 `/admin/menu`의 DnD 순서 변경이
모두 이전과 동일하게 동작한다.

검증: (1) "기존 테스트"의 범위는 다음으로 한정한다(2026-08-16 확인 — 메뉴 컴포넌트·메뉴
액션에는 애초에 기존 테스트가 없다): `AdminSidebar.test.tsx`, site-design
`SelectorPane.test.tsx`·`TokenEditor.test.tsx`·`app/admin/site/design/actions.test.ts`, tRPC
라우터 `admin/menu*.test.ts`. M2~M4의 사전 characterization 테스트도 이 조항의 대상에
합류한다. (2) **행동 보존은 테스트로 증명한다** — M2 특성화 3종이 전 건 통과하는 것으로
승계 동작 보존을 주장한다(`MenuRenderer.tsx`는 M3가 변경하므로 그 파일의 no-diff 주장은 더
이상 성립하지 않는다). (3) `git diff <base>..HEAD -- apps/web/app/admin/site/design/` 변경
**0줄** — `<base>`는 plan.md §A.6 절차대로 run 킥오프 시 progress.md §E에 기록한 base SHA.
**앵커 없는 `git diff --stat` 금지**(감사 D4) — 커밋 적립 후 작업 트리가 clean하면 무조건 빈
출력이 나와 거짓 통과한다.

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
**Then** `status: superseded`이고 이 SPEC ID를 가리키는 포인터가 **문서화된 메커니즘**에
남는다 — 정식 전환 커밋 서식(Status Transition Ownership Matrix `* → superseded` 행)과,
보조로 아카이브 문서의 HISTORY 전환 행.

검증(기계적):
```bash
grep -n "^status:" .moai/specs/_archive/SPEC-MENU-001/spec.md
# 기대: status: superseded (아카이브 경로 — 원본 디렉터리가 아님, 감사 D3)
git log --oneline --grep="supersedes SPEC-MENU-001"
# 기대: feat(SPEC-LEGACY-PARITY-001): supersedes SPEC-MENU-001
# — `* → superseded` 행의 정식 커밋 서식이 이 SPEC ID 포인터다.
# 보조 포인터: 아카이브 문서의 HISTORY에 전환을 기록한 행(본문 가지 — frontmatter 아님).
# 주의: 프론트매터 필드 `^superseded_by:`는 스키마 SSOT에 없는 비문서화 필드이므로 쓰지도
# 검증하지도 않는다(감사 D2 — 1차 D9 `related_specs:`와 같은 결함 부류의 재발 차단).
```
전환 소유: manager-spec(오케스트레이터 중재 — Status Transition Ownership Matrix의
`completed → superseded`). 실행 시점: sync phase. 아카이브 문서의 본문(stale §8.3·§8.5·Status
푸터) 수리는 이 AC의 범위가 아니다(spec.md §4.6 — 별도 후속).

## AC-SITE-010 — 버튼 이미지 공개 렌더링 (REQ-SITE-010)

**Given** 3종 상태 버튼 이미지가 설정된 메뉴 아이템이 공개 페이지에 노출되어 있고
**When** 공개 페이지가 렌더되거나 방문자가 hover/active 상호작용을 일으키면
**Then** normal 이미지가 기본 표시되고, hover/active 이미지가 해당 상태에서 표시된다.

검증: `MenuRenderer` 렌더 테스트(상태별 노출 주장 — normal 기본 + hover/active 상태 전환) +
브라우저 실측. 렌더 테스트는 **RED로 시작한다** — 현 `MenuRenderer.tsx`는 버튼 필드를
읽지 않으므로(`research.md` §1.4 (1)) M3 이전 실행 시 이미지 노출 주장은 실패하고 M3 후
통과한다(AC-SITE-011과 같은 계약). 버튼 이미지가 설정되지 않은 아이템은 텍스트 라벨로 렌더된다(이미지가 라벨을
대체하는 것이지 라벨 없는 빈 링크를 만드는 것이 아니다). 이 AC가 없으면 업로드된 데이터는
어디에도 표시되지 않는다 — 버튼 필드는 현재 쓰기 전용이다(`research.md` §1.4).

## AC-SITE-011 — 버튼 필드 저장 형태 정합화 (REQ-SITE-011)

**Given** Q4 정합화가 적용된 저장 형태가 있고
**When** 편집기에서 버튼 이미지를 설정해 저장한 뒤 export → import 왕복을 수행하면
**Then** 값이 왕복을 생존하고, 편집기·서버 액션·tRPC·`serializer.ts`·`bundle-schema.ts`·
`apply.ts`가 모두 같은 형태를 읽고 쓴다.

검증: (1) 편집기로 쓴 값의 export→import 왕복 테스트 — **현재는 결함이다**(같은 필드가 3곳에서
서로 다른 형태 — 편집기 스타일 JSON vs `bundle-schema.ts:29-34` `{label,href,icon,target}` vs
레거시 `varchar(255)` 파일명, `research.md` §1.4)이므로 재현 테스트가 RED로 시작한다.
(2) `bundle-schema.ts`가 정합화된 형태 외 값을 거부하는지 확인. (3) 레거시 번들의 파일명 값
수용은 `design.md` D1 규칙을 따른다.

## 완료 조건 (Definition of Done)

- [ ] AC-SITE-001 ~ AC-SITE-011 전건 통과
- [ ] M1 관찰 결과(2026-08-16)가 `research.md` §3.0·§1.2에 **관찰 기록**으로 반영됨 — 전임
      기록의 어느 가지를 따른 것이 아니라 실측이 확정했다는 서술 포함
- [ ] **커밋 순서 증명**: M2 특성화 테스트 커밋이 `MenuRenderer.tsx` 변경 커밋보다 선행함을
      `git log`로 확인 (plan.md §A.2 구조 제약)
- [ ] Q4 저장 형태가 `design.md` D1에 문서화되고 3귀속 호출처(편집기·액션·tRPC·
      serializer/bundle-schema/apply)가 전부 그 형태로 일치함 (REQ-SITE-011)
- [ ] M1에서 격차가 실재하지 않는 것으로 드러난 REQ가 있다면, 철회 사실과 근거가 기록됨
- [ ] base SHA가 run 킥오프 시 progress.md §E에 기록됨 (plan.md §A.6 — AC-SITE-007/008의
      diff 앵커)
- [ ] `research.md` 판정표의 모든 항목이 대응있음 / 격차 / 의도적제외 중 하나로 남아 있음 (REQ-LGP-003)
- [ ] 스키마(컬럼) 마이그레이션 0건 — 값 해석 정합화(Q4)는 마이그레이션이 아니다 (plan.md §A.3)
- [ ] `SPEC-MENU-001`이 `superseded`로 마킹되고 이 SPEC ID를 가리킴 (REQ-SITE-009 / REQ-LGP-006)
- [ ] `pnpm typecheck` 신규 오류 0건
