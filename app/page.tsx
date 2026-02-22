import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NoticeWidget, RecentPostsWidget } from '@/components/widgets'
import { createClient } from '@/lib/supabase/server'
import type { WidgetPost } from '@/components/widgets'

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
      .limit(5)

    if (!posts) return []

    // Get board slugs for the posts
    const boardIds = [...new Set(posts.map((p) => p.board_id))]
    const { data: boards } = await supabase
      .from('boards')
      .select('id, slug')
      .in('id', boardIds)

    const boardSlugMap = new Map(boards?.map((b) => [b.id, b.slug]) || [])

    // Process and map to WidgetPost format
    return posts.map((post) => {
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

export default async function HomePage() {
  const [notices, recentPosts] = await Promise.all([
    getNoticePosts(),
    getRecentPosts(),
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Notice Widget - At the top with emphasized styling */}
      {notices.length > 0 && (
        <div className="mb-8">
          <NoticeWidget
            notices={notices}
            moreLink="/board"
            limit={5}
          />
        </div>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Rhymix TS</h1>
        <p className="text-muted-foreground">
          Modern CMS built with Next.js and Supabase
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Posts - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          {recentPosts.length > 0 && (
            <RecentPostsWidget
              title="Recent Posts"
              description="Latest community posts"
              posts={recentPosts}
              moreLink="/board"
              showThumbnail={true}
              showExcerpt={true}
            />
          )}
        </div>

        {/* Quick Links - Takes 1 column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Navigate the site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full" variant="default">
                <Link href="/board">Visit Board</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/documents">Documents</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Area</CardTitle>
              <CardDescription>Account management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/member/profile">My Profile</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/member/settings">Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
