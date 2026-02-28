'use server'

import { createClient } from '@/lib/supabase/server'

// @MX:NOTE: Server actions for initial data seeding
// SPEC-SETUP-001: Initial Setup System with Automatic Data Seeding

export interface SeedResult {
  success: boolean
  data?: {
    boards: number
    menus: number
    pages: number
    widgets: number
    config: number
  }
  error?: string
  details?: string
}

export interface SeedStatus {
  isSeeded: boolean
  boards: number
  menus: number
  pages: number
  config: number
}

/**
 * Check if initial seeding has been completed
 * SPEC-SETUP-001 R9: Seeding Idempotency
 */
export async function checkSeedingStatus(): Promise<SeedStatus> {
  const supabase = await createClient()

  try {
    // Check boards
    const { count: boardsCount } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })
      .in('slug', ['board', 'qna', 'notice'])

    // Check menus
    const { count: menusCount } = await supabase
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .in('name', ['gnb', 'unb', 'fnb'])

    // Check pages
    const { count: pagesCount } = await supabase
      .from('pages')
      .select('*', { count: 'exact', head: true })
      .in('slug', ['home', 'terms', 'privacy'])

    // Check site_config
    const { count: configCount } = await supabase
      .from('site_config')
      .select('*', { count: 'exact', head: true })

    const isSeeded =
      (boardsCount ?? 0) >= 3 &&
      (menusCount ?? 0) >= 3 &&
      (pagesCount ?? 0) >= 3

    return {
      isSeeded,
      boards: boardsCount ?? 0,
      menus: menusCount ?? 0,
      pages: pagesCount ?? 0,
      config: configCount ?? 0,
    }
  } catch (error) {
    console.error('Error checking seeding status:', error)
    return {
      isSeeded: false,
      boards: 0,
      menus: 0,
      pages: 0,
      config: 0,
    }
  }
}

/**
 * Execute initial data seeding
 * SPEC-SETUP-001 R8: Installation Wizard Integration
 * SPEC-SETUP-001 R7: Seeding Transaction Integrity
 */
export async function seedDefaultData(): Promise<SeedResult> {
  const supabase = await createClient()

  try {
    // First, check if already seeded (idempotency)
    const status = await checkSeedingStatus()
    if (status.isSeeded) {
      return {
        success: true,
        data: {
          boards: status.boards,
          menus: status.menus,
          pages: status.pages,
          widgets: 0,
          config: status.config,
        },
        details: 'Seeding already completed. No changes made.',
      }
    }

    // Seed default boards
    const { error: boardsError } = await supabase
      .from('boards')
      .upsert([
        {
          slug: 'board',
          title: '자유게시판',
          description: '자유롭게 글을 작성할 수 있는 게시판입니다.',
          content: '자유게시판에 오신 것을 환영합니다. 자유롭게 글을 작성해 주세요.',
          config: {
            post_permission: 'all',
            comment_permission: 'all',
            list_count: 20,
            page_count: 10,
            use_category: true,
            use_tags: true,
            use_editor: true,
            use_file: true,
          },
          is_active: true,
        },
        {
          slug: 'qna',
          title: '질문답변',
          description: '질문과 답변을 주고받을 수 있는 게시판입니다.',
          content: '궁금한 점을 질문하고 답변을 주고받는 공간입니다.',
          config: {
            post_permission: 'all',
            comment_permission: 'all',
            list_count: 20,
            page_count: 10,
            use_category: true,
            use_tags: true,
            use_editor: true,
            use_file: true,
          },
          is_active: true,
        },
        {
          slug: 'notice',
          title: '공지사항',
          description: '공지사항을 확인하실 수 있습니다.',
          content: '사이트 공지사항입니다.',
          config: {
            post_permission: 'admin',
            comment_permission: 'all',
            list_count: 20,
            page_count: 10,
            use_category: false,
            use_tags: false,
            use_editor: true,
            use_file: true,
          },
          is_active: true,
        },
      ], { onConflict: 'slug' })

    if (boardsError) {
      console.error('Error seeding boards:', boardsError)
      throw new Error(`Failed to seed boards: ${boardsError.message}`)
    }

    // Seed default menus
    const { data: gnbMenu, error: gnbError } = await supabase
      .from('menus')
      .upsert({
        name: 'gnb',
        title: 'Main Menu',
        location: 'header',
        description: 'Global Navigation Bar - Main site navigation',
        config: { type: 'normal', max_depth: 2, expandable: true, show_title: false },
        is_active: true,
        order_index: 1,
      }, { onConflict: 'name' })
      .select('id')
      .single()

    if (gnbError) {
      console.error('Error seeding GNB menu:', gnbError)
    }

    const { data: unbMenu, error: unbError } = await supabase
      .from('menus')
      .upsert({
        name: 'unb',
        title: 'Utility Menu',
        location: 'top',
        description: 'Utility Navigation Bar - External links',
        config: { type: 'normal', max_depth: 1, expandable: false, show_title: false },
        is_active: true,
        order_index: 2,
      }, { onConflict: 'name' })
      .select('id')
      .single()

    if (unbError) {
      console.error('Error seeding UNB menu:', unbError)
    }

    const { data: fnbMenu, error: fnbError } = await supabase
      .from('menus')
      .upsert({
        name: 'fnb',
        title: 'Footer Menu',
        location: 'footer',
        description: 'Footer Navigation Bar - Footer links',
        config: { type: 'normal', max_depth: 1, expandable: false, show_title: false },
        is_active: true,
        order_index: 3,
      }, { onConflict: 'name' })
      .select('id')
      .single()

    if (fnbError) {
      console.error('Error seeding FNB menu:', fnbError)
    }

    // Seed menu items for GNB
    if (gnbMenu) {
      const gnbItems = [
        { title: 'Welcome', url: '/', order_index: 1 },
        { title: 'Free Board', url: '/board', order_index: 2 },
        { title: 'Q&A', url: '/qna', order_index: 3 },
        { title: 'Notice', url: '/notice', order_index: 4 },
      ]

      for (const item of gnbItems) {
        await supabase.from('menu_items').upsert({
          menu_id: gnbMenu.id,
          title: item.title,
          url: item.url,
          type: 'link',
          order_index: item.order_index,
          is_active: true,
          is_visible: true,
          required_role: 'all',
        }, { onConflict: 'menu_id,url' })
      }
    }

    // Seed menu items for UNB (external links)
    if (unbMenu) {
      const unbItems = [
        { title: 'Rhymix Official', url: 'https://rhymix.org/', order_index: 1 },
        { title: 'Rhymix GitHub', url: 'https://github.com/rhymix', order_index: 2 },
      ]

      for (const item of unbItems) {
        await supabase.from('menu_items').upsert({
          menu_id: unbMenu.id,
          title: item.title,
          url: item.url,
          type: 'link',
          order_index: item.order_index,
          is_active: true,
          is_visible: true,
          required_role: 'all',
          is_new_window: true,
        }, { onConflict: 'menu_id,url' })
      }
    }

    // Seed menu items for FNB
    if (fnbMenu) {
      const fnbItems = [
        { title: 'Terms of Service', url: '/terms', order_index: 1 },
        { title: 'Privacy Policy', url: '/privacy', order_index: 2 },
      ]

      for (const item of fnbItems) {
        await supabase.from('menu_items').upsert({
          menu_id: fnbMenu.id,
          title: item.title,
          url: item.url,
          type: 'link',
          order_index: item.order_index,
          is_active: true,
          is_visible: true,
          required_role: 'all',
        }, { onConflict: 'menu_id,url' })
      }
    }

    // Seed default pages
    const { error: pagesError } = await supabase
      .from('pages')
      .upsert([
        {
          slug: 'home',
          title: 'Welcome to Rhymix',
          content: `# Welcome to Rhymix

This is your new Rhymix-TS site powered by Next.js 16, React 19, and Supabase.

## Getting Started

1. **Admin Panel** - Access the admin panel at \`/admin\` to configure your site
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
- **Free Board** (\`/board\`) - General discussion board
- **Q&A** (\`/qna\`) - Question and answer board
- **Notice** (\`/notice\`) - Site announcements

## Support

For more information, visit the [Rhymix Official Site](https://rhymix.org/) or check the [GitHub repository](https://github.com/rhymix).

---

Thank you for choosing Rhymix-TS!`,
          status: 'published',
          is_homepage: true,
          published_at: new Date().toISOString(),
        },
        {
          slug: 'terms',
          title: 'Terms of Service',
          content: `# Terms of Service

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
Last updated: ${new Date().toISOString().split('T')[0]}`,
          status: 'published',
          is_homepage: false,
          published_at: new Date().toISOString(),
        },
        {
          slug: 'privacy',
          title: 'Privacy Policy',
          content: `# Privacy Policy

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
Last updated: ${new Date().toISOString().split('T')[0]}`,
          status: 'published',
          is_homepage: false,
          published_at: new Date().toISOString(),
        },
      ], { onConflict: 'slug' })

    if (pagesError) {
      console.error('Error seeding pages:', pagesError)
      throw new Error(`Failed to seed pages: ${pagesError.message}`)
    }

    // Seed site configuration (only if not already present)
    const configEntries = [
      { key: 'site.theme', value: 'default', category: 'appearance', description: 'Active theme', is_public: true },
      { key: 'site.logo_url', value: null, category: 'appearance', description: 'Logo URL', is_public: true },
      { key: 'site.favicon_url', value: null, category: 'appearance', description: 'Favicon URL', is_public: true },
      { key: 'seo.meta_keywords', value: [], category: 'seo', description: 'Meta keywords', is_public: true },
      { key: 'seo.google_analytics_id', value: null, category: 'seo', description: 'Google Analytics ID', is_public: false },
      { key: 'auth.allow_registration', value: true, category: 'security', description: 'Allow user registration', is_public: false },
      { key: 'auth.require_email_verification', value: true, category: 'security', description: 'Require email verification', is_public: false },
      { key: 'auth.allow_social_login', value: false, category: 'security', description: 'Allow social login', is_public: false },
      { key: 'email.smtp_enabled', value: false, category: 'email', description: 'SMTP enabled', is_public: false },
      { key: 'features.allow_file_upload', value: true, category: 'features', description: 'Allow file uploads', is_public: false },
      { key: 'features.max_file_size', value: 10485760, category: 'features', description: 'Max file size (bytes)', is_public: false },
      { key: 'modules.board.skin', value: 'default', category: 'appearance', description: 'Default board skin', is_public: true },
      { key: 'modules.editor.skin', value: 'ckeditor', category: 'appearance', description: 'Default editor skin', is_public: true },
    ]

    let configCount = 0
    for (const config of configEntries) {
      const { error: configError } = await supabase
        .from('site_config')
        .upsert({
          key: config.key,
          value: config.value,
          category: config.category,
          description: config.description,
          is_public: config.is_public,
          is_editable: true,
        }, { onConflict: 'key' })

      if (!configError) {
        configCount++
      }
    }

    // Verify seeding completed
    const finalStatus = await checkSeedingStatus()

    return {
      success: finalStatus.isSeeded,
      data: {
        boards: finalStatus.boards,
        menus: finalStatus.menus,
        pages: finalStatus.pages,
        widgets: 0,
        config: finalStatus.config,
      },
      details: finalStatus.isSeeded
        ? 'Seeding completed successfully.'
        : 'Seeding completed with partial results. Please verify.',
    }
  } catch (error) {
    console.error('Error during seeding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during seeding',
      details: error instanceof Error ? error.stack : undefined,
    }
  }
}

/**
 * Verify seeding integrity
 * SPEC-SETUP-001 R12: Seeding Verification
 */
export async function verifySeeding(): Promise<{
  success: boolean
  results: Array<{
    table: string
    expected: number
    actual: number
    status: 'OK' | 'MISSING'
  }>
}> {
  const supabase = await createClient()

  const results: Array<{
    table: string
    expected: number
    actual: number
    status: 'OK' | 'MISSING'
  }> = []

  // Check boards
  const { count: boardsCount } = await supabase
    .from('boards')
    .select('*', { count: 'exact', head: true })
    .in('slug', ['board', 'qna', 'notice'])

  results.push({
    table: 'boards',
    expected: 3,
    actual: boardsCount ?? 0,
    status: (boardsCount ?? 0) >= 3 ? 'OK' : 'MISSING',
  })

  // Check menus
  const { count: menusCount } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .in('name', ['gnb', 'unb', 'fnb'])

  results.push({
    table: 'menus',
    expected: 3,
    actual: menusCount ?? 0,
    status: (menusCount ?? 0) >= 3 ? 'OK' : 'MISSING',
  })

  // Check pages
  const { count: pagesCount } = await supabase
    .from('pages')
    .select('*', { count: 'exact', head: true })
    .in('slug', ['home', 'terms', 'privacy'])

  results.push({
    table: 'pages',
    expected: 3,
    actual: pagesCount ?? 0,
    status: (pagesCount ?? 0) >= 3 ? 'OK' : 'MISSING',
  })

  // Check site_config
  const { count: configCount } = await supabase
    .from('site_config')
    .select('*', { count: 'exact', head: true })

  results.push({
    table: 'site_config',
    expected: 10,
    actual: configCount ?? 0,
    status: (configCount ?? 0) >= 10 ? 'OK' : 'MISSING',
  })

  const allOk = results.every((r) => r.status === 'OK')

  return {
    success: allOk,
    results,
  }
}
