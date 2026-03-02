-- Migration: level_group_mapping and level_groups tables (WHW-043)
-- Sprint 3: Level-Group Linkage
-- Creates tables for mapping user levels to groups

-- Create level_group_mapping table (settings)
CREATE TABLE IF NOT EXISTS public.level_group_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- WHW-043: 레벨-그룹 연동 설정 (Level-Group Linkage Settings)
  group_sync_mode TEXT DEFAULT 'replace' CHECK (group_sync_mode IN ('replace', 'add')),
  point_decrease_mode TEXT DEFAULT 'keep' CHECK (point_decrease_mode IN ('keep', 'demote')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Single row constraint
  CONSTRAINT level_group_mapping_single_row CHECK (id IS NOT NULL)
);

-- Enable RLS for level_group_mapping
ALTER TABLE public.level_group_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level group mapping readable by all authenticated"
  ON public.level_group_mapping FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage level group mapping"
  ON public.level_group_mapping FOR ALL
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

-- Insert default settings
INSERT INTO public.level_group_mapping (group_sync_mode, point_decrease_mode)
VALUES ('replace', 'keep') ON CONFLICT DO NOTHING;

-- Create level_groups table (per-level group assignments)
CREATE TABLE IF NOT EXISTS public.level_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 100),
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(level)
);

-- Enable RLS for level_groups
ALTER TABLE public.level_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level groups readable by all authenticated"
  ON public.level_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage level groups"
  ON public.level_groups FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_level_groups_level ON public.level_groups(level);
CREATE INDEX IF NOT EXISTS idx_level_groups_group_id ON public.level_groups(group_id);

-- Add comments
COMMENT ON TABLE public.level_group_mapping IS 'Settings for level-group synchronization (WHW-043)';
COMMENT ON COLUMN public.level_group_mapping.group_sync_mode IS 'How to assign groups: replace existing groups or add to them (WHW-043)';
COMMENT ON COLUMN public.level_group_mapping.point_decrease_mode IS 'What to do when point decreases: keep current level or demote (WHW-043)';

COMMENT ON TABLE public.level_groups IS 'Maps each level (1-100) to a group (WHW-043)';
COMMENT ON COLUMN public.level_groups.level IS 'User level (1-100, typically 1-30)';
COMMENT ON COLUMN public.level_groups.group_id IS 'Group to assign when user reaches this level';
