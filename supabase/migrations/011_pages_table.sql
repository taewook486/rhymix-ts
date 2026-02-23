-- Rhymix-TS Pages Table Migration
-- Run this in Supabase SQL Editor: http://127.0.0.1:54321
-- Or in Supabase Dashboard: Database → SQL Editor

-- ============================================
-- PAGES Table (페이지)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  layout TEXT DEFAULT 'default',
  is_homepage BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on pages"
  ON public.pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Published pages are viewable by everyone"
  ON public.pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can view their own pages"
  ON public.pages FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "Authors can insert their own pages"
  ON public.pages FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their own pages"
  ON public.pages FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their own pages"
  ON public.pages FOR DELETE
  USING (author_id = auth.uid());

-- ============================================
-- Indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON public.pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_is_homepage ON public.pages(is_homepage);
CREATE INDEX IF NOT EXISTS idx_pages_published_at ON public.pages(published_at);

-- ============================================
-- Trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION update_pages_updated_at();

-- ============================================
-- Trigger to set published_at when status changes to published
-- ============================================
CREATE OR REPLACE FUNCTION set_pages_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at := COALESCE(NEW.published_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_pages_published_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_pages_published_at();

-- ============================================
-- Helper function to increment view count
-- ============================================
CREATE OR REPLACE FUNCTION increment_page_view_count(page_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  UPDATE public.pages
  SET view_count = view_count + 1
  WHERE id = page_id
  RETURNING view_count INTO current_count;

  RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Insert sample homepage
-- ============================================
INSERT INTO public.pages (title, slug, content, status, author_id, is_homepage, published_at)
VALUES (
  'Welcome to Rhymix-TS',
  'home',
  '# Welcome to Rhymix-TS

This is a modern Next.js implementation of the Rhymix CMS.

## Features

- **Modern Tech Stack**: Next.js 16, React 19, TypeScript 5.9+
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Built-in user authentication and authorization
- **Admin Panel**: Comprehensive admin dashboard
- **Real-time**: Real-time data synchronization

## Getting Started

Edit this page in the admin panel or create new pages to build your site.',
  'published',
  (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1),
  true,
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
