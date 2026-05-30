---
id: SPEC-BOARD-CRUD-001-acceptance
title: SPEC-BOARD-CRUD-001 인수 기준
version: 1.0.0
status: draft
created: 2026-05-27
parent: SPEC-BOARD-CRUD-001
language: ko
---

# SPEC-BOARD-CRUD-001 — Acceptance Criteria

본 문서는 spec.md의 각 REQ가 실제로 만족되었음을 확인하는 Given-When-Then 시나리오의 완전한 목록이다. 각 AC는 Slice 식별자(A/B/C)로 분류된다.

---

## Slice A — 의존성 재배치 (Refactor)

### AC-BOARD-A1 — Characterization 회귀 없음

- **GIVEN** 기존 `packages/board` 코드 + Slice A 적용 완료 (document/comment 코드 이주됨, deprecation re-export 추가됨)
- **WHEN** `pnpm test packages/board packages/document packages/comment` 실행
- **THEN**
  - characterization snapshot 테스트 통과 (export 시그니처 유지)
  - 기존 board 테스트 전체 통과 (회귀 없음)
  - document/comment 새 패키지 테스트 전체 통과

### AC-BOARD-A2 — 의존 방향 역전

- **GIVEN** Slice A 완료
- **WHEN** `packages/board/package.json` 검사
- **THEN**
  - `dependencies`에 `@rhymix-ts/document: workspace:*` + `@rhymix-ts/comment: workspace:*` 포함
  - `packages/document`, `packages/comment`의 package.json은 `@rhymix-ts/board`를 의존하지 않음

### AC-BOARD-A3 — 이주된 파일 부재

- **GIVEN** Slice A 완료
- **WHEN** `ls packages/board/src/document.ts packages/board/src/comment.ts` 실행
- **THEN** 두 파일이 존재하지 않는다 (이주 완료). 단, `packages/board/src/index.ts`는 `@deprecated` 표시와 함께 re-export를 유지한다.

### AC-BOARD-A4 — 타입 검사 통과

- **GIVEN** Slice A 완료
- **WHEN** `pnpm tsc --noEmit`
- **THEN** 0 type error, board/document/comment 모든 패키지에서 통과.

### AC-BOARD-A5 — Deprecation 경고 노출

- **GIVEN** 외부 consumer가 `import { createDocument } from '@rhymix-ts/board'` 사용
- **WHEN** IDE의 hover 또는 tsserver 분석
- **THEN** `@deprecated` JSDoc 경고가 표시되며, 권장 import 경로(`@rhymix-ts/document`)가 안내된다.

---

## Slice B — 사용자 라우트 UI

### AC-BOARD-B1 — 게시판 목록 렌더 (REQ-BOARD-030, 031)

- **GIVEN**
  - board 인스턴스가 mid=`free`로 생성됨
  - 샘플 문서 3개 시드 (notice=false, list_order 내림차순)
  - SPEC-LAYOUT-001 default theme 시드 완료
- **WHEN** 사용자가 `/free` 방문
- **THEN**
  - HTTP 200
  - `[data-rhymix-layout="default"]` 안에 페이지 렌더
  - 3개 문서 제목이 list_order 내림차순으로 표시
  - 페이지네이션 컨트롤이 표시 (페이지 1만 활성)

### AC-BOARD-B2 — 카테고리 필터 (REQ-BOARD-032)

- **GIVEN** mid=`free` + 카테고리 id=10("공지사항"), id=20("자유") 시드 + 카테고리별 문서 2개씩
- **WHEN** 사용자가 `/free?category=10` 방문
- **THEN** 카테고리 id=10에 속한 문서 2개만 표시, id=20 문서는 hidden

### AC-BOARD-B3 — 검색 (REQ-BOARD-033)

- **GIVEN** mid=`free` + 문서 다수 (title="포팅 가이드" 1개 포함)
- **WHEN** 사용자가 `/free?q=포팅` 방문
- **THEN** title 또는 content에 "포팅"이 포함된 문서만 표시. (SPEC-DOCUMENT-001의 FTS 결과 위임)

### AC-BOARD-B4 — 페이지네이션 (REQ-BOARD-034)

- **GIVEN** mid=`free` + boardConfig.pageSize=20 + 문서 45개 시드
- **WHEN** 사용자가 `/free?page=2` 방문
- **THEN** 21~40번째 문서 표시 + pagination에서 page=2 활성

### AC-BOARD-B5 — list grant 없음 → 403 fragment (REQ-BOARD-035)

- **GIVEN** mid=`free` + `Board.permissions.list = []` (admin only)
- **WHEN** 일반 회원이 `/free` 방문
- **THEN**
  - HTTP 200 (layout은 정상 렌더)
  - 본문에 403 fragment + "권한이 없습니다" 메시지
  - 문서 제목/카운트/카테고리명 어느 것도 노출되지 않음

### AC-BOARD-B6 — 상세 라우트 (REQ-BOARD-040, 041)

- **GIVEN** mid=`free`, document_id=`100` (title="샘플 문서", content="본문", 댓글 2개)
- **WHEN** 사용자가 `/free/100` 방문
- **THEN**
  - HTTP 200
  - 제목, 작성자, regdate, sanitized content, 댓글 트리 표시
  - readedCount가 1 증가됨 (REQ-BOARD-044)

### AC-BOARD-B7 — Secret 문서 접근 제어 (REQ-BOARD-042)

- **GIVEN** document.status='SECRET', author=memberId=5
- **WHEN**
  - case 1: author 본인 접근 → 본문 표시
  - case 2: 다른 회원 접근 → 비밀번호 입력 폼 표시
  - case 3: 다른 회원이 올바른 비밀번호 입력 → 본문 표시
  - case 4: admin 접근 → 본문 표시
- **THEN** 각 case 정확히 동작

### AC-BOARD-B8 — 비로그인 쓰기 redirect (REQ-BOARD-050) ★ 핵심

- **GIVEN** 비로그인 세션 + mid=`free` + `allowAnonymousWrite=false`
- **WHEN** 사용자가 `/free/write` 방문
- **THEN**
  - `/login?callbackUrl=%2Ffree%2Fwrite`로 redirect
  - 로그인 후 `/free/write`로 자동 복귀

### AC-BOARD-B9 — 비로그인 쓰기 redirect (카테고리 파라미터 보존)

- **GIVEN** 비로그인 세션
- **WHEN** 사용자가 `/free/write?category=10` 방문
- **THEN** `/login?callbackUrl=%2Ffree%2Fwrite%3Fcategory%3D10`로 redirect

### AC-BOARD-B10 — 쓰기 성공 흐름 (REQ-BOARD-051)

- **GIVEN** 로그인 사용자 + `write_document` grant 보유
- **WHEN** 쓰기 폼에 title + content 입력 후 제출
- **THEN**
  - 새 Document row 생성 (SPEC-DOCUMENT-001 createDocument 위임)
  - `/free/{newDocumentId}`로 redirect
  - 상세 라우트에서 작성된 글 확인 가능

### AC-BOARD-B11 — 쓰기 권한 거부 (REQ-BOARD-052)

- **GIVEN** 로그인 사용자, `write_document` grant 미보유
- **WHEN** Server Action 직접 호출 (form 우회 시도)
- **THEN**
  - `{ ok: false, error: 'FORBIDDEN', message: '...' }` 반환
  - Document row 생성되지 않음 (DB 변경 없음)

### AC-BOARD-B12 — 수정 (REQ-BOARD-053, 054)

- **GIVEN** document_id=100의 author가 로그인
- **WHEN** `/free/100/edit` 진입 → 폼 수정 → 제출
- **THEN**
  - 폼 사전 채워짐 (title, content, category 표시)
  - updateDocument 호출 (SPEC-DOCUMENT-001 위임)
  - `/free/100`로 redirect, 수정된 내용 표시

### AC-BOARD-B13 — 댓글 작성 (REQ-BOARD-061)

- **GIVEN** 로그인 사용자 + `write_comment` grant 보유 + 문서 상세 페이지
- **WHEN** 댓글 폼에 content 입력 후 제출
- **THEN**
  - 새 Comment row 생성
  - 페이지 revalidate → 댓글 트리에 즉시 표시
  - Document.commentCount + 1

### AC-BOARD-B14 — 비로그인 댓글 reply → /login (REQ-BOARD-065)

- **GIVEN** 비로그인 + 문서 상세 페이지 + 댓글 reply 버튼 클릭
- **WHEN** reply 버튼 클릭
- **THEN** `/login?callbackUrl=%2Ffree%2F100%3Freply%3D{commentId}`로 redirect

### AC-BOARD-B15 — 댓글 수정/삭제 권한 (REQ-BOARD-062, 063, 064)

- **GIVEN** 댓글 작성자 A, 다른 사용자 B
- **WHEN**
  - case 1: A가 자신의 댓글 수정 → 성공
  - case 2: A가 자신의 댓글 삭제 → soft delete 성공
  - case 3: B가 A의 댓글 수정 시도 → 403
  - case 4: admin이 A의 댓글 삭제 → 성공
- **THEN** 각 case 정확히 동작

### AC-BOARD-B16 — 트리 댓글 렌더 (REQ-BOARD-060)

- **GIVEN** 댓글 트리: c1 → c2 (reply) → c3 (reply to c2) → c4 (reply to c3) → c5 (reply to c4)
- **WHEN** 상세 라우트 렌더
- **THEN** depth 5까지 인덴트되어 표시, 6번째 reply 시도는 SPEC-COMMENT-001에서 거부됨 (본 SPEC은 표시만)

### AC-BOARD-B17 — 공지글 핀 (REQ-BOARD-091, 092)

- **GIVEN** mid=`free` + 일반 문서 30개 + notice=true 문서 2개
- **WHEN** 사용자가 `/free` 방문
- **THEN**
  - 페이지 상단에 notice=true 2개 (공지 영역) — `[공지]` prefix 또는 시각 distinguished
  - 그 아래에 일반 문서 페이지 1 (20개)
  - notice 문서는 일반 목록의 자연 위치에 중복으로 나타나지 않음 (dedup)

---

## Slice C — 관리자 UI (권한 / 카테고리 / extra_vars)

### AC-BOARD-C1 — 권한 매트릭스 UI 접근 가드 (REQ-BOARD-075)

- **GIVEN** 비admin 세션
- **WHEN** `/admin/boards/free/permissions` 방문
- **THEN** `/login`으로 redirect 또는 403 fragment

### AC-BOARD-C2 — 권한 매트릭스 저장 (REQ-BOARD-072)

- **GIVEN** admin 세션 + mid=`free`
- **WHEN** matrix에서 `list` 행의 `guest` 그룹(srl=0) 체크박스를 추가 → 저장 클릭
- **THEN**
  - `Board.permissions.list = [0, 1]` 저장
  - 새로고침 시 체크박스 상태 유지

### AC-BOARD-C3 — 변경된 권한 즉시 반영 (REQ-BOARD-072 + Slice B 통합)

- **GIVEN** AC-BOARD-C2 직후
- **WHEN** guest 세션이 `/free` 방문
- **THEN** 목록이 정상 표시 (이전에는 403이었던 시나리오가 이제 허용)

### AC-BOARD-C4 — 권한 evaluator의 7-grant 지원 (REQ-BOARD-073, 074)

- **GIVEN** 다양한 board.permissions JSON
- **WHEN** `canPerformAction(board, action, ctx)` 호출
- **THEN**
  - 4개 기본 grant (`list`, `view`, `write_document`, `write_comment`)의 default = `[1]` (member only) — 기존 동작 보존
  - 3개 추가 grant (`vote_log_view`, `update_view`, `consultation_read`)의 default = `[]` (admin only)
  - admin은 모든 grant pass-through (isAdmin escape hatch — 기존 line 48 보존)

### AC-BOARD-C5 — 카테고리 CRUD (REQ-BOARD-080, 081)

- **GIVEN** admin 세션, mid=`free`
- **WHEN**
  - case 1: "공지사항" 카테고리 추가 → 저장
  - case 2: "공지사항" → "공지" 이름 수정 → 저장
  - case 3: "공지" 카테고리 삭제 → 저장
- **THEN**
  - 각 case에서 `ModuleConfig.config.board.categories` JSON이 정확히 업데이트
  - 변경 사항이 새 글쓰기 폼의 카테고리 select에 즉시 반영

### AC-BOARD-C6 — 카테고리 트리 (parentId)

- **GIVEN** 카테고리 "공지" (id=1), "긴급공지" (id=2, parentId=1) 설정
- **WHEN** 카테고리 list UI 렌더
- **THEN** "공지" 아래에 indent로 "긴급공지" 표시

### AC-BOARD-C7 — extra_vars CRUD (REQ-BOARD-082, 083)

- **GIVEN** admin 세션, mid=`free`
- **WHEN** "분류2" 라는 type=select extra key를 옵션 ["A","B","C"]로 추가 → 저장
- **THEN**
  - `ModuleConfig.config.board.extraKeys` 업데이트
  - 새 글쓰기 폼에 "분류2" select 드롭다운 A/B/C 옵션과 함께 표시
  - required=true로 설정 시 빈 값 제출하면 validation error

### AC-BOARD-C8 — 공지 토글 (REQ-BOARD-090)

- **GIVEN** admin 세션 + document_id=100의 상세 페이지
- **WHEN** "공지로 지정" 버튼 클릭
- **THEN**
  - `Document.notice = true` 업데이트
  - `/free` 목록에서 상단 핀 영역에 표시

### AC-BOARD-C9 — 공지 토글 admin only (REQ-BOARD-090)

- **GIVEN** 일반 회원 세션 + 자기 글의 상세 페이지
- **WHEN** "공지로 지정" 버튼이 UI에 없음을 확인
- **THEN** 비admin에게는 토글 버튼이 노출되지 않음. Server Action을 직접 호출해도 403 반환.

---

## Quality Gate (전 슬라이스 공통)

### AC-BOARD-Q1 — 타입 검사

- **GIVEN** Slice A/B/C 모두 완료
- **WHEN** `pnpm tsc --noEmit`
- **THEN** 0 type error

### AC-BOARD-Q2 — Lint

- **GIVEN** 전 슬라이스 완료
- **WHEN** `pnpm lint`
- **THEN** 0 error, 0 warning (또는 사전 합의된 warning만 허용)

### AC-BOARD-Q3 — 단위 테스트 커버리지

- **GIVEN** 전 슬라이스 완료
- **WHEN** `pnpm test --coverage`
- **THEN** `packages/board`의 새 코드 (routes/, admin/, actions/, module.ts) 커버리지 ≥ 80%

### AC-BOARD-Q4 — e2e 시나리오

- **GIVEN** 전 슬라이스 완료 + clean install + seed
- **WHEN** Playwright e2e 실행
- **THEN**
  - `board-list-detail.e2e.ts` 통과
  - `board-write-redirect.e2e.ts` 통과

### AC-BOARD-Q5 — 언어 정책 준수 (REQ-BOARD-105)

- **GIVEN** 전 슬라이스 완료
- **WHEN** 새 파일의 주석 확인
- **THEN** 코드 주석은 한국어, 식별자/문자열은 영어 (config.yaml `code_comments: ko` 준수)

### AC-BOARD-Q6 — 회귀 없음

- **GIVEN** 전 슬라이스 완료
- **WHEN** SPEC-PAGE-001, SPEC-WIDGET-001, SPEC-LAYOUT-001의 e2e/단위 테스트 재실행
- **THEN** 기존 테스트 모두 통과 (회귀 없음)

---

## Definition of Done (DoD)

다음 항목 모두 충족 시 본 SPEC을 "Done"으로 간주한다:

- [ ] AC-BOARD-A1 ~ A5 (Slice A: refactor 회귀 없음) 통과
- [ ] AC-BOARD-B1 ~ B17 (Slice B: 사용자 UI) 통과
- [ ] AC-BOARD-C1 ~ C9 (Slice C: admin UI) 통과
- [ ] AC-BOARD-Q1 ~ Q6 (Quality Gate) 통과
- [ ] 본 SPEC의 모든 REQ에 대응되는 AC가 최소 1개 존재
- [ ] plan.md의 모든 Slice 완료
- [ ] manager-quality TRUST 5 통과
- [ ] manager-git PR 생성 + 리뷰 통과
- [ ] manager-docs SYNC 단계 완료

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
