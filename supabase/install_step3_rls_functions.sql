-- =====================================================
-- STEP 3: RLS POLICIES, FUNCTIONS, AND TRIGGERS
-- Run AFTER step 2 completes successfully
-- =====================================================

-- =====================================================
-- ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Profiles RLS
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

-- Boards RLS
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

-- Groups RLS
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

-- Permissions RLS
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

-- Group Permissions RLS
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on group_permissions"
  ON public.group_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pages RLS
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

-- Menus RLS
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

-- Menu Items RLS
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

-- Site Config RLS
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

-- Site Modules RLS
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

-- Layouts RLS
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

-- Widgets RLS
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

-- Documents RLS
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

-- Comments RLS
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

-- Messages RLS
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

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Files RLS
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
-- CREATE FUNCTIONS AND TRIGGERS
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
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION increment_page_view_count(UUID) TO anon, authenticated;

-- =====================================================
-- VERIFY RLS AND FUNCTIONS CREATED
-- =====================================================
SELECT 'RLS AND FUNCTIONS CREATED' AS status,
       COUNT(DISTINCT schemaname||'.'||tablename) AS rls_enabled_count
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
