# Database Schema Analysis for Admin Menu Features

**Analysis Date:** 2026-03-02
**SPEC:** SPEC-RHYMIX-001
**Purpose:** Identify existing and missing database tables for admin menu implementation

---

## Executive Summary

This analysis examines the current database schema for features required by admin menu implementations. The existing schema provides a solid foundation for most admin features, but some tables need to be created or extended.

**Overall Status:**
- Existing Tables: 35+
- Missing Tables: 6
- Partial Implementation: 4

---

## 1. Member Settings Configuration

### Existing Tables

#### `profiles` (Migration: 001_initial_schema.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users) |
| email | TEXT | User email (unique) |
| display_name | TEXT | Display name |
| avatar_url | TEXT | Profile image URL |
| bio | TEXT | User biography |
| role | TEXT | Role: admin, user, guest, moderator |
| notification_settings | JSONB | Notification preferences |
| metadata | JSONB | Additional user metadata |

**Key Features:**
- RLS policies for profile access control
- Admin role check functions available
- Notification settings stored as JSONB

#### `site_config` (Migration: 003_installation_status.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | TEXT | Configuration key (unique) |
| value | JSONB | Configuration value |
| category | TEXT | Category: general, security, email, seo, appearance, features, integration |
| description | TEXT | Configuration description |
| is_public | BOOLEAN | Public visibility |
| is_editable | BOOLEAN | Editable from admin panel |
| validation_rules | JSONB | Validation rules |

**Existing Member-Related Config Keys:**
- `auth.allow_registration`
- `auth.require_email_verification`
- `auth.allow_social_login`

### Missing Tables

#### `member_config` (New Table Needed)
**Purpose:** Store member module-specific configuration settings

**Recommended Schema:**
```sql
CREATE TABLE public.member_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'member' CHECK (category IN (
    'member',
    'signup',
    'login',
    'profile',
    'security'
  )),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Required Configuration Keys:**
- `member.signup.enable_email_verification`
- `member.signup.enable_agreement`
- `member.signup.enable_nickname`
- `member.signup.enable_profile_image`
- `member.login.enable_remember_me`
- `member.login.max_attempts`
- `member.login.lockout_duration`
- `member.profile.enable_signature`
- `member.profile.enable_website`
- `member.profile.max_signature_length`

---

## 2. Member Groups

### Existing Tables

#### `groups` (Migration: 007_admin_features.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Group name (unique) |
| slug | TEXT | URL-friendly identifier (unique) |
| description | TEXT | Group description |
| icon | TEXT | Group icon |
| color | TEXT | Group color |
| is_default | BOOLEAN | Default group for new users |
| is_admin | BOOLEAN | Admin group flag |
| is_system | BOOLEAN | System-protected group |
| config | JSONB | Group configuration |
| member_count | INTEGER | Cached member count |

#### `user_groups` (Migration: 007_admin_features.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles(id) |
| group_id | UUID | References groups(id) |
| is_leader | BOOLEAN | Group leader flag |
| added_by | UUID | Admin who added user |
| added_at | TIMESTAMPTZ | When user was added |
| expires_at | TIMESTAMPTZ | Optional expiration |

**Key Features:**
- Automatic member_count updates via trigger
- Group leader support
- Expiration support for temporary memberships
- RLS policies for admin management

#### `group_permissions` (Migration: 007_admin_features.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | References groups(id) |
| permission_id | UUID | References permissions(id) |
| config | JSONB | Permission configuration |
| granted_by | UUID | Admin who granted |
| granted_at | TIMESTAMPTZ | When permission granted |
| expires_at | TIMESTAMPTZ | Optional expiration |

### Missing Tables

#### `group_image` (New Table Needed)
**Purpose:** Store group-specific images/badges

**Recommended Schema:**
```sql
CREATE TABLE public.group_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  image_type TEXT NOT NULL CHECK (image_type IN ('badge', 'icon', 'banner')),
  image_url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Point Configuration

### Existing Tables

#### `points` (Migration: 001_initial_schema.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles(id) |
| point | INTEGER | Point change (positive/negative) |
| reason | TEXT | Reason for point change |
| target_type | TEXT | Related content type |
| target_id | UUID | Related content ID |
| created_at | TIMESTAMPTZ | When points were awarded |

**Helper Functions:**
- `get_user_points(user_uuid)` - Returns total points for a user

### Missing Tables

#### `point_config` (New Table Needed)
**Purpose:** Configure point rewards for various actions

**Recommended Schema:**
```sql
CREATE TABLE public.point_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT UNIQUE NOT NULL,
  action_name TEXT NOT NULL,
  point_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_daily_count INTEGER DEFAULT 0, -- 0 = unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Required Action Types:**
- `signup` - New user registration
- `login` - Daily login bonus
- `write_post` - Creating a post
- `write_comment` - Creating a comment
- `upload_file` - Uploading a file
- `receive_vote` - Receiving a vote/like
- `download_file` - Downloading a file
- `delete_post` - Post deletion (negative)

#### `point_levels` (New Table Needed)
**Purpose:** Define point-based user levels/ranks

**Recommended Schema:**
```sql
CREATE TABLE public.point_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  icon_url TEXT,
  badge_color TEXT,
  description TEXT,
  benefits JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Widget Management

### Existing Tables

#### `site_widgets` (Migration: 010_widget_system.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Widget identifier (unique) |
| title | TEXT | Display title |
| description | TEXT | Widget description |
| type | TEXT | Widget type: html, text, menu, recent_posts, popular_posts, login_form, online_users, calendar, banner, custom |
| position | TEXT | Position: sidebar_left, sidebar_right, header, footer, content_top, content_bottom |
| content | TEXT | Widget content |
| config | JSONB | Widget configuration |
| is_active | BOOLEAN | Active status |
| is_visible | BOOLEAN | Visibility |
| order_index | INTEGER | Display order |

**Default Widgets Seeded:**
- latest_posts
- popular_posts
- login_form
- calendar
- banner

#### `layout_widgets` (Migration: 013_layouts_table.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| layout_id | UUID | References layouts(id) |
| widget_id | UUID | References site_widgets(id) |
| column_index | INTEGER | Column position |
| row_index | INTEGER | Row position |
| order_index | INTEGER | Display order |
| width_fraction | NUMERIC | Width (0.1 to 1.0) |
| config | JSONB | Widget-specific overrides |

### Missing Tables

None - Widget system is complete for admin menu needs.

---

## 5. Theme Settings

### Existing Tables

#### `site_themes` (Migration: 010_widget_system.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Theme identifier (unique) |
| title | TEXT | Display title |
| description | TEXT | Theme description |
| version | TEXT | Theme version |
| author | TEXT | Theme author |
| author_url | TEXT | Author website |
| screenshot_url | TEXT | Theme preview image |
| preview_image | TEXT | Alternative preview |
| is_active | BOOLEAN | Active status |
| is_responsive | BOOLEAN | Responsive design support |
| supports_dark_mode | BOOLEAN | Dark mode support |
| config | JSONB | Theme configuration |

**Default Themes Seeded:**
- default
- simple
- classic
- dark

**Config JSONB Structure:**
```json
{
  "primary_color": "#3b82f6",
  "secondary_color": "#8b5cf6",
  "font_family": "system-ui",
  "border_radius": "0.5rem",
  "custom_css": ""
}
```

### Missing Tables

#### `theme_skins` (New Table Needed)
**Purpose:** Store skin variants for themes

**Recommended Schema:**
```sql
CREATE TABLE public.theme_skins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID REFERENCES public.site_themes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::JSONB,
  preview_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Permission Tables

### Existing Tables

#### `permissions` (Migration: 007_admin_features.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Permission name (unique) |
| slug | TEXT | URL-friendly identifier (unique) |
| description | TEXT | Permission description |
| module | TEXT | Module: board, document, user, system, etc. |
| permission_type | TEXT | Type: action, resource, global |
| config | JSONB | Permission configuration |
| is_system | BOOLEAN | System-protected |
| is_active | BOOLEAN | Active status |

**Pre-seeded Permissions:**
- User management (manage, view, create, update, delete)
- Board management (manage, view, create, update, delete)
- Content management (manage, view)
- Page management (manage, create, update, delete)
- Module management (manage, install, configure)
- System settings (manage, view, update)
- Activity logs (view)
- Comment management (manage, delete)
- File management (manage, delete)

**Helper Functions:**
- `user_has_permission(user_uuid, permission_slug)` - Check user permission
- `get_user_groups(user_uuid)` - Get user's groups

### Missing Tables

None - Permission system is complete.

---

## 7. Additional Admin-Related Tables

### Layouts

#### `layouts` (Migration: 013_layouts_table.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Layout identifier (unique) |
| title | TEXT | Display title |
| description | TEXT | Layout description |
| layout_type | TEXT | Type: default, custom, blog, forum, landing |
| is_default | BOOLEAN | Default layout |
| is_active | BOOLEAN | Active status |
| config | JSONB | Layout configuration |

#### `layout_columns` (Migration: 013_layouts_table.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| layout_id | UUID | References layouts(id) |
| column_index | INTEGER | Column position |
| width_fraction | NUMERIC | Width fraction |
| css_class | TEXT | CSS class |
| inline_style | TEXT | Inline styles |

### Activity Logging

#### `activity_log` (Migration: 007_admin_features.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles(id) |
| action | TEXT | Action: create, update, delete, login, logout |
| target_type | TEXT | Target: post, comment, user, board, page |
| target_id | UUID | Target content ID |
| description | TEXT | Action description |
| ip_address | TEXT | Client IP |
| user_agent | TEXT | Client user agent |
| metadata | JSONB | Additional data |
| severity | TEXT | Severity: debug, info, warning, error, critical |
| module | TEXT | Related module |

### Menus

#### `menus` (Migration: 001_initial_schema.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Menu identifier (unique) |
| title | TEXT | Display title |
| location | TEXT | Location: header, footer, sidebar, top, bottom |
| description | TEXT | Menu description |
| config | JSONB | Menu configuration |
| is_active | BOOLEAN | Active status |
| order_index | INTEGER | Display order |

#### `menu_items` (Migration: 001_initial_schema.sql)
**Status:** ✅ Complete

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| menu_id | UUID | References menus(id) |
| parent_id | UUID | References menu_items(id) |
| title | TEXT | Display title |
| url | TEXT | Link URL |
| type | TEXT | Type: link, divider, header, action, custom |
| icon | TEXT | Icon identifier |
| badge | TEXT | Badge text |
| target | TEXT | Link target: _self, _blank, _parent, _top |
| required_role | TEXT | Role: all, member, admin |
| depth | INTEGER | Nesting depth |
| path | TEXT | Hierarchical path |
| order_index | INTEGER | Display order |

---

## Summary

### Existing Tables Summary (35+ Tables)

| Category | Tables | Status |
|----------|--------|--------|
| Member Settings | profiles, site_config | ⚠️ Partial (need member_config) |
| Member Groups | groups, user_groups, group_permissions | ✅ Complete |
| Point System | points | ⚠️ Partial (need point_config, point_levels) |
| Widgets | site_widgets, layout_widgets | ✅ Complete |
| Themes | site_themes | ⚠️ Partial (need theme_skins) |
| Permissions | permissions, group_permissions | ✅ Complete |
| Layouts | layouts, layout_columns, layout_widgets | ✅ Complete |
| Menus | menus, menu_items | ✅ Complete |
| Activity | activity_log | ✅ Complete |

### Missing Tables Summary (6 Tables)

| Table Name | Purpose | Priority |
|------------|---------|----------|
| `member_config` | Member module configuration | High |
| `group_images` | Group badges/icons | Medium |
| `point_config` | Point reward configuration | High |
| `point_levels` | Point-based user levels | Medium |
| `theme_skins` | Theme skin variants | Low |
| `editor_config` | Editor settings (optional) | Low |

### Recommended Implementation Order

1. **Phase 1 - Critical:**
   - Create `member_config` table
   - Create `point_config` table

2. **Phase 2 - Important:**
   - Create `point_levels` table
   - Create `group_images` table

3. **Phase 3 - Enhancement:**
   - Create `theme_skins` table
   - Create `editor_config` table (if needed)

---

## Migration Script Recommendations

### member_config Migration

```sql
-- Migration: 015_member_config.sql
CREATE TABLE public.member_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'member',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default member configurations
INSERT INTO public.member_config (key, value, category, description) VALUES
  ('signup.enable_email_verification', 'true'::JSONB, 'signup', 'Require email verification'),
  ('signup.enable_agreement', 'true'::JSONB, 'signup', 'Require terms agreement'),
  ('signup.enable_nickname', 'true'::JSONB, 'signup', 'Allow nickname setting'),
  ('signup.enable_profile_image', 'true'::JSONB, 'signup', 'Allow profile image upload'),
  ('login.enable_remember_me', 'true'::JSONB, 'login', 'Enable remember me option'),
  ('login.max_attempts', '5'::JSONB, 'login', 'Maximum login attempts'),
  ('login.lockout_duration', '900'::JSONB, 'login', 'Lockout duration in seconds'),
  ('profile.enable_signature', 'true'::JSONB, 'profile', 'Enable user signature'),
  ('profile.enable_website', 'true'::JSONB, 'profile', 'Enable website URL'),
  ('profile.max_signature_length', '250'::JSONB, 'profile', 'Maximum signature length');
```

### point_config Migration

```sql
-- Migration: 016_point_config.sql
CREATE TABLE public.point_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT UNIQUE NOT NULL,
  action_name TEXT NOT NULL,
  point_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_daily_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default point configurations
INSERT INTO public.point_config (action_type, action_name, point_value, description, max_daily_count) VALUES
  ('signup', '회원가입', 100, 'New user registration bonus', 1),
  ('login', '로그인', 10, 'Daily login bonus', 1),
  ('write_post', '글 작성', 10, 'Creating a new post', 0),
  ('write_comment', '댓글 작성', 5, 'Creating a comment', 0),
  ('upload_file', '파일 업로드', 2, 'Uploading a file', 0),
  ('receive_vote', '추천 받음', 5, 'Receiving a vote/like', 0),
  ('download_file', '파일 다운로드', -1, 'Downloading a file', 0),
  ('delete_post', '글 삭제', -10, 'Post deletion penalty', 0);
```

---

**End of Analysis**
