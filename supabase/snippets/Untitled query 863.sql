-- =====================================================
-- RESET AUTH USERS
-- Delete all existing users for clean installation
-- =====================================================

-- Delete from auth.users (cascades to auth.identities, auth.sessions, etc.)
DELETE FROM auth.users;

-- Verify deletion
SELECT 'AUTH USERS RESET' AS status,
       (SELECT COUNT(*) FROM auth.users) AS remaining_users;