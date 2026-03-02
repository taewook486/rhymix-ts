-- =====================================================
-- STEP 1: RESET DATABASE
-- Run this first to clean up existing objects
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
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Note: Triggers are automatically dropped when tables are dropped with CASCADE
-- No need to explicitly drop triggers before dropping tables

-- Drop all custom functions
DROP FUNCTION IF EXISTS public.update_boards_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_pages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_pages_published_at() CASCADE;
DROP FUNCTION IF EXISTS public.increment_page_view_count() CASCADE;
DROP FUNCTION IF EXISTS public.verify_initial_seed() CASCADE;
DROP FUNCTION IF EXISTS public.is_seeding_complete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify reset complete
SELECT 'RESET COMPLETE' AS status, COUNT(*) AS tables_dropped
FROM pg_tables WHERE schemaname = 'public';
