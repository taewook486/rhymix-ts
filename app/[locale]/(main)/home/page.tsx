import { cookies } from 'next/headers'
import { NoticeWidget, RecentPostsWidget } from '@/components/widgets'
import { HeroSection } from '@/components/home/HeroSection'
import { createClient } from '@/lib/supabase/server'
import type { WidgetPost } from '@/components/widgets'
import { getLocale } from '@/lib/i18n/config'
import type { Locale } from '@/lib/i18n/config'
import koTranslations from '@/lib/i18n/locales/ko.json'
import enTranslations from '@/lib/i18n/locales/en.json'
import jaTranslations from '@/lib/i18n/locales/ja.json'
import zhTranslations from '@/lib/i18n/locales/zh.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Locale, any> = {
  ko: koTranslations,
  en: enTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
}

interface HomePageProps {
  params: Promise<{ locale: string }>
}

/**
 * Fetch notice posts from all boards
 */
async function getNoticePosts(): Promise<WidgetPost[]> {
  try {
    const supabase = await createClient()

    const { data: notices } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        excerpt,
        created_at,
        view_count,
        comment_count,
        board_id,
        is_notice,
        author:profiles!posts_author_id_fkey(display_name),
        category:categories(id, name, slug),
        files(thumbnail_path, cdn_url, storage_path, is_image)
      `
      )
      .eq('is_notice', true)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!notices) return []

    // Get board slugs for the posts
    const boardIds = [...new Set(notices.map((p) => p.board_id))]
    const { data: boards } = await supabase
      .from('boards')
      .select('id, slug')
      .in('id', boardIds)

    const boardSlugMap = new Map(boards?.map((b) => [b.id, b.slug]) || [])

    // Process and map to WidgetPost format
    return notices.map((post) => {
      const files = post.files as Array<{
        thumbnail_path: string | null
        cdn_url: string | null
        storage_path: string
        is_image: boolean
      }> | null
      const firstImageFile = files?.find((f) => f.is_image)

      return {
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        thumbnail_url: firstImageFile?.thumbnail_path || firstImageFile?.cdn_url || null,
        created_at: post.created_at,
        view_count: post.view_count,
        comment_count: post.comment_count,
        board_id: post.board_id,
        board_slug: boardSlugMap.get(post.board_id),
        is_notice: post.is_notice,
        author: Array.isArray(post.author) ? post.author[0] : post.author,
        category: Array.isArray(post.category) ? post.category[0] : post.category,
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetch recent posts from all boards
 */
async function getRecentPosts(): Promise<WidgetPost[]> {
  try {
    const supabase = await createClient()

    const { data: posts } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        excerpt,
        created_at,
        view_count,
        comment_count,
        board_id,
        is_notice,
        author:profiles!posts_author_id_fkey(display_name),
        category:categories(id, name, slug),
        files(thumbnail_path, cdn_url, storage_path, is_image)
      `
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!posts) return []

    // Get board slugs for the posts
    const boardIds = [...new Set(posts.map((p) => p.board_id))]
    const { data: boards } = await supabase
      .from('boards')
      .select('id, slug')
      .in('id', boardIds)

    const boardSlugMap = new Map(boards?.map((b) => [b.id, b.slug]) || [])

    // Filter out notices from recent posts (they're shown separately)
    return posts
      .filter((p) => !p.is_notice)
      .map((post) => {
        const files = post.files as Array<{
          thumbnail_path: string | null
          cdn_url: string | null
          storage_path: string
          is_image: boolean
        }> | null
        const firstImageFile = files?.find((f) => f.is_image)

        return {
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          thumbnail_url: firstImageFile?.thumbnail_path || firstImageFile?.cdn_url || null,
          created_at: post.created_at,
          view_count: post.view_count,
          comment_count: post.comment_count,
          board_id: post.board_id,
          board_slug: boardSlugMap.get(post.board_id),
          is_notice: post.is_notice,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          category: Array.isArray(post.category) ? post.category[0] : post.category,
        }
      })
  } catch {
    return []
  }
}

export default async function LocaleHomePage({ params }: HomePageProps) {
  const { locale: localeParam } = await params
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value

  const locale = getLocale(localeParam, localeCookie) as Locale
  const t = translations[locale]

  const [notices, recentPosts] = await Promise.all([
    getNoticePosts(),
    getRecentPosts(),
  ])

  const localePrefix = `/${locale}`

  return (
    <>
      {/* Hero Section - Full width at the top */}
      <HeroSection
        locale={locale}
        title={t.home.welcome}
        subtitle={t.home.subtitle}
        description={t.home.description || 'A modern community platform built with Next.js and Supabase'}
        ctaText={t.home.getStarted || 'Get Started'}
        ctaLink="/board"
        secondaryCtaText={t.home.learnMore || 'Learn More'}
        secondaryCtaLink="/documents"
      />

      <div className="container mx-auto py-8 px-4">
        {/* Notice Widget - At the top with emphasized styling */}
        {notices.length > 0 && (
          <div className="mb-8">
            <NoticeWidget
              title={t.widget.notice}
              notices={notices}
              moreLink={`${localePrefix}/board`}
              limit={5}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Posts - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            {recentPosts.length > 0 && (
              <RecentPostsWidget
                title={t.widget.recentPosts}
                description={t.widget.latestPosts}
                posts={recentPosts}
                moreLink={`${localePrefix}/board`}
                showThumbnail={true}
                showExcerpt={true}
              />
            )}
          </div>

          {/* Quick Links - Takes 1 column */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">
                  {t.home.quickLinks}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.home.quickLinksDesc}
                </p>
              </div>
              <div className="p-6 pt-0 space-y-2">
                <a
                  href={`${localePrefix}/board`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>📝</span>
                    <span>{t.board.title}</span>
                  </span>
                  <span>→</span>
                </a>
                <a
                  href={`${localePrefix}/documents`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span>
                    <span>{t.document.title}</span>
                  </span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">
                  {t.home.siteStats}
                </h3>
              </div>
              <div className="p-6 pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.home.posts}</span>
                  <span className="font-semibold">{recentPosts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.home.notices}</span>
                  <span className="font-semibold">{notices.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
