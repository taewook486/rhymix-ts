# SPEC-FRONT-PARITY-001 — acceptance

각 AC는 대응 REQ의 GEARS 패턴(Ubiquitous / Event-Driven / State-Driven / Unwanted)을 그대로
반영한다. **모든 AC는 DB 재설치 후 실제 렌더 결과로 검증**한다 — mock 단위 테스트만으로는
중복 렌더·연결 누락을 잡을 수 없음이 2026-08-11 실측으로 확인되었기 때문이다(research.md §0).

기준 명령(재설치): `prisma migrate reset --force` → `/install` 4단계 완료 → 아래 검증.

| AC | REQ | GEARS 검증 기준 | 기계 검증 명령 |
|----|-----|------------------|------------------|
| AC-FP-001 | REQ-FP-001 | **When** 설치가 완료되면 **the system shall** 도메인의 `indexModuleInstanceId`가 `moduleCode='page'`인 인스턴스를 가리키도록 설정한다. | `psql -c "SELECT m.\"moduleCode\" FROM domains d JOIN module_instances m ON m.id=d.\"indexModuleInstanceId\";"` → `page` |
| AC-FP-002 | REQ-FP-002 | **When** 설치가 완료되면 **the system shall** 인덱스 page 인스턴스의 본문에 제목·소개 문단·`/admin` 링크를 포함한다. | `psql -c "SELECT mcontent FROM module_instances WHERE \"moduleCode\"='page';"` 출력에 `<h1`(또는 heading 태그), 문단 텍스트, `/admin` 문자열이 각각 1회 이상 |
| AC-FP-003 | REQ-FP-003 | **The** 렌더된 방문자 페이지 **shall** `<footer>`를 정확히 1개 포함하며, 동일 푸터 문구를 2회 이상 노출 **shall not**. | Playwright: `document.querySelectorAll('footer').length === 1` **AND** 푸터 문구 배열에 중복 없음(`new Set(texts).size === texts.length`) |
| AC-FP-004 | REQ-FP-004 | **The** 렌더된 방문자 페이지 **shall** `<main>`을 정확히 1개 포함하며, `<main>` 안에 `<main>`을 중첩 **shall not**. | Playwright: `document.querySelectorAll('main').length === 1` **AND** `document.querySelectorAll('main main').length === 0` |
| AC-FP-005 | REQ-FP-005 | **The** 게시판 **shall** `/board`·`/notice`·`/qna` 라우트와 헤더 메뉴로 접근 가능하며, 목록의 컬럼·정렬·카드형 컨트롤을 유지한다. | 3개 라우트 각각 HTTP 200 + `/board`에서 `th` 텍스트가 `[번호,제목,작성자,작성일,조회수,추천수]`와 일치 + 정렬 select·카드형 링크 존재 |
| AC-FP-006 | REQ-FP-006 | **The system shall not** 다크모드 토글·정렬 컨트롤(최신순/추천순/조회순)·카드형 토글·추천수 컬럼을 제거하거나 회귀시킨다. | 기존 board/theme 테스트 전체 재실행 PASS + `/board` 렌더에서 4개 요소 존재 확인(AC-FP-005 명령에 포함) |
| AC-FP-007 | REQ-FP-007 | **While** 인증된 관리자가 인덱스를 조회하면 **the system shall** 온보딩 패널을 페이지 콘텐츠 위에 계속 렌더하며, 그 패널이 AC-FP-003/004의 중복 판정을 유발 **shall not**. | 관리자 로그인 상태로 `/` 렌더 → 온보딩 텍스트("설치가 성공적으로 완료") 존재 **AND** AC-FP-003/004 조건 동시 충족 |

## Edge Cases

- **비로그인 방문자**: 온보딩 패널이 렌더되지 않는 상태에서도 AC-FP-003/004(푸터 1개·main 1개)가
  충족되어야 한다. 로그인/비로그인 두 경우 모두 검증한다.
- **인덱스 외 라우트**: `/board` 등 레이아웃을 타는 다른 라우트에서도 푸터가 사라지거나
  중복되지 않아야 한다(plan.md §2 M1의 "무조건 삭제 금지" 주의사항과 연결). 최소
  `/`·`/board` 2개 라우트에서 AC-FP-003/004를 확인한다.
- **page 모듈 렌더 경로**: `apps/web/app/page.tsx`는 `moduleCode === 'page'`일 때
  `renderBodyWithWidgets` 경로를 탄다(board와 다른 분기). AC-FP-002 검증 시 DB 값뿐 아니라
  실제 렌더 결과에 환영 콘텐츠가 나타나는지 함께 확인한다.
