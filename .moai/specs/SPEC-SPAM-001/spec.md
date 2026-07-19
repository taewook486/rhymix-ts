---
id: SPEC-SPAM-001
title: 스팸 필터 — 게시물/댓글/회원 자동 스팸 탐지 및 차단
version: 1.0.0
status: completed
created: 2026-06-27
updated: 2026-07-19
author: MoAI gap-analysis
priority: P3
phase: 6
parent: MASTER-PLAN-002
depends-on:
  - SPEC-DOCUMENT-001
  - SPEC-COMMENT-001
  - SPEC-AUTH-001
  - SPEC-ADMIN-002
issue_number: TBD
language: ko
---

# SPEC-SPAM-001 — 스팸 필터 (Phase 6 / P3)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix spamfilter 모듈은 금지어 필터, URL 블랙리스트, IP 차단, 신고 임계치 자동 숨김 등을 제공. SPEC-ADMIN-002에서 IP 차단 일부가 구현됐으나 콘텐츠 스팸 필터는 미구현 상태. 대규모 커뮤니티 운영 시 필수 기능.

---

## 1. Goal & Audience

### 1.1 Goal

**스팸 게시물/댓글이 자동으로 탐지되어 숨겨지거나 차단된다**:

- 금지어 필터: 관리자가 등록한 키워드가 포함된 게시물/댓글을 자동 차단.
- URL 블랙리스트: 차단 도메인 포함 콘텐츠 필터링.
- 신고 임계치 자동 숨김: N회 신고된 게시물/댓글을 자동으로 임시 숨김.
- 동일 내용 반복 게시 방지 (시간 제한).
- 스팸 의심 콘텐츠를 관리자 검토 큐에 대기.
- Akismet API 연동 옵션 (선택).

### 1.2 Audience

- expert-backend agent — 스팸 필터 미들웨어, tRPC 훅 통합
- expert-frontend agent — 관리자 스팸 필터 설정 UI, 검토 큐 UI

### 1.3 Non-Goals

- ML 기반 스팸 탐지 — P3+ 후속 (별도 인프라 필요)
- 이미지 스팸 탐지 — 범위 외
- 이메일 스팸 — 범위 외

---

## 2. Requirements

### REQ-SPAM-001: 금지어 필터

```
WHEN 게시물/댓글 저장 요청이 들어올 때
THE SYSTEM SHALL 제목과 내용에서 금지어 목록과 매칭을 수행한다
IF 금지어가 발견되면
  THE SYSTEM SHALL 저장을 거부하고 "금지된 단어가 포함되어 있습니다" 오류를 반환한다
  OR 관리자 설정에 따라 검토 큐로 이동시킨다
```

### REQ-SPAM-002: URL 블랙리스트

```
THE SYSTEM SHALL 게시물/댓글 내 URL을 추출하여 차단 도메인 목록과 비교한다
IF 차단 도메인이 발견되면
  THE SYSTEM SHALL REQ-SPAM-001과 동일한 처리를 적용한다
```

### REQ-SPAM-003: 신고 기반 자동 숨김

```
WHEN 게시물/댓글의 신고 수가 관리자 설정 임계치(기본 5)를 초과하면
THE SYSTEM SHALL 해당 콘텐츠를 자동으로 비공개(hidden) 상태로 변경한다
AND 관리자 검토 큐에 추가한다
AND 작성자에게 알림을 발송한다
```

### REQ-SPAM-004: 동일 내용 반복 게시 방지

```
WHEN 같은 사용자가 동일한 내용의 게시물/댓글을 N분 내(기본 1분)에 다시 작성하면
THE SYSTEM SHALL "동일한 내용을 연속으로 게시할 수 없습니다" 오류를 반환한다
AND 해시 기반으로 내용 동일성을 판단한다 (SHA256)
```

### REQ-SPAM-005: 관리자 검토 큐

```
THE SYSTEM SHALL 관리자 > 콘텐츠 > 스팸 검토 페이지를 제공한다
WITH 검토 대기 게시물/댓글 목록
AND 각 항목에 대해: 승인(공개) / 삭제 / 영구 차단(작성자 IP) 버튼
AND 필터: 게시물/댓글 구분, 날짜 범위
```

### REQ-SPAM-006: 금지어/URL 관리

```
THE SYSTEM SHALL 관리자 > 보안 설정 > 스팸 필터 페이지를 제공한다
WITH 금지어 목록 (추가/삭제, 정규식 지원 여부 토글)
AND 차단 도메인 목록 (추가/삭제)
AND 신고 임계치 설정 (게시물/댓글 각각)
AND 반복 게시 방지 시간 설정
AND Akismet API Key 입력 (선택)
```

### REQ-SPAM-007: Akismet 연동 (선택)

```
WHEN 관리자가 Akismet API Key를 설정한 경우
THE SYSTEM SHALL 게시물/댓글 저장 시 Akismet API에 스팸 여부를 비동기로 질의한다
AND 스팸으로 판정된 경우 검토 큐로 이동시킨다
AND Akismet API 호출 실패 시 필터링 없이 저장을 진행한다 (fail-open)
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-SPAM-001 | 금지어가 포함된 게시물 저장 시도 시 오류가 반환된다 |
| AC-SPAM-002 | 차단 도메인 URL이 포함된 댓글 저장 시도 시 오류가 반환된다 |
| AC-SPAM-003 | 신고 5회 초과 시 게시물이 자동으로 비공개 처리된다 |
| AC-SPAM-004 | 동일 내용을 1분 내 재게시 시도 시 오류가 반환된다 |
| AC-SPAM-005 | 관리자 검토 큐에서 승인 처리 시 게시물이 공개 상태로 변경된다 |
| AC-SPAM-006 | 관리자에서 금지어 추가 후 즉시 해당 단어가 필터에 적용된다 |

---

## 4. Technical Approach

### 스팸 필터 미들웨어

```typescript
// packages/spam/src/SpamFilter.ts
export class SpamFilter {
  async check(content: string, userId: number, ip: string): Promise<SpamResult> {
    const checks = await Promise.all([
      this.checkForbiddenWords(content),
      this.checkBlacklistUrls(content),
      this.checkDuplicateContent(content, userId),
    ])
    return this.aggregate(checks)
  }
}
```

tRPC `content.document.create` 및 `content.comment.create` 프로시저에 beforeHook으로 주입.

### DB 스키마

```prisma
model SpamWord {
  id      Int    @id @default(autoincrement())
  word    String @unique
  isRegex Boolean @default(false)
}

model SpamDomain {
  id     Int    @id @default(autoincrement())
  domain String @unique
}

model SpamQueue {
  id         Int      @id @default(autoincrement())
  type       String   // 'document' | 'comment'
  contentId  Int
  reason     String   // 'forbidden_word' | 'blacklist_url' | 'report_threshold' | 'akismet'
  status     String   @default("pending") // 'pending' | 'approved' | 'deleted'
  createdAt  DateTime @default(now())
  reviewedAt DateTime?
  reviewerId Int?
}
```
