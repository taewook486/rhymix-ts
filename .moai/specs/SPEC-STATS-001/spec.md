---
id: SPEC-STATS-001
title: 접속 통계 — 일별/월별 방문자 차트 및 게시물 통계
version: 1.0.0
status: completed
created: 2026-06-27
updated: 2026-07-19
author: MoAI gap-analysis
priority: P2
phase: 5
parent: MASTER-PLAN-002
depends-on:
  - SPEC-ADMIN-001
  - SPEC-DOCUMENT-001
issue_number: TBD
language: ko
---

# SPEC-STATS-001 — 접속 통계 (Phase 5 / P2)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix는 counter 모듈로 일별 방문자 수, 페이지 뷰, 신규 회원 등을 Highcharts로 시각화한다. 뉴버전 관리자 대시보드에는 요약 카드만 있고 시계열 차트가 없음. SPEC-MODULE-BACKLOG-001에서 counter 모듈을 KEEP 분류.

---

## 1. Goal & Audience

### 1.1 Goal

**관리자 대시보드와 통계 페이지에서 사이트 운영 지표를 차트로 확인할 수 있다**:

- 일별/주별/월별 방문자 수(UV), 페이지뷰(PV) 차트.
- 신규 가입자, 게시물 작성 수, 댓글 작성 수 시계열 차트.
- 인기 게시물 TOP 10 (기간별).
- 검색 키워드 TOP 10 (SPEC-SEARCH-001 연동).
- 대시보드 카드에 전일 대비 증감률 표시.
- 통계 데이터를 CSV로 내보내기.

### 1.2 Audience

- expert-backend agent — 방문 로그 수집 미들웨어, 통계 집계 쿼리
- expert-frontend agent — Recharts 기반 차트 컴포넌트, 대시보드 통합

### 1.3 Non-Goals

- 실시간 접속자 수 (WebSocket 기반) — P3
- 사용자별 행동 분석 (클릭 히트맵) — 외부 서비스 (GA, Hotjar)
- 광고 클릭 통계 — 범위 외

---

## 2. Requirements

### REQ-STATS-001: 방문 로그 수집

```
THE SYSTEM SHALL Next.js middleware에서 모든 페이지 요청을 인터셉트한다
AND 다음 정보를 page_views 테이블에 비동기 저장한다:
  - 날짜 (date), 시간 (hour)
  - 페이지 경로 (path)
  - 방문자 식별자 (세션 기반 UV 중복 제거)
  - 사용자 에이전트 (모바일/PC 구분용)
AND /api/*, /admin/* 경로는 수집에서 제외한다
AND 봇 User-Agent는 제외한다
```

### REQ-STATS-002: 통계 집계

```
THE SYSTEM SHALL 매일 00:05 UTC에 전일 통계를 집계하여 daily_stats 테이블에 저장한다 (cron job)
WITH 집계 항목:
  - uv: 일별 순방문자 수
  - pv: 일별 페이지뷰
  - new_members: 신규 가입자 수
  - new_documents: 게시물 작성 수
  - new_comments: 댓글 작성 수
```

### REQ-STATS-003: 관리자 대시보드 차트

```
THE SYSTEM SHALL 관리자 대시보드에 다음 차트를 추가한다:
  - 최근 30일 방문자(UV/PV) 라인 차트
  - 최근 7일 신규 콘텐츠 바 차트 (게시물/댓글/회원)
AND Recharts 라이브러리를 사용한다
AND 차트 데이터는 tRPC를 통해 서버에서 조회한다
```

### REQ-STATS-004: 통계 상세 페이지

```
THE SYSTEM SHALL 관리자 > 통계 페이지를 추가한다
WITH 기간 선택 (7일/30일/90일/직접입력)
AND 지표 선택 탭 (방문자 / 콘텐츠 / 검색어)
AND 인기 게시물 TOP 10 (선택 기간 내 조회수 기준)
AND CSV 내보내기 버튼
```

### REQ-STATS-005: 대시보드 카드 개선

```
THE SYSTEM SHALL 기존 대시보드 요약 카드에 전일 대비 증감률을 추가한다
AND 증가는 초록색 ▲N%, 감소는 빨간색 ▼N%로 표시한다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-STATS-001 | 사이트 방문 시 page_views 테이블에 로그가 기록된다 |
| AC-STATS-002 | 관리자 대시보드에 최근 30일 방문자 라인 차트가 표시된다 |
| AC-STATS-003 | 관리자 통계 페이지에서 인기 게시물 TOP 10이 표시된다 |
| AC-STATS-004 | 기간 선택 변경 시 차트 데이터가 갱신된다 |
| AC-STATS-005 | CSV 내보내기 버튼 클릭 시 통계 데이터 파일이 다운로드된다 |
| AC-STATS-006 | 봇 User-Agent의 방문은 통계에 포함되지 않는다 |

---

## 4. DB 스키마

```prisma
model PageView {
  id        BigInt   @id @default(autoincrement())
  date      DateTime @db.Date
  hour      Int
  path      String
  visitorId String   // 세션 기반 해시
  isMobile  Boolean  @default(false)
  @@index([date, path])
}

model DailyStat {
  date         DateTime @id @db.Date
  uv           Int      @default(0)
  pv           Int      @default(0)
  newMembers   Int      @default(0)
  newDocuments Int      @default(0)
  newComments  Int      @default(0)
}
```

### 패키지

- `recharts` — 차트 라이브러리 (React 네이티브)
- `papaparse` — CSV 생성
