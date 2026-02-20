-- =====================================================
-- RHYMIX-TS Installation Status Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 003_installation_status
-- Created: 2026-02-20
-- Description: Tracks installation wizard progress and configuration
-- =====================================================

-- =====================================================
-- INSTALLATION_STATUS TABLE
-- Tracks the installation progress and completion state
-- =====================================================

CREATE TABLE IF NOT EXISTS public.installation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6),
  step_data JSONB DEFAULT '{}'::JSONB,
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::JSONB,
  -- Cached configuration values for quick access
  site_name TEXT,
  admin_email TEXT,
  admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko',
  supabase_url TEXT,
  supabase_anon_key TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for installation_status
CREATE INDEX IF NOT EXISTS idx_installation_status_status ON public.installation_status(status);
CREATE INDEX IF NOT EXISTS idx_installation_status_current_step ON public.installation_status(current_step);
CREATE INDEX IF NOT EXISTS idx_installation_status_created_at ON public.installation_status(created_at DESC);

-- RLS Policies for installation_status
ALTER TABLE public.installation_status ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations during installation (no auth required yet)
-- After installation completes, only admins can view/modify
CREATE POLICY "Installation status readable during setup"
  ON public.installation_status FOR SELECT USING (
    NOT EXISTS (SELECT 1 FROM public.installation_status WHERE status = 'completed')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() IS NULL
  );

CREATE POLICY "Installation status insertable during setup"
  ON public.installation_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Installation status updatable"
  ON public.installation_status FOR UPDATE USING (true);

-- =====================================================
-- SITE_CONFIG TABLE
-- Stores site-wide configuration settings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general',
    'security',
    'email',
    'seo',
    'appearance',
    'features',
    'integration'
  )),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  validation_rules JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for site_config
CREATE INDEX IF NOT EXISTS idx_site_config_key ON public.site_config(key);
CREATE INDEX IF NOT EXISTS idx_site_config_category ON public.site_config(category);
CREATE INDEX IF NOT EXISTS idx_site_config_is_public ON public.site_config(is_public) WHERE is_public = TRUE;

-- RLS Policies for site_config
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public site config is viewable by everyone"
  ON public.site_config FOR SELECT USING (is_public = TRUE);

CREATE POLICY "All site config viewable by authenticated users"
  ON public.site_config FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage site config"
  ON public.site_config FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow insert during installation (before admin exists)
CREATE POLICY "Site config insertable during setup"
  ON public.site_config FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_installation_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_installation_status_updated_at ON public.installation_status;
CREATE TRIGGER trigger_update_installation_status_updated_at
  BEFORE UPDATE ON public.installation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_installation_status_updated_at();

-- Apply updated_at trigger to site_config
DROP TRIGGER IF EXISTS trigger_update_site_config_updated_at ON public.site_config;
CREATE TRIGGER trigger_update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW
  EXECUTE FUNCTION update_installation_status_updated_at();

-- =====================================================
-- HELPER FUNCTIONS FOR INSTALLATION
-- =====================================================

/**
 * Check if installation is complete
 * Returns true if the installation wizard has been completed
 */
CREATE OR REPLACE FUNCTION is_installation_complete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.installation_status
    WHERE status = 'completed'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

/**
 * Get current installation step
 * Returns the current step number or 0 if installation is complete
 */
CREATE OR REPLACE FUNCTION get_current_installation_step()
RETURNS INTEGER AS $$
DECLARE
  current_step INTEGER;
  is_complete BOOLEAN;
BEGIN
  -- Check if installation is complete
  SELECT is_installation_complete() INTO is_complete;

  IF is_complete THEN
    RETURN 0;
  END IF;

  -- Get the current step from installation_status
  SELECT current_step INTO current_step
  FROM public.installation_status
  LIMIT 1;

  RETURN COALESCE(current_step, 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

/**
 * Initialize default site configuration
 */
CREATE OR REPLACE FUNCTION initialize_site_config(
  p_site_name TEXT,
  p_site_description TEXT DEFAULT '',
  p_site_language TEXT DEFAULT 'ko',
  p_site_timezone TEXT DEFAULT 'Asia/Seoul',
  p_admin_email TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert default site configuration
  INSERT INTO public.site_config (key, value, category, description, is_public, is_editable) VALUES
    ('site.name', to_jsonb(p_site_name), 'general', 'Site name displayed in title and header', TRUE, TRUE),
    ('site.description', to_jsonb(p_site_description), 'general', 'Site description for SEO', TRUE, TRUE),
    ('site.language', to_jsonb(p_site_language), 'general', 'Default site language', TRUE, TRUE),
    ('site.timezone', to_jsonb(p_site_timezone), 'general', 'Site timezone', TRUE, TRUE),
    ('site.admin_email', to_jsonb(p_admin_email), 'general', 'Administrator email address', FALSE, TRUE),
    ('site.logo_url', 'null'::JSONB, 'appearance', 'Site logo URL', TRUE, TRUE),
    ('site.favicon_url', 'null'::JSONB, 'appearance', 'Site favicon URL', TRUE, TRUE),
    ('site.theme', '"default"'::JSONB, 'appearance', 'Active theme name', TRUE, TRUE),
    ('seo.meta_keywords', '[]'::JSONB, 'seo', 'Default meta keywords', TRUE, TRUE),
    ('seo.google_analytics_id', 'null'::JSONB, 'seo', 'Google Analytics tracking ID', FALSE, TRUE),
    ('auth.allow_registration', 'true'::JSONB, 'security', 'Allow new user registration', FALSE, TRUE),
    ('auth.require_email_verification', 'true'::JSONB, 'security', 'Require email verification', FALSE, TRUE),
    ('auth.allow_social_login', 'false'::JSONB, 'security', 'Allow social login providers', FALSE, TRUE),
    ('email.smtp_enabled', 'false'::JSONB, 'email', 'Enable SMTP email sending', FALSE, TRUE),
    ('features.allow_file_upload', 'true'::JSONB, 'features', 'Allow file uploads', FALSE, TRUE),
    ('features.max_file_size', '10485760'::JSONB, 'features', 'Maximum file size in bytes', FALSE, TRUE)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert initial record
INSERT INTO public.installation_status (status, current_step)
VALUES ('pending', 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.installation_status TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_status TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.site_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
