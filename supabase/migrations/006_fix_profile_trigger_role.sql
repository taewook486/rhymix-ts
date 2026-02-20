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
