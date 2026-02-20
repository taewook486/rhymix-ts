-- =====================================================
-- RHYMIX-TS Initial Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 001_initial_schema
-- Created: 2026-02-20
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For trigram-based full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- For composite indexes

-- =====================================================
-- PROFILES TABLE (extends auth.users)
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

-- Indexes for profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_display_name ON public.profiles USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- RLS Policies for profiles
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

-- =====================================================
-- BOARDS TABLE (Forum/Board configuration)
-- =====================================================

CREATE TABLE public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  icon TEXT,
  banner_url TEXT,
  config JSONB DEFAULT '{
    "post_permission": "all",
    "comment_permission": "all",
    "list_count": 20,
    "search_list_count": 20,
    "page_count": 10,
    "anonymous": false,
    "use_category": true,
    "use_tags": true,
    "use_editor": true,
    "use_file": true,
    "max_file_size": 10485760,
    "allowed_file_extensions": ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx"],
    "max_file_count": 10,
    "thumbnail_type": "crop",
    "thumbnail_width": 200,
    "thumbnail_height": 200,
    "allow_captcha": false,
    "allow_anonymous": false,
    "allow_signup": false,
    "hide_category": false,
    "list_categories": true,
    "protect_content": false,
    "protect_comment": false,
    "protect_view_count": false,
    "protect_voted_count": false,
    "protect_blamed_count": false,
    "protect_noticed": false,
    "protect_secret": false,
    "protect_document_category": false,
    "non_login_vote": false,
    "only_image": false,
    "only_image_extension": ["jpg", "jpeg", "png", "gif", "webp"],
    "disable_copy": false
  }'::JSONB,
  skin TEXT DEFAULT 'default',
  list_order TEXT DEFAULT 'latest' CHECK (list_order IN ('latest', 'voted', 'blamed', 'readed', 'commented', 'title', 'updated', 'random')),
  sort_order TEXT DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
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

-- Indexes for boards
CREATE INDEX idx_boards_slug ON public.boards(slug);
CREATE INDEX idx_boards_title ON public.boards USING gin(title gin_trgm_ops);
CREATE INDEX idx_boards_admin_id ON public.boards(admin_id);
CREATE INDEX idx_boards_is_notice ON public.boards(is_notice) WHERE is_notice = TRUE;
CREATE INDEX idx_boards_is_hidden ON public.boards(is_hidden) WHERE is_hidden = TRUE;
CREATE INDEX idx_boards_created_at ON public.boards(created_at DESC);

-- RLS Policies for boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public boards are viewable by everyone"
  ON public.boards FOR SELECT USING (NOT is_hidden OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  ));

CREATE POLICY "Admins can create boards"
  ON public.boards FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update boards"
  ON public.boards FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete boards"
  ON public.boards FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- CATEGORIES TABLE (Hierarchical categories)
-- =====================================================

CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  path TEXT DEFAULT '',
  post_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, slug),
  CHECK (depth >= 0 AND depth <= 5)
);

-- Indexes for categories
CREATE INDEX idx_categories_board_id ON public.categories(board_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_order_index ON public.categories(board_id, order_index);
CREATE INDEX idx_categories_path ON public.categories USING gin(path gin_trgm_ops);
CREATE INDEX idx_categories_name ON public.categories USING gin(name gin_trgm_ops);

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public categories are viewable by everyone"
  ON public.categories FOR SELECT USING (NOT is_hidden OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  ));

CREATE POLICY "Admins can create categories"
  ON public.categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- POSTS TABLE (Forum posts with full-text search)
-- =====================================================

CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  author_password TEXT, -- Hashed password for anonymous posts
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'trash', 'temp', 'embossed', 'secret')),
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'member', 'admin', 'only_me')),
  is_notice BOOLEAN DEFAULT FALSE,
  is_secret BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_blind BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  allow_comment BOOLEAN DEFAULT TRUE,
  allow_trackback BOOLEAN DEFAULT FALSE,
  notify_message BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,
  view_count INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  blamed_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  trackback_count INTEGER DEFAULT 0,
  attached_count INTEGER DEFAULT 0,
  readed_count INTEGER DEFAULT 0,
  voted_count INTEGER DEFAULT 0,
  comment_notified BOOLEAN DEFAULT FALSE,
  last_commenter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_commented_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Full-text search vector column
ALTER TABLE public.posts ADD COLUMN search_vector tsvector;
CREATE INDEX posts_search_idx ON public.posts USING gin(search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.author_name, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- Indexes for posts
CREATE INDEX idx_posts_board_id ON public.posts(board_id);
CREATE INDEX idx_posts_category_id ON public.posts(category_id);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_is_notice ON public.posts(is_notice) WHERE is_notice = TRUE;
CREATE INDEX idx_posts_is_secret ON public.posts(is_secret) WHERE is_secret = TRUE;
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_updated_at ON public.posts(updated_at DESC);
CREATE INDEX idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX idx_posts_view_count ON public.posts(view_count DESC);
CREATE INDEX idx_posts_vote_count ON public.posts(vote_count DESC);
CREATE INDEX idx_posts_comment_count ON public.posts(comment_count DESC);
CREATE INDEX idx_posts_title ON public.posts USING gin(title gin_trgm_ops);
CREATE INDEX idx_posts_tags ON public.posts USING gin(tags);
CREATE INDEX idx_posts_tags_gin ON public.posts USING gin(tags array_ops);
CREATE INDEX idx_posts_metadata ON public.posts USING gin(metadata);

-- Composite indexes for common queries
CREATE INDEX idx_posts_board_status_created ON public.posts(board_id, status, created_at DESC);
CREATE INDEX idx_posts_board_category_created ON public.posts(board_id, category_id, created_at DESC);
CREATE INDEX idx_posts_author_board_created ON public.posts(author_id, board_id, created_at DESC);

-- RLS Policies for posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT USING (
    status = 'published' AND
    is_hidden = FALSE AND
    (NOT is_secret OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "Authors can view own posts"
  ON public.posts FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all posts"
  ON public.posts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = author_id
  );

CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE USING (
    auth.uid() = author_id AND
    (EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_id AND is_locked = FALSE
    ) OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    ))
  );

CREATE POLICY "Authors can delete own posts"
  ON public.posts FOR DELETE USING (
    auth.uid() = author_id AND
    (EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_id AND is_locked = FALSE
    ) OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    ))
  );

CREATE POLICY "Admins can do anything with posts"
  ON public.posts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- COMMENTS TABLE (Nested comments with threading)
-- =====================================================

CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  author_password TEXT, -- Hashed password for anonymous comments
  content TEXT NOT NULL,
  content_html TEXT,
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'trash', 'secret')),
  is_secret BOOLEAN DEFAULT FALSE,
  is_blind BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  vote_count INTEGER DEFAULT 0,
  blamed_count INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  path TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for comments
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_status ON public.comments(status);
CREATE INDEX idx_comments_is_secret ON public.comments(is_secret) WHERE is_secret = TRUE;
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX idx_comments_vote_count ON public.comments(vote_count DESC);
CREATE INDEX idx_comments_content ON public.comments USING gin(content gin_trgm_ops);
CREATE INDEX idx_comments_metadata ON public.comments USING gin(metadata);
CREATE INDEX idx_comments_post_parent_created ON public.comments(post_id, parent_id, created_at ASC);
CREATE INDEX idx_comments_path ON public.comments(path);

-- Composite index for thread ordering
CREATE INDEX idx_comments_post_depth_order ON public.comments(post_id, depth, order_index);

-- RLS Policies for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visible comments are viewable by everyone"
  ON public.comments FOR SELECT USING (
    status = 'visible' AND
    is_blind = FALSE AND
    (NOT is_secret OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "Authors can view own comments"
  ON public.comments FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all comments"
  ON public.comments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = author_id
  );

CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE USING (
    auth.uid() = author_id AND
    (EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND is_locked = FALSE
    ) OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    ))
  );

CREATE POLICY "Authors can delete own comments"
  ON public.comments FOR DELETE USING (
    auth.uid() = author_id AND
    (EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND is_locked = FALSE
    ) OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    ))
  );

CREATE POLICY "Admins can do anything with comments"
  ON public.comments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- DOCUMENTS TABLE (Document content with versioning)
-- =====================================================

CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL, -- 'page', 'wiki', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  slug TEXT UNIQUE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'trash', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'password', 'member', 'admin')),
  password TEXT, -- Hashed password for protected documents
  template TEXT DEFAULT 'default',
  layout TEXT DEFAULT 'default',
  language TEXT DEFAULT 'ko',
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,
  version INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_sticky BOOLEAN DEFAULT FALSE,
  allow_comment BOOLEAN DEFAULT TRUE,
  allow_ping BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Full-text search vector column for documents
ALTER TABLE public.documents ADD COLUMN search_vector tsvector;
CREATE INDEX documents_search_idx ON public.documents USING gin(search_vector);

-- Trigger to update search vector for documents
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();

-- Indexes for documents
CREATE INDEX idx_documents_module ON public.documents(module);
CREATE INDEX idx_documents_slug ON public.documents(slug);
CREATE INDEX idx_documents_author_id ON public.documents(author_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_visibility ON public.documents(visibility);
CREATE INDEX idx_documents_language ON public.documents(language);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX idx_documents_updated_at ON public.documents(updated_at DESC);
CREATE INDEX idx_documents_published_at ON public.documents(published_at DESC);
CREATE INDEX idx_documents_title ON public.documents USING gin(title gin_trgm_ops);
CREATE INDEX idx_documents_tags ON public.documents USING gin(tags);
CREATE INDEX idx_documents_categories ON public.documents USING gin(categories);
CREATE INDEX idx_documents_metadata ON public.documents USING gin(metadata);
CREATE INDEX idx_documents_is_featured ON public.documents(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_documents_is_sticky ON public.documents(is_sticky) WHERE is_sticky = TRUE;

-- Composite indexes
CREATE INDEX idx_documents_module_status_published ON public.documents(module, status, published_at DESC);
CREATE INDEX idx_documents_author_status_created ON public.documents(author_id, status, created_at DESC);

-- RLS Policies for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published documents are viewable by everyone"
  ON public.documents FOR SELECT USING (
    status = 'published' AND visibility = 'public'
  );

CREATE POLICY "Members can view member documents"
  ON public.documents FOR SELECT USING (
    status = 'published' AND
    visibility IN ('member', 'public') AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authors can view own documents"
  ON public.documents FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all documents"
  ON public.documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authenticated users can create documents"
  ON public.documents FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = author_id
  );

CREATE POLICY "Authors can update own documents"
  ON public.documents FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins can update any document"
  ON public.documents FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authors can delete own documents"
  ON public.documents FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any document"
  ON public.documents FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- DOCUMENT VERSIONS TABLE (Version history tracking)
-- =====================================================

CREATE TABLE public.document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  change_summary TEXT,
  change_type TEXT DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'restore', 'publish')),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- Indexes for document_versions
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_author_id ON public.document_versions(author_id);
CREATE INDEX idx_document_versions_version ON public.document_versions(version);
CREATE INDEX idx_document_versions_created_at ON public.document_versions(created_at DESC);
CREATE INDEX idx_document_versions_title ON public.document_versions USING gin(title gin_trgm_ops);

-- RLS Policies for document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own document versions"
  ON public.document_versions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all document versions"
  ON public.document_versions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "System can create document versions"
  ON public.document_versions FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRANSLATIONS TABLE (Multi-language support)
-- =====================================================

CREATE TABLE public.translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lang_code TEXT NOT NULL CHECK (lang_code ~ '^[a-z]{2}(_[A-Z]{2})?$'),
  namespace TEXT DEFAULT 'core',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  plural TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lang_code, namespace, key)
);

-- Indexes for translations
CREATE INDEX idx_translations_lang_code ON public.translations(lang_code);
CREATE INDEX idx_translations_namespace ON public.translations(namespace);
CREATE INDEX idx_translations_key ON public.translations USING gin(key gin_trgm_ops);
CREATE INDEX idx_translations_value ON public.translations USING gin(value gin_trgm_ops);
CREATE INDEX idx_translations_is_active ON public.translations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_translations_is_system ON public.translations(is_system) WHERE is_system = TRUE;

-- Composite index for efficient translation lookups
CREATE INDEX idx_translations_lang_namespace_active ON public.translations(lang_code, namespace, is_active);

-- RLS Policies for translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active translations are viewable by everyone"
  ON public.translations FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can insert translations"
  ON public.translations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update translations"
  ON public.translations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete translations"
  ON public.translations FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- FILES TABLE (File management)
-- =====================================================

CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL, -- 'post', 'comment', 'document', 'profile'
  target_id UUID NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For video/audio files in seconds
  storage_path TEXT NOT NULL, -- Supabase Storage path
  cdn_url TEXT,
  thumbnail_path TEXT,
  is_image BOOLEAN DEFAULT FALSE,
  is_video BOOLEAN DEFAULT FALSE,
  is_audio BOOLEAN DEFAULT FALSE,
  is_document BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trash', 'deleted')),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for files
CREATE INDEX idx_files_target ON public.files(target_type, target_id);
CREATE INDEX idx_files_author_id ON public.files(author_id);
CREATE INDEX idx_files_mime_type ON public.files(mime_type);
CREATE INDEX idx_files_is_image ON public.files(is_image) WHERE is_image = TRUE;
CREATE INDEX idx_files_storage_path ON public.files(storage_path);
CREATE INDEX idx_files_filename ON public.files USING gin(filename gin_trgm_ops);
CREATE INDEX idx_files_status ON public.files(status);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX idx_files_metadata ON public.files USING gin(metadata);

-- RLS Policies for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active files are viewable by everyone"
  ON public.files FOR SELECT USING (status = 'active');

CREATE POLICY "Authors can view own files"
  ON public.files FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all files"
  ON public.files FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authenticated users can upload files"
  ON public.files FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = author_id
  );

CREATE POLICY "Authors can update own files"
  ON public.files FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins can update any file"
  ON public.files FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authors can delete own files"
  ON public.files FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any file"
  ON public.files FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- MENUS TABLE (Navigation menu structure)
-- =====================================================

CREATE TABLE public.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('header', 'footer', 'sidebar', 'top', 'bottom')),
  description TEXT,
  config JSONB DEFAULT '{
    "type": "normal",
    "max_depth": 3,
    "expandable": true,
    "show_title": false
  }'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for menus
CREATE INDEX idx_menus_location ON public.menus(location);
CREATE INDEX idx_menus_is_active ON public.menus(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_menus_order_index ON public.menus(order_index);
CREATE INDEX idx_menus_name ON public.menus USING gin(name gin_trgm_ops);

-- RLS Policies for menus
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active menus are viewable by everyone"
  ON public.menus FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage menus"
  ON public.menus FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- MENU ITEMS TABLE (Individual menu items)
-- =====================================================

CREATE TABLE public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  type TEXT DEFAULT 'link' CHECK (type IN ('link', 'divider', 'header', 'action', 'custom')),
  icon TEXT,
  badge TEXT,
  target TEXT DEFAULT '_self' CHECK (target IN ('_self', '_blank', '_parent', '_top')),
  rel TEXT,
  css_class TEXT,
  style TEXT,
  depth INTEGER DEFAULT 0,
  path TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  is_new_window BOOLEAN DEFAULT FALSE,
  is_nofollow BOOLEAN DEFAULT FALSE,
  required_role TEXT DEFAULT 'all' CHECK (required_role IN ('all', 'member', 'admin')),
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_menu_id ON public.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent_id ON public.menu_items(parent_id);
CREATE INDEX idx_menu_items_depth ON public.menu_items(depth);
CREATE INDEX idx_menu_items_order_index ON public.menu_items(menu_id, parent_id, order_index);
CREATE INDEX idx_menu_items_is_active ON public.menu_items(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_menu_items_is_visible ON public.menu_items(is_visible) WHERE is_visible = TRUE;
CREATE INDEX idx_menu_items_path ON public.menu_items(path);
CREATE INDEX idx_menu_items_title ON public.menu_items USING gin(title gin_trgm_ops);
CREATE INDEX idx_menu_items_config ON public.menu_items USING gin(config);

-- RLS Policies for menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active visible menu items are viewable by everyone"
  ON public.menu_items FOR SELECT USING (
    is_active = TRUE AND
    is_visible = TRUE AND
    (required_role = 'all' OR (required_role = 'member' AND auth.uid() IS NOT NULL))
  );

CREATE POLICY "Admins can view all menu items"
  ON public.menu_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- VOTES TABLE (Vote/like system)
-- =====================================================

CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'document')),
  target_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type TEXT DEFAULT 'up' CHECK (vote_type IN ('up', 'down')),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, user_id)
);

-- Indexes for votes
CREATE INDEX idx_votes_target ON public.votes(target_type, target_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_votes_vote_type ON public.votes(vote_type);
CREATE INDEX idx_votes_created_at ON public.votes(created_at DESC);

-- RLS Policies for votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view votes"
  ON public.votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SCRAP FOLDERS TABLE (Scrap organization)
-- =====================================================

CREATE TABLE public.scrap_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES public.scrap_folders(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scrap_folders
CREATE INDEX idx_scrap_folders_user_id ON public.scrap_folders(user_id);
CREATE INDEX idx_scrap_folders_parent_id ON public.scrap_folders(parent_id);
CREATE INDEX idx_scrap_folders_order_index ON public.scrap_folders(user_id, order_index);
CREATE INDEX idx_scrap_folders_is_default ON public.scrap_folders(is_default) WHERE is_default = TRUE;

-- RLS Policies for scrap_folders
ALTER TABLE public.scrap_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scrap folders"
  ON public.scrap_folders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create scrap folders"
  ON public.scrap_folders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scrap folders"
  ON public.scrap_folders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scrap folders"
  ON public.scrap_folders FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SCRAP TABLE (Bookmark/scrap system)
-- =====================================================

CREATE TABLE public.scraps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'document')),
  target_id UUID NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  thumbnail_url TEXT,
  url TEXT NOT NULL,
  folder_id UUID REFERENCES public.scrap_folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- Indexes for scraps
CREATE INDEX idx_scraps_user_id ON public.scraps(user_id);
CREATE INDEX idx_scraps_target ON public.scraps(target_type, target_id);
CREATE INDEX idx_scraps_folder_id ON public.scraps(folder_id);
CREATE INDEX idx_scraps_is_favorite ON public.scraps(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_scraps_created_at ON public.scraps(created_at DESC);
CREATE INDEX idx_scraps_tags ON public.scraps USING gin(tags);
CREATE INDEX idx_scraps_title ON public.scraps USING gin(title gin_trgm_ops);

-- RLS Policies for scraps
ALTER TABLE public.scraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scraps"
  ON public.scraps FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create scraps"
  ON public.scraps FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scraps"
  ON public.scraps FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scraps"
  ON public.scraps FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATIONS TABLE (User notifications)
-- =====================================================

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'mention', 'like', 'reply', 'system', 'admin')),
  title TEXT NOT NULL,
  content TEXT,
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- RLS Policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TAGS TABLE (Centralized tag management)
-- =====================================================

CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tags
CREATE INDEX idx_tags_name ON public.tags USING gin(name gin_trgm_ops);
CREATE INDEX idx_tags_slug ON public.tags(slug);
CREATE INDEX idx_tags_count ON public.tags(count DESC);
CREATE INDEX idx_tags_created_at ON public.tags(created_at DESC);

-- RLS Policies for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tags"
  ON public.tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- POINTS TABLE (User points/rewards)
-- =====================================================

CREATE TABLE public.points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  point INTEGER NOT NULL,
  reason TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for points
CREATE INDEX idx_points_user_id ON public.points(user_id);
CREATE INDEX idx_points_target ON public.points(target_type, target_id);
CREATE INDEX idx_points_created_at ON public.points(created_at DESC);

-- RLS Policies for points
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.points FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create point records"
  ON public.points FOR INSERT WITH CHECK (true);

-- =====================================================
-- SETTINGS TABLE (System configuration)
-- =====================================================

CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, key)
);

-- Indexes for settings
CREATE INDEX idx_settings_module ON public.settings(module);
CREATE INDEX idx_settings_key ON public.settings USING gin(key gin_trgm_ops);
CREATE INDEX idx_settings_is_public ON public.settings(is_public) WHERE is_public = TRUE;

-- RLS Policies for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public settings are viewable by everyone"
  ON public.settings FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Admins can view all settings"
  ON public.settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraps_updated_at BEFORE UPDATE ON public.scraps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scrap_folders_updated_at BEFORE UPDATE ON public.scrap_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(table_name TEXT, row_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET view_count = view_count + 1 WHERE id = $1',
    table_name
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's total points
CREATE OR REPLACE FUNCTION get_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(point), 0) INTO total_points
  FROM public.points
  WHERE user_id = user_uuid;
  RETURN total_points;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comment_count = comment_count + 1,
        last_commenter_id = NEW.author_id,
        last_commented_at = NEW.created_at
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply comment count trigger
CREATE TRIGGER update_post_comment_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default admin role placeholder
-- (Actual admin will be created during initial setup)

-- Insert default translations for English
INSERT INTO public.translations (lang_code, namespace, key, value, is_system) VALUES
  ('en', 'core', 'common.welcome', 'Welcome', true),
  ('en', 'core', 'common.login', 'Login', true),
  ('en', 'core', 'common.logout', 'Logout', true),
  ('en', 'core', 'common.signup', 'Sign Up', true),
  ('en', 'core', 'common.search', 'Search', true),
  ('en', 'core', 'common.read_more', 'Read More', true),
  ('en', 'core', 'common.submit', 'Submit', true),
  ('en', 'core', 'common.cancel', 'Cancel', true),
  ('en', 'core', 'common.save', 'Save', true),
  ('en', 'core', 'common.delete', 'Delete', true),
  ('en', 'core', 'common.edit', 'Edit', true),
  ('en', 'core', 'common.create', 'Create', true),
  ('en', 'core', 'common.update', 'Update', true),
  ('en', 'core', 'board.title', 'Board', true),
  ('en', 'core', 'board.list', 'Board List', true),
  ('en', 'core', 'board.create_post', 'Create Post', true),
  ('en', 'core', 'board.comment', 'Comment', true),
  ('en', 'core', 'board.category', 'Category', true),
  ('en', 'core', 'board.view_count', 'Views', true),
  ('en', 'core', 'board.vote_count', 'Votes', true);

-- Insert default translations for Korean
INSERT INTO public.translations (lang_code, namespace, key, value, is_system) VALUES
  ('ko', 'core', 'common.welcome', '환영합니다', true),
  ('ko', 'core', 'common.login', '로그인', true),
  ('ko', 'core', 'common.logout', '로그아웃', true),
  ('ko', 'core', 'common.signup', '회원가입', true),
  ('ko', 'core', 'common.search', '검색', true),
  ('ko', 'core', 'common.read_more', '더 보기', true),
  ('ko', 'core', 'common.submit', '제출', true),
  ('ko', 'core', 'common.cancel', '취소', true),
  ('ko', 'core', 'common.save', '저장', true),
  ('ko', 'core', 'common.delete', '삭제', true),
  ('ko', 'core', 'common.edit', '수정', true),
  ('ko', 'core', 'common.create', '생성', true),
  ('ko', 'core', 'common.update', '업데이트', true),
  ('ko', 'core', 'board.title', '게시판', true),
  ('ko', 'core', 'board.list', '게시판 목록', true),
  ('ko', 'core', 'board.create_post', '글쓰기', true),
  ('ko', 'core', 'board.comment', '댓글', true),
  ('ko', 'core', 'board.category', '분류', true),
  ('ko', 'core', 'board.view_count', '조회', true),
  ('ko', 'core', 'board.vote_count', '추천', true);

-- Insert default settings
INSERT INTO public.settings (module, key, value, description, is_public, is_system) VALUES
  ('core', 'site.title', '"Rhymix TS"', 'Site title', true, true),
  ('core', 'site.description', '"Rhymix TypeScript CMS"', 'Site description', true, true),
  ('core', 'site.language', '"ko"', 'Default language', true, true),
  ('core', 'site.timezone', '"Asia/Seoul"', 'Site timezone', true, true),
  ('core', 'auth.signup_enabled', 'true', 'Allow new user registration', false, true),
  ('core', 'auth.email_verification', 'true', 'Require email verification', false, true),
  ('core', 'board.items_per_page', '20', 'Number of posts per page', false, true),
  ('core', 'file.max_upload_size', '10485760', 'Max file upload size in bytes', false, true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on tables for anon users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant all permissions on tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
