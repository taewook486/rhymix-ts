# SPEC-FRONT-PARITY-001 — acceptance

각 AC는 대응 REQ의 GEARS 패턴(Ubiquitous / Event-Driven / State-Driven / Unwanted)을 그대로
반영한다. **모든 AC는 DB 재설치 후 실제 렌더 결과로 검증**한다 — mock 단위 테스트만으로는
중복 렌더·연결 누락을 잡을 수 없음이 2026-08-11 실측으로 확인되었기 때문이다(research.md §0).

기준 명령(재설치): `prisma migrate reset --force` → `/install` 4단계 완료 → 아래 검증.

| AC | REQ | GEARS 검증 기준 | 기계 검증 명령 |
|----|-----|------------------|------------------|
| AC-FP-001 | REQ-FP-001 | **When** 설치가 완료되면 **the system shall** 도메인의 `indexModuleInstanceId`가 `moduleCode='page'`인 인스턴스를 가리키도록 설정한다. | `psql -c "SELECT m.\"moduleCode\" FROM domains d JOIN module_instances m ON m.id=d.\"indexModuleInstanceId\";"` → `page` |
| AC-FP-002 | REQ-FP-002 | **When** 설치가 완료되면 **the system shall** 인덱스 page 인스턴스의 본문에 제목·소개 문단·`/admin` 링크를 포함한다. | `psql -c "SELECT mcontent FROM module_instances WHERE \"moduleCode\"='page';"` 출력이 다음 3개 리터럴을 각각 1회 이상 포함: (a) `<h1`, (b) 고정 문구 `Rhymix-TS에 오신 것을 환영합니다`, (c) `/admin`. **구현 시 이 3개 리터럴을 그대로 시딩할 것** — 판정을 구현자 재량에 맡기지 않기 위해 문자열을 고정한다 |
| AC-FP-003 | REQ-FP-003 | **The** 렌더된 방문자 페이지 **shall** `<footer>`를 정확히 1개 포함하며, 동일 푸터 문구를 2회 이상 노출 **shall not**. | Playwright: `document.querySelectorAll('footer').length === 1` **AND** 푸터 문구 배열에 중복 없음(`new Set(texts).size === texts.length`) |
| AC-FP-004 | REQ-FP-004 | **The** 렌더된 방문자 페이지 **shall** `<main>`을 정확히 1개 포함하며, `<main>` 안에 `<main>`을 중첩 **shall not**. | Playwright: `document.querySelectorAll('main').length === 1` **AND** `document.querySelectorAll('main main').length === 0` |
| AC-FP-005 | REQ-FP-005 | **The** 게시판 **shall** `/board`·`/notice`·`/qna` 라우트와 헤더 메뉴로 접근 가능하며, 목록의 컬럼·정렬·카드형 컨트롤을 유지한다. | 3개 라우트 각각 HTTP 200 + `/board`에서 `th` 텍스트가 `[번호,제목,작성자,작성일,조회수,추천수]`와 일치 + 정렬 select·카드형 링크 존재 + **다크모드 토글 버튼 존재**(헤더의 색상 스킴 토글 selector) |
| AC-FP-006 | REQ-FP-006 | **The system shall not** (a) 다크모드 토글·정렬·카드형·추천수 컬럼, (b) FOOTER 메뉴 슬롯 렌더 경로, (c) 항상 렌더되는 attribution 푸터를 제거하거나 회귀시킨다. | (a) AC-FP-005 명령으로 확인(다크모드 토글 포함). (b) 관리자 UI에서 FOOTER 슬롯에 메뉴 배정 후 방문자 화면에 해당 메뉴가 렌더되는지 확인. (c) `GlobalFooter.test.tsx` + `app/layout.test.tsx` PASS. 푸터 통합으로 이 테스트들을 이전하는 경우, 살아남는 푸터에 대해 **다음 3개 단언을 그대로 재현**해야 한다(판정을 구현자 재량에 맡기지 않음): `layout.test.tsx:84`(렌더됨), `:105`(문구 "Powered by Rhymix-TS" 포함), `:127`(main 뒤에 위치). **그 외 기존 board/theme/seed 테스트 전체 재실행 PASS** |
| AC-FP-007 | REQ-FP-007 | **While** 인증된 관리자가 인덱스를 조회하면 **the system shall** 온보딩 패널을 페이지 콘텐츠 위에 계속 렌더하며, 그 패널은 자체 `<main>`·`<footer>`를 렌더 **shall not**. | 관리자 로그인 상태로 `/` 렌더 → (1) 온보딩 텍스트("설치가 성공적으로 완료") 존재, (2) `document.querySelectorAll('.operator-onboarding main, .operator-onboarding footer').length === 0`, (3) AC-FP-003/004 조건 동시 충족 |

## 의도된 변경 carve-out (회귀와 구분할 것)

AC-FP-006의 "기존 테스트 전체 재실행 PASS" 판정에서, 아래 **2개 단언 사이트는 예외**다.
REQ-FP-001이 인덱스 모듈을 board → page로 뒤집으므로 이 단언들은 **반드시 실패해야 정상**이며,
page 기준으로 갱신하는 것이 M2의 필수 산출물이다(plan.md §2 M2).

| 파일:행 | 현재 단언 | 갱신 방향 |
|---|---|---|
| `packages/db/src/install/seed.test.ts:406` | `indexModuleInstanceId === MODULE_ID.board` | page 인스턴스 id 기준으로 변경 |
| `packages/db/src/install/seed.test.ts:469` | 동일 | 동일 |

이 2건 외의 기존 테스트 실패는 **회귀**로 간주하고 수정 없이 통과시키지 않는다.

## Edge Cases

- **비로그인 방문자**: 온보딩 패널이 렌더되지 않는 상태에서도 AC-FP-003/004(푸터 1개·main 1개)가
  충족되어야 한다. 로그인/비로그인 두 경우 모두 검증한다.
- **인덱스 외 라우트**: 다른 라우트에서도 푸터가 사라지거나 중복되지 않아야 한다
  (plan.md §2 M1의 "무조건 삭제 금지" 주의사항과 연결). AC-FP-003/004는 **`/`·`/board`·
  `/board/[id]` 3개 라우트 전부**에서 확인한다.
- **`/board/[id]`(글 보기)는 레이아웃 미적용 라우트**: `app/[mid]/[id]/page.tsx`가
  `renderModuleWithLayout`을 호출하지 않아 DefaultLayout이 적용되지 않는다(plan.md §1 표).
  따라서 (a) DefaultLayout 푸터만 남기는 통합 방식은 이 라우트의 푸터를 0개로 만들어
  REQ-FP-006(c) 위반이고, (b) 레이아웃 쪽 `<main>`만 낮추는 방식은 이 라우트에 닿지 않아
  REQ-FP-004 위반이다. 두 위반 모두 `/`·`/board`만 검사하면 탐지되지 않으므로 이 라우트를
  반드시 샘플에 포함한다.
- **page 모듈 렌더 경로**: `apps/web/app/page.tsx`는 `moduleCode === 'page'`일 때
  `renderBodyWithWidgets` 경로를 탄다(board와 다른 분기). AC-FP-002 검증 시 DB 값뿐 아니라
  실제 렌더 결과에 환영 콘텐츠가 나타나는지 함께 확인한다.
