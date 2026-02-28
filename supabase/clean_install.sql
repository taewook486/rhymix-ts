-- =====================================================
-- RHYMIX-TS Clean Installation Script
-- Single-file migration with all tables, no conflicts
-- Run this in Supabase SQL Editor for fresh installation
-- Created: 2026-02-28
-- =====================================================

-- =====================================================
-- PHASE 1: RESET (Drop all existing objects)
-- =====================================================

-- Drop all existing tables (CASCADE to handle dependencies)
DROP TABLE IF EXISTS public.group_permissions CASCADE;
DROP TABLE IF EXISTS public.site_modules CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menus CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;
DROP TABLE IF EXISTS public.site_config CASCADE;
DROP TABLE IF EXISTS public.layouts CASCADE;
DROP TABLE IF EXISTS public.widgets CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.installation_status CASCADE;

-- Drop all custom functions
DROP FUNCTION IF EXISTS public.update_boards_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_pages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_pages_published_at() CASCADE;
DROP FUNCTION IF EXISTS public.increment_page_view_count() CASCADE;
DROP FUNCTION IF EXISTS public.verify_initial_seed() CASCADE;
DROP FUNCTION IF EXISTS public.is_seeding_complete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop all custom triggers
DROP TRIGGER IF EXISTS trigger_update_boards_updated_at ON public.boards;
DROP TRIGGER IF EXISTS trigger_update_pages_updated_at ON public.pages;
DROP TRIGGER IF EXISTS trigger_set_pages_published_at ON public.pages;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =====================================================
-- PHASE 2: EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- PHASE 3: TABLES (Final consolidated schemas)
-- =====================================================

-- -----------------------------------------------------
-- PROFILES TABLE (extends auth.users)
-- -----------------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  location TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest', 'moderator')),
  email_verified TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  signature TEXT,
  notification_settings JSONB DEFAULT '{"email": true, "push": false, "comment": true}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_display_name ON public.profiles USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------
-- BOARDS TABLE (Consolidated final schema)
-- -----------------------------------------------------
CREATE TABLE public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  config JSONB DEFAULT '{
    "post_permission": "all",
    "comment_permission": "all",
    "list_count": 20,
    "page_count": 10,
    "use_category": true,
    "use_tags": true,
    "use_editor": true,
    "use_file": true
  }'::jsonb,
  skin TEXT DEFAULT 'default',
  list_order INTEGER DEFAULT 0,
  sort_order TEXT DEFAULT 'newest',
  view_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_notice BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_secret BOOLEAN DEFAULT FALSE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_boards_slug ON public.boards(slug);
CREATE INDEX idx_boards_is_active ON public.boards(is_hidden);
CREATE INDEX idx_boards_admin_id ON public.boards(admin_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on boards"
  ON public.boards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Non-hidden boards are viewable by everyone"
  ON public.boards FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Admins can view hidden boards"
  ON public.boards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------------
-- GROUPS TABLE
-- -----------------------------------------------------
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_name ON public.groups(name);

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

-- -----------------------------------------------------
-- PERMISSIONS TABLE
-- -----------------------------------------------------
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_name ON public.permissions(name);
CREATE INDEX idx_permissions_module ON public.permissions(module);

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

-- -----------------------------------------------------
-- GROUP_PERMISSIONS junction table
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- PAGES TABLE (Consolidated final schema)
-- -----------------------------------------------------
CREATE TABLE public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_author_id ON public.pages(author_id);

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

-- -----------------------------------------------------
-- MENUS TABLE
-- -----------------------------------------------------
CREATE TABLE public.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX idx_menus_name ON public.menus(name);
CREATE INDEX idx_menus_location ON public.menus(location);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on menus"
  ON public.menus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Active menus are viewable by everyone"
  ON public.menus FOR SELECT
  USING (is_active = true);

-- -----------------------------------------------------
-- MENU_ITEMS TABLE
-- -----------------------------------------------------
CREATE TABLE public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  type TEXT DEFAULT 'link',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  required_role TEXT DEFAULT 'all'
);

CREATE INDEX idx_menu_items_menu_id ON public.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent_id ON public.menu_items(parent_id);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on menu_items"
  ON public.menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Visible menu items are viewable by everyone"
  ON public.menu_items FOR SELECT
  USING (is_visible = true);

-- -----------------------------------------------------
-- SITE_CONFIG TABLE
-- -----------------------------------------------------
CREATE TABLE public.site_config (
  key TEXT UNIQUE NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true
);

CREATE INDEX idx_site_config_category ON public.site_config(category);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on site_config"
  ON public.site_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Public config is viewable by everyone"
  ON public.site_config FOR SELECT
  USING (is_public = true);

-- -----------------------------------------------------
-- SITE_MODULES TABLE
-- -----------------------------------------------------
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

CREATE INDEX idx_site_modules_name ON public.site_modules(name);
CREATE INDEX idx_site_modules_is_active ON public.site_modules(is_active);

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

-- -----------------------------------------------------
-- LAYOUTS TABLE
-- -----------------------------------------------------
CREATE TABLE public.layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layouts_name ON public.layouts(name);

ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on layouts"
  ON public.layouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Active layouts are viewable by everyone"
  ON public.layouts FOR SELECT
  USING (is_active = true);

-- -----------------------------------------------------
-- WIDGETS TABLE
-- -----------------------------------------------------
CREATE TABLE public.widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_name ON public.widgets(name);

ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on widgets"
  ON public.widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Active widgets are viewable by everyone"
  ON public.widgets FOR SELECT
  USING (is_active = true);

-- -----------------------------------------------------
-- DOCUMENTS TABLE (Posts)
-- -----------------------------------------------------
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'trash', 'temp')),
  is_notice BOOLEAN DEFAULT false,
  is_secret BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_board_id ON public.documents(board_id);
CREATE INDEX idx_documents_author_id ON public.documents(author_id);
CREATE INDEX idx_documents_status ON public.documents(status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on documents"
  ON public.documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Published documents are viewable by everyone"
  ON public.documents FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can view their own documents"
  ON public.documents FOR SELECT
  USING (author_id = auth.uid());

-- -----------------------------------------------------
-- COMMENTS TABLE
-- -----------------------------------------------------
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_secret BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_document_id ON public.comments(document_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on comments"
  ON public.comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Non-secret comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (is_secret = false);

-- -----------------------------------------------------
-- MESSAGES TABLE
-- -----------------------------------------------------
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_receiver BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages they send"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- -----------------------------------------------------
-- NOTIFICATIONS TABLE
-- -----------------------------------------------------
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- FILES TABLE
-- -----------------------------------------------------
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_uploader_id ON public.files(uploader_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on files"
  ON public.files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own files"
  ON public.files FOR SELECT
  USING (uploader_id = auth.uid());

-- =====================================================
-- PHASE 4: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Update boards updated_at
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

-- Function: Update pages updated_at
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

-- Function: Increment page view count
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

-- Function: Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- PHASE 5: SEED DATA
-- =====================================================

-- Default Boards
INSERT INTO public.boards (id, slug, title, description, content, config, skin)
VALUES
  (
    gen_random_uuid(),
    'board',
    '자유게시판',
    '자유롭게 글을 작성할 수 있는 게시판입니다.',
    '자유게시판에 오신 것을 환영합니다. 자유롭게 글을 작성해 주세요.',
    '{
      "post_permission": "all",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": true,
      "use_tags": true,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  ),
  (
    gen_random_uuid(),
    'qna',
    '질문답변',
    '질문과 답변을 주고받을 수 있는 게시판입니다.',
    '궁금한 점을 질문하고 답변을 주고받는 공간입니다.',
    '{
      "post_permission": "all",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": true,
      "use_tags": true,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  ),
  (
    gen_random_uuid(),
    'notice',
    '공지사항',
    '공지사항을 확인하실 수 있습니다.',
    '사이트 공지사항입니다.',
    '{
      "post_permission": "admin",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": false,
      "use_tags": false,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  )
ON CONFLICT (slug) DO NOTHING;

-- Default Menus
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'gnb',
    'Main Menu',
    'header',
    'Global Navigation Bar - Main site navigation',
    '{"type": "normal", "max_depth": 2}'::jsonb,
    true,
    1
  ),
  (
    gen_random_uuid(),
    'unb',
    'Utility Menu',
    'top',
    'Utility Navigation Bar - External links',
    '{"type": "normal", "max_depth": 1}'::jsonb,
    true,
    2
  ),
  (
    gen_random_uuid(),
    'fnb',
    'Footer Menu',
    'footer',
    'Footer Navigation Bar - Footer links',
    '{"type": "normal", "max_depth": 1}'::jsonb,
    true,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- GNB Menu Items
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all'
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Welcome', '/', 'link', 1),
    ('Free Board', '/board', 'link', 2),
    ('Q&A', '/qna', 'link', 3),
    ('Notice', '/notice', 'link', 4)
) AS item(title, url, type, order_index)
WHERE m.name = 'gnb'
ON CONFLICT DO NOTHING;

-- UNB Menu Items
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role, is_new_window)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all',
  true
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Rhymix Official', 'https://rhymix.org/', 'link', 1),
    ('Rhymix GitHub', 'https://github.com/rhymix', 'link', 2)
) AS item(title, url, type, order_index)
WHERE m.name = 'unb'
ON CONFLICT DO NOTHING;

-- FNB Menu Items
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all'
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Terms of Service', '/terms', 'link', 1),
    ('Privacy Policy', '/privacy', 'link', 2)
) AS item(title, url, type, order_index)
WHERE m.name = 'fnb'
ON CONFLICT DO NOTHING;

-- Default Pages
INSERT INTO public.pages (title, slug, content, status)
VALUES
  (
    'Welcome to Rhymix',
    'home',
    '# Welcome to Rhymix

This is your new Rhymix-TS site powered by Next.js 16, React 19, and Supabase.

## Getting Started

1. **Admin Panel** - Access the admin panel at `/admin` to configure your site
2. **Create Content** - Add boards, pages, and content through the admin interface
3. **Customize** - Configure themes, layouts, and widgets to personalize your site

## Features

- **Modern Tech Stack**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Built-in user authentication and role management
- **Admin Panel**: Comprehensive admin dashboard for site management
- **Responsive Design**: Mobile-first responsive layouts

## Default Boards

Your site comes with three default boards:
- **Free Board** (`/board`) - General discussion board
- **Q&A** (`/qna`) - Question and answer board
- **Notice** (`/notice`) - Site announcements

## Support

For more information, visit the [Rhymix Official Site](https://rhymix.org/) or check the [GitHub repository](https://github.com/rhymix).

---

Thank you for choosing Rhymix-TS!',
    'published'
  ),
  (
    'Terms of Service',
    'terms',
    '# Terms of Service

Please review the terms of service for using this site.

## 1. Acceptance of Terms

By accessing and using this website, you accept and agree to be bound by the terms and conditions of this agreement.

## 2. Use License

Permission is granted to temporarily access the materials on this website for personal, non-commercial use only.

## 3. User Responsibilities

Users are responsible for maintaining the confidentiality of their account and for all activities that occur under their account.

## 4. Content

Users retain ownership of content they post, but grant the site a license to use, modify, and display such content.

---

Last updated: 2026-02-28',
    'published'
  ),
  (
    'Privacy Policy',
    'privacy',
    '# Privacy Policy

Your privacy is important to us. This policy explains how we collect, use, and protect your information.

## 1. Information We Collect

We collect information you provide directly, such as:
- Account information (email, username)
- Content you post
- Communications with us

## 2. How We Use Information

We use the information to:
- Provide and maintain our services
- Communicate with you
- Improve our services

## 3. Data Security

We implement appropriate security measures to protect your personal information.

## 4. Cookies

We use cookies to enhance your experience on our site.

## 5. Contact

If you have questions about this policy, contact the site administrator.

---

Last updated: 2026-02-28',
    'published'
  )
ON CONFLICT (slug) DO NOTHING;

-- Site Configuration
INSERT INTO public.site_config (key, value, category, description, is_public, is_editable)
VALUES
  -- General Settings
  ('site.theme', '"default"'::jsonb, 'appearance', 'Active theme', true, true),
  ('site.logo_url', 'null'::jsonb, 'appearance', 'Logo URL', true, true),
  ('site.favicon_url', 'null'::jsonb, 'appearance', 'Favicon URL', true, true),

  -- SEO Settings
  ('seo.meta_keywords', '[]'::jsonb, 'seo', 'Meta keywords', true, true),
  ('seo.google_analytics_id', 'null'::jsonb, 'seo', 'Google Analytics ID', false, true),

  -- Authentication Settings
  ('auth.allow_registration', 'true'::jsonb, 'security', 'Allow user registration', false, true),
  ('auth.require_email_verification', 'true'::jsonb, 'security', 'Require email verification', false, true),
  ('auth.allow_social_login', 'false'::jsonb, 'security', 'Allow social login', false, true),

  -- Email Settings
  ('email.smtp_enabled', 'false'::jsonb, 'email', 'SMTP enabled', false, true),

  -- Feature Settings
  ('features.allow_file_upload', 'true'::jsonb, 'features', 'Allow file uploads', false, true),
  ('features.max_file_size', '10485760'::jsonb, 'features', 'Max file size (bytes)', false, true),

  -- Module Settings
  ('modules.board.skin', '"default"'::jsonb, 'appearance', 'Default board skin', true, true),
  ('modules.editor.skin', '"ckeditor"'::jsonb, 'appearance', 'Default editor skin', true, true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- VERIFICATION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION verify_initial_seed()
RETURNS TABLE(
  table_name TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  status TEXT
) AS $$
BEGIN
  -- Check boards
  RETURN QUERY SELECT 'boards'::text, 3, (SELECT COUNT(*)::int FROM public.boards WHERE slug IN ('board', 'qna', 'notice')),
    CASE WHEN (SELECT COUNT(*) FROM public.boards WHERE slug IN ('board', 'qna', 'notice')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check menus
  RETURN QUERY SELECT 'menus'::text, 3, (SELECT COUNT(*)::int FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb')),
    CASE WHEN (SELECT COUNT(*) FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check pages
  RETURN QUERY SELECT 'pages'::text, 3, (SELECT COUNT(*)::int FROM public.pages WHERE slug IN ('home', 'terms', 'privacy')),
    CASE WHEN (SELECT COUNT(*) FROM public.pages WHERE slug IN ('home', 'terms', 'privacy')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check site_config
  RETURN QUERY SELECT 'site_config'::text, 13, (SELECT COUNT(*)::int FROM public.site_config),
    CASE WHEN (SELECT COUNT(*) FROM public.site_config) >= 10 THEN 'OK' ELSE 'MISSING' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_seeding_complete()
RETURNS BOOLEAN AS $$
DECLARE
  boards_count INTEGER;
  menus_count INTEGER;
  pages_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO boards_count FROM public.boards WHERE slug IN ('board', 'qna', 'notice');
  SELECT COUNT(*) INTO menus_count FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb');
  SELECT COUNT(*) INTO pages_count FROM public.pages WHERE slug IN ('home', 'terms', 'privacy');

  RETURN (boards_count >= 3 AND menus_count >= 3 AND pages_count >= 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_initial_seed() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_seeding_complete() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_page_view_count(UUID) TO anon, authenticated;

-- =====================================================
-- INSTALLATION COMPLETE
-- =====================================================

-- Verify installation
SELECT * FROM verify_initial_seed();
