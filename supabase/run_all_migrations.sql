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
-- =====================================================
-- RHYMIX-TS Helper Functions Migration
-- Supabase PostgreSQL 16 Migration
-- Migration: 002_helper_functions
-- Created: 2026-02-20
-- =====================================================

-- =====================================================
-- BOARD HELPER FUNCTIONS
-- =====================================================

-- Function to increment board post count
CREATE OR REPLACE FUNCTION increment_board_post_count(board_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.boards
  SET post_count = post_count + 1
  WHERE id = board_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement board post count
CREATE OR REPLACE FUNCTION decrement_board_post_count(board_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.boards
  SET post_count = GREATEST(post_count - 1, 0)
  WHERE id = board_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment board comment count
CREATE OR REPLACE FUNCTION increment_board_comment_count(board_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.boards
  SET comment_count = comment_count + 1
  WHERE id = board_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement board comment count
CREATE OR REPLACE FUNCTION decrement_board_comment_count(board_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.boards
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = board_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CATEGORY HELPER FUNCTIONS
-- =====================================================

-- Function to increment category post count
CREATE OR REPLACE FUNCTION increment_category_post_count(category_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF category_uuid IS NOT NULL THEN
    UPDATE public.categories
    SET post_count = post_count + 1
    WHERE id = category_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement category post count
CREATE OR REPLACE FUNCTION decrement_category_post_count(category_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF category_uuid IS NOT NULL THEN
    UPDATE public.categories
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = category_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VOTE HELPER FUNCTIONS
-- =====================================================

-- Function to increment vote count
CREATE OR REPLACE FUNCTION increment_vote_count(
  table_name TEXT,
  row_id UUID,
  count_field TEXT DEFAULT 'vote_count'
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + 1 WHERE id = $1',
    table_name,
    count_field,
    count_field
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement vote count
CREATE OR REPLACE FUNCTION decrement_vote_count(
  table_name TEXT,
  row_id UUID,
  count_field TEXT DEFAULT 'vote_count'
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = GREATEST(%I - 1, 0) WHERE id = $1',
    table_name,
    count_field,
    count_field
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR POST COUNTS
-- =====================================================

-- Function to update category post count when post is created/deleted
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_category_post_count(NEW.category_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.category_id != NEW.category_id THEN
      PERFORM decrement_category_post_count(OLD.category_id);
      PERFORM increment_category_post_count(NEW.category_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_category_post_count(OLD.category_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply category post count trigger
CREATE TRIGGER update_category_post_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_category_post_count();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION increment_board_post_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_board_post_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_board_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_board_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_category_post_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_category_post_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_vote_count(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_vote_count(TEXT, UUID, TEXT) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- =====================================================
-- RHYMIX-TS Installation Status Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 003_installation_status
-- Created: 2026-02-20
-- Description: Tracks installation wizard progress and configuration
-- =====================================================

-- =====================================================
-- INSTALLATION_STATUS TABLE
-- Tracks the installation progress and completion state
-- =====================================================

CREATE TABLE IF NOT EXISTS public.installation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6),
  step_data JSONB DEFAULT '{}'::JSONB,
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::JSONB,
  -- Cached configuration values for quick access
  site_name TEXT,
  admin_email TEXT,
  admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko',
  supabase_url TEXT,
  supabase_anon_key TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for installation_status
CREATE INDEX IF NOT EXISTS idx_installation_status_status ON public.installation_status(status);
CREATE INDEX IF NOT EXISTS idx_installation_status_current_step ON public.installation_status(current_step);
CREATE INDEX IF NOT EXISTS idx_installation_status_created_at ON public.installation_status(created_at DESC);

-- RLS Policies for installation_status
ALTER TABLE public.installation_status ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations during installation (no auth required yet)
-- After installation completes, only admins can view/modify
CREATE POLICY "Installation status readable during setup"
  ON public.installation_status FOR SELECT USING (
    NOT EXISTS (SELECT 1 FROM public.installation_status WHERE status = 'completed')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() IS NULL
  );

CREATE POLICY "Installation status insertable during setup"
  ON public.installation_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Installation status updatable"
  ON public.installation_status FOR UPDATE USING (true);

-- =====================================================
-- SITE_CONFIG TABLE
-- Stores site-wide configuration settings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general',
    'security',
    'email',
    'seo',
    'appearance',
    'features',
    'integration'
  )),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  validation_rules JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for site_config
CREATE INDEX IF NOT EXISTS idx_site_config_key ON public.site_config(key);
CREATE INDEX IF NOT EXISTS idx_site_config_category ON public.site_config(category);
CREATE INDEX IF NOT EXISTS idx_site_config_is_public ON public.site_config(is_public) WHERE is_public = TRUE;

-- RLS Policies for site_config
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public site config is viewable by everyone"
  ON public.site_config FOR SELECT USING (is_public = TRUE);

CREATE POLICY "All site config viewable by authenticated users"
  ON public.site_config FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage site config"
  ON public.site_config FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow insert during installation (before admin exists)
CREATE POLICY "Site config insertable during setup"
  ON public.site_config FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_installation_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_installation_status_updated_at ON public.installation_status;
CREATE TRIGGER trigger_update_installation_status_updated_at
  BEFORE UPDATE ON public.installation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_installation_status_updated_at();

-- Apply updated_at trigger to site_config
DROP TRIGGER IF EXISTS trigger_update_site_config_updated_at ON public.site_config;
CREATE TRIGGER trigger_update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW
  EXECUTE FUNCTION update_installation_status_updated_at();

-- =====================================================
-- HELPER FUNCTIONS FOR INSTALLATION
-- =====================================================

/**
 * Check if installation is complete
 * Returns true if the installation wizard has been completed
 */
CREATE OR REPLACE FUNCTION is_installation_complete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.installation_status
    WHERE status = 'completed'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

/**
 * Get current installation step
 * Returns the current step number or 0 if installation is complete
 */
CREATE OR REPLACE FUNCTION get_current_installation_step()
RETURNS INTEGER AS $$
DECLARE
  current_step INTEGER;
  is_complete BOOLEAN;
BEGIN
  -- Check if installation is complete
  SELECT is_installation_complete() INTO is_complete;

  IF is_complete THEN
    RETURN 0;
  END IF;

  -- Get the current step from installation_status
  SELECT current_step INTO current_step
  FROM public.installation_status
  LIMIT 1;

  RETURN COALESCE(current_step, 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

/**
 * Initialize default site configuration
 */
CREATE OR REPLACE FUNCTION initialize_site_config(
  p_site_name TEXT,
  p_site_description TEXT DEFAULT '',
  p_site_language TEXT DEFAULT 'ko',
  p_site_timezone TEXT DEFAULT 'Asia/Seoul',
  p_admin_email TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert default site configuration
  INSERT INTO public.site_config (key, value, category, description, is_public, is_editable) VALUES
    ('site.name', to_jsonb(p_site_name), 'general', 'Site name displayed in title and header', TRUE, TRUE),
    ('site.description', to_jsonb(p_site_description), 'general', 'Site description for SEO', TRUE, TRUE),
    ('site.language', to_jsonb(p_site_language), 'general', 'Default site language', TRUE, TRUE),
    ('site.timezone', to_jsonb(p_site_timezone), 'general', 'Site timezone', TRUE, TRUE),
    ('site.admin_email', to_jsonb(p_admin_email), 'general', 'Administrator email address', FALSE, TRUE),
    ('site.logo_url', 'null'::JSONB, 'appearance', 'Site logo URL', TRUE, TRUE),
    ('site.favicon_url', 'null'::JSONB, 'appearance', 'Site favicon URL', TRUE, TRUE),
    ('site.theme', '"default"'::JSONB, 'appearance', 'Active theme name', TRUE, TRUE),
    ('seo.meta_keywords', '[]'::JSONB, 'seo', 'Default meta keywords', TRUE, TRUE),
    ('seo.google_analytics_id', 'null'::JSONB, 'seo', 'Google Analytics tracking ID', FALSE, TRUE),
    ('auth.allow_registration', 'true'::JSONB, 'security', 'Allow new user registration', FALSE, TRUE),
    ('auth.require_email_verification', 'true'::JSONB, 'security', 'Require email verification', FALSE, TRUE),
    ('auth.allow_social_login', 'false'::JSONB, 'security', 'Allow social login providers', FALSE, TRUE),
    ('email.smtp_enabled', 'false'::JSONB, 'email', 'Enable SMTP email sending', FALSE, TRUE),
    ('features.allow_file_upload', 'true'::JSONB, 'features', 'Allow file uploads', FALSE, TRUE),
    ('features.max_file_size', '10485760'::JSONB, 'features', 'Maximum file size in bytes', FALSE, TRUE)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert initial record
INSERT INTO public.installation_status (status, current_step)
VALUES ('pending', 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.installation_status TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_status TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.site_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- =====================================================
-- FIX INSTALLATION STATUS RLS POLICY
-- Fixes infinite recursion in installation_status RLS policy
-- =====================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Installation status readable during setup" ON public.installation_status;
DROP POLICY IF EXISTS "Installation status insertable during setup" ON public.installation_status;
DROP POLICY IF EXISTS "Installation status updatable" ON public.installation_status;

-- Create simplified policies without recursion
CREATE POLICY "Allow all during installation"
  ON public.installation_status FOR ALL USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- =====================================================
-- RHYMIX-TS Profile Auto-Creation Trigger
-- Supabase PostgreSQL 16 Migration
-- Migration: 005_add_profile_trigger
-- Description: Automatically create profile when user signs up
-- =====================================================

-- =====================================================
-- PROFILE AUTO-CREATION TRIGGER
-- Automatically creates a profile record when a new user is added to auth.users
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    'user' -- Default role for regular users (must match CHECK constraint)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- =====================================================
-- RHYMIX-TS Fix Profile Trigger Role
-- Supabase PostgreSQL 16 Migration
-- Migration: 006_fix_profile_trigger_role
-- Description: Fix role value in profile trigger from 'member' to 'user'
-- =====================================================

-- Update the trigger function to use correct role value
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    'user' -- Default role for regular users (must match CHECK constraint: 'admin', 'user', 'guest', 'moderator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- =====================================================
-- RHYMIX-TS Admin Features Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 007_admin_features
-- Created: 2026-02-21
-- =====================================================

-- =====================================================
-- GROUPS TABLE (User groups for role-based access control)
-- =====================================================

CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{
    "max_members": 0,
    "permissions": []
  }'::JSONB,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CHECK (member_count >= 0)
);

-- Indexes for groups
CREATE INDEX idx_groups_slug ON public.groups(slug);
CREATE INDEX idx_groups_is_default ON public.groups(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_groups_is_admin ON public.groups(is_admin) WHERE is_admin = TRUE;
CREATE INDEX idx_groups_is_system ON public.groups(is_system) WHERE is_system = TRUE;
CREATE INDEX idx_groups_name ON public.groups USING gin(name gin_trgm_ops);
CREATE INDEX idx_groups_created_at ON public.groups(created_at DESC);

-- RLS Policies for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active groups are viewable by everyone"
  ON public.groups FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Admins can create groups"
  ON public.groups FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete groups"
  ON public.groups FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- PERMISSIONS TABLE (System permissions)
-- =====================================================

CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- 'board', 'document', 'user', 'system', etc.
  permission_type TEXT DEFAULT 'action' CHECK (permission_type IN ('action', 'resource', 'global')),
  config JSONB DEFAULT '{
    "actions": [],
    "resources": []
  }'::JSONB,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for permissions
CREATE INDEX idx_permissions_slug ON public.permissions(slug);
CREATE INDEX idx_permissions_module ON public.permissions(module);
CREATE INDEX idx_permissions_type ON public.permissions(permission_type);
CREATE INDEX idx_permissions_is_active ON public.permissions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_permissions_is_system ON public.permissions(is_system) WHERE is_system = TRUE;
CREATE INDEX idx_permissions_name ON public.permissions USING gin(name gin_trgm_ops);

-- RLS Policies for permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active permissions are viewable by everyone"
  ON public.permissions FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- GROUP_PERMISSIONS TABLE (Group-Permission mapping)
-- =====================================================

CREATE TABLE public.group_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}'::JSONB,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, permission_id),
  CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Indexes for group_permissions
CREATE INDEX idx_group_permissions_group_id ON public.group_permissions(group_id);
CREATE INDEX idx_group_permissions_permission_id ON public.group_permissions(permission_id);
CREATE INDEX idx_group_permissions_granted_by ON public.group_permissions(granted_by);
CREATE INDEX idx_group_permissions_expires_at ON public.group_permissions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_group_permissions_created_at ON public.group_permissions(created_at DESC);

-- RLS Policies for group_permissions
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view group permissions"
  ON public.group_permissions FOR SELECT USING (true);

CREATE POLICY "Admins can manage group permissions"
  ON public.group_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- USER_GROUPS TABLE (User-Group mapping)
-- =====================================================

CREATE TABLE public.user_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, group_id),
  CHECK (expires_at IS NULL OR expires_at > added_at)
);

-- Indexes for user_groups
CREATE INDEX idx_user_groups_user_id ON public.user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON public.user_groups(group_id);
CREATE INDEX idx_user_groups_is_leader ON public.user_groups(is_leader) WHERE is_leader = TRUE;
CREATE INDEX idx_user_groups_added_by ON public.user_groups(added_by);
CREATE INDEX idx_user_groups_expires_at ON public.user_groups(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies for user_groups
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view user groups"
  ON public.user_groups FOR SELECT USING (true);

CREATE POLICY "Admins can manage user groups"
  ON public.user_groups FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- SITE_MODULES TABLE (Module tracking and management)
-- =====================================================

CREATE TABLE public.site_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  author TEXT,
  homepage TEXT,
  module_type TEXT DEFAULT 'module' CHECK (module_type IN ('module', 'widget', 'addon', 'layout', 'theme')),
  category TEXT,
  icon TEXT,
  screenshot_url TEXT,
  config JSONB DEFAULT '{
    "dependencies": [],
    "settings": {}
  }'::JSONB,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  is_installed BOOLEAN DEFAULT TRUE,
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  installed_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (rating >= 0 AND rating <= 5),
  CHECK (install_count >= 0)
);

-- Indexes for site_modules
CREATE INDEX idx_site_modules_slug ON public.site_modules(slug);
CREATE INDEX idx_site_modules_type ON public.site_modules(module_type);
CREATE INDEX idx_site_modules_category ON public.site_modules(category);
CREATE INDEX idx_site_modules_is_enabled ON public.site_modules(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX idx_site_modules_is_system ON public.site_modules(is_system) WHERE is_system = TRUE;
CREATE INDEX idx_site_modules_is_installed ON public.site_modules(is_installed) WHERE is_installed = TRUE;
CREATE INDEX idx_site_modules_rating ON public.site_modules(rating DESC);
CREATE INDEX idx_site_modules_name ON public.site_modules USING gin(name gin_trgm_ops);
CREATE INDEX idx_site_modules_title ON public.site_modules USING gin(title gin_trgm_ops);

-- RLS Policies for site_modules
ALTER TABLE public.site_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled modules are viewable by everyone"
  ON public.site_modules FOR SELECT USING (is_enabled = TRUE OR is_system = TRUE);

CREATE POLICY "Admins can manage modules"
  ON public.site_modules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- PAGES TABLE (Static pages management)
-- =====================================================

CREATE TABLE public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  template TEXT DEFAULT 'default',
  layout TEXT DEFAULT 'default',
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'trash')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'password', 'member')),
  password TEXT, -- Hashed password for protected pages
  language TEXT DEFAULT 'ko',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  path TEXT DEFAULT '',
  is_homepage BOOLEAN DEFAULT FALSE,
  allow_comment BOOLEAN DEFAULT FALSE,
  show_in_menu BOOLEAN DEFAULT TRUE,
  show_in_search BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CHECK (depth >= 0 AND depth <= 5)
);

-- Full-text search vector column for pages
ALTER TABLE public.pages ADD COLUMN search_vector tsvector;
CREATE INDEX pages_search_idx ON public.pages USING gin(search_vector);

-- Trigger to update search vector for pages
CREATE OR REPLACE FUNCTION pages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.meta_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION pages_search_vector_update();

-- Indexes for pages
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_author_id ON public.pages(author_id);
CREATE INDEX idx_pages_parent_id ON public.pages(parent_id);
CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_visibility ON public.pages(visibility);
CREATE INDEX idx_pages_language ON public.pages(language);
CREATE INDEX idx_pages_is_homepage ON public.pages(is_homepage) WHERE is_homepage = TRUE;
CREATE INDEX idx_pages_show_in_menu ON public.pages(show_in_menu) WHERE show_in_menu = TRUE;
CREATE INDEX idx_pages_show_in_search ON public.pages(show_in_search) WHERE show_in_search = TRUE;
CREATE INDEX idx_pages_order_index ON public.pages(parent_id, order_index);
CREATE INDEX idx_pages_created_at ON public.pages(created_at DESC);
CREATE INDEX idx_pages_updated_at ON public.pages(updated_at DESC);
CREATE INDEX idx_pages_published_at ON public.pages(published_at DESC);
CREATE INDEX idx_pages_title ON public.pages USING gin(title gin_trgm_ops);
CREATE INDEX idx_pages_meta_keywords ON public.pages USING gin(meta_keywords);
CREATE INDEX idx_pages_meta_description ON public.pages USING gin(meta_description gin_trgm_ops);

-- RLS Policies for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published public pages are viewable by everyone"
  ON public.pages FOR SELECT USING (
    status = 'published' AND
    visibility = 'public' AND
    deleted_at IS NULL
  );

CREATE POLICY "Published member pages are viewable by members"
  ON public.pages FOR SELECT USING (
    status = 'published' AND
    visibility IN ('member', 'public') AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authors can view own pages"
  ON public.pages FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all pages"
  ON public.pages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can manage pages"
  ON public.pages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- ACTIVITY_LOG TABLE (Activity tracking and audit log)
-- =====================================================

CREATE TABLE public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
  target_type TEXT, -- 'post', 'comment', 'user', 'board', 'page', etc.
  target_id UUID,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  module TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity_log
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_action ON public.activity_log(action);
CREATE INDEX idx_activity_log_target ON public.activity_log(target_type, target_id);
CREATE INDEX idx_activity_log_severity ON public.activity_log(severity);
CREATE INDEX idx_activity_log_module ON public.activity_log(module);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_metadata ON public.activity_log USING gin(metadata);

-- Composite index for common queries
CREATE INDEX idx_activity_log_user_created ON public.activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_action_created ON public.activity_log(action, created_at DESC);

-- RLS Policies for activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON public.activity_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "System can create activity logs"
  ON public.activity_log FOR INSERT WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- =====================================================

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_modules_updated_at BEFORE UPDATE ON public.site_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS FOR ADMIN FEATURES
-- =====================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Check if user has permission through group membership
  SELECT EXISTS(
    SELECT 1
    FROM public.user_groups ug
    INNER JOIN public.group_permissions gp ON ug.group_id = gp.group_id
    INNER JOIN public.permissions p ON gp.permission_id = p.id
    WHERE ug.user_id = user_uuid
      AND p.slug = permission_slug
      AND p.is_active = TRUE
      AND (ug.expires_at IS NULL OR ug.expires_at > NOW())
      AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user groups
CREATE OR REPLACE FUNCTION get_user_groups(user_uuid UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_slug TEXT,
  is_leader BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.slug,
    ug.is_leader
  FROM public.user_groups ug
  INNER JOIN public.groups g ON ug.group_id = g.id
  WHERE ug.user_id = user_uuid
    AND g.deleted_at IS NULL
    AND (ug.expires_at IS NULL OR ug.expires_at > NOW())
  ORDER BY g.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  user_uuid UUID,
  action_text TEXT,
  target_type_text TEXT,
  target_uuid UUID,
  description_text TEXT,
  ip_addr TEXT,
  user_agent_text TEXT,
  metadata_json JSONB,
  severity_text TEXT,
  module_text TEXT
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_log (
    user_id,
    action,
    target_type,
    target_id,
    description,
    ip_address,
    user_agent,
    metadata,
    severity,
    module
  ) VALUES (
    user_uuid,
    action_text,
    target_type_text,
    target_uuid,
    description_text,
    ip_addr,
    user_agent_text,
    COALESCE(metadata_json, '{}'::JSONB),
    COALESCE(severity_text, 'info'),
    module_text
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply member count trigger
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR DELETE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- =====================================================
-- DEFAULT DATA FOR ADMIN FEATURES
-- =====================================================

-- Insert default permissions
INSERT INTO public.permissions (name, slug, description, module, permission_type, config, is_system) VALUES
  -- User management permissions
  ('Manage Users', 'admin.users.manage', 'Full access to user management', 'user', 'global', '{"actions": ["create", "read", "update", "delete"]}'::JSONB, true),
  ('View Users', 'admin.users.view', 'View user list and details', 'user', 'action', '{"actions": ["read"]}'::JSONB, true),
  ('Create Users', 'admin.users.create', 'Create new users', 'user', 'action', '{"actions": ["create"]}'::JSONB, true),
  ('Update Users', 'admin.users.update', 'Update user information', 'user', 'action', '{"actions": ["update"]}'::JSONB, true),
  ('Delete Users', 'admin.users.delete', 'Delete users', 'user', 'action', '{"actions": ["delete"]}'::JSONB, true),

  -- Board management permissions
  ('Manage Boards', 'admin.boards.manage', 'Full access to board management', 'board', 'global', '{"actions": ["create", "read", "update", "delete"]}'::JSONB, true),
  ('View Boards', 'admin.boards.view', 'View board list and details', 'board', 'action', '{"actions": ["read"]}'::JSONB, true),
  ('Create Boards', 'admin.boards.create', 'Create new boards', 'board', 'action', '{"actions": ["create"]}'::JSONB, true),
  ('Update Boards', 'admin.boards.update', 'Update board settings', 'board', 'action', '{"actions": ["update"]}'::JSONB, true),
  ('Delete Boards', 'admin.boards.delete', 'Delete boards', 'board', 'action', '{"actions": ["delete"]}'::JSONB, true),

  -- Content management permissions
  ('Manage Content', 'admin.content.manage', 'Full access to content management', 'content', 'global', '{"actions": ["create", "read", "update", "delete"]}'::JSONB, true),
  ('View All Content', 'admin.content.view', 'View all content regardless of permissions', 'content', 'action', '{"actions": ["read"]}'::JSONB, true),
  ('Manage Pages', 'admin.pages.manage', 'Full access to page management', 'page', 'global', '{"actions": ["create", "read", "update", "delete"]}'::JSONB, true),
  ('Create Pages', 'admin.pages.create', 'Create new pages', 'page', 'action', '{"actions": ["create"]}'::JSONB, true),
  ('Update Pages', 'admin.pages.update', 'Update page content', 'page', 'action', '{"actions": ["update"]}'::JSONB, true),
  ('Delete Pages', 'admin.pages.delete', 'Delete pages', 'page', 'action', '{"actions": ["delete"]}'::JSONB, true),

  -- Module management permissions
  ('Manage Modules', 'admin.modules.manage', 'Full access to module management', 'module', 'global', '{"actions": ["install", "uninstall", "enable", "disable", "configure"]}'::JSONB, true),
  ('Install Modules', 'admin.modules.install', 'Install new modules', 'module', 'action', '{"actions": ["install"]}'::JSONB, true),
  ('Configure Modules', 'admin.modules.configure', 'Configure module settings', 'module', 'action', '{"actions": ["configure"]}'::JSONB, true),

  -- System settings permissions
  ('Manage Settings', 'admin.settings.manage', 'Full access to system settings', 'system', 'global', '{"actions": ["read", "update"]}'::JSONB, true),
  ('View Settings', 'admin.settings.view', 'View system settings', 'system', 'action', '{"actions": ["read"]}'::JSONB, true),
  ('Update Settings', 'admin.settings.update', 'Update system settings', 'system', 'action', '{"actions": ["update"]}'::JSONB, true),

  -- Activity log permissions
  ('View Activity Logs', 'admin.logs.view', 'View activity and audit logs', 'log', 'action', '{"actions": ["read"]}'::JSONB, true),

  -- Comment management permissions
  ('Manage Comments', 'admin.comments.manage', 'Full access to comment management', 'comment', 'global', '{"actions": ["create", "read", "update", "delete"]}'::JSONB, true),
  ('Delete Comments', 'admin.comments.delete', 'Delete any comments', 'comment', 'action', '{"actions": ["delete"]}'::JSONB, true),

  -- File management permissions
  ('Manage Files', 'admin.files.manage', 'Full access to file management', 'file', 'global', '{"actions": ["upload", "read", "update", "delete"]}'::JSONB, true),
  ('Delete Files', 'admin.files.delete', 'Delete any files', 'file', 'action', '{"actions": ["delete"]}'::JSONB, true);

-- Insert default groups
INSERT INTO public.groups (name, slug, description, is_default, is_system) VALUES
  ('Administrators', 'administrators', 'Full system administrators with all permissions', FALSE, TRUE),
  ('Moderators', 'moderators', 'Content moderators with limited admin access', FALSE, TRUE),
  ('Registered Users', 'registered', 'Default group for registered users', TRUE, TRUE),
  ('Guests', 'guests', 'Guest users with limited access', FALSE, TRUE);

-- Grant all permissions to administrators group
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT
  (SELECT id FROM public.groups WHERE slug = 'administrators'),
  id
FROM public.permissions
WHERE is_system = TRUE;

-- Grant limited permissions to moderators group
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT
  (SELECT id FROM public.groups WHERE slug = 'moderators'),
  id
FROM public.permissions
WHERE slug IN (
  'admin.content.view',
  'admin.boards.view',
  'admin.comments.manage',
  'admin.comments.delete',
  'admin.files.manage',
  'admin.files.delete',
  'admin.logs.view'
);

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
-- =====================================================
-- WIDGET SYSTEM TABLE
-- Widget management for Rhymix TS
-- Migration: 010_widget_system
-- Created: 2026-02-22
-- =====================================================

-- =====================================================
-- SITE WIDGETS TABLE
-- =====================================================

CREATE TABLE public.site_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('html', 'text', 'menu', 'recent_posts', 'popular_posts', 'login_form', 'online_users', 'calendar', 'banner', 'custom')),
  position TEXT NOT NULL CHECK (position IN ('sidebar_left', 'sidebar_right', 'header', 'footer', 'content_top', 'content_bottom')),
  content TEXT,
  config JSONB DEFAULT '{
    "show_title": true,
    "title_style": "default",
    "css_class": "",
    "inline_style": ""
  }'::JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for site_widgets
CREATE INDEX idx_site_widgets_position ON public.site_widgets(position);
CREATE INDEX idx_site_widgets_type ON public.site_widgets(type);
CREATE INDEX idx_site_widgets_is_active ON public.site_widgets(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_site_widgets_is_visible ON public.site_widgets(is_visible) WHERE is_visible = TRUE;
CREATE INDEX idx_site_widgets_order ON public.site_widgets(position, order_index);
CREATE INDEX idx_site_widgets_name ON public.site_widgets USING gin(name gin_trgm_ops);

-- RLS Policies for site_widgets
ALTER TABLE public.site_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active widgets are viewable by everyone"
  ON public.site_widgets FOR SELECT USING (is_visible = TRUE AND deleted_at IS NULL);

CREATE POLICY "Admins can create widgets"
  ON public.site_widgets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update widgets"
  ON public.site_widgets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete widgets"
  ON public.site_widgets FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_site_widgets_updated_at BEFORE UPDATE ON public.site_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SITE THEMES TABLE
-- =====================================================

CREATE TABLE public.site_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  author_url TEXT,
  screenshot_url TEXT,
  preview_image TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_responsive BOOLEAN DEFAULT TRUE,
  supports_dark_mode BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{
    "primary_color": "#3b82f6",
    "secondary_color": "#8b5cf6",
    "font_family": "system-ui",
    "border_radius": "0.5rem",
    "custom_css": ""
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for site_themes
CREATE INDEX idx_site_themes_name ON public.site_themes(name);
CREATE INDEX idx_site_themes_is_active ON public.site_themes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_site_themes_title ON public.site_themes USING gin(title gin_trgm_ops);

-- RLS Policies for site_themes
ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes are viewable by everyone"
  ON public.site_themes FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Admins can create themes"
  ON public.site_themes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update themes"
  ON public.site_themes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete themes"
  ON public.site_themes FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_site_themes_updated_at BEFORE UPDATE ON public.site_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EDITOR AUTOSAVE TABLE
-- =====================================================

CREATE TABLE public.editor_autosave (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'page', 'comment')),
  target_id UUID,
  title TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(user_id, target_type, target_id)
);

-- Indexes for editor_autosave
CREATE INDEX idx_editor_autosave_user_target ON public.editor_autosave(user_id, target_type, target_id);
CREATE INDEX idx_editor_autosave_expires_at ON public.editor_autosave(expires_at) WHERE expires_at > NOW();

-- RLS Policies for editor_autosave
ALTER TABLE public.editor_autosave ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own autosaves"
  ON public.editor_autosave FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own autosaves"
  ON public.editor_autosave FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own autosaves"
  ON public.editor_autosave FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own autosaves"
  ON public.editor_autosave FOR DELETE USING (auth.uid() = user_id);

-- Cleanup function for expired autosaves
CREATE OR REPLACE FUNCTION cleanup_expired_autosaves()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.editor_autosave WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLL TABLES
-- =====================================================

CREATE TABLE public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  stop_date TIMESTAMPTZ,
  poll_type TEXT DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
  max_choices INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  show_results TEXT DEFAULT 'always' CHECK (show_results IN ('always', 'after_vote', 'after_end')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.poll_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.poll_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  poll_item_id UUID REFERENCES public.poll_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id, ip_address)
);

-- Indexes for polls
CREATE INDEX idx_polls_is_active ON public.polls(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_polls_stop_date ON public.polls(stop_date);
CREATE INDEX idx_poll_items_poll_id ON public.poll_items(poll_id, order_index);
CREATE INDEX idx_poll_logs_poll_id ON public.poll_logs(poll_id);
CREATE INDEX idx_poll_logs_user_id ON public.poll_logs(user_id);

-- RLS Policies for polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_logs ENABLE ROW LEVEL SECURITY;

-- Polls are viewable by everyone
CREATE POLICY "Active polls are viewable by everyone"
  ON public.polls FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "Poll items are viewable by everyone"
  ON public.poll_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.polls
      WHERE id = poll_id AND is_active = TRUE AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can manage polls"
  ON public.polls FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Authenticated users can vote"
  ON public.poll_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR ip_address IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default theme
INSERT INTO public.site_themes (name, title, description, version, author, is_active, is_responsive, supports_dark_mode) VALUES
  ('default', 'Default Theme', 'Clean and modern default theme for Rhymix TS', '1.0.0', 'Rhymix', true, true, true),
  ('simple', 'Simple Theme', 'Minimalist theme focused on content readability', '1.0.0', 'Rhymix', false, true, true),
  ('classic', 'Classic Theme', 'Traditional forum-style theme with sidebar layout', '1.0.0', 'Rhymix', false, true, false),
  ('dark', 'Dark Theme', 'Dark mode first theme for night browsing', '1.0.0', 'Community', false, true, true);

-- Insert default widgets
INSERT INTO public.site_widgets (name, title, type, position, is_active, order_index) VALUES
  ('latest_posts', 'Latest Posts', 'recent_posts', 'sidebar_right', true, 1),
  ('popular_posts', 'Popular Posts', 'popular_posts', 'sidebar_right', true, 2),
  ('login_form', 'Login Form', 'login_form', 'sidebar_right', true, 3),
  ('calendar', 'Calendar', 'calendar', 'sidebar_right', true, 4),
  ('banner', 'Banner', 'banner', 'header', true, 1);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
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
-- =====================================================
-- Messages Table Migration
-- =====================================================
-- 개인 메시지 시스템을 위한 테이블 생성
-- Phase 12: Personal Message System
-- =====================================================

-- Messages 테이블 생성
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_sender_deleted BOOLEAN DEFAULT FALSE,
  is_receiver_deleted BOOLEAN DEFAULT FALSE,
  sender_deleted_at TIMESTAMPTZ,
  receiver_deleted_at TIMESTAMPTZ,
  parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

-- Messages Full-Text Search 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_title_search ON public.messages USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING GIN(to_tsvector('english', content));

-- Message blocks 테이블 생성 (차단 기능)
CREATE TABLE IF NOT EXISTS public.message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Message blocks 인덱스
CREATE INDEX IF NOT EXISTS idx_message_blocks_blocker_id ON public.message_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_message_blocks_blocked_id ON public.message_blocks(blocked_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;

-- Messages RLS 정책
-- 사용자는 자신이 보내거나 받은 메시지만 볼 수 있음
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- 사용자는 메시지를 보낼 수 있음
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 사용자는 받은 메시지를 읽음 표시할 수 있음
DROP POLICY IF EXISTS messages_update_read_policy ON public.messages;
CREATE POLICY messages_update_read_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (
    -- 읽음 상태만 변경 가능
    CASE
      WHEN is_read IS DISTINCT FROM FALSE THEN auth.uid() = receiver_id
      ELSE TRUE
    END
  );

-- 보낸 사람은 메시지를 삭제 표시할 수 있음
DROP POLICY IF EXISTS messages_update_sender_delete_policy ON public.messages;
CREATE POLICY messages_update_sender_delete_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (
    -- 보낸 사람 삭제 상태만 변경 가능
    CASE
      WHEN is_sender_deleted IS DISTINCT FROM FALSE THEN auth.uid() = sender_id
      ELSE TRUE
    END
  );

-- 받은 사람은 메시지를 삭제 표시할 수 있음
DROP POLICY IF EXISTS messages_update_receiver_delete_policy ON public.messages;
CREATE POLICY messages_update_receiver_delete_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (
    -- 받은 사람 삭제 상태만 변경 가능
    CASE
      WHEN is_receiver_deleted IS DISTINCT FROM FALSE THEN auth.uid() = receiver_id
      ELSE TRUE
    END
  );

-- Message blocks RLS 정책
-- 사용자는 자신이 차단한 목록만 볼 수 있음
DROP POLICY IF EXISTS message_blocks_select_policy ON public.message_blocks;
CREATE POLICY message_blocks_select_policy ON public.message_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- 사용자는 다른 사용자를 차단할 수 있음
DROP POLICY IF EXISTS message_blocks_insert_policy ON public.message_blocks;
CREATE POLICY message_blocks_insert_policy ON public.message_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- 사용자는 차단을 해제할 수 있음
DROP POLICY IF EXISTS message_blocks_delete_policy ON public.message_blocks;
CREATE POLICY message_blocks_delete_policy ON public.message_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- 함수: 차단된 사용자인지 확인
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id UUID, p_target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.message_blocks
    WHERE blocker_id = p_target_id
      AND blocked_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 받은편지함 메시지 수 (삭제되지 않은 메시지만)
CREATE OR REPLACE FUNCTION public.count_inbox_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE receiver_id = p_user_id
      AND is_receiver_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 보낸편지함 메시지 수 (삭제되지 않은 메시지만)
CREATE OR REPLACE FUNCTION public.count_sent_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE sender_id = p_user_id
      AND is_sender_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 읽지 않은 메시지 수
CREATE OR REPLACE FUNCTION public.count_unread_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE receiver_id = p_user_id
      AND is_read = FALSE
      AND is_receiver_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: updated_at 자동 업데이트
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 주석
COMMENT ON TABLE public.messages IS 'Personal messages between users';
COMMENT ON COLUMN public.messages.sender_id IS 'Message sender user ID';
COMMENT ON COLUMN public.messages.receiver_id IS 'Message receiver user ID';
COMMENT ON COLUMN public.messages.title IS 'Message title';
COMMENT ON COLUMN public.messages.content IS 'Message content';
COMMENT ON COLUMN public.messages.is_read IS 'Whether the message has been read';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read';
COMMENT ON COLUMN public.messages.is_sender_deleted IS 'Whether sender deleted this message';
COMMENT ON COLUMN public.messages.is_receiver_deleted IS 'Whether receiver deleted this message';
COMMENT ON COLUMN public.messages.parent_id IS 'Parent message ID for threaded messages';

COMMENT ON TABLE public.message_blocks IS 'User block list for messages';
COMMENT ON COLUMN public.message_blocks.blocker_id IS 'User who blocked someone';
COMMENT ON COLUMN public.message_blocks.blocked_id IS 'User who was blocked';

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- =====================================================
-- LAYOUT BUILDER TABLES
-- Drag-and-drop layout builder for Rhymix TS
-- Migration: 013_layouts_table
-- Created: 2026-02-24
-- =====================================================

-- =====================================================
-- LAYOUTS TABLE
-- =====================================================

CREATE TABLE public.layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  layout_type TEXT NOT NULL DEFAULT 'custom' CHECK (layout_type IN ('default', 'custom', 'blog', 'forum', 'landing')),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{
    "columns": [],
    "rows": [],
    "widgets": []
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for layouts
CREATE INDEX idx_layouts_name ON public.layouts(name);
CREATE INDEX idx_layouts_is_active ON public.layouts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_layouts_is_default ON public.layouts(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_layouts_type ON public.layouts(layout_type);

-- RLS Policies for layouts
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active layouts are viewable by everyone"
  ON public.layouts FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "Admins can create layouts"
  ON public.layouts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update layouts"
  ON public.layouts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete layouts"
  ON public.layouts FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_layouts_updated_at BEFORE UPDATE ON public.layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LAYOUT WIDGETS TABLE
-- Stores widget placement within layouts
-- =====================================================

CREATE TABLE public.layout_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layout_id UUID REFERENCES public.layouts(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.site_widgets(id) ON DELETE CASCADE,
  column_index INTEGER DEFAULT 0,
  row_index INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  width_fraction NUMERIC(5, 2) DEFAULT 1.0, -- Fraction of column width (0.1 to 1.0)
  config JSONB DEFAULT '{}'::JSONB, -- Widget-specific overrides
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(layout_id, column_index, row_index, order_index)
);

-- Indexes for layout_widgets
CREATE INDEX idx_layout_widgets_layout_id ON public.layout_widgets(layout_id);
CREATE INDEX idx_layout_widgets_widget_id ON public.layout_widgets(widget_id);
CREATE INDEX idx_layout_widgets_position ON public.layout_widgets(layout_id, column_index, row_index, order_index);

-- RLS Policies for layout_widgets
ALTER TABLE public.layout_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Layout widgets are viewable by everyone"
  ON public.layout_widgets FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.layouts
      WHERE id = layout_id AND is_active = TRUE AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can manage layout widgets"
  ON public.layout_widgets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_layout_widgets_updated_at BEFORE UPDATE ON public.layout_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LAYOUT COLUMNS TABLE
-- Defines column structure for layouts
-- =====================================================

CREATE TABLE public.layout_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layout_id UUID REFERENCES public.layouts(id) ON DELETE CASCADE,
  column_index INTEGER DEFAULT 0,
  width_fraction NUMERIC(5, 2) NOT NULL DEFAULT 1.0, -- Fraction of total width (sum = 1.0)
  css_class TEXT,
  inline_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(layout_id, column_index)
);

-- Indexes for layout_columns
CREATE INDEX idx_layout_columns_layout_id ON public.layout_columns(layout_id);
CREATE INDEX idx_layout_columns_index ON public.layout_columns(layout_id, column_index);

-- RLS Policies for layout_columns
ALTER TABLE public.layout_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Layout columns are viewable by everyone"
  ON public.layout_columns FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.layouts
      WHERE id = layout_id AND is_active = TRUE AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can manage layout columns"
  ON public.layout_columns FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_layout_columns_updated_at BEFORE UPDATE ON public.layout_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default layouts
INSERT INTO public.layouts (name, title, description, layout_type, is_default, is_active, config) VALUES
  ('default_sidebar_right', 'Default with Right Sidebar', 'Standard layout with main content and right sidebar', 'default', true, true, '{
    "columns": [
      {
        "id": "col_main",
        "width": 0.75,
        "widgets": []
      },
      {
        "id": "col_sidebar",
        "width": 0.25,
        "widgets": ["latest_posts", "popular_posts", "login_form"]
      }
    ]
  }'::JSONB),
  ('full_width', 'Full Width', 'Full-width layout without sidebars', 'custom', false, true, '{
    "columns": [
      {
        "id": "col_main",
        "width": 1.0,
        "widgets": []
      }
    ]
  }'::JSONB),
  ('three_column', 'Three Column', 'Three-column layout with sidebars on both sides', 'custom', false, true, '{
    "columns": [
      {
        "id": "col_left",
        "width": 0.25,
        "widgets": []
      },
      {
        "id": "col_main",
        "width": 0.50,
        "widgets": []
      },
      {
        "id": "col_right",
        "width": 0.25,
        "widgets": ["latest_posts", "popular_posts"]
      }
    ]
  }'::JSONB);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get layout with all widgets and columns
CREATE OR REPLACE FUNCTION get_layout_with_widgets(p_layout_id UUID)
RETURNS JSON AS $$
DECLARE
  v_layout JSON;
  v_columns JSON;
  v_widgets JSON;
BEGIN
  -- Get layout
  SELECT json_build_object(
    'id', id,
    'name', name,
    'title', title,
    'description', description,
    'layout_type', layout_type,
    'is_default', is_default,
    'is_active', is_active,
    'config', config
  ) INTO v_layout
  FROM public.layouts
  WHERE id = p_layout_id AND deleted_at IS NULL;

  IF v_layout IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get columns
  SELECT json_agg(json_build_object(
    'id', id,
    'column_index', column_index,
    'width_fraction', width_fraction,
    'css_class', css_class,
    'inline_style', inline_style
  )) INTO v_columns
  FROM public.layout_columns
  WHERE layout_id = p_layout_id
  ORDER BY column_index;

  -- Get widgets with their positions
  SELECT json_agg(json_build_object(
    'id', lw.id,
    'widget_id', lw.widget_id,
    'widget_name', sw.name,
    'widget_title', sw.title,
    'widget_type', sw.type,
    'column_index', lw.column_index,
    'row_index', lw.row_index,
    'order_index', lw.order_index,
    'width_fraction', lw.width_fraction,
    'config', lw.config,
    'widget_config', sw.config
  )) INTO v_widgets
  FROM public.layout_widgets lw
  JOIN public.site_widgets sw ON sw.id = lw.widget_id
  WHERE lw.layout_id = p_layout_id
  ORDER BY lw.column_index, lw.row_index, lw.order_index;

  RETURN json_build_object(
    'layout', v_layout,
    'columns', COALESCE(v_columns, '[]'::JSON),
    'widgets', COALESCE(v_widgets, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "groups_select_authenticated" ON public.groups;
DROP POLICY IF EXISTS "groups_select_admin" ON public.groups;

-- Policy: Authenticated users can view all groups
CREATE POLICY "groups_select_authenticated" ON public.groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can insert groups
CREATE POLICY "groups_insert_admin" ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update groups
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete non-system groups
CREATE POLICY "groups_delete_admin" ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND is_system = false
  );
-- =====================================================
-- RHYMIX-TS Initial Data Seed Migration
-- Supabase PostgreSQL 16 Migration
-- Migration: 014_initial_data_seed
-- Created: 2026-02-28
-- SPEC: SPEC-SETUP-001
-- =====================================================

-- This migration seeds default data for new installations
-- Includes: default boards, menus, pages, configuration
-- Uses idempotent INSERT with ON CONFLICT DO NOTHING

-- =====================================================
-- SECTION 1: DEFAULT BOARDS (게시판)
-- =====================================================

-- @MX:NOTE: Default boards matching ASIS Rhymix installation
-- SPEC-SETUP-001 R1: Automatic Board Seeding

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

-- =====================================================
-- SECTION 2: DEFAULT MENUS (메뉴 구조)
-- =====================================================

-- @MX:NOTE: Default menu structure matching ASIS Rhymix
-- SPEC-SETUP-001 R2: Menu Structure Seeding

-- GNB (Global Navigation Bar - Main Menu)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'gnb',
    'Main Menu',
    'header',
    'Global Navigation Bar - Main site navigation',
    '{"type": "normal", "max_depth": 2, "expandable": true, "show_title": false}'::jsonb,
    true,
    1
  )
ON CONFLICT (name) DO NOTHING;

-- UNB (Utility Navigation Bar)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'unb',
    'Utility Menu',
    'top',
    'Utility Navigation Bar - External links',
    '{"type": "normal", "max_depth": 1, "expandable": false, "show_title": false}'::jsonb,
    true,
    2
  )
ON CONFLICT (name) DO NOTHING;

-- FNB (Footer Navigation Bar)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'fnb',
    'Footer Menu',
    'footer',
    'Footer Navigation Bar - Footer links',
    '{"type": "normal", "max_depth": 1, "expandable": false, "show_title": false}'::jsonb,
    true,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 2.1: DEFAULT MENU ITEMS
-- =====================================================

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

-- UNB Menu Items (External Links)
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

-- =====================================================
-- SECTION 3: DEFAULT PAGES (페이지)
-- =====================================================

-- @MX:NOTE: Welcome page for site homepage
-- SPEC-SETUP-001 R4: Welcome Page Creation

-- Welcome/Home Page
INSERT INTO public.pages (title, slug, content, status, author_id)
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
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- Terms of Service Page
INSERT INTO public.pages (title, slug, content, status, author_id)
VALUES
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
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- Privacy Policy Page
INSERT INTO public.pages (title, slug, content, status, author_id)
VALUES
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

If you have questions about this policy, please contact the site administrator.

---
Last updated: 2026-02-28',
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 4: SITE CONFIGURATION (사이트 설정)
-- =====================================================

-- @MX:NOTE: Default site configuration matching ASIS Rhymix
-- SPEC-SETUP-001 R6: Site Configuration Defaults

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
-- SECTION 5: SEEDING VERIFICATION FUNCTION
-- =====================================================

-- @MX:NOTE: Function to verify seeding completed successfully
-- SPEC-SETUP-001 R12: Seeding Verification

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

-- =====================================================
-- SECTION 6: HELPER FUNCTION TO CHECK SEED STATUS
-- =====================================================

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

-- =====================================================
-- SECTION 7: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION verify_initial_seed() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_seeding_complete() TO anon, authenticated;
