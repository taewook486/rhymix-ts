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
