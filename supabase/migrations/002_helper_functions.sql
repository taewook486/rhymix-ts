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
