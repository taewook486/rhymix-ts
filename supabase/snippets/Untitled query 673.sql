-- Rhymix-TS Database Migration
-- Run this in Supabase SQL Editor: http://127.0.0.1:54321
-- Or in Supabase Dashboard: Database → SQL Editor

-- ============================================
-- Clean up existing tables/policies first
-- ============================================
DROP TABLE IF EXISTS public.group_permissions CASCADE;
DROP TABLE IF EXISTS public.site_modules CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- ============================================
-- 1. GROUPS Table
-- ============================================
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on groups"
  ON public.groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT
  USING (true);

-- ============================================
-- 2. PERMISSIONS Table
-- ============================================
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on permissions"
  ON public.permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

-- ============================================
-- 3. PAGES Table
-- ============================================
CREATE TABLE public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================
-- 4. GROUP_PERMISSIONS junction table
-- ============================================
CREATE TABLE public.group_permissions (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_id)
);

ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on group_permissions"
  ON public.group_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. SITE_MODULES Table
-- ============================================
CREATE TABLE public.site_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  is_core BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on site_modules"
  ON public.site_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view site_modules"
  ON public.site_modules FOR SELECT
  USING (true);

-- ============================================
-- Indexes for better performance
-- ============================================
CREATE INDEX idx_groups_name ON public.groups(name);
CREATE INDEX idx_permissions_name ON public.permissions(name);
CREATE INDEX idx_permissions_module ON public.permissions(module);
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_author_id ON public.pages(author_id);
CREATE INDEX idx_site_modules_name ON public.site_modules(name);
CREATE INDEX idx_site_modules_is_active ON public.site_modules(is_active);
