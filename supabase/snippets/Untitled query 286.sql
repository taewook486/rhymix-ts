-- =====================================================
-- RHYMIX-TS Database Reset Script
-- Drops all tables and resets database to initial state
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

-- Drop all custom functions
DROP FUNCTION IF EXISTS public.update_boards_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_pages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_pages_published_at() CASCADE;
DROP FUNCTION IF EXISTS public.increment_page_view_count() CASCADE;
DROP FUNCTION IF EXISTS public.verify_initial_seed() CASCADE;
DROP FUNCTION IF EXISTS public.is_seeding_complete() CASCADE;

-- Drop all custom triggers
DROP TRIGGER IF EXISTS trigger_update_boards_updated_at ON public.boards;
DROP TRIGGER IF EXISTS trigger_update_pages_updated_at ON public.pages;
DROP TRIGGER IF EXISTS trigger_set_pages_published_at ON public.pages;

-- Database reset complete
-- Now run migrations in order:
-- 001_initial_schema.sql
-- 002_helper_functions.sql
-- 003_installation_status.sql
-- 004_fix_installation_rls.sql
-- 005_add_profile_trigger.sql
-- 006_fix_profile_trigger_role.sql
-- 007_admin_features.sql
-- 008_admin_tables.sql
-- 009_boards_table.sql
-- 010_widget_system.sql
-- 011_pages_table.sql
-- 012_messages_table.sql
-- 013_layouts_table.sql
-- 014_initial_data_seed.sql
