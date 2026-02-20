# Installation Wizard Fixes & Navigation Updates

**Date**: 2026-02-21
**Session**: Debugging installation wizard and navigation authentication

## Issues Fixed

### 1. Profile Trigger Role Mismatch (Critical Bug)

**Problem**: Database error "Database error saving new user" when creating admin account.

**Root Cause**:
- `profiles` table role constraint: `CHECK (role IN ('admin', 'user', 'guest', 'moderator'))`
- Trigger function used `'member'` as default role (NOT in allowed list)
- This violated the CHECK constraint, causing profile creation to fail

**Fix**:
- Updated `supabase/migrations/005_add_profile_trigger.sql`: Changed `'member'` → `'user'`
- Created `supabase/migrations/006_fix_profile_trigger_role.sql`
- Applied fix to local database via docker exec

**Files Modified**:
- `supabase/migrations/005_add_profile_trigger.sql`
- `supabase/migrations/006_fix_profile_trigger_role.sql` (new)

### 2. Navigation Authentication State

**Problem**: Navigation always showed "Sign In" and "Sign Up" even when logged in. No admin menu.

**Root Cause**: Navigation component had no authentication state integration.

**Fix**:
- Added `useEffect` to fetch session and profile from Supabase
- Implemented user menu with dropdown for authenticated users
- Added admin menu link (visible only when `profile.role === 'admin'`)
- Added sign out functionality
- Mobile menu support for user menu

**Files Modified**:
- `components/layout/Navigation.tsx` (complete rewrite)

**New Features**:
- User display name shown when logged in
- Admin link visible only for admin users
- Dashboard and Settings links
- Sign out functionality

### 3. Homepage Admin Panel Card

**Problem**: Admin Panel card visible on homepage for all users.

**Fix**: Removed Admin Panel card from homepage. Admin access is now only through:
- Navigation menu (for admin users)
- Direct URL `/admin`

**Files Modified**:
- `app/page.tsx`

## Remaining Tasks

### ASIS Rhymix PHP Analysis Needed

The user noted that ASIS (Rhymix PHP) analysis is insufficient. Rhymix is:
- Open-source PHP CMS (fork of XpressEngine 1.8)
- Modular architecture with plugins
- Korean-language focused

**To Research**:
- Rhymix module structure
- Core features and layout system
- Admin panel functionality
- User permissions and roles
- Menu and page management

**Sources**:
- [Rhymix GitHub](https://github.com/rhymix/rhymix) (verify)
- Official documentation (rhymix.org or similar)

## Database Schema Notes

### profiles table
```sql
role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest', 'moderator'))
```

### trigger function
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ...),
    'user'  -- Must match CHECK constraint
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing Status

- ✅ Trigger role fixed and verified in database
- ✅ Navigation authentication state working
- ✅ Homepage Admin Panel removed
- ⏳ Full installation flow testing needed
- ⏳ Admin panel functionality not yet implemented

## Next Session Priorities

1. **Complete installation wizard testing**
   - Test full flow from step 1 to completion
   - Verify admin account creation works
   - Test auto-login after installation

2. **Implement admin panel**
   - Create `/admin` dashboard
   - Site configuration management
   - User and role management

3. **ASIS Rhymix research**
   - Study original Rhymix PHP structure
   - Map features to TypeScript implementation
