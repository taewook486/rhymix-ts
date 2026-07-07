---
id: SPEC-CAPTCHA-001
title: CAPTCHA + 이용약관 동의 (가입/로그인 스팸 방지)
version: 1.0.0
status: draft
created: 2026-06-27
updated: 2026-06-27
author: MoAI gap-analysis
priority: P1
phase: 4
parent: MASTER-PLAN-002
depends-on:
  - SPEC-AUTH-001
issue_number: TBD
language: ko
---

# SPEC-CAPTCHA-001 — CAPTCHA + 이용약관 동의 (Phase 4 / P1)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. Gap Analysis 결과, 현재 뉴버전 회원가입 폼에 CAPTCHA가 없고 이용약관 동의 단계가 없음. 레거시 Rhymix는 가입/로그인 시 보안 문자와 필수/선택 약관 동의를 지원함. 서비스 운영 시 개인정보 처리방침 동의는 법적 요건이며, CAPTCHA는 봇 가입 방지의 기본 수단.

---

## 1. Goal & Audience

### 1.1 Goal

**회원가입 시 이용약관 동의 단계와 봇 방지 CAPTCHA가 적용된다**:

- 이용약관 동의: 가입 폼에 필수/선택 약관 동의 체크박스를 추가한다.
- 약관 내용은 관리자가 관리자 패널에서 편집할 수 있다.
- hCaptcha 또는 Cloudflare Turnstile 중 하나를 CAPTCHA로 사용한다 (기본: Turnstile - 무료).
- 관리자가 사이트 설정에서 CAPTCHA 활성화/비활성화 및 사이트 키를 설정한다.
- 로그인 시 N회 실패 후 CAPTCHA를 요구한다 (기본: 5회).

### 1.2 Audience

- expert-frontend agent — 가입 폼 약관 체크박스 UI, CAPTCHA 위젯 통합
- expert-backend agent — 서버사이드 CAPTCHA 토큰 검증, 약관 저장 API
- 운영자 — 약관 내용 편집, CAPTCHA 키 설정

### 1.3 Non-Goals

- 이메일/SMS 2단계 인증 — SPEC-ADMIN-2FA-OTP-001 범위
- 이미지 CAPTCHA (자체 구현) — 외부 서비스 활용으로 대체

---

## 2. Requirements

### REQ-CAPTCHA-001: 이용약관 동의 UI

```
WHEN 사용자가 /signup 페이지에 접근하면
THE SYSTEM SHALL 가입 폼 하단에 다음을 표시한다:
  - "이용약관 (필수)" 체크박스 + "약관 보기" 링크
  - "개인정보 처리방침 (필수)" 체크박스 + "약관 보기" 링크
  - 선택 동의 항목 (관리자 설정에 따라 0~N개)
AND 필수 항목 미동의 시 회원가입 버튼이 비활성화된다
```

### REQ-CAPTCHA-002: 약관 내용 관리

```
THE SYSTEM SHALL 관리자 > 회원 설정 > 약관 관리 페이지를 제공한다
WITH 약관 유형: terms(이용약관), privacy(개인정보처리방침), custom(추가 선택약관)
AND 각 약관에 대해 제목, 내용(리치 텍스트), 필수여부, 활성화 여부 설정 가능
AND DB에 저장하고 API로 클라이언트에 제공한다
```

### REQ-CAPTCHA-003: Cloudflare Turnstile CAPTCHA

```
WHEN 관리자가 CAPTCHA를 활성화하면
THE SYSTEM SHALL 회원가입 폼 하단에 Turnstile 위젯을 렌더한다
AND 폼 제출 시 cf-turnstile-response 토큰을 서버에 전송한다
AND 서버에서 Cloudflare siteverify API로 토큰을 검증한다
AND 검증 실패 시 가입을 거부하고 "로봇 확인에 실패했습니다" 오류를 반환한다
```

### REQ-CAPTCHA-004: 로그인 실패 시 CAPTCHA

```
WHEN 사용자가 로그인을 5회 연속 실패하면
THE SYSTEM SHALL 로그인 폼에 CAPTCHA 위젯을 추가로 표시한다
AND 이후 로그인 시도마다 CAPTCHA 검증을 요구한다
AND 로그인 성공 시 실패 카운터를 초기화한다
```

### REQ-CAPTCHA-005: 관리자 설정

```
THE SYSTEM SHALL 관리자 > 보안 설정 > CAPTCHA 섹션에서:
  - CAPTCHA 활성화 토글 (가입/로그인 각각)
  - Turnstile Site Key / Secret Key 입력
  - 로그인 실패 허용 횟수 (기본 5)
을 제공한다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-CAPTCHA-001 | 가입 폼에 이용약관/개인정보처리방침 체크박스가 표시된다 |
| AC-CAPTCHA-002 | 필수 약관 미체크 시 가입 버튼 클릭이 동작하지 않는다 |
| AC-CAPTCHA-003 | CAPTCHA 활성화 시 가입 폼에 Turnstile 위젯이 표시된다 |
| AC-CAPTCHA-004 | CAPTCHA 미완료 상태로 제출 시 서버에서 거부된다 |
| AC-CAPTCHA-005 | 로그인 5회 실패 후 CAPTCHA가 로그인 폼에 표시된다 |
| AC-CAPTCHA-006 | 관리자가 약관 내용을 수정하면 가입 페이지에 반영된다 |

---

## 4. Technical Approach

### 패키지

- `@cloudflare/turnstile-types` (클라이언트 타입)
- Turnstile 서버 검증: `fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', ...)`

### DB 스키마

```prisma
model Terms {
  id        Int      @id @default(autoincrement())
  type      String   // 'terms' | 'privacy' | 'custom'
  title     String
  content   String   @db.Text
  required  Boolean  @default(true)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserTermsConsent {
  id        Int      @id @default(autoincrement())
  userId    Int
  termsId   Int
  agreedAt  DateTime @default(now())
}
```
