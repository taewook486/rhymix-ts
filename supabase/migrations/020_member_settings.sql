-- =====================================================
-- RHYMIX-TS Member Settings Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 020_member_settings
-- Created: 2026-03-02
-- Purpose: Member management enhancement (SPEC-RHYMIX-002 Sprint 1)
-- =====================================================

-- =====================================================
-- MEMBER_SETTINGS TABLE (Global member configuration)
-- Single-row table for site-wide member settings
-- =====================================================

CREATE TABLE public.member_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Registration settings
  enable_join BOOLEAN DEFAULT TRUE,
  enable_join_key TEXT, -- Secret key for restricted registration
  enable_confirm BOOLEAN DEFAULT TRUE, -- Email confirmation required
  authmail_expires INTEGER DEFAULT 86400, -- Auth email expiration (seconds, default 24h)

  -- Profile settings
  member_profile_view TEXT DEFAULT 'member' CHECK (member_profile_view IN ('everyone', 'member', 'admin')),
  allow_nickname_change BOOLEAN DEFAULT TRUE,
  update_nickname_log BOOLEAN DEFAULT TRUE, -- Log nickname changes
  nickname_symbols BOOLEAN DEFAULT FALSE, -- Allow symbols in nickname
  nickname_spaces BOOLEAN DEFAULT FALSE, -- Allow spaces in nickname
  allow_duplicate_nickname BOOLEAN DEFAULT FALSE,

  -- Password settings
  password_strength TEXT DEFAULT 'normal' CHECK (password_strength IN ('weak', 'normal', 'strong')),
  password_hashing_algorithm TEXT DEFAULT 'bcrypt' CHECK (password_hashing_algorithm IN ('bcrypt', 'argon2')),
  password_hashing_work_factor INTEGER DEFAULT 10 CHECK (password_hashing_work_factor >= 4 AND password_hashing_work_factor <= 15),
  password_hashing_auto_upgrade BOOLEAN DEFAULT TRUE,
  password_change_invalidate_other_sessions BOOLEAN DEFAULT TRUE,
  password_reset_method TEXT DEFAULT 'email' CHECK (password_reset_method IN ('email', 'question', 'admin')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row constraint
ALTER TABLE public.member_settings ADD CONSTRAINT member_settings_single_row CHECK (id IS NOT NULL);

-- Indexes for member_settings
CREATE INDEX idx_member_settings_id ON public.member_settings(id);

-- RLS Policies for member_settings
ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view member_settings"
  ON public.member_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert member_settings"
  ON public.member_settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update member_settings"
  ON public.member_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- PROFILES TABLE EXTENSIONS (Additional member fields)
-- =====================================================

-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS homepage TEXT,
  ADD COLUMN IF NOT EXISTS blog TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS allow_mailing BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_message TEXT DEFAULT 'member' CHECK (allow_message IN ('everyone', 'member', 'friend', 'nobody'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_birthday ON public.profiles(birthday) WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_allow_mailing ON public.profiles(allow_mailing) WHERE allow_mailing = TRUE;

-- =====================================================
-- MEMBER_NICKNAME_LOG TABLE (Track nickname changes)
-- =====================================================

CREATE TABLE public.member_nickname_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  old_nickname TEXT,
  new_nickname TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  reason TEXT,

  CONSTRAINT valid_nicknames CHECK (
    (old_nickname IS NULL OR old_nickname != '') AND
    new_nickname != ''
  )
);

-- Indexes for member_nickname_log
CREATE INDEX idx_member_nickname_log_user_id ON public.member_nickname_log(user_id);
CREATE INDEX idx_member_nickname_log_changed_at ON public.member_nickname_log(changed_at DESC);
CREATE INDEX idx_member_nickname_log_changed_by ON public.member_nickname_log(changed_by);

-- RLS Policies for member_nickname_log
ALTER TABLE public.member_nickname_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nickname log"
  ON public.member_nickname_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all nickname logs"
  ON public.member_nickname_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert nickname logs"
  ON public.member_nickname_log FOR INSERT WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGER FOR MEMBER_SETTINGS
-- =====================================================

CREATE TRIGGER update_member_settings_updated_at
  BEFORE UPDATE ON public.member_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default settings row (only if table is empty)
INSERT INTO public.member_settings (
  enable_join,
  enable_confirm,
  authmail_expires,
  member_profile_view,
  allow_nickname_change,
  update_nickname_log,
  nickname_symbols,
  nickname_spaces,
  allow_duplicate_nickname,
  password_strength,
  password_hashing_algorithm,
  password_hashing_work_factor,
  password_hashing_auto_upgrade,
  password_change_invalidate_other_sessions,
  password_reset_method
) VALUES (
  TRUE,   -- enable_join
  TRUE,   -- enable_confirm
  86400,  -- authmail_expires (24 hours)
  'member', -- member_profile_view
  TRUE,   -- allow_nickname_change
  TRUE,   -- update_nickname_log
  FALSE,  -- nickname_symbols
  FALSE,  -- nickname_spaces
  FALSE,  -- allow_duplicate_nickname
  'normal', -- password_strength
  'bcrypt', -- password_hashing_algorithm
  10,     -- password_hashing_work_factor
  TRUE,   -- password_hashing_auto_upgrade
  TRUE,   -- password_change_invalidate_other_sessions
  'email' -- password_reset_method
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
