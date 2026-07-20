---
id: SPEC-POLL-001
title: 설문(투표) 모듈 — 게시물 연동 및 독립 설문 위젯
version: 1.0.0
status: in-progress
created: 2026-06-27
updated: 2026-07-20
author: MoAI gap-analysis
priority: P3
phase: 6
parent: MASTER-PLAN-002
depends-on:
  - SPEC-DOCUMENT-001
  - SPEC-WIDGET-001
  - SPEC-AUTH-001
issue_number: TBD
language: ko
---

# SPEC-POLL-001 — 설문(투표) 모듈 (Phase 6 / P3)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix poll 모듈은 게시물에 설문을 첨부하거나 독립 설문 위젯으로 운영하는 기능을 제공. SPEC-MODULE-BACKLOG-001에서 KEEP 분류. 커뮤니티의 의사결정/의견수렴에 핵심적인 기능.

---

## 1. Goal & Audience

### 1.1 Goal

**게시물에 투표를 첨부하거나 독립 설문 위젯으로 운영할 수 있다**:

- 글쓰기 폼에서 설문 첨부 옵션을 제공한다.
- 설문 항목: 질문 1개 + 선택지 2~10개.
- 단일 선택 또는 복수 선택 설문.
- 로그인 사용자만 투표 가능 (설정에 따라 비로그인도 허용 가능).
- 1인 1회 투표 제한.
- 실시간 투표 결과 바 차트 표시.
- 설문 마감일 설정 (기간 내에만 투표 가능).
- 설문 위젯을 페이지에 독립적으로 배치 가능 (SPEC-WIDGET-001 연동).

### 1.2 Non-Goals

- 설문 결과 통계 내보내기 (CSV) — P3 후속
- 이미지 선택지 — P3 후속
- 설문 응답자 목록 공개 — 개인정보 고려 필요, 범위 외

---

## 2. Requirements

### REQ-POLL-001: 설문 생성 UI

```
WHEN 사용자가 글쓰기 폼에서 "설문 추가" 버튼을 클릭하면
THE SYSTEM SHALL 설문 섹션을 폼에 추가한다:
  - 질문 입력 필드
  - 선택지 2~10개 (추가/제거 버튼)
  - 선택 방식: 단일선택 / 복수선택 라디오
  - 마감일 날짜 선택기
  - "비로그인도 투표 가능" 체크박스
```

### REQ-POLL-002: 투표 실행

```
WHEN 로그인 사용자가 설문 항목을 선택하고 "투표" 버튼을 클릭하면
THE SYSTEM SHALL 서버에서 중복 투표 여부를 확인한다
IF 이미 투표했으면 "이미 투표하셨습니다" 메시지를 표시한다
ELSE 투표를 기록하고 실시간으로 결과 차트를 갱신한다
AND 마감일이 지난 설문은 투표 버튼을 비활성화하고 결과만 표시한다
```

### REQ-POLL-003: 투표 결과 시각화

```
THE SYSTEM SHALL 투표 후 또는 마감 설문의 경우 각 선택지의 득표수와 비율을 바 차트로 표시한다
AND 전체 참여자 수를 표시한다
AND 내가 투표한 항목을 강조 표시한다
```

### REQ-POLL-004: 독립 설문 위젯

```
THE SYSTEM SHALL poll-widget 타입을 SPEC-WIDGET-001 레지스트리에 등록한다
AND 위젯 설정: 연결할 설문 ID 선택
AND 페이지/레이아웃 어디에나 배치 가능
```

### REQ-POLL-005: 관리자 설문 관리

```
THE SYSTEM SHALL 관리자 > 콘텐츠 > 설문 관리 페이지를 제공한다
WITH 설문 목록 (제목, 게시물 연결 여부, 참여자 수, 마감일, 상태)
AND 설문 강제 마감 / 재개 기능
AND 설문 결과 상세 조회
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-POLL-001 | 글쓰기 폼에서 설문을 추가하고 저장 시 게시물 하단에 설문이 표시된다 |
| AC-POLL-002 | 로그인 후 선택지 투표 시 결과 차트가 갱신된다 |
| AC-POLL-003 | 같은 설문에 재투표 시도 시 "이미 투표하셨습니다" 메시지가 표시된다 |
| AC-POLL-004 | 마감일이 지난 설문의 투표 버튼이 비활성화된다 |
| AC-POLL-005 | 설문 위젯을 페이지에 배치하면 설문이 렌더된다 |

---

## 4. DB 스키마

```prisma
model Poll {
  id           Int          @id @default(autoincrement())
  documentId   Int?
  question     String
  multiSelect  Boolean      @default(false)
  allowGuest   Boolean      @default(false)
  endsAt       DateTime?
  createdAt    DateTime     @default(now())
  options      PollOption[]
  votes        PollVote[]
}

model PollOption {
  id        Int        @id @default(autoincrement())
  pollId    Int
  text      String
  count     Int        @default(0)
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes     PollVote[]
}

model PollVote {
  id        Int        @id @default(autoincrement())
  pollId    Int
  optionId  Int
  userId    Int?
  guestId   String?    // 비로그인 식별자 (쿠키)
  createdAt DateTime   @default(now())
  @@unique([pollId, userId])
}
```
