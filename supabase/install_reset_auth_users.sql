-- =====================================================
-- RESET AUTH USERS
-- Delete all existing users for clean installation
-- =====================================================

-- Delete from auth.users (cascades to auth.identities, auth.sessions, etc.)
-- This is the core Supabase authentication table
DELETE FROM auth.users;

-- Verify deletion
SELECT 'AUTH USERS RESET' AS status,
       (SELECT COUNT(*) FROM auth.users) AS remaining_users;

-- Note: This also cascades to:
-- - auth.identities
-- - auth.sessions
-- - auth.refresh_tokens
-- - public.profiles (via trigger, but profiles are already dropped in step1)
