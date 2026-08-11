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

`<main>` 3개 — 2단 중첩:

| 파일 | 비고 |
|---|---|
| `apps/web/app/layout.tsx:71` | `<main>{children}</main>` — 앱 전역 |
| `themes/default/layouts/default.tsx:35` | `container mx-auto px-4 py-8 …` — 레이아웃 컨테이너 |
| `packages/board/src/routes/index-page.tsx:287` | 모듈 자체 `<main>` |

## §2. 파일별 변경 계획

### M1 — 중복 마크업 해소 (REQ-FP-003, 004, 007)

목표: 문서당 `<footer>` 1개 / `<main>` 1개.

- **푸터**: 소유권을 한 곳으로 확정한다. DefaultLayout(테마 레이어)이 푸터를 갖는 것이
  테마별 푸터 커스터마이징에 유리하므로, 앱 전역 푸터 중 중복 문구를 내는 쪽을 제거하는
  방향을 우선 검토한다. 단 `GlobalFooter`/`Footer` 각각의 사용처(다른 라우트에서 단독
  사용 여부)를 먼저 grep으로 확인하고, 어느 것을 남길지는 구현 시점에 근거와 함께 결정한다.
  — 무조건 삭제 금지: 인덱스 외 라우트(로그인/에러 등)에서 레이아웃 없이 렌더될 때
  푸터가 아예 사라지는 회귀를 만들 수 있다.
- **`<main>`**: 앱 전역(`app/layout.tsx`)의 `<main>`을 `<div>`로 바꾸거나, 모듈/레이아웃 쪽
  `<main>`을 `<div>`/`<section>`으로 낮춘다. 시맨틱상 "페이지 본문"을 가장 잘 나타내는
  한 곳만 `<main>`을 유지한다(레이아웃 컨테이너 권장 — 실제 본문 영역과 일치).
- 온보딩 패널(REQ-FP-007)이 `<main>` 밖/안 어디에 위치해도 중복이 생기지 않도록 확인한다.

### M2 — 인덱스 모듈을 page로 전환 (REQ-FP-001, 002, 005)

파일: `packages/db/src/install/seed.ts`

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
- `SPEC-ADMIN-MENU-PARITY-001`에서 수정한 메뉴 슬롯·레이아웃 연결 시드 (회귀 금지)
- 즐겨찾기 시딩 2건 (REQ-AMP-006)

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
