---
id: SPEC-RHYMIX-002
title: ASIS vs TOBE Gap Analysis - Remaining Implementation
version: 1.0.0
status: Planned
created: 2026-03-02
updated: 2026-03-02
author: taewo
priority: High
domain: RHYMIX-CONVERSION
related_specs:
  - SPEC-RHYMIX-001
lifecycle_level: spec-anchored
---

# SPEC-RHYMIX-002: ASIS vs TOBE Gap Analysis - Remaining Implementation

## Executive Summary

본 SPEC은 ASIS Rhymix PHP CMS와 TOBE Next.js 시스템 간의 기능 격차를 분석하고, 누락된 기능들의 구현을 계획합니다. ASIS 분석을 통해 30개의 관리자 메뉴와 200+ 설정 필드가 식별되었으며, 이 중 상당수가 TOBE 시스템에 아직 구현되지 않았습니다.

### Key Findings

- **Member Management**: 20+ 설정 필드 누락
- **Board Configuration**: 45+ 설정 필드 누락
- **Editor Settings**: 25+ 설정 필드 누락
- **Security Settings**: 12+ 설정 필드 누락
- **Points System**: 25+ 포인트 규칙 누락

---

## Environment

### System Context

- **ASIS System**: Rhymix PHP CMS at http://localhost/
- **TOBE System**: Next.js 16 at http://localhost:3000/
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth

### Constraints

- [CONSTRAINT-001] TOBE는 Next.js App Router 기반이어야 함
- [CONSTRAINT-002] 모든 설정은 Supabase에 저장되어야 함
- [CONSTRAINT-003] 기존 TOBE UI/UX 패턴을 유지해야 함
- [CONSTRAINT-004] 한국어 우선 지원, 다국어 확장 가능

---

## Assumptions

### Technical Assumptions

- [ASSUMPTION-001] Supabase RLS 정책이 올바르게 설정되어 있음
- [ASSUMPTION-002] 관리자 권한 시스템이 이미 구현되어 있음
- [ASSUMPTION-003] 기존 API 라우트들이 확장 가능함
- [ASSUMPTION-004] shadcn/ui 컴포넌트 라이브러리 사용 가능

### Business Assumptions

- [ASSUMPTION-005] 모든 ASIS 기능이 TOBE에 필요한 것은 아님
- [ASSUMPTION-006] 일부 기능은 Next.js 아키텍처에 맞게 재설계 필요
- [ASSUMPTION-007] 단계적 구현이 허용됨

---

## Requirements

### UC-001: 회원 관리 고급 설정

**Use Case**: 관리자가 회원 시스템의 세부 설정을 구성할 수 있다.

#### WHW-001: 회원 가입 설정

**WHEN** 관리자가 회원 설정 페이지에 접근하면
**THEN** 다음 설정들을 구성할 수 있어야 한다:
- 회원 가입 허용 여부 (예/아니오/URL 키 필요)
- URL 키 설정 (가입 URL 제한)
- 이메일 인증 필수 여부
- 인증 메일 만료 시간

#### WHW-002: 회원 필드 설정

**WHEN** 관리자가 회원 필드 설정을 구성하면
**THEN** 다음 필드들의 필수/선택 여부를 설정할 수 있어야 한다:
- 홈페이지 URL
- 블로그 URL
- 생년월일
- 메일링 수신 동의
- 쪽지 수신 설정

#### WHW-003: 닉네임 설정

**WHEN** 관리자가 닉네임 정책을 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 닉네임 변경 허용 여부
- 닉네임 변경 이력 기록
- 특수문자 허용 범위
- 띄어쓰기 허용 여부
- 중복 닉네임 허용 여부

#### WHW-004: 비밀번호 보안 설정

**WHEN** 관리자가 비밀번호 정책을 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 비밀번호 강도 (낮음/보통/높음)
- 해싱 알고리즘 선택 (argon2id/bcrypt/pbkdf2)
- 해싱 워크 팩터 (4-16)
- 자동 업그레이드 여부
- 비밀번호 변경 시 다른 세션 무효화

#### WHW-005: 비밀번호 재설정 방식

**WHEN** 관리자가 비밀번호 재설정을 구성하면
**THEN** 다음 방식 중 선택할 수 있어야 한다:
- 재설정 링크 전달 (권장)
- 임시 비밀번호 전달

---

### UC-002: 회원 추가/편집 폼

**Use Case**: 관리자가 회원 정보를 직접 추가하거나 편집할 수 있다.

#### WHW-010: 회원 추가 폼

**WHEN** 관리자가 새 회원을 추가하면
**THEN** 다음 필드를 입력할 수 있어야 한다:
- 아이디 (필수)
- 이메일 주소 (필수)
- 비밀번호 (필수)
- 이름 (필수)
- 닉네임 (필수)
- 홈페이지 URL (선택)
- 블로그 URL (선택)
- 생년월일 (선택)
- 메일링 수신 동의 (예/아니오)
- 쪽지 수신 설정 (전체/친구만/거부)
- 관리자 여부 (예/아니오)
- 관리자 메모
- 회원 그룹 선택

#### WHW-011: 회원 편집 폼

**WHEN** 관리자가 기존 회원을 편집하면
**THEN** 다음 추가 필드를 수정할 수 있어야 한다:
- 회원 상태 (승인/거부/미인증)
- 거부 사유
- 계정 제한 일자
- 제한 사유

---

### UC-003: 게시판 고급 설정

**Use Case**: 관리자가 게시판의 세부 동작을 구성할 수 있다.

#### WHW-020: 게시판 기본 설정

**WHEN** 관리자가 게시판 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 모듈 분류
- 레이아웃 선택
- 스킨 선택
- 모바일 뷰 사용 여부
- 모바일 레이아웃
- 모바일 스킨
- 설명
- 상단 내용
- 하단 내용

#### WHW-021: 게시판 콘텐츠 설정

**WHEN** 관리자가 콘텐츠 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 히스토리 추적 (미사용/사용/흔적만)
- 추천 기능 (사용/공개/미사용)
- 비추천 기능 (사용/공개/미사용)
- 동일 IP 추천 허용
- 추천 취소 허용
- 비회원 추천 허용
- 신고 기능 설정
- 신고 알림 대상

#### WHW-022: 댓글 설정

**WHEN** 관리자가 댓글 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 댓글 수 (페이지당)
- 댓글 페이지 수
- 대댓글 최대 깊이
- 기본 페이지 (첫/마지막)
- 댓글 검증 사용

#### WHW-023: 게시판 권한 설정

**WHEN** 관리자가 권한을 구성하면
**THEN** 다음 권한을 그룹별로 설정할 수 있어야 한다:
- 목록 보기
- 글 열람
- 글 작성
- 댓글 작성
- 추천인 보기
- 수정 내역 보기
- 상담글 열람
- 접근 권한
- 관리 권한

---

### UC-004: 에디터 설정

**Use Case**: 관리자가 WYSIWYG 에디터의 동작을 구성할 수 있다.

#### WHW-030: 에디터 기본 설정

**WHEN** 관리자가 에디터 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 에디터 스킨 (CKEditor/SimpleEditor/Textarea)
- 컬러셋 (Moono/Moono Dark/Moono Lisa)
- 에디터 높이
- 툴바 (기본/간단)
- 툴바 숨김

#### WHW-031: 폰트 설정

**WHEN** 관리자가 폰트 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 본문 폰트 (20+ 폰트 옵션)
- 폰트 크기
- 줄 간격
- 문단 간격
- 줄바꿈 방식

#### WHW-032: 자동 저장 및 기능

**WHEN** 관리자가 자동 기능을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 자동 저장 (예/아니오)
- 자동 다크 모드 (예/아니오)
- HTML 허용 (예/아니오)
- 미디어 자동 삽입 (이미지/오디오/동영상)
- 삽입 위치

---

### UC-005: 포인트 시스템

**Use Case**: 관리자가 포인트 시스템을 구성할 수 있다.

#### WHW-040: 포인트 기본 설정

**WHEN** 관리자가 포인트 시스템을 활성화하면
**THEN** 다음을 설정할 수 있어야 한다:
- 포인트 모듈 켜기/끄기
- 포인트 이름
- 최고 레벨
- 레벨 아이콘

#### WHW-041: 포인트 제한

**WHEN** 관리자가 포인트 제한을 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 다운로드 금지 (포인트 부족 시)
- 글 열람 금지 (포인트 부족 시)

#### WHW-042: 포인트 부여 규칙

**WHEN** 관리자가 포인트 규칙을 설정하면
**THEN** 다음 각 항목에 포인트를 할당할 수 있어야 한다:
- 회원가입
- 로그인
- 글 작성 (삭제 시 회수 옵션)
- 댓글 작성 (삭제 시 회수 옵션, 제한)
- 파일 업로드 (삭제 시 회수 옵션)
- 파일 다운로드
- 글 열람 (공지 제외, 제한)
- 추천/비추천 (작성자/추천자 각각)
- 댓글 추천/비추천 (작성자/추천자 각각)

#### WHW-043: 레벨-그룹 연동

**WHEN** 관리자가 레벨 그룹 연동을 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 그룹 연동 방식 (교체/추가)
- 포인트 감소 처리 (유지/강등)
- 레벨별 그룹 할당 (1-30 레벨)

---

### UC-006: 보안 설정

**Use Case**: 관리자가 시스템 보안을 구성할 수 있다.

#### WHW-050: 미디어 필터

**WHEN** 관리자가 미디어 필터를 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 외부 멀티미디어 허용 도메인
- 허용된 HTML class 목록

#### WHW-051: 관리자 접근 제어

**WHEN** 관리자가 접근 제어를 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 관리자 로그인 허용 IP
- 관리자 로그인 금지 IP
- 로봇 user-agent 목록

#### WHW-052: 세션 보안

**WHEN** 관리자가 세션 보안을 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 자동 로그인 유지 시간
- 보안키 갱신
- 세션 SSL 사용
- 쿠키 SSL 사용
- CSRF 토큰 검사
- nofollow 사용
- HttpOnly 쿠키
- SameSite 속성 (Strict/Lax/None)
- X-Frame-Options (Deny/SameOrigin)
- X-Content-Type-Options (nosniff)

---

### UC-007: 알림 시스템

**Use Case**: 관리자가 알림 시스템을 구성할 수 있다.

#### WHW-060: 알림 유형 설정

**WHEN** 관리자가 알림 설정을 구성하면
**THEN** 다음 8가지 유형에 대해 채널별 활성화할 수 있어야 한다:
- 댓글 알림
- 대댓글 알림
- 멘션 알림
- 추천 알림
- 스크랩 알림
- 쪽지 알림
- 관리자 콘텐츠 알림
- 커스텀 알림

#### WHW-061: 알림 채널

**WHEN** 관리자가 알림 채널을 설정하면
**THEN** 각 유형에 대해 다음 채널을 활성화할 수 있어야 한다:
- 웹 알림
- 메일 알림
- SMS 알림
- 푸시 알림

#### WHW-062: 알림 표시 설정

**WHEN** 관리자가 알림 표시를 설정하면
**THEN** 다음을 구성할 수 있어야 한다:
- 표시 여부 (모두/없음/PC만/모바일만)
- 항상 표시
- 사용자 설정 목록 표시
- 사용자 알림 설정 허용
- SMS 전 푸시 시도
- 문서 열람 시 알림 삭제

---

### UC-008: 통합 메일/SMS/푸시 관리

**Use Case**: 관리자가 메일, SMS, 푸시 알림 발송을 구성할 수 있다.

#### WHW-070: 발송 설정

**WHEN** 관리자가 발송 설정을 구성하면
**THEN** 다음을 설정할 수 있어야 한다:
- 기본 발송 방법
- 보낸이 정보

#### WHW-071: 발송 내역

**WHEN** 관리자가 발송 내역 설정을 구성하면
**THEN** 다음 로그를 기록할 수 있어야 한다:
- 메일 발송 내역
- 메일 오류 내역
- SMS 발송 내역
- SMS 오류 내역
- 푸시 발송 내역
- 푸시 오류 내역

---

## Specifications

### Database Schema Extensions

#### Member Settings Table

```sql
CREATE TABLE member_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Registration settings
  enable_join TEXT CHECK (enable_join IN ('yes', 'no', 'url_key')),
  enable_join_key TEXT,
  enable_confirm BOOLEAN DEFAULT true,
  authmail_expires INTEGER DEFAULT 86400,

  -- Profile settings
  member_profile_view BOOLEAN DEFAULT true,

  -- Nickname settings
  allow_nickname_change BOOLEAN DEFAULT true,
  update_nickname_log BOOLEAN DEFAULT true,
  nickname_symbols TEXT CHECK (nickname_symbols IN ('yes', 'no', 'custom')),
  nickname_symbols_allowed_list TEXT,
  nickname_spaces BOOLEAN DEFAULT true,
  allow_duplicate_nickname BOOLEAN DEFAULT false,

  -- Password settings
  password_strength TEXT CHECK (password_strength IN ('low', 'medium', 'high')),
  password_hashing_algorithm TEXT DEFAULT 'argon2id',
  password_hashing_work_factor INTEGER DEFAULT 12,
  password_hashing_auto_upgrade BOOLEAN DEFAULT true,
  password_change_invalidate_other_sessions BOOLEAN DEFAULT true,
  password_reset_method TEXT CHECK (password_reset_method IN ('link', 'random')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Board Settings Table Extensions

```sql
ALTER TABLE boards ADD COLUMN IF NOT EXISTS
  -- Content settings
  use_history TEXT CHECK (use_history IN ('none', 'use', 'trace')),
  use_vote_up TEXT CHECK (use_vote_up IN ('use', 'public', 'none')),
  use_vote_down TEXT CHECK (use_vote_down IN ('use', 'public', 'none')),
  allow_vote_from_same_ip BOOLEAN DEFAULT false,
  allow_vote_cancel BOOLEAN DEFAULT true,
  allow_vote_non_member BOOLEAN DEFAULT false,

  -- Comment settings
  comment_count INTEGER DEFAULT 50,
  comment_page_count INTEGER DEFAULT 10,
  max_thread_depth INTEGER DEFAULT 7,
  default_page TEXT CHECK (default_page IN ('first', 'last')),
  use_comment_validation BOOLEAN DEFAULT true,

  -- Editor settings
  editor_skin TEXT DEFAULT 'ckeditor',
  editor_height INTEGER DEFAULT 300,
  editor_toolbar TEXT CHECK (editor_toolbar IN ('default', 'simple')),
  content_font TEXT,
  content_font_size TEXT,
  enable_autosave BOOLEAN DEFAULT true,
  auto_dark_mode BOOLEAN DEFAULT false,
  allow_html BOOLEAN DEFAULT true,

  -- RSS settings
  open_rss TEXT CHECK (open_rss IN ('full', 'summary', 'none')),
  open_total_feed BOOLEAN DEFAULT false,
  feed_description TEXT,
  feed_copyright TEXT;
```

#### Point Rules Table

```sql
CREATE TABLE point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  action TEXT NOT NULL UNIQUE,
  point INTEGER DEFAULT 0,
  revert_on_delete BOOLEAN DEFAULT false,
  limit_count INTEGER,
  except_notice BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rules
INSERT INTO point_rules (name, action, point) VALUES
  ('회원가입', 'signup', 100),
  ('로그인', 'login', 10),
  ('글 작성', 'insert_document', 50),
  ('댓글 작성', 'insert_comment', 10),
  ('파일 업로드', 'upload_file', 5),
  ('파일 다운로드', 'download_file', -5),
  ('글 열람', 'read_document', 0),
  ('추천받음', 'voted', 10),
  ('비추천받음', 'blamed', -5),
  ('추천함', 'voter', 0),
  ('비추천함', 'blamer', 0);
```

#### Notification Settings Table

```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per-type settings (JSONB for flexibility)
  comment JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  comment_comment JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  mention JSONB DEFAULT '{"web": true, "mail": true, "sms": false, "push": false}',
  vote JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  scrap JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  message JSONB DEFAULT '{"web": true, "mail": true, "sms": false, "push": true}',
  admin_content JSONB DEFAULT '{"web": true, "mail": true, "sms": true, "push": true}',
  custom JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',

  -- Display settings
  display_use TEXT CHECK (display_use IN ('all', 'none', 'pc', 'mobile')),
  always_display BOOLEAN DEFAULT true,
  user_config_list BOOLEAN DEFAULT true,
  user_notify_setting BOOLEAN DEFAULT true,
  push_before_sms BOOLEAN DEFAULT true,
  document_read_delete BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Security Settings Table

```sql
CREATE TABLE security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Media filter
  mediafilter_whitelist TEXT,
  mediafilter_classes TEXT,
  robot_user_agents TEXT,

  -- Admin access control
  admin_allowed_ip TEXT,
  admin_denied_ip TEXT,

  -- Session security
  autologin_lifetime INTEGER DEFAULT 604800,
  autologin_refresh BOOLEAN DEFAULT false,
  use_session_ssl BOOLEAN DEFAULT true,
  use_cookies_ssl BOOLEAN DEFAULT true,
  check_csrf_token BOOLEAN DEFAULT true,
  use_nofollow BOOLEAN DEFAULT true,
  use_httponly BOOLEAN DEFAULT true,
  use_samesite TEXT CHECK (use_samesite IN ('Strict', 'Lax', 'None')),
  x_frame_options TEXT CHECK (x_frame_options IN ('DENY', 'SAMEORIGIN')),
  x_content_type_options TEXT CHECK (x_content_type_options IN ('nosniff')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Traceability

| Requirement ID | Use Case | Sprint | Priority |
|----------------|----------|--------|----------|
| WHW-001 ~ WHW-005 | UC-001 | Sprint 1 | High |
| WHW-010 ~ WHW-011 | UC-002 | Sprint 1 | High |
| WHW-020 ~ WHW-023 | UC-003 | Sprint 2 | High |
| WHW-030 ~ WHW-032 | UC-004 | Sprint 2 | Medium |
| WHW-040 ~ WHW-043 | UC-005 | Sprint 3 | Medium |
| WHW-050 ~ WHW-052 | UC-006 | Sprint 3 | High |
| WHW-060 ~ WHW-062 | UC-007 | Sprint 4 | Medium |
| WHW-070 ~ WHW-071 | UC-008 | Sprint 4 | Low |

---

## References

- ASIS Live Analysis: `.moai/specs/SPEC-RHYMIX-001/asis-live-analysis.md`
- ASIS vs TOBE Comparison: `.moai/specs/SPEC-RHYMIX-001/asis-tobe-comparison.md`
- SPEC-RHYMIX-001: `.moai/specs/SPEC-RHYMIX-001/spec.md`
