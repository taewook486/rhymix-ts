---
id: SPEC-SEARCH-001
title: 통합 검색 — 전체 게시판 대상 키워드 검색
version: 1.0.0
status: draft
created: 2026-06-27
updated: 2026-06-27
author: MoAI gap-analysis
priority: P1
phase: 4
parent: MASTER-PLAN-002
depends-on:
  - SPEC-DOCUMENT-001
  - SPEC-BOARD-UI-001
issue_number: TBD
language: ko
---

# SPEC-SEARCH-001 — 통합 검색 (Phase 4 / P1)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. Gap Analysis 결과, 레거시는 integration_search 모듈로 전체 게시판을 대상으로 한 통합 검색을 제공하나 뉴버전에는 검색 기능 자체가 없음. SPEC-MODULE-BACKLOG-001에서 integration_search를 KEEP 분류했으나 실제 구현 SPEC이 없어 신규 작성.

---

## 1. Goal & Audience

### 1.1 Goal

**헤더 검색창에서 전체 게시판을 대상으로 키워드 검색이 가능하다**:

- 헤더 내비게이션에 검색 아이콘/입력창을 추가한다.
- 검색 범위: 전체 게시판 / 특정 게시판 선택.
- 검색 필드: 제목+내용(기본) / 제목만 / 작성자.
- PostgreSQL `to_tsvector` + `ts_query` 기반 전문 검색 (초기 구현).
- 검색 결과 페이지: 게시판별 그룹핑, 관련도순/최신순 정렬.
- 검색어 하이라이팅 (결과 스니펫에서 매칭 부분 강조).

### 1.2 Non-Goals

- Elasticsearch/Meilisearch 외부 검색 엔진 연동 — P3 후속 (대규모 트래픽 대응)
- 파일 내용 검색 (PDF/DOCX 등) — 범위 외
- 실시간 자동완성 — P2 후속

---

## 2. Requirements

### REQ-SEARCH-001: 헤더 검색 UI

```
THE SYSTEM SHALL 헤더 우측에 검색 아이콘을 배치한다
WHEN 아이콘 클릭 시 검색 입력창이 확장되거나 검색 모달이 표시된다
WHEN 사용자가 Enter 또는 검색 버튼을 누르면 /search?q={keyword} 로 이동한다
```

### REQ-SEARCH-002: 검색 결과 페이지

```
THE SYSTEM SHALL /search 라우트에서 검색 결과를 렌더한다
WITH 검색어 표시, 총 결과 수, 검색 범위 선택 UI
AND 결과를 게시판(mid)별로 섹션 분리하여 표시한다
AND 각 결과 항목: 게시판명 > 제목 (하이라이팅) / 스니펫 / 작성자 / 날짜
```

### REQ-SEARCH-003: PostgreSQL 전문 검색

```
THE SYSTEM SHALL documents 테이블의 title, content 컬럼에 tsvector GIN 인덱스를 생성한다
AND to_tsquery로 검색 쿼리를 실행한다
AND ts_rank로 관련도 점수를 계산한다
AND 한국어 검색을 위해 simple dictionary를 사용한다 (pg_trgm 보완)
```

### REQ-SEARCH-004: 검색 필터

```
THE SYSTEM SHALL 다음 필터 파라미터를 지원한다:
  - ?mid={board_mid}: 특정 게시판으로 범위 제한
  - ?field=title|content|author: 검색 필드 선택
  - ?sort=relevance|latest: 정렬 순서
  - ?page=N: 페이지네이션
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-SEARCH-001 | 헤더 검색창에 키워드 입력 후 Enter 시 /search?q=키워드 로 이동한다 |
| AC-SEARCH-002 | 검색 결과에 게시판별 섹션이 표시되고 각 결과에 제목+스니펫이 보인다 |
| AC-SEARCH-003 | 검색어가 결과 텍스트에서 하이라이팅된다 |
| AC-SEARCH-004 | ?mid=board 파라미터로 특정 게시판만 검색된다 |
| AC-SEARCH-005 | 결과가 20개 초과 시 페이지네이션이 동작한다 |
| AC-SEARCH-006 | 검색 결과 없을 경우 "검색 결과가 없습니다" 메시지가 표시된다 |

---

## 4. Technical Approach

```
apps/web/app/search/
└── page.tsx                    # 검색 결과 Server Component

apps/web/server/api/routers/content/
└── search.ts                   # 통합 검색 tRPC 라우터

packages/db/prisma/migrations/
└── add_search_index.sql        # GIN 인덱스 마이그레이션
```

Prisma `$queryRaw` 또는 `$executeRaw`를 사용해 PostgreSQL 전문 검색 쿼리 실행.
