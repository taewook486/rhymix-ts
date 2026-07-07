---
id: SPEC-TAG-001
title: 태그 시스템 — 게시물 태그 입력/검색/연관글
version: 1.0.0
status: draft
created: 2026-06-27
updated: 2026-06-27
author: MoAI gap-analysis
priority: P2
phase: 5
parent: MASTER-PLAN-002
depends-on:
  - SPEC-DOCUMENT-001
  - SPEC-EDITOR-001
  - SPEC-BOARD-UI-001
issue_number: TBD
language: ko
---

# SPEC-TAG-001 — 태그 시스템 (Phase 5 / P2)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix tag 모듈은 게시물에 태그를 부여하고, 태그 클라우드 위젯으로 탐색하며, 태그 기반 연관글을 보여주는 기능을 제공. SPEC-MODULE-BACKLOG-001에서 tag 모듈을 KEEP으로 분류했으나 구현 SPEC이 없어 신규 작성.

---

## 1. Goal & Audience

### 1.1 Goal

**게시물에 태그를 입력하고 태그로 게시물을 탐색할 수 있다**:

- 글쓰기/수정 폼에 태그 입력 UI(태그 칩 형태)를 추가한다.
- 태그 자동완성 (기존 태그 목록에서 제안).
- 게시물 상세 뷰에서 태그 목록을 표시하고 클릭 시 해당 태그 검색 결과로 이동.
- `/tag/{tagName}` 라우트에서 해당 태그가 붙은 게시물 목록을 표시.
- 관리자 태그 관리 (태그 병합, 삭제, 이름 변경).
- 태그 클라우드 위젯 (SPEC-WIDGET-001 연동).

### 1.2 Non-Goals

- 해시태그(#) 자동 감지 (본문 내 해시태그 파싱) — P3
- 태그별 RSS 피드 — P3

---

## 2. Requirements

### REQ-TAG-001: 태그 입력 UI

```
WHEN 사용자가 글쓰기/수정 폼에서 태그 입력창에 텍스트를 입력하면
THE SYSTEM SHALL 기존 태그 자동완성 드롭다운을 표시한다
WHEN 쉼표 또는 Enter를 누르면
THE SYSTEM SHALL 해당 텍스트를 태그 칩으로 변환한다
AND 태그 칩의 X 버튼으로 개별 태그를 제거할 수 있다
AND 태그는 최대 10개, 각 태그 최대 30자 제한이 있다
```

### REQ-TAG-002: 게시물-태그 연결

```
WHEN 게시물을 저장할 때
THE SYSTEM SHALL 입력된 태그를 tags 테이블에 upsert하고
AND document_tags 연결 테이블에 관계를 저장한다
AND 태그 사용 횟수(count)를 갱신한다
```

### REQ-TAG-003: 게시물 상세 뷰 태그 표시

```
WHEN 게시물 상세 페이지를 렌더할 때
THE SYSTEM SHALL 본문 하단에 태그 목록을 칩 형태로 표시한다
WHEN 태그 칩을 클릭하면
THE SYSTEM SHALL /tag/{tagName} 으로 이동한다
```

### REQ-TAG-004: 태그별 게시물 목록

```
THE SYSTEM SHALL /tag/{tagName} 라우트를 구현한다
AND 해당 태그가 붙은 게시물을 최신순으로 표시한다
AND SPEC-BOARD-UI-001과 동일한 목록 테이블을 사용한다
AND 페이지네이션을 지원한다
```

### REQ-TAG-005: 태그 클라우드 위젯

```
THE SYSTEM SHALL tag-cloud 위젯 타입을 SPEC-WIDGET-001 위젯 레지스트리에 등록한다
AND 위젯 설정: 표시 태그 수(기본 30), 최소/최대 폰트 크기
AND 태그 사용 빈도에 따라 폰트 크기를 비례하여 표시한다
```

### REQ-TAG-006: 관리자 태그 관리

```
THE SYSTEM SHALL 관리자 > 콘텐츠 > 태그 관리 페이지를 제공한다
WITH 태그 목록 (이름, 사용 횟수, 생성일)
AND 태그 삭제 (연결된 게시물에서 자동 제거)
AND 태그 병합 (A→B 병합 시 A가 붙은 게시물이 B 태그로 변경됨)
AND 태그 이름 변경
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-TAG-001 | 글쓰기 폼에서 태그 입력 후 저장 시 상세 뷰에 태그 칩이 표시된다 |
| AC-TAG-002 | 태그 입력 시 기존 태그 자동완성이 표시된다 |
| AC-TAG-003 | 상세 뷰 태그 클릭 시 /tag/{tagName} 으로 이동하고 해당 게시물들이 표시된다 |
| AC-TAG-004 | 태그 클라우드 위젯을 페이지에 배치하면 태그가 빈도별 크기로 표시된다 |
| AC-TAG-005 | 관리자에서 태그를 삭제하면 해당 게시물의 태그도 제거된다 |

---

## 4. DB 스키마

```prisma
model Tag {
  id        Int              @id @default(autoincrement())
  name      String           @unique
  count     Int              @default(0)
  createdAt DateTime         @default(now())
  documents DocumentTag[]
}

model DocumentTag {
  documentId Int
  tagId      Int
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([documentId, tagId])
}
```
