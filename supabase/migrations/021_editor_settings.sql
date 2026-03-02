-- =====================================================
-- RHYMIX-TS Editor Settings Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 021_editor_settings
-- Created: 2026-03-02
-- Purpose: Editor configuration system (SPEC-RHYMIX-002 Sprint 2)
-- =====================================================

-- =====================================================
-- EDITOR_SETTINGS TABLE (Global editor configuration)
-- Single-row table for site-wide editor settings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.editor_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-030: Editor Basic Settings
  editor_skin TEXT DEFAULT 'ckeditor' CHECK (editor_skin IN ('ckeditor', 'simpleeditor', 'textarea')),
  color_scheme TEXT DEFAULT 'mondo' CHECK (color_scheme IN ('mondo', 'mondo-dark', 'mondo-lisa')),
  editor_height INTEGER DEFAULT 300 CHECK (editor_height >= 100 AND editor_height <= 2000),
  toolbar_set TEXT DEFAULT 'basic' CHECK (toolbar_set IN ('basic', 'advanced')),
  hide_toolbar BOOLEAN DEFAULT FALSE,

  -- WHW-031: Font Settings
  font_family TEXT DEFAULT 'sans-serif',
  font_size INTEGER DEFAULT 14 CHECK (font_size >= 8 AND font_size <= 72),
  line_height DECIMAL(5,2) DEFAULT 1.5 CHECK (line_height >= 1.0 AND line_height <= 3.0),

  -- WHW-032: Editor Toolbar Tools (array of enabled tools)
  enabled_tools TEXT[] DEFAULT ARRAY[
    'bold', 'italic', 'underline', 'strike', '|',
    'fontSize', 'fontFamily', '|',
    'link', 'unlink'
  ]::TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row constraint
ALTER TABLE public.editor_settings ADD CONSTRAINT editor_settings_single_row CHECK (id IS NOT NULL);

-- Indexes for editor_settings
CREATE INDEX idx_editor_settings_id ON public.editor_settings(id);

-- RLS Policies for editor_settings
ALTER TABLE public.editor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editor settings are readable by all"
  ON public.editor_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can insert editor settings"
  ON public.editor_settings FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update editor settings"
  ON public.editor_settings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER FOR EDITOR_SETTINGS
-- =====================================================

CREATE TRIGGER update_editor_settings_updated_at
  BEFORE UPDATE ON public.editor_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default settings row (only if table is empty)
INSERT INTO public.editor_settings (
  editor_skin,
  color_scheme,
  editor_height,
  toolbar_set,
  hide_toolbar,
  font_family,
  font_size,
  line_height,
  enabled_tools
) VALUES (
  'ckeditor',     -- editor_skin
  'mondo',        -- color_scheme
  300,            -- editor_height (pixels)
  'basic',        -- toolbar_set
  FALSE,          -- hide_toolbar
  'sans-serif',   -- font_family
  14,             -- font_size (points)
  1.5,            -- line_height
  ARRAY[
    'bold', 'italic', 'underline', 'strike', '|',
    'fontSize', 'fontFamily', '|',
    'link', 'unlink'
  ]::TEXT[] -- enabled_tools
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
