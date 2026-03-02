# Sprint 3 Execution Plan - SPEC-RHYMIX-002

## Plan Summary

Sprint 3는 포인트 시스템(UC-005)과 보안 설정(UC-006) 구현에 집중합니다. 총 7개의 WHW 요구사항을 구현하며, 포인트 기본/제한/규칙/레벨-그룹 연동 설정(4개 WHW)과 미디어 필터/접근 제어/세션 보안 설정(3개 WHW)을 포함합니다.

### Key Context from Sprint 1 & 2

Sprint 1과 2에서 확립된 패턴:
- `member_settings` 테이블 패턴 (단일 행 설정 테이블)
- `editor_settings` 테이블 패턴 (RLS 정책)
- `app/actions/admin/*-settings.ts` 서버 액션 패턴
- `lib/validations/*-settings.ts` Zod 검증 패턴
- `app/(admin)/admin/settings/*/page.tsx` 설정 페이지 UI 패턴
- React Hook Form + Zod + Debounced Auto-save 패턴

---

## Requirements Analysis

### Sprint 3: Points System & Security Settings

| WHW ID | Requirement | Complexity | Methodology | Effort |
|--------|------------|------------|-------------|--------|
| WHW-040 | 포인트 기본 설정 (모듈 켜기/끄기, 포인트 이름, 최고 레벨, 레벨 아이콘) | Low | TDD (NEW) | 2h |
| WHW-041 | 포인트 제한 (다운로드 금지, 글 열람 금지) | Low | TDD (NEW) | 2h |
| WHW-042 | 포인트 부여 규칙 (가입, 로그인, 글 작성, 댓글, 파일, 추천 등 20+ 규칙) | High | TDD (NEW) | 6h |
| WHW-043 | 레벨-그룹 연동 (그룹 연동 방식, 포인트 감소 처리, 레벨별 그룹 할당 1-30) | High | TDD (NEW) | 5h |
| WHW-050 | 미디어 필터 (외부 멀티미디어 허용 도메인, 허용된 HTML class 목록) | Medium | TDD (NEW) | 3h |
| WHW-051 | 관리자 접근 제어 (관리자 로그인 허용 IP, 금지 IP, 로봇 user-agent 목록) | Medium | TDD (NEW) | 3h |
| WHW-052 | 세션 보안 (자동 로그인 유지 시간, 보안키 갱신, SSL, CSRF, 쿠키 보안 등) | High | TDD (NEW) | 4h |

**Total Sprint 3 Estimate**: 25 hours (~3-4 days)

---

## Database Schema Design

### 1. point_settings Table (WHW-040, WHW-041)

```sql
CREATE TABLE public.point_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-040: 포인트 기본 설정
  is_enabled BOOLEAN DEFAULT TRUE,
  point_name TEXT DEFAULT '포인트',
  max_level INTEGER DEFAULT 30 CHECK (max_level >= 1 AND max_level <= 100),
  level_icon_type TEXT DEFAULT 'default' CHECK (level_icon_type IN ('default', 'custom', 'none')),
  level_icon_path TEXT,

  -- WHW-041: 포인트 제한
  disable_download_on_low_point BOOLEAN DEFAULT FALSE,
  disable_read_on_low_point BOOLEAN DEFAULT FALSE,
  min_point_for_download INTEGER DEFAULT 0,
  min_point_for_read INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT point_settings_single_row CHECK (id IS NOT NULL)
);

-- RLS Policies
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Point settings are readable by all authenticated users"
  ON public.point_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage point settings"
  ON public.point_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index
CREATE INDEX idx_point_settings_id ON public.point_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_point_settings_updated_at
  BEFORE UPDATE ON public.point_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default data
INSERT INTO public.point_settings (
  is_enabled, point_name, max_level, level_icon_type
) VALUES (
  TRUE, '포인트', 30, 'default'
) ON CONFLICT DO NOTHING;
```

### 2. point_rules Table (WHW-042)

```sql
CREATE TABLE public.point_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Rule identification
  action TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Point configuration
  point INTEGER DEFAULT 0,
  revert_on_delete BOOLEAN DEFAULT FALSE,

  -- Limits
  daily_limit INTEGER DEFAULT NULL,
  per_content_limit INTEGER DEFAULT NULL,

  -- Exceptions
  except_notice BOOLEAN DEFAULT FALSE,
  except_admin BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Point rules are readable by all authenticated users"
  ON public.point_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage point rules"
  ON public.point_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_point_rules_action ON public.point_rules(action);
CREATE INDEX idx_point_rules_is_active ON public.point_rules(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_point_rules_updated_at
  BEFORE UPDATE ON public.point_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default point rules (WHW-042)
INSERT INTO public.point_rules (action, name, point, revert_on_delete, description) VALUES
  -- 회원가입
  ('signup', '회원가입', 100, FALSE, '회원가입 시 포인트 부여'),
  ('signup_referred', '추천인 회원가입', 100, FALSE, '추천인이 회원가입한 경우'),

  -- 로그인
  ('login', '로그인', 10, FALSE, '일일 로그인 포인트'),

  -- 글 작성
  ('insert_document', '글 작성', 50, TRUE, '게시글 작성'),
  ('delete_document', '글 삭제', -50, FALSE, '게시글 삭제 (회수)'),

  -- 댓글
  ('insert_comment', '댓글 작성', 10, TRUE, '댓글 작성'),
  ('delete_comment', '댓글 삭제', -10, FALSE, '댓글 삭제 (회수)'),

  -- 파일
  ('upload_file', '파일 업로드', 5, TRUE, '파일 업로드'),
  ('download_file', '파일 다운로드', -5, FALSE, '파일 다운로드'),
  ('delete_file', '파일 삭제', -5, FALSE, '파일 삭제 (회수)'),

  -- 열람
  ('read_document', '글 열람', 0, FALSE, '게시글 열람'),

  -- 추천/비추천 (작성자)
  ('voted', '추천받음', 10, FALSE, '작성한 글이 추천받음'),
  ('blamed', '비추천받음', -5, FALSE, '작성한 글이 비추천받음'),

  -- 추천/비추천 (추천자)
  ('voter', '추천함', 0, FALSE, '다른 글을 추천함'),
  ('blamer', '비추천함', 0, FALSE, '다른 글을 비추천함'),

  -- 댓글 추천
  ('comment_voted', '댓글 추천받음', 5, FALSE, '작성한 댓글이 추천받음'),
  ('comment_blamed', '댓글 비추천받음', -3, FALSE, '작성한 댓글이 비추천받음'),

  -- 스크랩
  ('scrap', '스크랩', 0, FALSE, '게시글 스크랩'),

  -- 신고
  ('report', '신고함', 0, FALSE, '콘텐츠 신고'),
  ('reported', '신고당함', -20, FALSE, '콘텐츠가 신고당함')

ON CONFLICT (action) DO NOTHING;
```

### 3. level_group_mapping Table (WHW-043)

```sql
CREATE TABLE public.level_group_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-043: 레벨-그룹 연동 설정
  group_sync_mode TEXT DEFAULT 'replace' CHECK (group_sync_mode IN ('replace', 'add')),
  point_decrease_mode TEXT DEFAULT 'keep' CHECK (point_decrease_mode IN ('keep', 'demote')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT level_group_mapping_single_row CHECK (id IS NOT NULL)
);

-- RLS Policies
ALTER TABLE public.level_group_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level group mapping readable by all authenticated"
  ON public.level_group_mapping FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage level group mapping"
  ON public.level_group_mapping FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Default data
INSERT INTO public.level_group_mapping (group_sync_mode, point_decrease_mode)
VALUES ('replace', 'keep') ON CONFLICT DO NOTHING;

-- Level-specific group assignments (1-30)
CREATE TABLE public.level_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 100),
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(level)
);

ALTER TABLE public.level_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level groups readable by all authenticated"
  ON public.level_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage level groups"
  ON public.level_groups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_level_groups_level ON public.level_groups(level);
```

### 4. security_settings Table (WHW-050, WHW-051, WHW-052)

```sql
CREATE TABLE public.security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-050: 미디어 필터
  mediafilter_whitelist TEXT DEFAULT 'youtube.com, vimeo.com, soundcloud.com',
  mediafilter_classes TEXT DEFAULT '',
  robot_user_agents TEXT DEFAULT 'googlebot, bingbot, slurp, daumoa',

  -- WHW-051: 관리자 접근 제어
  admin_allowed_ip TEXT DEFAULT '',
  admin_denied_ip TEXT DEFAULT '',

  -- WHW-052: 세션 보안
  autologin_lifetime INTEGER DEFAULT 604800 CHECK (autologin_lifetime >= 0),
  autologin_refresh BOOLEAN DEFAULT FALSE,
  use_session_ssl BOOLEAN DEFAULT TRUE,
  use_cookies_ssl BOOLEAN DEFAULT TRUE,
  check_csrf_token BOOLEAN DEFAULT TRUE,
  use_nofollow BOOLEAN DEFAULT TRUE,
  use_httponly BOOLEAN DEFAULT TRUE,
  use_samesite TEXT DEFAULT 'Lax' CHECK (use_samesite IN ('Strict', 'Lax', 'None')),
  x_frame_options TEXT DEFAULT 'SAMEORIGIN' CHECK (x_frame_options IN ('DENY', 'SAMEORIGIN')),
  x_content_type_options TEXT DEFAULT 'nosniff',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT security_settings_single_row CHECK (id IS NOT NULL)
);

-- RLS Policies
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security settings"
  ON public.security_settings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can manage security settings"
  ON public.security_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index
CREATE INDEX idx_security_settings_id ON public.security_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default data
INSERT INTO public.security_settings (
  mediafilter_whitelist,
  robot_user_agents,
  autologin_lifetime,
  use_session_ssl,
  use_cookies_ssl,
  check_csrf_token,
  use_nofollow,
  use_httponly,
  use_samesite,
  x_frame_options,
  x_content_type_options
) VALUES (
  'youtube.com, vimeo.com, soundcloud.com',
  'googlebot, bingbot, slurp, daumoa',
  604800,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  'Lax',
  'SAMEORIGIN',
  'nosniff'
) ON CONFLICT DO NOTHING;
```

### 5. profiles Table Extensions

```sql
-- Add point and level columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS point INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_profiles_point ON public.profiles(point DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);
```

### 6. point_logs Table (Audit Trail)

```sql
CREATE TABLE public.point_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  point INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point logs"
  ON public.point_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all point logs"
  ON public.point_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert point logs"
  ON public.point_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_point_logs_user_id ON public.point_logs(user_id);
CREATE INDEX idx_point_logs_created_at ON public.point_logs(created_at DESC);
CREATE INDEX idx_point_logs_action ON public.point_logs(action);
```

---

## TypeScript Interface Definitions

### PointSettings Interface

```typescript
// types/point-settings.ts

export interface PointSettings {
  id: string
  is_enabled: boolean
  point_name: string
  max_level: number
  level_icon_type: 'default' | 'custom' | 'none'
  level_icon_path: string | null
  disable_download_on_low_point: boolean
  disable_read_on_low_point: boolean
  min_point_for_download: number
  min_point_for_read: number
  created_at: string
  updated_at: string
}

export type PointSettingsUpdate = Partial<
  Omit<PointSettings, 'id' | 'created_at' | 'updated_at'>
>
```

### PointRule Interface

```typescript
// types/point-rule.ts

export interface PointRule {
  id: string
  action: string
  name: string
  description: string | null
  point: number
  revert_on_delete: boolean
  daily_limit: number | null
  per_content_limit: number | null
  except_notice: boolean
  except_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PointRuleCreate = Omit<PointRule, 'id' | 'created_at' | 'updated_at'>
export type PointRuleUpdate = Partial<PointRuleCreate>

// Predefined actions for UI
export const POINT_ACTIONS = {
  signup: { name: '회원가입', category: 'member' },
  signup_referred: { name: '추천인 회원가입', category: 'member' },
  login: { name: '로그인', category: 'member' },
  insert_document: { name: '글 작성', category: 'content' },
  delete_document: { name: '글 삭제', category: 'content' },
  insert_comment: { name: '댓글 작성', category: 'content' },
  delete_comment: { name: '댓글 삭제', category: 'content' },
  upload_file: { name: '파일 업로드', category: 'file' },
  download_file: { name: '파일 다운로드', category: 'file' },
  delete_file: { name: '파일 삭제', category: 'file' },
  read_document: { name: '글 열람', category: 'content' },
  voted: { name: '추천받음', category: 'vote' },
  blamed: { name: '비추천받음', category: 'vote' },
  voter: { name: '추천함', category: 'vote' },
  blamer: { name: '비추천함', category: 'vote' },
  comment_voted: { name: '댓글 추천받음', category: 'vote' },
  comment_blamed: { name: '댓글 비추천받음', category: 'vote' },
  scrap: { name: '스크랩', category: 'content' },
  report: { name: '신고함', category: 'content' },
  reported: { name: '신고당함', category: 'content' },
} as const

export type PointAction = keyof typeof POINT_ACTIONS
```

### LevelGroupMapping Interface

```typescript
// types/level-group-mapping.ts

export interface LevelGroupMapping {
  id: string
  group_sync_mode: 'replace' | 'add'
  point_decrease_mode: 'keep' | 'demote'
  created_at: string
  updated_at: string
}

export interface LevelGroup {
  id: string
  level: number
  group_id: string | null
  group?: { id: string; name: string }
  created_at: string
}

export type LevelGroupMappingUpdate = Partial<
  Omit<LevelGroupMapping, 'id' | 'created_at' | 'updated_at'>
>

export type LevelGroupUpdate = {
  level: number
  group_id: string | null
}
```

### SecuritySettings Interface

```typescript
// types/security-settings.ts

export interface SecuritySettings {
  id: string
  mediafilter_whitelist: string
  mediafilter_classes: string
  robot_user_agents: string
  admin_allowed_ip: string
  admin_denied_ip: string
  autologin_lifetime: number
  autologin_refresh: boolean
  use_session_ssl: boolean
  use_cookies_ssl: boolean
  check_csrf_token: boolean
  use_nofollow: boolean
  use_httponly: boolean
  use_samesite: 'Strict' | 'Lax' | 'None'
  x_frame_options: 'DENY' | 'SAMEORIGIN'
  x_content_type_options: 'nosniff'
  created_at: string
  updated_at: string
}

export type SecuritySettingsUpdate = Partial<
  Omit<SecuritySettings, 'id' | 'created_at' | 'updated_at'>
>
```

---

## Zod Validation Schemas

### Point Settings Validation

```typescript
// lib/validations/point-settings.ts

import { z } from 'zod'

export const pointSettingsSchema = z.object({
  is_enabled: z.boolean(),
  point_name: z.string().min(1).max(50),
  max_level: z.number().int().min(1).max(100),
  level_icon_type: z.enum(['default', 'custom', 'none']),
  level_icon_path: z.string().nullable().optional(),
  disable_download_on_low_point: z.boolean(),
  disable_read_on_low_point: z.boolean(),
  min_point_for_download: z.number().int().min(0),
  min_point_for_read: z.number().int().min(0),
})

export const pointSettingsUpdateSchema = pointSettingsSchema.partial()

export const pointRuleSchema = z.object({
  action: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  point: z.number().int(),
  revert_on_delete: z.boolean(),
  daily_limit: z.number().int().positive().nullable(),
  per_content_limit: z.number().int().positive().nullable(),
  except_notice: z.boolean(),
  except_admin: z.boolean(),
  is_active: z.boolean(),
})

export const pointRuleUpdateSchema = pointRuleSchema.partial()

export const levelGroupMappingSchema = z.object({
  group_sync_mode: z.enum(['replace', 'add']),
  point_decrease_mode: z.enum(['keep', 'demote']),
})

export const levelGroupMappingUpdateSchema = levelGroupMappingSchema.partial()

export const levelGroupSchema = z.object({
  level: z.number().int().min(1).max(100),
  group_id: z.string().uuid().nullable(),
})
```

### Security Settings Validation

```typescript
// lib/validations/security-settings.ts

import { z } from 'zod'

export const securitySettingsSchema = z.object({
  // WHW-050: Media filter
  mediafilter_whitelist: z.string().max(5000),
  mediafilter_classes: z.string().max(5000),
  robot_user_agents: z.string().max(5000),

  // WHW-051: Admin access control
  admin_allowed_ip: z.string().max(5000),
  admin_denied_ip: z.string().max(5000),

  // WHW-052: Session security
  autologin_lifetime: z.number().int().min(0).max(31536000), // Max 1 year
  autologin_refresh: z.boolean(),
  use_session_ssl: z.boolean(),
  use_cookies_ssl: z.boolean(),
  check_csrf_token: z.boolean(),
  use_nofollow: z.boolean(),
  use_httponly: z.boolean(),
  use_samesite: z.enum(['Strict', 'Lax', 'None']),
  x_frame_options: z.enum(['DENY', 'SAMEORIGIN']),
  x_content_type_options: z.literal('nosniff'),
})

export const securitySettingsUpdateSchema = securitySettingsSchema.partial()

// IP address validation helper
export const ipAddressListSchema = z.string().refine((val) => {
  if (!val.trim()) return true // Empty is valid
  const ips = val.split(',').map(ip => ip.trim())
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$/
  return ips.every(ip => ipv4Regex.test(ip) || ipv6Regex.test(ip))
}, { message: 'Invalid IP address format' })
```

---

## Task Decomposition

### Phase 1: Database Schema (TDD - RED-GREEN-REFACTOR)

#### Task 1.1: Create point_settings table migration

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/022_point_settings.sql` (NEW)
  - `__tests__/migrations/022_point_settings.test.ts` (NEW)
- **Dependencies**: None
- **Acceptance**:
  - point_settings 테이블 생성
  - RLS 정책 적용 (인증 사용자 읽기, 관리자 쓰기)
  - 기본 데이터 삽입
  - updated_at 트리거

#### Task 1.2: Create point_rules table migration

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/023_point_rules.sql` (NEW)
  - `__tests__/migrations/023_point_rules.test.ts` (NEW)
- **Dependencies**: Task 1.1
- **Acceptance**:
  - point_rules 테이블 생성
  - 20개 기본 규칙 삽입
  - action 컬럼 unique constraint

#### Task 1.3: Create level_group_mapping tables migration

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/024_level_group_mapping.sql` (NEW)
  - `__tests__/migrations/024_level_group_mapping.test.ts` (NEW)
- **Dependencies**: Task 1.1
- **Acceptance**:
  - level_group_mapping 테이블 생성
  - level_groups 테이블 생성 (1-30 레벨)
  - groups 테이블 FK 참조

#### Task 1.4: Create security_settings table migration

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/025_security_settings.sql` (NEW)
  - `__tests__/migrations/025_security_settings.test.ts` (NEW)
- **Dependencies**: None
- **Acceptance**:
  - security_settings 테이블 생성
  - RLS 정책 적용 (관리자만 접근)
  - 기본 보안 설정값

#### Task 1.5: Extend profiles table with point/level

- **Type**: DDD (MODIFY existing)
- **Files**:
  - `supabase/migrations/026_profiles_point_level.sql` (NEW)
- **Dependencies**: Task 1.1
- **Acceptance**:
  - profiles 테이블에 point, level 컬럼 추가
  - 인덱스 생성

---

### Phase 2: TypeScript Types & Validation (TDD)

#### Task 2.1: Create point settings types and validation

- **Type**: TDD (NEW code)
- **Files**:
  - `types/point-settings.ts` (NEW)
  - `types/point-rule.ts` (NEW)
  - `types/level-group-mapping.ts` (NEW)
  - `lib/validations/point-settings.ts` (NEW)
  - `__tests__/validations/point-settings.test.ts` (NEW)
- **Dependencies**: Phase 1
- **Acceptance**:
  - 모든 인터페이스 정의
  - Zod 스키마 구현
  - 테스트 커버리지 >= 90%

#### Task 2.2: Create security settings types and validation

- **Type**: TDD (NEW code)
- **Files**:
  - `types/security-settings.ts` (NEW)
  - `lib/validations/security-settings.ts` (NEW)
  - `__tests__/validations/security-settings.test.ts` (NEW)
- **Dependencies**: Phase 1
- **Acceptance**:
  - 모든 인터페이스 정의
  - IP 주소 검증 로직
  - 테스트 커버리지 >= 90%

---

### Phase 3: Server Actions (TDD)

#### Task 3.1: Create point settings server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/point-settings.ts` (NEW)
  - `__tests__/actions/admin/point-settings.test.ts` (NEW)
- **Dependencies**: Task 2.1
- **Acceptance**:
  - getPointSettings()
  - updatePointSettings(data)
  - 관리자 권한 검증
  - 감사 로그 기록

#### Task 3.2: Create point rules server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/point-rules.ts` (NEW)
  - `__tests__/actions/admin/point-rules.test.ts` (NEW)
- **Dependencies**: Task 2.1
- **Acceptance**:
  - getPointRules()
  - getPointRule(action)
  - updatePointRule(id, data)
  - updatePointRulesBatch(data[]) // 일괄 업데이트

#### Task 3.3: Create level group mapping server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/level-group-mapping.ts` (NEW)
  - `__tests__/actions/admin/level-group-mapping.test.ts` (NEW)
- **Dependencies**: Task 2.1
- **Acceptance**:
  - getLevelGroupMapping()
  - updateLevelGroupMapping(data)
  - getLevelGroups()
  - updateLevelGroup(level, groupId)
  - 그룹 목록 연동

#### Task 3.4: Create security settings server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/security-settings.ts` (NEW)
  - `__tests__/actions/admin/security-settings.test.ts` (NEW)
- **Dependencies**: Task 2.2
- **Acceptance**:
  - getSecuritySettings()
  - updateSecuritySettings(data)
  - 보안 설정 변경 시 감사 로그

---

### Phase 4: UI Components (TDD)

#### Task 4.1: Create Point Settings Page

- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/settings/point/page.tsx` (NEW)
  - `components/admin/point-settings/BasicSettings.tsx` (NEW)
  - `components/admin/point-settings/RestrictionSettings.tsx` (NEW)
  - `__tests__/components/admin/point-settings/*.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Acceptance**:
  - WHW-040: 포인트 기본 설정 탭
  - WHW-041: 포인트 제한 탭
  - Auto-save 패턴 적용

#### Task 4.2: Create Point Rules Page

- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/points/rules/page.tsx` (NEW)
  - `components/admin/point-settings/PointRulesTable.tsx` (NEW)
  - `components/admin/point-settings/PointRuleEditor.tsx` (NEW)
  - `__tests__/components/admin/point-settings/*.test.tsx` (NEW)
- **Dependencies**: Task 3.2
- **Acceptance**:
  - WHW-042: 포인트 규칙 목록 테이블
  - 카테고리별 그룹핑 (회원/콘텐츠/파일/추천)
  - 인라인 편집
  - 일괄 저장

#### Task 4.3: Create Level-Group Mapping Page

- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/points/level-groups/page.tsx` (NEW)
  - `components/admin/point-settings/LevelGroupMapping.tsx` (NEW)
  - `components/admin/point-settings/LevelGroupSelector.tsx` (NEW)
  - `__tests__/components/admin/point-settings/*.test.tsx` (NEW)
- **Dependencies**: Task 3.3
- **Acceptance**:
  - WHW-043: 연동 방식 설정 (교체/추가)
  - WHW-043: 포인트 감소 처리 (유지/강등)
  - WHW-043: 레벨별 그룹 선택 (1-30)
  - 그룹 드롭다운 연동

#### Task 4.4: Create Security Settings Page

- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/settings/security/page.tsx` (NEW)
  - `components/admin/security-settings/MediaFilterSettings.tsx` (NEW)
  - `components/admin/security-settings/AccessControlSettings.tsx` (NEW)
  - `components/admin/security-settings/SessionSecuritySettings.tsx` (NEW)
  - `__tests__/components/admin/security-settings/*.test.tsx` (NEW)
- **Dependencies**: Task 3.4
- **Acceptance**:
  - WHW-050: 미디어 필터 탭
  - WHW-051: 관리자 접근 제어 탭
  - WHW-052: 세션 보안 탭
  - IP 주소 textarea (여러 줄 입력)
  - 보안 헤더 설정

---

### Phase 5: Integration & Testing

#### Task 5.1: Create PointService for point operations

- **Type**: TDD (NEW code)
- **Files**:
  - `lib/services/point-service.ts` (NEW)
  - `__tests__/lib/services/point-service.test.ts` (NEW)
- **Dependencies**: Phase 2, Phase 3
- **Acceptance**:
  - awardPoint(userId, action, reference?)
  - deductPoint(userId, action, reference?)
  - calculateLevel(point): number
  - syncLevelGroup(userId): void
  - 포인트 로그 기록

#### Task 5.2: Integration tests for point flow

- **Type**: TDD (NEW code)
- **Files**:
  - `__tests__/integration/point-flow.test.ts` (NEW)
- **Dependencies**: Task 5.1
- **Acceptance**:
  - 포인트 부여 -> 로그 기록 -> 레벨 계산
  - 레벨 업 -> 그룹 자동 할당
  - 포인트 감소 -> 레벨 다운 -> 그룹 강등 (설정에 따라)

#### Task 5.3: Security middleware enhancement

- **Type**: DDD (MODIFY existing)
- **Files**:
  - `middleware.ts` (MODIFY)
  - `lib/middleware/security-headers.ts` (NEW)
  - `lib/middleware/ip-check.ts` (NEW)
- **Dependencies**: Task 3.4
- **Acceptance**:
  - IP 화이트리스트/블랙리스트 체크
  - 보안 헤더 적용
  - CSRF 토큰 검증 강화

#### Task 5.4: E2E tests for admin workflows

- **Type**: TDD (NEW code)
- **Files**:
  - `e2e/admin/point-settings.spec.ts` (NEW)
  - `e2e/admin/security-settings.spec.ts` (NEW)
- **Dependencies**: Phase 4
- **Acceptance**:
  - 포인트 설정 변경 전체 흐름
  - 보안 설정 변경 전체 흐름
  - 레벨-그룹 연동 설정

---

## Technical Approach

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                                │
│  - PointSettingsPage (Tabs: Basic/Restriction)             │
│  - PointRulesPage (Table with inline editing)              │
│  - LevelGroupMappingPage (Level selectors 1-30)            │
│  - SecuritySettingsPage (Tabs: Media/Access/Session)       │
│  - shadcn/ui Card, Tabs, Switch, Select, Input, Textarea   │
│  - React Hook Form + Zod validation                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  API Layer (Server Actions)                                 │
│  - getPointSettings, updatePointSettings                    │
│  - getPointRules, updatePointRulesBatch                     │
│  - getLevelGroupMapping, updateLevelGroupMapping            │
│  - getSecuritySettings, updateSecuritySettings              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Service Layer                                              │
│  - PointService: awardPoint, deductPoint, calculateLevel   │
│  - LevelGroupService: syncUserGroup, promoteUser, demote   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Database Layer (Supabase)                                  │
│  - point_settings (single row)                              │
│  - point_rules (multi row, 20 default rules)               │
│  - level_group_mapping (single row)                         │
│  - level_groups (multi row, 30 levels)                      │
│  - security_settings (single row)                           │
│  - point_logs (audit trail)                                 │
│  - profiles.point, profiles.level (extensions)              │
│  - RLS policies for appropriate access control              │
└─────────────────────────────────────────────────────────────┘
```

### Level Calculation Formula

```typescript
// Level calculation: N^2 * 100 = points required for level N
// Level 1: 100 points
// Level 2: 400 points
// Level 3: 900 points
// Level 10: 10,000 points
// Level 30: 90,000 points

export function calculateLevel(point: number): number {
  if (point < 100) return 1
  return Math.floor(Math.sqrt(point / 100))
}

export function getPointsForLevel(level: number): number {
  return level * level * 100
}

export function getPointsToNextLevel(currentPoint: number): number {
  const currentLevel = calculateLevel(currentPoint)
  const nextLevel = currentLevel + 1
  return getPointsForLevel(nextLevel) - currentPoint
}
```

---

## Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 포인트 동시성 이슈 (동시 부여/차감) | Medium | High | PostgreSQL 트랜잭션, row-level locking |
| 레벨 계산 경계 조건 | Low | Medium | 단위 테스트로 모든 경계값 검증 |
| 그룹 동기화 실패 | Medium | Medium | 트랜잭션으로 포인트+그룹 변경 묶음 |
| IP 주소 형식 검증 | Low | Low | Zod 스키마로 IPv4/IPv6 검증 |
| 보안 설정 미적용 | Low | High | 설정 변경 후 middleware 즉시 반영 |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| groups 테이블 의존성 | Low | Medium | groups 테이블 존재 확인, FK 제약 |
| 기존 profiles 데이터 호환 | Low | Medium | point/level 기본값 0/1 설정 |
| 미들웨어 성능 영향 | Low | Medium | 설정 캐싱, 최소한의 DB 조회 |

---

## Acceptance Criteria

### Functional Requirements

- [ ] WHW-040: 포인트 모듈 켜기/끄기, 포인트 이름, 최고 레벨 설정
- [ ] WHW-041: 포인트 부족 시 다운로드/열람 금지 설정
- [ ] WHW-042: 20개 포인트 규칙 편집 (가입, 로그인, 글 작성, 댓글, 파일, 추천 등)
- [ ] WHW-043: 레벨-그룹 연동 방식, 포인트 감소 처리, 레벨별 그룹 할당
- [ ] WHW-050: 외부 멀티미디어 허용 도메인, HTML class 목록
- [ ] WHW-051: 관리자 로그인 허용/금지 IP, 로봇 user-agent
- [ ] WHW-052: 세션 보안 설정 (SSL, CSRF, 쿠키 보안, 보안 헤더)

### Quality Requirements

- [ ] Test coverage >= 85% for all new code
- [ ] TypeScript strict mode 에러 없음
- [ ] ESLint warnings 없음
- [ ] TRUST 5 quality gates passed

### Performance Requirements

- [ ] 설정 페이지 로드 < 2 seconds
- [ ] 설정 저장 응답 < 500ms
- [ ] 포인트 부여/차감 < 100ms
- [ ] 레벨 계산 < 10ms

---

## Effort Estimate

### Detailed Breakdown

| Task Category | Tasks | Hours | Methodology |
|--------------|-------|-------|-------------|
| Database Schema | 5 | 5h | TDD (5) |
| Types & Validation | 2 | 3h | TDD (2) |
| Server Actions | 4 | 6h | TDD (4) |
| UI Components | 4 | 8h | TDD (4) |
| Integration & Testing | 4 | 5h | TDD (3), DDD (1) |
| **Sprint 3 Total** | **19** | **27h** | TDD (18), DDD (1) |

### Timeline

**Day 1**: Database + Types
- 오전: point_settings, point_rules, level_group_mapping migrations (3h)
- 오후: security_settings migration, types & validation (3h)

**Day 2**: Server Actions
- 오전: Point settings & rules server actions (3h)
- 오후: Level group mapping & security settings actions (3h)

**Day 3**: UI Components (Points)
- 오전: Point settings page, Point rules page (4h)
- 오후: Level-group mapping page (3h)

**Day 4**: UI Components (Security) + Integration
- 오전: Security settings page (3h)
- 오후: PointService, integration tests, E2E tests (4h)

**Total Duration**: 4 working days

---

## Handoff to Implementation Agent

### Context Package

```yaml
spec_id: SPEC-RHYMIX-002
sprint: 3
focus: Points System & Security Settings
methodology: hybrid

tdd_tasks:
  - Task 1.1-1.5: Database migrations (NEW)
  - Task 2.1-2.2: Types & validation (NEW)
  - Task 3.1-3.4: Server actions (NEW)
  - Task 4.1-4.4: UI components (NEW)
  - Task 5.1-5.4: Integration & testing (NEW/MODIFY)

database_changes:
  - point_settings table (NEW)
  - point_rules table (NEW)
  - level_group_mapping table (NEW)
  - level_groups table (NEW)
  - security_settings table (NEW)
  - point_logs table (NEW)
  - profiles.point, profiles.level (EXTEND)

api_endpoints:
  - getPointSettings/updatePointSettings (Server Actions)
  - getPointRules/updatePointRulesBatch (Server Actions)
  - getLevelGroupMapping/updateLevelGroupMapping (Server Actions)
  - getSecuritySettings/updateSecuritySettings (Server Actions)

ui_pages:
  - /admin/settings/point (NEW)
  - /admin/points/rules (NEW)
  - /admin/points/level-groups (NEW)
  - /admin/settings/security (NEW)

existing_patterns:
  - member_settings table (single-row pattern)
  - editor_settings table (RLS pattern)
  - app/actions/admin/member-settings.ts (server action pattern)
  - lib/validations/member-settings.ts (zod pattern)
  - app/(admin)/admin/settings/member/page.tsx (ui pattern)
  - app/actions/groups.ts (group management pattern)

test_requirements:
  coverage: 85%
  integration_tests: point flow, level-group sync
  e2e_tests: Playwright for admin workflows
```

---

**Document Status**: READY FOR IMPLEMENTATION
**Created**: 2026-03-02
**Author**: manager-strategy agent
**Version**: 1.0.0
**Sprint**: 3 of 4
