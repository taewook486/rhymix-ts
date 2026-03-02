-- Migration: security_settings table (WHW-050, WHW-051, WHW-052)
-- Sprint 3: Security Settings
-- Creates security_settings table for media filters, access control, and session security

-- Create security_settings table
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-050: 미디어 필터 (Media Filter)
  mediafilter_whitelist TEXT DEFAULT 'youtube.com, vimeo.com, soundcloud.com',
  mediafilter_classes TEXT DEFAULT '',
  robot_user_agents TEXT DEFAULT 'googlebot, bingbot, slurp, daumoa',

  -- WHW-051: 관리자 접근 제어 (Admin Access Control)
  admin_allowed_ip TEXT DEFAULT '',
  admin_denied_ip TEXT DEFAULT '',

  -- WHW-052: 세션 보안 (Session Security)
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

-- Enable RLS (Admin-only access for security settings)
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security settings"
  ON public.security_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage security settings"
  ON public.security_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_security_settings_id ON public.security_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default security settings
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

-- Add comments
COMMENT ON TABLE public.security_settings IS 'Security settings for media filters, access control, and session security (WHW-050, WHW-051, WHW-052)';

-- WHW-050 comments
COMMENT ON COLUMN public.security_settings.mediafilter_whitelist IS 'Comma-separated list of allowed domains for embedded media (WHW-050)';
COMMENT ON COLUMN public.security_settings.mediafilter_classes IS 'Comma-separated list of allowed HTML class names (WHW-050)';
COMMENT ON COLUMN public.security_settings.robot_user_agents IS 'Comma-separated list of search bot user agents (WHW-050)';

-- WHW-051 comments
COMMENT ON COLUMN public.security_settings.admin_allowed_ip IS 'Comma-separated list of allowed IP addresses/CIDRs for admin login (WHW-051)';
COMMENT ON COLUMN public.security_settings.admin_denied_ip IS 'Comma-separated list of denied IP addresses/CIDRs for admin login (WHW-051)';

-- WHW-052 comments
COMMENT ON COLUMN public.security_settings.autologin_lifetime IS 'Auto-login session lifetime in seconds (default: 7 days) (WHW-052)';
COMMENT ON COLUMN public.security_settings.autologin_refresh IS 'Whether to refresh auto-login on each visit (WHW-052)';
COMMENT ON COLUMN public.security_settings.use_session_ssl IS 'Require SSL for sessions (WHW-052)';
COMMENT ON COLUMN public.security_settings.use_cookies_ssl IS 'Require SSL for cookies (WHW-052)';
COMMENT ON COLUMN public.security_settings.check_csrf_token IS 'Enable CSRF token validation (WHW-052)';
COMMENT ON COLUMN public.security_settings.use_nofollow IS 'Add rel="nofollow" to external links (WHW-052)';
COMMENT ON COLUMN public.security_settings.use_httponly IS 'Set HttpOnly flag on cookies (WHW-052)';
COMMENT ON COLUMN public.security_settings.use_samesite IS 'SameSite cookie attribute (WHW-052)';
COMMENT ON COLUMN public.security_settings.x_frame_options IS 'X-Frame-Options header value (WHW-052)';
COMMENT ON COLUMN public.security_settings.x_content_type_options IS 'X-Content-Type-Options header value (WHW-052)';
