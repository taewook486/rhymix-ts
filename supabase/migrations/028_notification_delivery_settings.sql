-- =====================================================
-- RHYMIX-TS Notification Delivery Settings Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 028_notification_delivery_settings
-- Created: 2026-03-02
-- Purpose: 발송 관리 (Delivery Management) - UC-008
-- WHW-070: SMTP 설정 (Email Delivery Settings)
-- WHW-071: SMS/Push 발송 설정 (SMS/Push Delivery Settings)
-- =====================================================

-- =====================================================
-- NOTIFICATION_DELIVERY_SETTINGS TABLE (Global delivery configuration)
-- Single-row table for notification delivery settings
-- =====================================================

CREATE TABLE public.notification_delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-070: SMTP 설정 (Email Delivery Settings)
  smtp_enabled BOOLEAN DEFAULT FALSE,
  smtp_host TEXT,
  smtp_port INTEGER CHECK (smtp_port > 0 AND smtp_port <= 65535),
  smtp_username TEXT,
  -- Password should be stored encrypted (use pgcrypto or external secret management)
  smtp_password TEXT, -- Store encrypted password
  smtp_encryption TEXT DEFAULT 'tls' CHECK (smtp_encryption IN ('none', 'ssl', 'tls')),
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_reply_to TEXT,
  smtp_max_recipients INTEGER DEFAULT 100 CHECK (smtp_max_recipients > 0 AND smtp_max_recipients <= 1000),
  smtp_timeout_seconds INTEGER DEFAULT 30 CHECK (smtp_timeout_seconds > 0 AND smtp_timeout_seconds <= 300),

  -- WHW-071: SMS 발송 설정 (SMS Delivery Settings)
  sms_enabled BOOLEAN DEFAULT FALSE,
  sms_provider TEXT DEFAULT 'default' CHECK (sms_provider IN ('default', 'twilio', 'nexmo', 'alphasms', 'custom')),
  sms_api_key TEXT, -- Encrypted API key
  sms_api_secret TEXT, -- Encrypted API secret
  sms_from_number TEXT,
  sms_max_length INTEGER DEFAULT 90 CHECK (sms_max_length > 0 AND sms_max_length <= 1000),
  sms_encoding TEXT DEFAULT 'utf8' CHECK (sms_encoding IN ('utf8', 'euckr')),
  sms_timeout_seconds INTEGER DEFAULT 10 CHECK (sms_timeout_seconds > 0 AND sms_timeout_seconds <= 60),

  -- Push 알림 설정 (Push Notification Settings)
  push_enabled BOOLEAN DEFAULT FALSE,
  push_provider TEXT DEFAULT 'fcm' CHECK (push_provider IN ('fcm', 'apns', 'onesignal', 'custom')),
  push_api_key TEXT, -- Encrypted API key
  push_apns_key_id TEXT,
  push_apns_team_id TEXT,
  push_apns_bundle_id TEXT,
  push_fcm_server_key TEXT, -- Encrypted FCM server key
  push_fcm_sender_id TEXT,
  push_ttl_seconds INTEGER DEFAULT 86400 CHECK (push_ttl_seconds > 0),
  push_sound TEXT DEFAULT 'default',

  -- Web 알림 설정 (Web Notification Settings)
  web_enabled BOOLEAN DEFAULT TRUE,
  web_require_permission BOOLEAN DEFAULT TRUE,
  web_vapid_public_key TEXT,
  web_vapid_private_key TEXT, -- Encrypted VAPID private key
  web_subject TEXT DEFAULT 'mailto:admin@example.com',

  -- 발송 제한 설정 (Rate Limiting)
  rate_limit_enabled BOOLEAN DEFAULT TRUE,
  rate_limit_per_minute INTEGER DEFAULT 60 CHECK (rate_limit_per_minute > 0),
  rate_limit_per_hour INTEGER DEFAULT 1000 CHECK (rate_limit_per_hour > 0),
  rate_limit_per_day INTEGER DEFAULT 10000 CHECK (rate_limit_per_day > 0),

  -- 발송 재시도 설정 (Retry Settings)
  retry_enabled BOOLEAN DEFAULT TRUE,
  retry_max_attempts INTEGER DEFAULT 3 CHECK (retry_max_attempts >= 1 AND retry_max_attempts <= 10),
  retry_delay_seconds INTEGER DEFAULT 60 CHECK (retry_delay_seconds >= 10),
  retry_backoff_multiplier NUMERIC(3,2) DEFAULT 2.0 CHECK (retry_backoff_multiplier >= 1.0 AND retry_backoff_multiplier <= 5.0),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one delivery method can be enabled
  CONSTRAINT at_least_one_delivery_enabled CHECK (
    smtp_enabled = TRUE OR sms_enabled = TRUE OR push_enabled = TRUE OR web_enabled = TRUE
  )
);

-- Enforce single row constraint
ALTER TABLE public.notification_delivery_settings ADD CONSTRAINT notification_delivery_settings_single_row CHECK (id IS NOT NULL);

-- Indexes for notification_delivery_settings
CREATE INDEX idx_notification_delivery_settings_id ON public.notification_delivery_settings(id);

-- RLS Policies for notification_delivery_settings
-- NOTE: Sensitive data (API keys, passwords) should only be accessible to admins
ALTER TABLE public.notification_delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification_delivery_settings"
  ON public.notification_delivery_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert notification_delivery_settings"
  ON public.notification_delivery_settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update notification_delivery_settings"
  ON public.notification_delivery_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- UPDATED_AT TRIGGER FOR NOTIFICATION_DELIVERY_SETTINGS
-- =====================================================

CREATE TRIGGER update_notification_delivery_settings_updated_at
  BEFORE UPDATE ON public.notification_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTION: Mask sensitive data for non-admin queries
-- =====================================================

CREATE OR REPLACE FUNCTION get_safe_delivery_settings()
RETURNS TABLE (
  id UUID,
  smtp_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  push_enabled BOOLEAN,
  web_enabled BOOLEAN,
  rate_limit_enabled BOOLEAN,
  retry_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nds.id,
    nds.smtp_enabled,
    nds.sms_enabled,
    nds.push_enabled,
    nds.web_enabled,
    nds.rate_limit_enabled,
    nds.retry_enabled,
    nds.created_at,
    nds.updated_at
  FROM public.notification_delivery_settings nds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default delivery settings with all methods disabled
INSERT INTO public.notification_delivery_settings (
  smtp_enabled,
  sms_enabled,
  push_enabled,
  web_enabled,
  rate_limit_enabled,
  rate_limit_per_minute,
  rate_limit_per_hour,
  rate_limit_per_day,
  retry_enabled,
  retry_max_attempts,
  retry_delay_seconds,
  retry_backoff_multiplier
) VALUES (
  FALSE,  -- smtp_enabled (disabled by default, requires configuration)
  FALSE,  -- sms_enabled (disabled by default, requires API keys)
  FALSE,  -- push_enabled (disabled by default, requires configuration)
  TRUE,   -- web_enabled (enabled by default, uses VAPID keys)
  TRUE,   -- rate_limit_enabled
  60,     -- rate_limit_per_minute
  1000,   -- rate_limit_per_hour
  10000,  -- rate_limit_per_day
  TRUE,   -- retry_enabled
  3,      -- retry_max_attempts
  60,     -- retry_delay_seconds
  2.0     -- retry_backoff_multiplier
) ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
