---
id: SPEC-MESSAGE-001
title: 쪽지(DM) 시스템 — 회원간 1:1 개인 메시지
version: 1.0.0
status: completed
created: 2026-06-27
updated: 2026-07-20
author: MoAI gap-analysis
priority: P3
phase: 6
parent: MASTER-PLAN-002
depends-on:
  - SPEC-AUTH-001
  - SPEC-NOTIFICATION-001
issue_number: TBD
language: ko
---

# SPEC-MESSAGE-001 — 쪽지(DM) 시스템 (Phase 6 / P3)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix message 모듈은 회원간 1:1 쪽지를 제공. SPEC-MODULE-BACKLOG-001에서 KEEP 분류. 커뮤니티 내 사적 소통 기능. 뉴버전의 알림 시스템(SPEC-NOTIFICATION-001)과 연동하여 새 쪽지 수신 알림을 제공한다.

---

## 1. Goal & Audience

### 1.1 Goal

**로그인 회원이 다른 회원에게 1:1 쪽지를 보내고 받을 수 있다**:

- 회원 닉네임 클릭 시 "쪽지 보내기" 버튼.
- 받은 쪽지함 / 보낸 쪽지함.
- 새 쪽지 수신 시 알림 센터에 알림 표시.
- 쪽지 삭제 (양측 독립적으로 삭제 가능).
- 차단된 사용자에게는 쪽지를 보낼 수 없음.
- 관리자가 쪽지 시스템 활성화/비활성화 설정.

### 1.2 Audience

- expert-backend agent — 쪽지 tRPC 라우터, 알림 연동
- expert-frontend agent — 쪽지함 UI, 작성 모달

### 1.3 Non-Goals

- 실시간 채팅 (WebSocket) — P3 후속 별도 SPEC
- 그룹 메시지 (멀티 수신자) — 범위 외
- 메시지 암호화 (E2E) — 범위 외

---

## 2. Requirements

### REQ-MSG-001: 쪽지 보내기

```
WHEN 사용자가 다른 회원 닉네임 클릭 후 "쪽지 보내기"를 선택하면
THE SYSTEM SHALL 수신자 닉네임이 자동 입력된 쪽지 작성 모달을 표시한다
WITH 제목 입력 필드, 내용 textarea (최대 2000자)
AND 보내기 버튼 클릭 시 서버에 저장하고 모달을 닫는다
AND 수신자에게 SPEC-NOTIFICATION-001 알림을 생성한다
AND 차단된 사용자에게 전송 시도 시 "해당 회원에게 쪽지를 보낼 수 없습니다" 오류를 반환한다
```

### REQ-MSG-002: 쪽지함 UI

```
THE SYSTEM SHALL /messages 라우트에 쪽지함 페이지를 제공한다
WITH 탭: 받은 쪽지함 / 보낸 쪽지함
AND 각 쪽지 목록: 상대방 닉네임, 제목, 수신일, 읽음 여부
AND 읽지 않은 쪽지는 굵은 글씨로 강조
AND 쪽지 클릭 시 내용 패널에 표시 (읽음 상태로 변경)
AND 쪽지 삭제 체크박스 + 일괄 삭제 버튼
```

### REQ-MSG-003: 새 쪽지 알림

```
WHEN 사용자가 새 쪽지를 수신하면
THE SYSTEM SHALL SPEC-NOTIFICATION-001 알림을 생성한다 (type: 'message')
AND 헤더 알림 아이콘에 미읽음 카운트를 표시한다
AND 알림 클릭 시 /messages?id={messageId} 로 이동한다
```

### REQ-MSG-004: 쪽지 허용 설정

```
THE SYSTEM SHALL 사용자 프로필 설정에서 "쪽지 수신 허용" 토글을 제공한다
WHEN 비허용으로 설정한 경우
THE SYSTEM SHALL 다른 사용자가 쪽지 보내기 시도 시 "해당 회원은 쪽지를 받지 않습니다" 오류를 반환한다
```

### REQ-MSG-005: 관리자 설정

```
THE SYSTEM SHALL 관리자 > 회원 설정에서 쪽지 시스템 활성화/비활성화 토글을 제공한다
AND 비활성화 시 /messages 접근 및 쪽지 보내기 기능이 비노출된다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-MSG-001 | 회원 A가 회원 B에게 쪽지 발송 시 B의 받은 쪽지함에 표시된다 |
| AC-MSG-002 | 새 쪽지 수신 시 헤더 알림 아이콘에 카운트가 표시된다 |
| AC-MSG-003 | 쪽지를 읽으면 읽음 상태로 변경되고 알림 카운트가 감소한다 |
| AC-MSG-004 | 쪽지 삭제 시 보낸 사람의 보낸 쪽지함에는 영향 없이 받은 사람 쪽지함에서만 삭제된다 |
| AC-MSG-005 | 쪽지 수신 비허용 회원에게 쪽지 시도 시 오류 메시지가 표시된다 |

---

## 4. DB 스키마

```prisma
model Message {
  id          Int       @id @default(autoincrement())
  senderId    Int
  receiverId  Int
  subject     String
  content     String    @db.Text
  readAt      DateTime?
  senderDel   Boolean   @default(false)  // 발신자 삭제 여부
  receiverDel Boolean   @default(false)  // 수신자 삭제 여부
  createdAt   DateTime  @default(now())
  sender      User      @relation("MessageSender", fields: [senderId], references: [id])
  receiver    User      @relation("MessageReceiver", fields: [receiverId], references: [id])
  @@index([receiverId, readAt])
  @@index([senderId])
}
```
