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
