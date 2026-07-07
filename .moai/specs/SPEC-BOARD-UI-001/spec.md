---
id: SPEC-BOARD-UI-001
title: 게시판 목록 UI 완성 — 테이블/페이지네이션/검색/정렬/공지/비밀
version: 1.0.0
status: draft
created: 2026-06-27
updated: 2026-06-27
author: MoAI gap-analysis
priority: P0
phase: 3
parent: MASTER-PLAN-002
depends-on:
  - SPEC-BOARD-CRUD-001
  - SPEC-DOCUMENT-001
  - SPEC-EDITOR-001
issue_number: TBD
language: ko
---

# SPEC-BOARD-UI-001 — 게시판 목록 UI 완성 (Phase 3 / P0)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. Gap Analysis 결과, 현재 뉴버전 `/board` 페이지는 제목만 출력하는 텍스트 목록이며 페이지네이션/검색/정렬/조회수/추천수/첨부파일 표시 등 레거시의 핵심 게시판 기능이 전무한 상태임. SPEC-BOARD-CRUD-001이 백엔드 tRPC 라우터를 완성했으나 프론트엔드 목록 UI가 MVP 수준에 머물러 있어 실사용이 불가능함.

---

## 1. Goal & Audience

### 1.1 Goal

**`/{mid}` 게시판 목록 페이지가 레거시와 동등한 수준으로 동작한다**:

- 목록 테이블: 번호/공지여부/제목(댓글수)/작성자/날짜/조회수/추천수 컬럼
- 공지글이 목록 상단에 고정 표시된다 (배경색 구분)
- 페이지네이션 (기본 20개/페이지, 관리자 설정 가능)
- 게시판 내 검색 (제목/내용/작성자 구분 선택)
- 정렬 (최신순/추천순/조회순)
- 첨부파일 있음 아이콘 표시
- 비밀글 잠금 아이콘 + 작성자/관리자만 내용 열람 가능
- 글쓰기 버튼 (권한 있는 사용자만)
- 뷰 스타일 토글: 테이블형 / 카드형 (기본 테이블)

### 1.2 Audience

- expert-frontend agent — 게시판 목록/상세 UI 컴포넌트 구현
- expert-backend agent — 목록 tRPC 쿼리 페이지네이션/필터/정렬 파라미터 보강

### 1.3 Non-Goals

- 앨범형/갤러리형 뷰 — P2 후속
- 모바일 무한 스크롤 — P2 후속
- 통합검색 (여러 게시판 동시 검색) — SPEC-SEARCH-001

---

## 2. Requirements

### REQ-BUI-001: 목록 테이블

```
WHEN 사용자가 /{mid} 게시판 URL에 접근하면
THE SYSTEM SHALL 다음 컬럼의 테이블을 렌더한다:
  - 번호 (공지글은 "공지" 뱃지)
  - 제목 (댓글 수 [N] 표시, 첨부파일 아이콘, 비밀글 자물쇠 아이콘)
  - 작성자 (닉네임)
  - 작성일 (오늘이면 시간, 아니면 날짜)
  - 조회수
  - 추천수
```

### REQ-BUI-002: 공지글 고정

```
WHEN 관리자/게시판 운영자가 문서를 공지로 지정하면
THE SYSTEM SHALL 해당 문서를 목록 상단에 정렬 무관하게 고정 표시한다
AND 공지 배경색(light: gray-50, dark: gray-800)을 적용한다
```

### REQ-BUI-003: 페이지네이션

```
THE SYSTEM SHALL 기본 20개/페이지로 게시물을 페이지네이션한다
AND URL 쿼리 ?page=N 으로 페이지를 제어한다
AND 첫/이전/페이지번호/다음/마지막 버튼을 렌더한다
AND 관리자가 게시판 설정에서 페이지당 개수(10/20/30/50)를 변경할 수 있다
```

### REQ-BUI-004: 검색

```
WHEN 사용자가 검색어를 입력하고 검색 범위를 선택 후 제출하면
THE SYSTEM SHALL ?search=keyword&searchField=title|content|author 파라미터로 필터링된 목록을 반환한다
AND 검색 결과 수를 상단에 표시한다
AND 검색 상태에서도 페이지네이션이 동작한다
```

### REQ-BUI-005: 정렬

```
THE SYSTEM SHALL ?sort=latest|recommend|views 파라미터로 정렬 순서를 제어한다
AND 정렬 선택 UI(드롭다운 또는 탭)를 목록 상단 오른쪽에 배치한다
AND 기본 정렬은 latest(최신순)이다
```

### REQ-BUI-006: 비밀글

```
WHEN 문서가 secret=true이면
THE SYSTEM SHALL 제목란에 자물쇠 아이콘을 표시한다
AND 작성자 또는 관리자 이외의 사용자가 상세 페이지 접근 시 "비밀글입니다" 메시지를 표시한다
```

### REQ-BUI-007: 문서 상세 완성

```
WHEN 사용자가 목록에서 게시물을 클릭하면
THE SYSTEM SHALL 다음 요소를 포함한 상세 페이지를 렌더한다:
  - 제목, 작성자, 작성일, 조회수, 추천수
  - 본문 (SPEC-EDITOR-001 HTML 렌더러)
  - 첨부파일 목록 (파일명/크기/다운로드)
  - 태그 목록 (SPEC-TAG-001 연동 준비)
  - 추천/비추천 버튼 (로그인 사용자)
  - 이전글/다음글 링크
  - 댓글 목록 및 작성 폼
  - 수정/삭제 버튼 (작성자/관리자)
```

### REQ-BUI-008: 글쓰기 권한 게이트

```
WHEN 글쓰기 버튼을 클릭할 때
IF 비로그인 사용자이면
  THE SYSTEM SHALL /login?callbackUrl=/{mid}/write 로 리다이렉트한다
IF 로그인했으나 권한이 없는 사용자이면
  THE SYSTEM SHALL "글쓰기 권한이 없습니다" 토스트를 표시한다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-BUI-001 | /board 접속 시 번호/제목/작성자/날짜/조회수/추천수 컬럼 테이블이 렌더된다 |
| AC-BUI-002 | 공지 지정 게시물이 목록 최상단에 별도 배경으로 표시된다 |
| AC-BUI-003 | 21번째 게시물부터 페이지2로 이동하고 URL이 ?page=2로 변경된다 |
| AC-BUI-004 | "검색어"로 제목 검색 시 해당 게시물만 목록에 표시된다 |
| AC-BUI-005 | 추천순 정렬 선택 시 추천수 높은 게시물이 상단에 표시된다 |
| AC-BUI-006 | 비밀글 게시물 클릭 시 작성자 외 사용자는 내용을 볼 수 없다 |
| AC-BUI-007 | 상세 페이지에서 이전글/다음글 링크가 동작한다 |
| AC-BUI-008 | 비로그인 상태에서 글쓰기 클릭 시 /login?callbackUrl=... 으로 이동한다 |
| AC-BUI-009 | 첨부파일이 있는 게시물 목록에 클립 아이콘이 표시된다 |

---

## 4. Technical Approach

### 목록 컴포넌트 구조

```
apps/web/app/[mid]/
├── page.tsx                    # 게시판 목록 Server Component
├── [id]/
│   └── page.tsx                # 문서 상세 Server Component
└── write/
    └── page.tsx                # 글쓰기 폼

apps/web/components/board/
├── BoardTable.tsx              # 목록 테이블
├── BoardPagination.tsx         # 페이지네이션
├── BoardSearch.tsx             # 검색 바
├── BoardSortSelect.tsx         # 정렬 드롭다운
├── DocumentDetail.tsx          # 상세 뷰
└── VoteButton.tsx              # 추천/비추천
```

### tRPC 쿼리 보강

`content.document.list` 쿼리에 다음 파라미터 추가:
- `page: number`
- `pageSize: 10 | 20 | 30 | 50`
- `search: string`
- `searchField: 'title' | 'content' | 'author'`
- `sort: 'latest' | 'recommend' | 'views'`
- `includeNotice: boolean`

### Slice 분리

- **Slice A**: 목록 테이블 + 페이지네이션 + 공지
- **Slice B**: 검색 + 정렬
- **Slice C**: 상세 뷰 완성 (추천/비추천/이전다음글/첨부파일)
