-- =====================================================
-- RHYMIX-TS Initial Data Seed Migration
-- Supabase PostgreSQL 16 Migration
-- Migration: 014_initial_data_seed
-- Created: 2026-02-28
-- SPEC: SPEC-SETUP-001
-- =====================================================

-- This migration seeds default data for new installations
-- Includes: default boards, menus, pages, configuration
-- Uses idempotent INSERT with ON CONFLICT DO NOTHING

-- =====================================================
-- SECTION 1: DEFAULT BOARDS (게시판)
-- =====================================================

-- @MX:NOTE: Default boards matching ASIS Rhymix installation
-- SPEC-SETUP-001 R1: Automatic Board Seeding

INSERT INTO public.boards (id, slug, title, description, content, config, skin)
VALUES
  (
    gen_random_uuid(),
    'board',
    '자유게시판',
    '자유롭게 글을 작성할 수 있는 게시판입니다.',
    '자유게시판에 오신 것을 환영합니다. 자유롭게 글을 작성해 주세요.',
    '{
      "post_permission": "all",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": true,
      "use_tags": true,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  ),
  (
    gen_random_uuid(),
    'qna',
    '질문답변',
    '질문과 답변을 주고받을 수 있는 게시판입니다.',
    '궁금한 점을 질문하고 답변을 주고받는 공간입니다.',
    '{
      "post_permission": "all",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": true,
      "use_tags": true,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  ),
  (
    gen_random_uuid(),
    'notice',
    '공지사항',
    '공지사항을 확인하실 수 있습니다.',
    '사이트 공지사항입니다.',
    '{
      "post_permission": "admin",
      "comment_permission": "all",
      "list_count": 20,
      "page_count": 10,
      "use_category": false,
      "use_tags": false,
      "use_editor": true,
      "use_file": true
    }'::jsonb,
    'default'
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 2: DEFAULT MENUS (메뉴 구조)
-- =====================================================

-- @MX:NOTE: Default menu structure matching ASIS Rhymix
-- SPEC-SETUP-001 R2: Menu Structure Seeding

-- GNB (Global Navigation Bar - Main Menu)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'gnb',
    'Main Menu',
    'header',
    'Global Navigation Bar - Main site navigation',
    '{"type": "normal", "max_depth": 2, "expandable": true, "show_title": false}'::jsonb,
    true,
    1
  )
ON CONFLICT (name) DO NOTHING;

-- UNB (Utility Navigation Bar)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'unb',
    'Utility Menu',
    'top',
    'Utility Navigation Bar - External links',
    '{"type": "normal", "max_depth": 1, "expandable": false, "show_title": false}'::jsonb,
    true,
    2
  )
ON CONFLICT (name) DO NOTHING;

-- FNB (Footer Navigation Bar)
INSERT INTO public.menus (id, name, title, location, description, config, is_active, order_index)
VALUES
  (
    gen_random_uuid(),
    'fnb',
    'Footer Menu',
    'footer',
    'Footer Navigation Bar - Footer links',
    '{"type": "normal", "max_depth": 1, "expandable": false, "show_title": false}'::jsonb,
    true,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 2.1: DEFAULT MENU ITEMS
-- =====================================================

-- GNB Menu Items
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all'
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Welcome', '/', 'link', 1),
    ('Free Board', '/board', 'link', 2),
    ('Q&A', '/qna', 'link', 3),
    ('Notice', '/notice', 'link', 4)
) AS item(title, url, type, order_index)
WHERE m.name = 'gnb'
ON CONFLICT DO NOTHING;

-- UNB Menu Items (External Links)
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role, is_new_window)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all',
  true
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Rhymix Official', 'https://rhymix.org/', 'link', 1),
    ('Rhymix GitHub', 'https://github.com/rhymix', 'link', 2)
) AS item(title, url, type, order_index)
WHERE m.name = 'unb'
ON CONFLICT DO NOTHING;

-- FNB Menu Items
INSERT INTO public.menu_items (menu_id, parent_id, title, url, type, order_index, is_active, is_visible, required_role)
SELECT
  m.id,
  NULL,
  item.title,
  item.url,
  item.type,
  item.order_index,
  true,
  true,
  'all'
FROM public.menus m
CROSS JOIN (
  VALUES
    ('Terms of Service', '/terms', 'link', 1),
    ('Privacy Policy', '/privacy', 'link', 2)
) AS item(title, url, type, order_index)
WHERE m.name = 'fnb'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 3: DEFAULT PAGES (페이지)
-- =====================================================

-- @MX:NOTE: Welcome page for site homepage
-- SPEC-SETUP-001 R4: Welcome Page Creation

-- Welcome/Home Page
INSERT INTO public.pages (title, slug, content, status, author_id)
VALUES
  (
    'Welcome to Rhymix',
    'home',
    '# Welcome to Rhymix

This is your new Rhymix-TS site powered by Next.js 16, React 19, and Supabase.

## Getting Started

1. **Admin Panel** - Access the admin panel at `/admin` to configure your site
2. **Create Content** - Add boards, pages, and content through the admin interface
3. **Customize** - Configure themes, layouts, and widgets to personalize your site

## Features

- **Modern Tech Stack**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Built-in user authentication and role management
- **Admin Panel**: Comprehensive admin dashboard for site management
- **Responsive Design**: Mobile-first responsive layouts

## Default Boards

Your site comes with three default boards:
- **Free Board** (`/board`) - General discussion board
- **Q&A** (`/qna`) - Question and answer board
- **Notice** (`/notice`) - Site announcements

## Support

For more information, visit the [Rhymix Official Site](https://rhymix.org/) or check the [GitHub repository](https://github.com/rhymix).

---

Thank you for choosing Rhymix-TS!',
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- Terms of Service Page
INSERT INTO public.pages (title, slug, content, status, author_id)
VALUES
  (
    'Terms of Service',
    'terms',
    '# Terms of Service

Please review the terms of service for using this site.

## 1. Acceptance of Terms

By accessing and using this website, you accept and agree to be bound by the terms and conditions of this agreement.

## 2. Use License

Permission is granted to temporarily access the materials on this website for personal, non-commercial use only.

## 3. User Responsibilities

Users are responsible for maintaining the confidentiality of their account and for all activities that occur under their account.

## 4. Content

Users retain ownership of content they post, but grant the site a license to use, modify, and display such content.

---
Last updated: 2026-02-28',
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- Privacy Policy Page
INSERT INTO public.pages (title, slug, content, status, author_id)
VALUES
  (
    'Privacy Policy',
    'privacy',
    '# Privacy Policy

Your privacy is important to us. This policy explains how we collect, use, and protect your information.

## 1. Information We Collect

We collect information you provide directly, such as:
- Account information (email, username)
- Content you post
- Communications with us

## 2. How We Use Information

We use the information to:
- Provide and maintain our services
- Communicate with you
- Improve our services

## 3. Data Security

We implement appropriate security measures to protect your personal information.

## 4. Cookies

We use cookies to enhance your experience on our site.

## 5. Contact

If you have questions about this policy, please contact the site administrator.

---
Last updated: 2026-02-28',
    'published',
    (SELECT id FROM public.profiles WHERE email = 'admin@rhymix.local' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 4: SITE CONFIGURATION (사이트 설정)
-- =====================================================

-- @MX:NOTE: Default site configuration matching ASIS Rhymix
-- SPEC-SETUP-001 R6: Site Configuration Defaults

INSERT INTO public.site_config (key, value, category, description, is_public, is_editable)
VALUES
  -- General Settings
  ('site.theme', '"default"'::jsonb, 'appearance', 'Active theme', true, true),
  ('site.logo_url', 'null'::jsonb, 'appearance', 'Logo URL', true, true),
  ('site.favicon_url', 'null'::jsonb, 'appearance', 'Favicon URL', true, true),

  -- SEO Settings
  ('seo.meta_keywords', '[]'::jsonb, 'seo', 'Meta keywords', true, true),
  ('seo.google_analytics_id', 'null'::jsonb, 'seo', 'Google Analytics ID', false, true),

  -- Authentication Settings
  ('auth.allow_registration', 'true'::jsonb, 'security', 'Allow user registration', false, true),
  ('auth.require_email_verification', 'true'::jsonb, 'security', 'Require email verification', false, true),
  ('auth.allow_social_login', 'false'::jsonb, 'security', 'Allow social login', false, true),

  -- Email Settings
  ('email.smtp_enabled', 'false'::jsonb, 'email', 'SMTP enabled', false, true),

  -- Feature Settings
  ('features.allow_file_upload', 'true'::jsonb, 'features', 'Allow file uploads', false, true),
  ('features.max_file_size', '10485760'::jsonb, 'features', 'Max file size (bytes)', false, true),

  -- Module Settings
  ('modules.board.skin', '"default"'::jsonb, 'appearance', 'Default board skin', true, true),
  ('modules.editor.skin', '"ckeditor"'::jsonb, 'appearance', 'Default editor skin', true, true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SECTION 5: SEEDING VERIFICATION FUNCTION
-- =====================================================

-- @MX:NOTE: Function to verify seeding completed successfully
-- SPEC-SETUP-001 R12: Seeding Verification

CREATE OR REPLACE FUNCTION verify_initial_seed()
RETURNS TABLE(
  table_name TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  status TEXT
) AS $$
BEGIN
  -- Check boards
  RETURN QUERY SELECT 'boards'::text, 3, (SELECT COUNT(*)::int FROM public.boards WHERE slug IN ('board', 'qna', 'notice')),
    CASE WHEN (SELECT COUNT(*) FROM public.boards WHERE slug IN ('board', 'qna', 'notice')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check menus
  RETURN QUERY SELECT 'menus'::text, 3, (SELECT COUNT(*)::int FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb')),
    CASE WHEN (SELECT COUNT(*) FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check pages
  RETURN QUERY SELECT 'pages'::text, 3, (SELECT COUNT(*)::int FROM public.pages WHERE slug IN ('home', 'terms', 'privacy')),
    CASE WHEN (SELECT COUNT(*) FROM public.pages WHERE slug IN ('home', 'terms', 'privacy')) >= 3 THEN 'OK' ELSE 'MISSING' END;

  -- Check site_config
  RETURN QUERY SELECT 'site_config'::text, 13, (SELECT COUNT(*)::int FROM public.site_config),
    CASE WHEN (SELECT COUNT(*) FROM public.site_config) >= 10 THEN 'OK' ELSE 'MISSING' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 6: HELPER FUNCTION TO CHECK SEED STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION is_seeding_complete()
RETURNS BOOLEAN AS $$
DECLARE
  boards_count INTEGER;
  menus_count INTEGER;
  pages_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO boards_count FROM public.boards WHERE slug IN ('board', 'qna', 'notice');
  SELECT COUNT(*) INTO menus_count FROM public.menus WHERE name IN ('gnb', 'unb', 'fnb');
  SELECT COUNT(*) INTO pages_count FROM public.pages WHERE slug IN ('home', 'terms', 'privacy');

  RETURN (boards_count >= 3 AND menus_count >= 3 AND pages_count >= 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 7: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION verify_initial_seed() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_seeding_complete() TO anon, authenticated;
