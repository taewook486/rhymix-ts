# SPEC-FRONT-PARITY-001 — plan

## §0. 설계 요약

신규 컴포넌트·데이터 모델 변경 없음. (a) 설치 시드가 인덱스로 지정하는 모듈을 board → page로
바꾸고 환영 콘텐츠를 넣는 작업, (b) 중복 렌더되는 푸터·`<main>`을 렌더 트리에서 정리하는 작업
두 갈래다.

## §1. 현황 실측 (수정 대상 위치)

푸터 3개 — 전부 동시에 렌더됨:

| 파일 | 클래스 | 문구 |
|---|---|---|
| `apps/web/components/layout/GlobalFooter.tsx:11` | `border-t py-6 mt-12` | Powered by Rhymix-TS |
| `apps/web/components/layout/Footer.tsx:17` | `border-t bg-zinc-50 mt-auto` | © 2026 Rhymix-TS |
| `themes/default/layouts/default.tsx:40` | `border-t py-4 text-center` | Powered by Rhymix-TS (중복) |

`<main>` — 인덱스 화면 기준 3개(2단 중첩)이나, **전역 영향 범위는 22개 파일**:

| 파일 | 비고 |
|---|---|
| `apps/web/app/layout.tsx:71` | `<main>{children}</main>` — **루트 레이아웃(전역)** |
| `themes/default/layouts/default.tsx:35` | `container mx-auto px-4 py-8 …` — 레이아웃 컨테이너 |
| `packages/board/src/routes/index-page.tsx:287` | 모듈 자체 `<main>` |

> **주의 — 루트 `<main>` 변경은 전역 변경이다.** `grep -rln "<main" apps/web/app packages
> --include="*.tsx" | grep -v test` → **22개 파일**. `app/layout.tsx`가 루트이므로 자체
> `<main>`을 렌더하는 모든 라우트가 이미 2중이다: `(member)` 그룹 6개, `admin/**` 2개,
> `install/**` 5개, `tags`, `[mid]/write`, board `view/edit/write-page` 등.
> 본 SPEC은 spec.md §3의 "방문자 화면" 정의에 따라 **인덱스 + 게시판 라우트만** 대상으로
> 한다. 루트 `<main>`을 건드리면 범위 밖 라우트까지 영향을 주므로, **모듈/레이아웃 쪽에서
> 낮추는 방향을 우선 검토**하고 루트 변경은 최후 수단으로 두되 선택 시 범위 밖 라우트
> 회귀 검증을 반드시 포함한다.

## §2. 파일별 변경 계획

### M1 — 중복 마크업 해소 (REQ-FP-003, 004, 007)

목표: 문서당 `<footer>` 1개 / `<main>` 1개.

- **푸터**: 소유권을 한 곳으로 확정한다. 어느 것을 남길지는 구현 시점에 근거와 함께
  결정하되, **아래 3개 결정 입력을 모두 확인한 뒤** 결정한다(하나라도 누락 시 완료 SPEC의
  요구사항을 조용히 깨뜨린다):

  | # | 확인 항목 | 실측 결과 | 삭제 시 필요한 조치 |
  |---|---|---|---|
  | 1 | 각 푸터가 어느 완료 SPEC의 REQ를 이행하는가 | `Footer.tsx:20` = `MenuSlotRenderer slot="FOOTER"` **유일 렌더러**(SPEC-MENU-001 REQ-MENU-030~034) / `GlobalFooter.tsx:11` = SPEC-INSTALL-003 REQ-INSTALL3-040~042(항상 렌더) | 이행 주체를 살아남는 푸터로 **이전**(REQ-FP-006 b·c) |
  | 2 | 각 푸터를 검증하는 기존 테스트 | `GlobalFooter.test.tsx` + `app/layout.test.tsx`(3건) | 테스트 갱신을 산출물에 포함 |
  | 3 | 레이아웃 미적용 라우트에서의 렌더 | DefaultLayout은 인덱스 모듈 경로에서만 적용 | 로그인/에러 등에서 푸터가 사라지지 않는지 확인 |

  — 무조건 삭제 금지. 특히 `Footer.tsx` 삭제 시 관리자 UI(`SlotAssignmentTable`)에서 FOOTER
  슬롯 배정이 여전히 가능한데 화면에는 아무것도 렌더되지 않는 무증상 실패가 발생한다.
- **`<main>`**: 앱 전역(`app/layout.tsx`)의 `<main>`을 `<div>`로 바꾸거나, 모듈/레이아웃 쪽
  `<main>`을 `<div>`/`<section>`으로 낮춘다. 시맨틱상 "페이지 본문"을 가장 잘 나타내는
  한 곳만 `<main>`을 유지한다(레이아웃 컨테이너 권장 — 실제 본문 영역과 일치).
- 온보딩 패널(REQ-FP-007)이 `<main>` 밖/안 어디에 위치해도 중복이 생기지 않도록 확인한다.

### M2 — 인덱스 모듈을 page로 전환 (REQ-FP-001, 002, 005)

파일: `packages/db/src/install/seed.ts`, **`packages/db/src/install/seed.test.ts`**

> **선행 필독 — 기존 가드 테스트가 정면 충돌한다.**
> `seed.test.ts:406`·`:469`가 `expect(indexUpdate?.data.indexModuleInstanceId).toBe(MODULE_ID.board)`를
> 단언한다. REQ-FP-001은 이 불변식을 **의도적으로 뒤집는다**. 두 단언 사이트를 page 인스턴스
> 기준으로 갱신하는 것이 M2의 필수 산출물이며, 이 실패는 **회귀가 아니라 의도된 변경**이다
> (AC-FP-006의 carve-out 참고). 갱신 없이 진행하면 "기존 테스트 전체 PASS" 판정이
> 불가능해진다.

- 기존 `moduleInstance.create` 3건(board/notice/qna)에 **page 인스턴스 1건 추가**.
- `domain.update`의 `indexModuleInstanceId`를 board → 신규 page 인스턴스로 변경.
- page 본문(`mcontent`)에 환영 콘텐츠 시딩: 제목 + 소개 문단 + `/admin` 링크
  (REQ-FP-002 최소 요건). `apps/web/app/page.tsx`가 page 모듈일 때
  `renderBodyWithWidgets(instance.mcontent)` 경로를 타므로 HTML 문자열로 저장한다.
- board/notice/qna 인스턴스와 샘플 문서는 **그대로 유지**(REQ-FP-005) — 메뉴로 접근.

## §3. PRESERVE 목록

- board/notice/qna 모듈 인스턴스 + 보드 + 샘플 문서 (삭제·이동 금지)
- 게시판 목록의 컬럼 6종·정렬 컨트롤·카드형 토글·추천수 (REQ-FP-006)
- 다크모드 토글 (`rx-color-scheme`)
- 온보딩 패널 렌더 조건 (관리자 + siteId 존재 시)
- **FOOTER 메뉴 슬롯 렌더 경로** — `MenuSlotRenderer slot="FOOTER"`, 현재 `Footer.tsx:20`이
  유일 렌더러. SPEC-MENU-001 REQ-MENU-030~034 이행 (REQ-FP-006 b)
- **항상 렌더되는 attribution 푸터** — `GlobalFooter.tsx`, SPEC-INSTALL-003
  REQ-INSTALL3-040~042 이행 + 전용 테스트 보유 (REQ-FP-006 c)
- `30acfeb`(독립 커밋 `fix(install): 설치 시 레이아웃·메뉴 연결 누락 수정`)에서 추가한
  메뉴 슬롯·레이아웃 연결 시드 (회귀 금지)
- 즐겨찾기 시딩 2건 — `e8f3ec6`, SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-006

## §4. 마일스톤

- M1: 중복 마크업 해소 (`app/layout.tsx`, `themes/default/layouts/default.tsx`,
  `packages/board/src/routes/index-page.tsx`, 푸터 컴포넌트 중 1개)
- M2: 인덱스 모듈 page 전환 + 환영 콘텐츠 시딩 (`packages/db/src/install/seed.ts`)

M1 → M2 순서 권장: M2가 인덱스 화면을 page로 바꾸므로, 마크업 정리를 먼저 끝내면 M2 검증 시
"푸터/main이 몇 개인가"를 깨끗한 상태에서 확인할 수 있다.

## §5. 검증 방법

M1·M2 모두 **DB 재설치 후 실제 렌더 결과**로 검증한다(mock 단위 테스트만으로는 중복 렌더를
잡을 수 없음 — 오늘 연결 버그가 정확히 그 사유로 누락되었다). 구체 명령은 acceptance.md 참고.

## §6. 클래리피케이션

없음 — 인덱스 모듈 정책(page)과 범위(구조·버그 한정)는 사용자 결정으로 확정됨.
