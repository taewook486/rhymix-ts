-- Migration: point_settings table (WHW-040, WHW-041)
-- Sprint 3: Point System Basic Settings
-- Creates point_settings table for enabling/disabling point module and basic restrictions

-- Create point_settings table
CREATE TABLE IF NOT EXISTS public.point_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-040: 포인트 기본 설정 (Point Basic Settings)
  is_enabled BOOLEAN DEFAULT TRUE,
  point_name TEXT DEFAULT '포인트',
  max_level INTEGER DEFAULT 30 CHECK (max_level >= 1 AND max_level <= 100),
  level_icon_type TEXT DEFAULT 'default' CHECK (level_icon_type IN ('default', 'custom', 'none')),
  level_icon_path TEXT,

  -- WHW-041: 포인트 제한 (Point Restrictions)
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

-- Enable RLS
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin-only write
CREATE POLICY "Point settings are readable by all authenticated users"
  ON public.point_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage point settings"
  ON public.point_settings FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_point_settings_id ON public.point_settings(id);

-- Trigger for updated_at
CREATE TRIGGER update_point_settings_updated_at
  BEFORE UPDATE ON public.point_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.point_settings (
  is_enabled,
  point_name,
  max_level,
  level_icon_type
) VALUES (
  TRUE,
  '포인트',
  30,
  'default'
) ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.point_settings IS 'Point system basic settings and restrictions (WHW-040, WHW-041)';
COMMENT ON COLUMN public.point_settings.is_enabled IS 'Enable/disable point module (WHW-040)';
COMMENT ON COLUMN public.point_settings.point_name IS 'Display name for points (WHW-040)';
COMMENT ON COLUMN public.point_settings.max_level IS 'Maximum level cap (WHW-040)';
COMMENT ON COLUMN public.point_settings.level_icon_type IS 'Level icon display type (WHW-040)';
COMMENT ON COLUMN public.point_settings.disable_download_on_low_point IS 'Prohibit download when point is low (WHW-041)';
COMMENT ON COLUMN public.point_settings.disable_read_on_low_point IS 'Prohibit reading content when point is low (WHW-041)';
