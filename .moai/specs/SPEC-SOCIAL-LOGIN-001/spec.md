---
id: SPEC-SOCIAL-LOGIN-001
title: 소셜 로그인 통합 (카카오 / 구글 OAuth2)
version: 1.0.0
status: completed
created: 2026-06-27
updated: 2026-07-25
author: MoAI gap-analysis
priority: P1
phase: 4
parent: MASTER-PLAN-002
depends-on:
  - SPEC-AUTH-001
issue_number: TBD
language: ko
---

# SPEC-SOCIAL-LOGIN-001 — 소셜 로그인 통합 (Phase 4 / P1)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. Gap Analysis 결과, 레거시 Rhymix는 카카오/네이버/구글/페이스북 소셜 로그인을 지원하나 뉴버전에는 없음. 한국 서비스에서 소셜 로그인은 사실상 필수. 뉴버전은 Auth.js(NextAuth.js v5) 기반으로, OAuth Provider 추가가 Auth.js 패턴으로 구현 가능하다.
- 2026-07-25: status를 completed로 갱신. REQ-SOCIAL-001~006 전부 구현 확인 (마지막 REQ-SOCIAL-005 관리자 설정 기반 동적 자격증명 커밋 2b4f84a).

---

## 1. Goal & Audience

### 1.1 Goal

**로그인 페이지에서 카카오 및 구글 계정으로 로그인/가입이 가능하다**:

- 로그인 페이지에 "카카오로 로그인", "구글로 로그인" 버튼을 추가한다.
- 신규 소셜 가입 시 닉네임/이메일 정보를 소셜 계정에서 자동 수집한다.
- 기존 이메일 계정과 소셜 계정을 연결(account linking)할 수 있다.
- 관리자가 사이트 설정에서 소셜 로그인 허용 여부 및 API 키를 입력한다.
- 소셜 가입 사용자도 일반 회원과 동일한 권한 그룹이 적용된다.

### 1.2 Audience

- expert-backend agent — Auth.js Provider 설정, 계정 연결 로직
- expert-frontend agent — 로그인/가입 페이지 소셜 버튼 UI, 계정 연결 설정 UI
- 운영자 — 관리자 설정에서 OAuth Client ID/Secret 입력

### 1.3 Non-Goals

- 네이버 로그인 — P2 (네이버 Developer 심사 필요)
- 페이스북/애플 로그인 — P3
- 소셜 계정 연동 해제 — P2 후속

---

## 2. Requirements

### REQ-SOCIAL-001: 카카오 OAuth2

```
THE SYSTEM SHALL Auth.js KakaoProvider를 사용해 카카오 OAuth2를 구현한다
WITH 스코프: profile_nickname, account_email
AND 로그인 페이지에 "카카오 계정으로 시작하기" 버튼을 배치한다
```

### REQ-SOCIAL-002: 구글 OAuth2

```
THE SYSTEM SHALL Auth.js GoogleProvider를 사용해 구글 OAuth2를 구현한다
WITH 스코프: openid, email, profile
AND 로그인 페이지에 "Google로 시작하기" 버튼을 배치한다
```

### REQ-SOCIAL-003: 신규 소셜 가입 플로우

```
WHEN 소셜 로그인으로 신규 사용자가 유입되면
IF 닉네임이 이미 사용 중이면
  THE SYSTEM SHALL 닉네임 수정 화면을 표시하고 수정 후 가입을 완료한다
ELSE
  THE SYSTEM SHALL 소셜 계정 정보로 자동 가입 처리한다
AND 가입 완료 시 이메일 인증 없이 즉시 로그인 상태가 된다
```

### REQ-SOCIAL-004: 계정 연결

```
WHEN 기존 이메일 로그인 사용자가 동일 이메일의 소셜 계정으로 로그인 시도하면
THE SYSTEM SHALL "이미 동일 이메일로 가입된 계정이 있습니다. 연결하시겠습니까?" 안내를 표시한다
AND 사용자 동의 시 두 계정을 연결하고 소셜 로그인도 사용 가능하게 한다
```

### REQ-SOCIAL-005: 관리자 설정

```
THE SYSTEM SHALL 관리자 > 회원 설정 > 소셜 로그인 섹션에서:
  - 카카오 Client ID / Client Secret 입력 필드
  - 구글 Client ID / Client Secret 입력 필드
  - 각 소셜 로그인 활성화/비활성화 토글
을 제공한다
AND 비활성화 시 로그인 페이지에서 해당 버튼을 숨긴다
```

### REQ-SOCIAL-006: DB 스키마 (Account 테이블)

```
THE SYSTEM SHALL Prisma Account 모델(Auth.js 표준)을 사용한다:
  provider: 'kakao' | 'google'
  providerAccountId: string
  userId: foreign key to User
AND 한 User에 여러 Account가 연결될 수 있다 (1:N)
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-SOCIAL-001 | 로그인 페이지에 카카오/구글 버튼이 표시된다 |
| AC-SOCIAL-002 | 카카오 버튼 클릭 → 카카오 인증 → 신규 사용자 자동 가입 → 메인 페이지 이동 |
| AC-SOCIAL-003 | 구글 버튼 클릭 → 구글 인증 → 신규 사용자 자동 가입 → 메인 페이지 이동 |
| AC-SOCIAL-004 | 관리자가 카카오 비활성화 시 로그인 페이지에서 카카오 버튼이 사라진다 |
| AC-SOCIAL-005 | 동일 이메일 기존 계정과 계정 연결이 동작한다 |
| AC-SOCIAL-006 | 소셜 가입 사용자가 글쓰기/댓글 작성이 가능하다 (일반 회원 권한) |

---

## 4. Technical Approach

### Auth.js Provider 추가

```typescript
// apps/web/server/auth.ts
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'

providers: [
  KakaoProvider({
    clientId: env.KAKAO_CLIENT_ID,
    clientSecret: env.KAKAO_CLIENT_SECRET,
  }),
  GoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  }),
]
```

### 환경 변수

```
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### DB 마이그레이션

Auth.js 표준 `Account` 테이블이 이미 존재하면 추가 마이그레이션 불필요. 없으면 추가.
