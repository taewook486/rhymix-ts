-- Rhymix-TS Boards Table Migration
-- Run this in Supabase SQL Editor: http://127.0.0.1:54321
-- Or in Supabase Dashboard: Database → SQL Editor

-- ============================================
-- BOARDS Table (게시판)
-- ============================================
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  skin TEXT DEFAULT 'default',
  list_count INTEGER DEFAULT 20,
  read_page_count INTEGER DEFAULT 10,
  use_category BOOLEAN DEFAULT false,
  use_tags BOOLEAN DEFAULT true,
  use_editor BOOLEAN DEFAULT true,
  allow_comment BOOLEAN DEFAULT true,
  allow_trackback BOOLEAN DEFAULT false,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on boards"
  ON public.boards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Active boards are viewable by everyone"
  ON public.boards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Managers can view their own boards"
  ON public.boards FOR SELECT
  USING (manager_id = auth.uid());

-- ============================================
-- Indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_boards_slug ON public.boards(slug);
CREATE INDEX IF NOT EXISTS idx_boards_is_active ON public.boards(is_active);
CREATE INDEX IF NOT EXISTS idx_boards_manager_id ON public.boards(manager_id);

-- ============================================
-- Trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION update_boards_updated_at();
