-- =====================================================
-- STEP 2: CREATE EXTENSIONS AND TABLES
-- Run AFTER step 1 completes successfully
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
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

-- =====================================================
-- BOARDS TABLE
-- =====================================================
CREATE TABLE public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  config JSONB DEFAULT '{"post_permission": "all", "comment_permission": "all", "list_count": 20, "page_count": 10, "use_category": true, "use_tags": true, "use_editor": true, "use_file": true}'::jsonb,
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

-- =====================================================
-- GROUPS TABLE
-- =====================================================
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERMISSIONS TABLE
-- =====================================================
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GROUP_PERMISSIONS junction table
-- =====================================================
CREATE TABLE public.group_permissions (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_id)
);

-- =====================================================
-- PAGES TABLE
-- =====================================================
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

-- =====================================================
-- MENUS TABLE
-- =====================================================
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

-- =====================================================
-- MENU_ITEMS TABLE
-- =====================================================
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
  required_role TEXT DEFAULT 'all',
  is_new_window BOOLEAN DEFAULT false
);

-- =====================================================
-- SITE_CONFIG TABLE
-- =====================================================
CREATE TABLE public.site_config (
  key TEXT UNIQUE NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true
);

-- =====================================================
-- SITE_MODULES TABLE
-- =====================================================
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

-- =====================================================
-- LAYOUTS TABLE
-- =====================================================
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

-- =====================================================
-- WIDGETS TABLE
-- =====================================================
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

-- =====================================================
-- DOCUMENTS TABLE (Posts)
-- =====================================================
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

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
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

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
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

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
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

-- =====================================================
-- FILES TABLE
-- =====================================================
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

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_display_name ON public.profiles USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- Boards indexes
CREATE INDEX idx_boards_slug ON public.boards(slug);
CREATE INDEX idx_boards_is_active ON public.boards(is_hidden);
CREATE INDEX idx_boards_admin_id ON public.boards(admin_id);

-- Groups/Permissions indexes
CREATE INDEX idx_groups_name ON public.groups(name);
CREATE INDEX idx_permissions_name ON public.permissions(name);
CREATE INDEX idx_permissions_module ON public.permissions(module);

-- Pages indexes
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_author_id ON public.pages(author_id);

-- Menus indexes
CREATE INDEX idx_menus_name ON public.menus(name);
CREATE INDEX idx_menus_location ON public.menus(location);
CREATE INDEX idx_menu_items_menu_id ON public.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent_id ON public.menu_items(parent_id);

-- Site config indexes
CREATE INDEX idx_site_config_category ON public.site_config(category);

-- Modules indexes
CREATE INDEX idx_site_modules_name ON public.site_modules(name);
CREATE INDEX idx_site_modules_is_active ON public.site_modules(is_active);

-- Layouts/Widgets indexes
CREATE INDEX idx_layouts_name ON public.layouts(name);
CREATE INDEX idx_widgets_name ON public.widgets(name);

-- Documents/Comments indexes
CREATE INDEX idx_documents_board_id ON public.documents(board_id);
CREATE INDEX idx_documents_author_id ON public.documents(author_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_comments_document_id ON public.comments(document_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);

-- Messages/Notifications indexes
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Files indexes
CREATE INDEX idx_files_uploader_id ON public.files(uploader_id);

-- =====================================================
-- VERIFY TABLES CREATED
-- =====================================================
SELECT 'TABLES CREATED' AS status, COUNT(*) AS table_count
FROM pg_tables WHERE schemaname = 'public';
