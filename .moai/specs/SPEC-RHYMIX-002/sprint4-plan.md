# Sprint 4 Implementation Plan: Notification System & Communication Management

**SPEC**: SPEC-RHYMIX-002
**Sprint**: 4/6
**Created**: 2026-03-02
**Author**: manager-strategy
**Status**: READY FOR APPROVAL

---

## 1. Executive Summary

### Sprint Goal
UC-007(알림 시스템)과 UC-008(통합 메일/SMS/푸시 관리) 기능을 구현합니다. 기존 notifications 테이블을 확장하고, 관리자 설정 UI 및 발송 로그 시스템을 구축합니다.

### Scope Overview
| Use Case | Requirements | Priority |
|----------|--------------|----------|
| UC-007 | WHW-060, WHW-061, WHW-062 | Medium |
| UC-008 | WHW-070, WHW-071 | Low |

### Key Deliverables
1. `notification_settings` 테이블 (관리자용 시스템 설정)
2. `notification_delivery_settings` 테이블 (발송 방법 설정)
3. `notification_logs` 테이블 (발송 내역 로그)
4. 관리자 알림 설정 UI (유형별 채널 매트릭스)
5. 관리자 발송 설정 UI
6. 발송 내역 로그 뷰어

---

## 2. Requirements Analysis

### 2.1 WHW-060: 알림 유형 설정

**요구사항**: 8가지 알림 유형에 대해 채널별 활성화 설정

| 알림 유형 | 코드명 | 설명 |
|-----------|--------|------|
| 댓글 알림 | `comment` | 내 글에 댓글 작성 시 |
| 대댓글 알림 | `comment_comment` | 내 댓글에 답글 작성 시 |
| 멘션 알림 | `mention` | @username으로 호출 시 |
| 추천 알림 | `vote` | 내 글/댓글 추천 시 |
| 스크랩 알림 | `scrap` | 내 글 스크랩 시 |
| 쪽지 알림 | `message` | 쪽지 수신 시 |
| 관리자 콘텐츠 알림 | `admin_content` | 관리자 알림 |
| 커스텀 알림 | `custom` | 확장용 커스텀 |

**채널 구성**: 각 유형은 4개 채널(web, mail, sms, push)에 대해 독립적으로 활성화 가능

### 2.2 WHW-061: 알림 채널

**요구사항**: 채널별 발송 설정

| 채널 | 코드명 | 설명 | 구현 상태 |
|------|--------|------|-----------|
| 웹 알림 | `web` | 인앱 알림 | 구현됨 |
| 메일 알림 | `mail` | 이메일 발송 | 미구현 |
| SMS 알림 | `sms` | 문자 메시지 | 미구현 |
| 푸시 알림 | `push` | 브라우저/앱 푸시 | 미구현 |

**비고**: Sprint 4에서는 설정 UI만 구현, 실제 발송 로직은 향후 확장

### 2.3 WHW-062: 알림 표시 설정

**요구사항**: 알림 표시 방식 설정

| 설정 항목 | 타입 | 기본값 | 설명 |
|-----------|------|--------|------|
| display_use | enum | 'all' | 표시 여부 (all/none/pc/mobile) |
| always_display | boolean | true | 항상 표시 |
| user_config_list | boolean | true | 사용자 설정 목록 표시 |
| user_notify_setting | boolean | true | 사용자 알림 설정 허용 |
| push_before_sms | boolean | true | SMS 전 푸시 시도 |
| document_read_delete | boolean | true | 문서 열람 시 알림 삭제 |

### 2.4 WHW-070: 발송 설정

**요구사항**: 메일/SMS/푸시 발송 기본 설정

| 설정 항목 | 타입 | 설명 |
|-----------|------|------|
| default_send_method | enum | 기본 발송 방법 (smtp/api/none) |
| smtp_host | string | SMTP 호스트 |
| smtp_port | number | SMTP 포트 |
| smtp_user | string | SMTP 사용자명 |
| smtp_password | string | SMTP 비밀번호 (암호화) |
| smtp_security | enum | 보안 (none/ssl/tls) |
| sender_name | string | 보낸이 이름 |
| sender_email | string | 보낸이 이메일 |

### 2.5 WHW-071: 발송 내역

**요구사항**: 발송 및 오류 로그 기록

| 로그 타입 | 테이블 | 보관 기간 |
|-----------|--------|-----------|
| 메일 발송 내역 | notification_logs (type=mail) | 90일 |
| SMS 발송 내역 | notification_logs (type=sms) | 90일 |
| 푸시 발송 내역 | notification_logs (type=push) | 90일 |
| 오류 내역 | notification_logs (status=error) | 90일 |

---

## 3. Database Schema Design

### 3.1 notification_settings Table (신규)

관리자용 시스템 전체 알림 설정 (단일 행 패턴)

```sql
-- Migration: 027_notification_settings.sql
-- Sprint 4: Notification System Settings (WHW-060, WHW-061, WHW-062)

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-060: 알림 유형별 채널 설정 (JSONB)
  -- 각 유형: { "web": bool, "mail": bool, "sms": bool, "push": bool }
  comment JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  comment_comment JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  mention JSONB DEFAULT '{"web": true, "mail": true, "sms": false, "push": false}',
  vote JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  scrap JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',
  message JSONB DEFAULT '{"web": true, "mail": true, "sms": false, "push": true}',
  admin_content JSONB DEFAULT '{"web": true, "mail": true, "sms": true, "push": true}',
  custom JSONB DEFAULT '{"web": true, "mail": false, "sms": false, "push": false}',

  -- WHW-062: 표시 설정
  display_use TEXT DEFAULT 'all' CHECK (display_use IN ('all', 'none', 'pc', 'mobile')),
  always_display BOOLEAN DEFAULT TRUE,
  user_config_list BOOLEAN DEFAULT TRUE,
  user_notify_setting BOOLEAN DEFAULT TRUE,
  push_before_sms BOOLEAN DEFAULT TRUE,
  document_read_delete BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT notification_settings_single_row CHECK (id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access
CREATE POLICY "Only admins can view notification settings"
  ON public.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage notification settings"
  ON public.notification_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_settings_id ON public.notification_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.notification_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE public.notification_settings IS 'System-wide notification settings (WHW-060, WHW-061, WHW-062)';
COMMENT ON COLUMN public.notification_settings.comment IS 'Comment notification channels';
COMMENT ON COLUMN public.notification_settings.comment_comment IS 'Reply to comment notification channels';
COMMENT ON COLUMN public.notification_settings.mention IS 'Mention notification channels';
COMMENT ON COLUMN public.notification_settings.vote IS 'Vote notification channels';
COMMENT ON COLUMN public.notification_settings.scrap IS 'Scrap notification channels';
COMMENT ON COLUMN public.notification_settings.message IS 'Message notification channels';
COMMENT ON COLUMN public.notification_settings.admin_content IS 'Admin content notification channels';
COMMENT ON COLUMN public.notification_settings.custom IS 'Custom notification channels';
COMMENT ON COLUMN public.notification_settings.display_use IS 'Display visibility (all/none/pc/mobile)';
COMMENT ON COLUMN public.notification_settings.always_display IS 'Always show notification indicator';
COMMENT ON COLUMN public.notification_settings.user_config_list IS 'Show user config list';
COMMENT ON COLUMN public.notification_settings.user_notify_setting IS 'Allow user notification settings';
COMMENT ON COLUMN public.notification_settings.push_before_sms IS 'Try push before SMS';
COMMENT ON COLUMN public.notification_settings.document_read_delete IS 'Delete notification when document is read';
```

### 3.2 notification_delivery_settings Table (신규)

메일/SMS/푸시 발송 설정 (단일 행 패턴)

```sql
-- Migration: 028_notification_delivery_settings.sql
-- Sprint 4: Notification Delivery Settings (WHW-070)

CREATE TABLE IF NOT EXISTS public.notification_delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-070: 기본 발송 설정
  default_send_method TEXT DEFAULT 'none' CHECK (default_send_method IN ('smtp', 'api', 'none')),

  -- SMTP Settings
  smtp_host TEXT DEFAULT '',
  smtp_port INTEGER DEFAULT 587 CHECK (smtp_port >= 1 AND smtp_port <= 65535),
  smtp_user TEXT DEFAULT '',
  smtp_password TEXT DEFAULT '',  -- 암호화 필요 (향후 구현)
  smtp_security TEXT DEFAULT 'tls' CHECK (smtp_security IN ('none', 'ssl', 'tls')),

  -- Sender Information
  sender_name TEXT DEFAULT '',
  sender_email TEXT DEFAULT '',

  -- API Settings (SendGrid, AWS SES, etc.)
  api_provider TEXT DEFAULT '' CHECK (api_provider IN ('', 'sendgrid', 'aws_ses', 'mailgun', 'resend')),
  api_key TEXT DEFAULT '',  -- 암호화 필요 (향후 구현)

  -- SMS Settings (Twilio, AWS SNS, etc.)
  sms_provider TEXT DEFAULT '' CHECK (sms_provider IN ('', 'twilio', 'aws_sns', 'local')),
  sms_account_sid TEXT DEFAULT '',
  sms_auth_token TEXT DEFAULT '',  -- 암호화 필요
  sms_sender_number TEXT DEFAULT '',

  -- Push Settings (FCM, APNs)
  push_provider TEXT DEFAULT '' CHECK (push_provider IN ('', 'fcm', 'apns', 'both')),
  push_api_key TEXT DEFAULT '',  -- 암호화 필요

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT notification_delivery_settings_single_row CHECK (id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.notification_delivery_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access
CREATE POLICY "Only admins can view delivery settings"
  ON public.notification_delivery_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage delivery settings"
  ON public.notification_delivery_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_delivery_settings_id ON public.notification_delivery_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_delivery_settings_updated_at
  BEFORE UPDATE ON public.notification_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.notification_delivery_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE public.notification_delivery_settings IS 'Notification delivery settings for mail/SMS/push (WHW-070)';
COMMENT ON COLUMN public.notification_delivery_settings.default_send_method IS 'Default sending method (smtp/api/none)';
COMMENT ON COLUMN public.notification_delivery_settings.smtp_host IS 'SMTP server hostname';
COMMENT ON COLUMN public.notification_delivery_settings.smtp_port IS 'SMTP server port';
COMMENT ON COLUMN public.notification_delivery_settings.smtp_user IS 'SMTP username';
COMMENT ON COLUMN public.notification_delivery_settings.smtp_password IS 'SMTP password (should be encrypted)';
COMMENT ON COLUMN public.notification_delivery_settings.smtp_security IS 'SMTP security (none/ssl/tls)';
COMMENT ON COLUMN public.notification_delivery_settings.sender_name IS 'Default sender name';
COMMENT ON COLUMN public.notification_delivery_settings.sender_email IS 'Default sender email';
COMMENT ON COLUMN public.notification_delivery_settings.api_provider IS 'Email API provider (sendgrid/aws_ses/mailgun/resend)';
COMMENT ON COLUMN public.notification_delivery_settings.api_key IS 'Email API key (should be encrypted)';
COMMENT ON COLUMN public.notification_delivery_settings.sms_provider IS 'SMS provider (twilio/aws_sns/local)';
COMMENT ON COLUMN public.notification_delivery_settings.push_provider IS 'Push notification provider (fcm/apns/both)';
```

### 3.3 notification_logs Table (신규)

발송 내역 로그

```sql
-- Migration: 029_notification_logs.sql
-- Sprint 4: Notification Logs (WHW-071)

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Notification Reference
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Log Details
  channel TEXT NOT NULL CHECK (channel IN ('web', 'mail', 'sms', 'push')),
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),

  -- Recipient Info
  recipient_address TEXT,  -- email, phone number, etc.
  recipient_name TEXT,

  -- Content (for logging purposes)
  subject TEXT,
  content_preview TEXT,  -- First 500 chars

  -- Error Info
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Provider Info
  provider TEXT,  -- smtp, sendgrid, twilio, fcm, etc.
  provider_message_id TEXT,  -- External message ID

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auto-delete after 90 days
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete notification logs"
  ON public.notification_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_notification_logs_notification_id ON public.notification_logs(notification_id);
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_expires_at ON public.notification_logs(expires_at);

-- Auto-delete expired logs (pg_cron or scheduled function needed)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete_expired_notification_logs', '0 3 * * *',
--   $$DELETE FROM public.notification_logs WHERE expires_at < NOW()$$);

-- Comments
COMMENT ON TABLE public.notification_logs IS 'Notification delivery logs for mail/SMS/push (WHW-071)';
COMMENT ON COLUMN public.notification_logs.channel IS 'Delivery channel (web/mail/sms/push)';
COMMENT ON COLUMN public.notification_logs.status IS 'Delivery status (pending/sent/delivered/failed/bounced)';
COMMENT ON COLUMN public.notification_logs.expires_at IS 'Auto-delete timestamp (90 days retention)';
```

---

## 4. TypeScript Interface Definitions

### 4.1 notification_settings Types

```typescript
// lib/types/notification-settings.ts

/**
 * 알림 채널 설정 (각 유형별)
 */
export interface NotificationChannelConfig {
  web: boolean
  mail: boolean
  sms: boolean
  push: boolean
}

/**
 * 알림 유형 키
 */
export type NotificationTypeKey =
  | 'comment'
  | 'comment_comment'
  | 'mention'
  | 'vote'
  | 'scrap'
  | 'message'
  | 'admin_content'
  | 'custom'

/**
 * 표시 설정 옵션
 */
export type DisplayUseOption = 'all' | 'none' | 'pc' | 'mobile'

/**
 * 관리자용 알림 설정 (notification_settings 테이블)
 */
export interface NotificationSettings {
  id: string

  // WHW-060: 알림 유형별 채널 설정
  comment: NotificationChannelConfig
  comment_comment: NotificationChannelConfig
  mention: NotificationChannelConfig
  vote: NotificationChannelConfig
  scrap: NotificationChannelConfig
  message: NotificationChannelConfig
  admin_content: NotificationChannelConfig
  custom: NotificationChannelConfig

  // WHW-062: 표시 설정
  display_use: DisplayUseOption
  always_display: boolean
  user_config_list: boolean
  user_notify_setting: boolean
  push_before_sms: boolean
  document_read_delete: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * 알림 설정 폼 데이터
 */
export interface NotificationSettingsFormData {
  comment: NotificationChannelConfig
  comment_comment: NotificationChannelConfig
  mention: NotificationChannelConfig
  vote: NotificationChannelConfig
  scrap: NotificationChannelConfig
  message: NotificationChannelConfig
  admin_content: NotificationChannelConfig
  custom: NotificationChannelConfig
  display_use: DisplayUseOption
  always_display: boolean
  user_config_list: boolean
  user_notify_setting: boolean
  push_before_sms: boolean
  document_read_delete: boolean
}
```

### 4.2 notification_delivery_settings Types

```typescript
// lib/types/notification-delivery-settings.ts

/**
 * 발송 방법
 */
export type SendMethod = 'smtp' | 'api' | 'none'

/**
 * SMTP 보안 옵션
 */
export type SMTPSecurity = 'none' | 'ssl' | 'tls'

/**
 * 이메일 API 제공자
 */
export type EmailAPIProvider = '' | 'sendgrid' | 'aws_ses' | 'mailgun' | 'resend'

/**
 * SMS 제공자
 */
export type SMSProvider = '' | 'twilio' | 'aws_sns' | 'local'

/**
 * 푸시 제공자
 */
export type PushProvider = '' | 'fcm' | 'apns' | 'both'

/**
 * 발송 설정 (notification_delivery_settings 테이블)
 */
export interface NotificationDeliverySettings {
  id: string

  // 기본 발송 설정
  default_send_method: SendMethod

  // SMTP 설정
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_security: SMTPSecurity

  // 보낸이 정보
  sender_name: string
  sender_email: string

  // API 설정
  api_provider: EmailAPIProvider
  api_key: string

  // SMS 설정
  sms_provider: SMSProvider
  sms_account_sid: string
  sms_auth_token: string
  sms_sender_number: string

  // 푸시 설정
  push_provider: PushProvider
  push_api_key: string

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * 발송 설정 폼 데이터 (비밀번호 제외)
 */
export interface NotificationDeliverySettingsFormData {
  default_send_method: SendMethod
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password?: string  // 선택적 (변경 시에만)
  smtp_security: SMTPSecurity
  sender_name: string
  sender_email: string
  api_provider: EmailAPIProvider
  api_key?: string
  sms_provider: SMSProvider
  sms_account_sid: string
  sms_auth_token?: string
  sms_sender_number: string
  push_provider: PushProvider
  push_api_key?: string
}
```

### 4.3 notification_logs Types

```typescript
// lib/types/notification-logs.ts

/**
 * 알림 채널
 */
export type NotificationChannel = 'web' | 'mail' | 'sms' | 'push'

/**
 * 발송 상태
 */
export type NotificationLogStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

/**
 * 알림 발송 로그
 */
export interface NotificationLog {
  id: string
  notification_id: string | null
  user_id: string | null
  channel: NotificationChannel
  notification_type: string
  status: NotificationLogStatus
  recipient_address: string | null
  recipient_name: string | null
  subject: string | null
  content_preview: string | null
  error_code: string | null
  error_message: string | null
  retry_count: number
  provider: string | null
  provider_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  created_at: string
  expires_at: string
}

/**
 * 로그 필터 옵션
 */
export interface NotificationLogFilters {
  channel?: NotificationChannel
  status?: NotificationLogStatus
  date_from?: string
  date_to?: string
  search?: string
}

/**
 * 로그 통계
 */
export interface NotificationLogStats {
  total: number
  sent: number
  delivered: number
  failed: number
  pending: number
  by_channel: {
    web: number
    mail: number
    sms: number
    push: number
  }
}
```

---

## 5. Zod Validation Schemas

### 5.1 Notification Settings Validation

```typescript
// lib/validations/notification-settings.ts

import { z } from 'zod'

/**
 * 알림 채널 설정 스키마
 */
export const notificationChannelConfigSchema = z.object({
  web: z.boolean(),
  mail: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
})

/**
 * 알림 설정 스키마
 */
export const notificationSettingsSchema = z.object({
  // WHW-060: 알림 유형별 채널 설정
  comment: notificationChannelConfigSchema,
  comment_comment: notificationChannelConfigSchema,
  mention: notificationChannelConfigSchema,
  vote: notificationChannelConfigSchema,
  scrap: notificationChannelConfigSchema,
  message: notificationChannelConfigSchema,
  admin_content: notificationChannelConfigSchema,
  custom: notificationChannelConfigSchema,

  // WHW-062: 표시 설정
  display_use: z.enum(['all', 'none', 'pc', 'mobile'], {
    errorMap: () => ({ message: '유효하지 않은 표시 설정입니다' }),
  }),
  always_display: z.boolean(),
  user_config_list: z.boolean(),
  user_notify_setting: z.boolean(),
  push_before_sms: z.boolean(),
  document_read_delete: z.boolean(),
})

export const notificationSettingsUpdateSchema = notificationSettingsSchema.partial()

export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>
```

### 5.2 Delivery Settings Validation

```typescript
// lib/validations/notification-delivery-settings.ts

import { z } from 'zod'

/**
 * SMTP 설정 검증
 */
const smtpSettingsSchema = z.object({
  smtp_host: z.string().max(255, '호스트명은 255자 이하여야 합니다'),
  smtp_port: z.number().int().min(1).max(65535, '유효한 포트 번호를 입력하세요'),
  smtp_user: z.string().max(255, '사용자명은 255자 이하여야 합니다'),
  smtp_password: z.string().max(255, '비밀번호는 255자 이하여야 합니다').optional(),
  smtp_security: z.enum(['none', 'ssl', 'tls'], {
    errorMap: () => ({ message: '유효하지 않은 보안 설정입니다' }),
  }),
})

/**
 * 발송 설정 스키마
 */
export const notificationDeliverySettingsSchema = z.object({
  default_send_method: z.enum(['smtp', 'api', 'none'], {
    errorMap: () => ({ message: '유효하지 않은 발송 방법입니다' }),
  }),

  // SMTP 설정
  ...smtpSettingsSchema.shape,

  // 보낸이 정보
  sender_name: z.string().max(100, '보낸이 이름은 100자 이하여야 합니다'),
  sender_email: z.string().email('유효한 이메일 주소를 입력하세요').max(255).optional().or(z.literal('')),

  // API 설정
  api_provider: z.enum(['', 'sendgrid', 'aws_ses', 'mailgun', 'resend'], {
    errorMap: () => ({ message: '유효하지 않은 API 제공자입니다' }),
  }),
  api_key: z.string().max(500).optional(),

  // SMS 설정
  sms_provider: z.enum(['', 'twilio', 'aws_sns', 'local'], {
    errorMap: () => ({ message: '유효하지 않은 SMS 제공자입니다' }),
  }),
  sms_account_sid: z.string().max(255).optional(),
  sms_auth_token: z.string().max(255).optional(),
  sms_sender_number: z.string().max(20).optional(),

  // 푸시 설정
  push_provider: z.enum(['', 'fcm', 'apns', 'both'], {
    errorMap: () => ({ message: '유효하지 않은 푸시 제공자입니다' }),
  }),
  push_api_key: z.string().max(500).optional(),
})

export const notificationDeliverySettingsUpdateSchema = notificationDeliverySettingsSchema.partial()

export type NotificationDeliverySettingsFormData = z.infer<typeof notificationDeliverySettingsSchema>
```

---

## 6. Task Breakdown

### Phase 1: Database Migration (Tasks 1-3)

#### Task 1: Create notification_settings Migration
**File**: `supabase/migrations/027_notification_settings.sql`
**Description**: notification_settings 테이블 생성
**Requirements**: WHW-060, WHW-061, WHW-062
**Effort**: 0.5h / 70 lines
**Dependencies**: None

#### Task 2: Create notification_delivery_settings Migration
**File**: `supabase/migrations/028_notification_delivery_settings.sql`
**Description**: notification_delivery_settings 테이블 생성
**Requirements**: WHW-070
**Effort**: 0.5h / 90 lines
**Dependencies**: None

#### Task 3: Create notification_logs Migration
**File**: `supabase/migrations/029_notification_logs.sql`
**Description**: notification_logs 테이블 생성
**Requirements**: WHW-071
**Effort**: 0.5h / 60 lines
**Dependencies**: notifications 테이블

### Phase 2: TypeScript Types (Tasks 4-6)

#### Task 4: Define Notification Settings Types
**File**: `lib/types/notification-settings.ts`
**Description**: NotificationSettings, NotificationChannelConfig 타입 정의
**Effort**: 0.5h / 80 lines
**Dependencies**: Task 1

#### Task 5: Define Delivery Settings Types
**File**: `lib/types/notification-delivery-settings.ts`
**Description**: NotificationDeliverySettings 및 관련 타입 정의
**Effort**: 0.5h / 70 lines
**Dependencies**: Task 2

#### Task 6: Define Notification Logs Types
**File**: `lib/types/notification-logs.ts`
**Description**: NotificationLog 및 필터 타입 정의
**Effort**: 0.3h / 60 lines
**Dependencies**: Task 3

### Phase 3: Validation Schemas (Tasks 7-9)

#### Task 7: Create Notification Settings Validation
**File**: `lib/validations/notification-settings.ts`
**Description**: Zod 스키마 정의
**Effort**: 0.5h / 50 lines
**Dependencies**: Task 4

#### Task 8: Create Delivery Settings Validation
**File**: `lib/validations/notification-delivery-settings.ts`
**Description**: Zod 스키마 정의 (SMTP, API, SMS, Push)
**Effort**: 0.5h / 70 lines
**Dependencies**: Task 5

#### Task 9: Create Notification Logs Validation
**File**: `lib/validations/notification-logs.ts`
**Description**: 로그 필터 및 조회 스키마
**Effort**: 0.3h / 40 lines
**Dependencies**: Task 6

### Phase 4: Server Actions (Tasks 10-14)

#### Task 10: Create Notification Settings Actions
**File**: `app/actions/admin/notification-settings.ts`
**Description**: getNotificationSettings, updateNotificationSettings
**Effort**: 1h / 150 lines
**Dependencies**: Task 1, 4, 7

#### Task 11: Create Delivery Settings Actions
**File**: `app/actions/admin/notification-delivery-settings.ts`
**Description**: getDeliverySettings, updateDeliverySettings, testSMTPConnection
**Effort**: 1.5h / 200 lines
**Dependencies**: Task 2, 5, 8

#### Task 12: Create Notification Logs Actions
**File**: `app/actions/admin/notification-logs.ts`
**Description**: getNotificationLogs, getNotificationLogStats, deleteOldLogs
**Effort**: 1h / 150 lines
**Dependencies**: Task 3, 6, 9

#### Task 13: Update database.types.ts
**File**: `lib/supabase/database.types.ts`
**Description**: 새 테이블 타입 추가 (자동 생성)
**Effort**: 0.2h
**Dependencies**: Task 1, 2, 3

#### Task 14: Export Types from Index
**File**: `lib/types/index.ts`
**Description**: 타입 re-export
**Effort**: 0.1h / 10 lines
**Dependencies**: Task 4, 5, 6

### Phase 5: Admin UI Components (Tasks 15-20)

#### Task 15: Create Notification Type Channel Matrix Component
**File**: `components/admin/notification/NotificationChannelMatrix.tsx`
**Description**: 8x4 매트릭스 UI (유형 x 채널)
**Effort**: 2h / 200 lines
**Dependencies**: Task 4, 7, 10

#### Task 16: Create Notification Display Settings Component
**File**: `components/admin/notification/NotificationDisplaySettings.tsx`
**Description**: 표시 설정 스위치 및 셀렉트
**Effort**: 1h / 100 lines
**Dependencies**: Task 4, 7, 10

#### Task 17: Create SMTP Settings Component
**File**: `components/admin/notification/SMTPSettingsForm.tsx`
**Description**: SMTP 설정 폼
**Effort**: 1.5h / 150 lines
**Dependencies**: Task 5, 8, 11

#### Task 18: Create SMS/Push Settings Component
**File**: `components/admin/notification/SMSPushSettingsForm.tsx`
**Description**: SMS 및 푸시 설정 폼
**Effort**: 1h / 120 lines
**Dependencies**: Task 5, 8, 11

#### Task 19: Create Notification Logs Viewer Component
**File**: `components/admin/notification/NotificationLogsViewer.tsx`
**Description**: 발송 내역 테이블 및 필터
**Effort**: 2h / 250 lines
**Dependencies**: Task 6, 9, 12

#### Task 20: Create Log Stats Dashboard Component
**File**: `components/admin/notification/NotificationLogStats.tsx`
**Description**: 발송 통계 카드
**Effort**: 1h / 100 lines
**Dependencies**: Task 6, 9, 12

### Phase 6: Admin Pages (Tasks 21-24)

#### Task 21: Update Notification Center Page
**File**: `app/(admin)/admin/notification-center/page.tsx`
**Description**: 알림 유형 설정 탭 추가
**Effort**: 1.5h / 150 lines
**Dependencies**: Task 15, 16

#### Task 22: Create Delivery Settings Page
**File**: `app/(admin)/admin/settings/notification-delivery/page.tsx`
**Description**: 발송 설정 페이지 (SMTP, SMS, Push)
**Effort**: 1.5h / 180 lines
**Dependencies**: Task 17, 18

#### Task 23: Create Notification Logs Page
**File**: `app/(admin)/admin/logs/notifications/page.tsx`
**Description**: 발송 내역 로그 페이지
**Effort**: 1.5h / 150 lines
**Dependencies**: Task 19, 20

#### Task 24: Update Admin Navigation
**File**: `components/admin/AdminSidebar.tsx`
**Description**: 새 메뉴 항목 추가
**Effort**: 0.3h / 20 lines
**Dependencies**: Task 21, 22, 23

---

## 7. Execution Phases

### Phase 1: Database Setup (Day 1)
1. Create 3 migration files
2. Apply migrations to local database
3. Verify table structure and RLS policies
4. Generate TypeScript types

**Milestone**: Database schema ready

### Phase 2: Type Definitions (Day 1-2)
1. Create type definition files
2. Create Zod validation schemas
3. Update database.types.ts

**Milestone**: Type system complete

### Phase 3: Server Actions (Day 2-3)
1. Implement notification settings actions
2. Implement delivery settings actions
3. Implement logs actions
4. Add audit logging

**Milestone**: API layer ready

### Phase 4: UI Components (Day 3-4)
1. Build channel matrix component
2. Build settings forms
3. Build logs viewer
4. Build stats dashboard

**Milestone**: Component library ready

### Phase 5: Page Integration (Day 4-5)
1. Update notification center page
2. Create delivery settings page
3. Create logs page
4. Update navigation

**Milestone**: UI fully integrated

---

## 8. Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 기존 notifications 테이블과 충돌 | Low | Medium | 기존 테이블 구조 분석 완료, 호환성 유지 |
| JSONB 타입 쿼리 성능 | Medium | Medium | 적절한 인덱싱, 쿼리 최적화 |
| SMTP 연결 테스트 실패 | Medium | Low | 상세한 오류 메시지, 재시도 로직 |
| 대량 로그 데이터 성능 저하 | Medium | Medium | 90일 자동 삭제, 인덱스 최적화 |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| RLS 정책 누락 | Low | High | 기존 패턴 준수, 철저한 테스트 |
| 타입 정의 불일치 | Medium | Medium | 자동 타입 생성 활용 |
| 기존 알림 기능 영향 | Low | High | 기존 로직 수정 없음, 설정만 추가 |

### Security Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SMTP 비밀번호 노출 | Medium | High | 향후 암호화 구현 (Phase 2) |
| API 키 노출 | Medium | High | 환경 변수 사용 권장 |
| 로그에 민감 정보 포함 | Low | Medium | content_preview 제한 (500자) |

---

## 9. Acceptance Criteria

### UC-007: 알림 시스템

#### AC-040: 알림 유형 설정
- [ ] 8가지 알림 유형이 모두 표시됨
- [ ] 각 유형별로 4개 채널(w/mail/sms/push) 활성화 가능
- [ ] 설정 변경 시 자동 저장됨
- [ ] 관리자만 접근 가능

#### AC-041: 알림 표시 설정
- [ ] display_use 옵션이 정상 동작함 (all/none/pc/mobile)
- [ ] always_display 설정이 알림 아이콘에 반영됨
- [ ] user_notify_setting 비활성화 시 사용자 설정 숨김

### UC-008: 통합 메일/SMS/푸시 관리

#### AC-050: 발송 설정
- [ ] SMTP 설정 저장 및 불러오기 가능
- [ ] 보낸이 정보 설정 가능
- [ ] API 제공자 선택 가능 (SendGrid, AWS SES, etc.)
- [ ] SMS 제공자 설정 가능 (Twilio, etc.)

#### AC-051: 발송 내역
- [ ] 메일/SMS/푸시 발송 내역 조회 가능
- [ ] 채널별, 상태별 필터링 가능
- [ ] 발송 통계 대시보드 표시
- [ ] 90일 이상 로그 자동 삭제

### Quality Gates

#### TRUST 5 Validation
- [ ] Tested: 85%+ 테스트 커버리지
- [ ] Readable: 명확한 한국어 UI, 영어 코드 주석
- [ ] Unified: 기존 security-settings 패턴 준수
- [ ] Secured: 관리자 전용 RLS 정책
- [ ] Trackable: 감사 로그 기록

---

## 10. Effort Estimation

### Summary

| Phase | Tasks | Effort | Lines of Code |
|-------|-------|--------|---------------|
| Phase 1: Database | 3 | 1.5h | 220 |
| Phase 2: Types | 3 | 1.3h | 210 |
| Phase 3: Validation | 3 | 1.3h | 160 |
| Phase 4: Actions | 5 | 3.8h | 510 |
| Phase 5: Components | 6 | 8.5h | 920 |
| Phase 6: Pages | 4 | 4.8h | 500 |
| **Total** | **24** | **21.2h** | **2,520** |

### By Priority

| Priority | Tasks | Effort |
|----------|-------|--------|
| High (Database, Types, Actions) | 14 | 7.9h |
| Medium (Components) | 6 | 8.5h |
| Low (Pages) | 4 | 4.8h |

---

## 11. Dependencies

### Internal Dependencies
- Sprint 1-3 완료 (security_settings 패턴 참조)
- notifications 테이블 존재 (001_initial_schema.sql)
- helper functions (update_updated_at_column)

### External Dependencies
- Supabase CLI (마이그레이션 적용)
- React Hook Form (폼 관리)
- Zod (유효성 검사)
- shadcn/ui (UI 컴포넌트)

### Optional Dependencies (Phase 2)
- Resend/SendGrid (이메일 발송)
- Twilio (SMS 발송)
- Firebase Cloud Messaging (푸시 알림)

---

## 12. Next Steps

1. **사용자 승인**: 본 계획에 대한 승인 요청
2. **Sprint 4 실행**: manager-ddd 에이전트에게 구현 위임
3. **Phase 1 시작**: 데이터베이스 마이그레이션 작성

### Approval Checklist
- [ ] 데이터베이스 스키마 승인
- [ ] TypeScript 타입 정의 승인
- [ ] UI 컴포넌트 구조 승인
- [ ] 작업 분해 승인
- [ ] 리스크 분석 승인

---

## 13. Appendix

### A. File Structure After Sprint 4

```
rhymix-ts/
├── supabase/migrations/
│   ├── 027_notification_settings.sql        (NEW)
│   ├── 028_notification_delivery_settings.sql (NEW)
│   └── 029_notification_logs.sql            (NEW)
├── lib/
│   ├── types/
│   │   ├── notification-settings.ts         (NEW)
│   │   ├── notification-delivery-settings.ts (NEW)
│   │   └── notification-logs.ts             (NEW)
│   └── validations/
│       ├── notification-settings.ts         (NEW)
│       ├── notification-delivery-settings.ts (NEW)
│       └── notification-logs.ts             (NEW)
├── app/
│   ├── actions/admin/
│   │   ├── notification-settings.ts         (NEW)
│   │   ├── notification-delivery-settings.ts (NEW)
│   │   └── notification-logs.ts             (NEW)
│   └── (admin)/admin/
│       ├── notification-center/page.tsx     (UPDATED)
│       ├── settings/notification-delivery/page.tsx (NEW)
│       └── logs/notifications/page.tsx      (NEW)
└── components/admin/notification/
    ├── NotificationChannelMatrix.tsx        (NEW)
    ├── NotificationDisplaySettings.tsx      (NEW)
    ├── SMTPSettingsForm.tsx                 (NEW)
    ├── SMSPushSettingsForm.tsx              (NEW)
    ├── NotificationLogsViewer.tsx           (NEW)
    └── NotificationLogStats.tsx             (NEW)
```

### B. Related Documents
- SPEC-RHYMIX-002/spec.md
- SPEC-RHYMIX-002/plan.md
- SPEC-RHYMIX-002/acceptance.md
- ASIS 분석: `.moai/specs/SPEC-RHYMIX-001/asis-analysis.md`
