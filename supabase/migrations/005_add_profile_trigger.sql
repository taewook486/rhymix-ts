-- =====================================================
-- RHYMIX-TS Profile Auto-Creation Trigger
-- Supabase PostgreSQL 16 Migration
-- Migration: 005_add_profile_trigger
-- Description: Automatically create profile when user signs up
-- =====================================================

-- =====================================================
-- PROFILE AUTO-CREATION TRIGGER
-- Automatically creates a profile record when a new user is added to auth.users
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    'user' -- Default role for regular users (must match CHECK constraint)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
