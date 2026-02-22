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
