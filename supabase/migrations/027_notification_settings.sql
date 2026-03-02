-- =====================================================
-- RHYMIX-TS Notification Settings Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 027_notification_settings
-- Created: 2026-03-02
-- Purpose: 알림 시스템 (Notification System) - UC-007
-- WHW-060: 알림 유형 (Notification Types)
-- WHW-061: 알림 채널 (Notification Channels)
-- WHW-062: 알림 표시 설정 (Display Settings)
-- =====================================================

-- =====================================================
-- NOTIFICATION_SETTINGS TABLE (Global notification configuration)
-- Single-row table for site-wide notification settings
-- =====================================================

CREATE TABLE public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-060: 알림 유형 설정 (Notification Types)
  -- JSONB structure: { "signup": true, "login": false, "document": true, ... }
  -- 8 notification types: signup, login, document, comment, vote, scrap, mention, message
  enable_notification_types JSONB DEFAULT '{
    "signup": true,
    "login": false,
    "document": true,
    "comment": true,
    "vote": true,
    "scrap": true,
    "mention": true,
    "message": true
  }'::jsonb,

  -- WHW-061: 알림 채널 설정 (Notification Channels)
  -- JSONB structure: { "email": true, "sms": false, "push": true, "web": true }
  -- 4 channels: email, SMS, push notification, web notification
  enable_notification_channels JSONB DEFAULT '{
    "email": true,
    "sms": false,
    "push": true,
    "web": true
  }'::jsonb,

  -- WHW-062: 알림 표시 설정 (Display Settings)
  -- Notification center display settings
  notification_center_enabled BOOLEAN DEFAULT TRUE,
  notification_center_limit INTEGER DEFAULT 20 CHECK (notification_center_limit > 0 AND notification_center_limit <= 100),
  notification_center_order TEXT DEFAULT 'latest' CHECK (notification_center_order IN ('latest', 'oldest', 'type')),

  -- Real-time notification settings
  realtime_notification_enabled BOOLEAN DEFAULT TRUE,
  realtime_notification_sound BOOLEAN DEFAULT TRUE,
  realtime_notification_desktop BOOLEAN DEFAULT FALSE,

  -- Notification retention (days)
  notification_retention_days INTEGER DEFAULT 90 CHECK (notification_retention_days >= 7 AND notification_retention_days <= 365),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row constraint
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_single_row CHECK (id IS NOT NULL);

-- Indexes for notification_settings
CREATE INDEX idx_notification_settings_id ON public.notification_settings(id);

-- Check constraint for valid JSONB keys
ALTER TABLE public.notification_settings
  ADD CONSTRAINT valid_notification_types CHECK (
    enable_notification_types ?| ARRAY[
      'signup', 'login', 'document', 'comment',
      'vote', 'scrap', 'mention', 'message'
    ]
  );

ALTER TABLE public.notification_settings
  ADD CONSTRAINT valid_notification_channels CHECK (
    enable_notification_channels ?| ARRAY['email', 'sms', 'push', 'web']
  );

-- RLS Policies for notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification_settings"
  ON public.notification_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert notification_settings"
  ON public.notification_settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update notification_settings"
  ON public.notification_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- USER_NOTIFICATION_SETTINGS TABLE (Per-user notification preferences)
-- Users can customize which notifications they want to receive
-- =====================================================

CREATE TABLE public.user_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- User-specific notification type preferences
  -- Overrides global settings for this user
  notification_types JSONB DEFAULT '{} '::jsonb,

  -- User-specific notification channel preferences
  -- Overrides global settings for this user
  notification_channels JSONB DEFAULT '{} '::jsonb,

  -- Additional user preferences
  mute_all BOOLEAN DEFAULT FALSE,
  do_not_disturb BOOLEAN DEFAULT FALSE,
  do_not_disturb_start TIME DEFAULT '22:00',
  do_not_disturb_end TIME DEFAULT '08:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id)
);

-- Indexes for user_notification_settings
CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings(user_id);
CREATE INDEX idx_user_notification_settings_mute_all ON public.user_notification_settings(mute_all) WHERE mute_all = TRUE;

-- RLS Policies for user_notification_settings
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification settings"
  ON public.user_notification_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- UPDATED_AT TRIGGER FOR NOTIFICATION_SETTINGS
-- =====================================================

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UPDATED_AT TRIGGER FOR USER_NOTIFICATION_SETTINGS
-- =====================================================

CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default global notification settings
INSERT INTO public.notification_settings (
  enable_notification_types,
  enable_notification_channels,
  notification_center_enabled,
  notification_center_limit,
  notification_center_order,
  realtime_notification_enabled,
  realtime_notification_sound,
  realtime_notification_desktop,
  notification_retention_days
) VALUES (
  '{
    "signup": true,
    "login": false,
    "document": true,
    "comment": true,
    "vote": true,
    "scrap": true,
    "mention": true,
    "message": true
  }'::jsonb,
  '{
    "email": true,
    "sms": false,
    "push": true,
    "web": true
  }'::jsonb,
  TRUE,   -- notification_center_enabled
  20,     -- notification_center_limit
  'latest', -- notification_center_order
  TRUE,   -- realtime_notification_enabled
  TRUE,   -- realtime_notification_sound
  FALSE,  -- realtime_notification_desktop
  90      -- notification_retention_days
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
