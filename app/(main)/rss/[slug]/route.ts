import { NextResponse } from 'next/server'

/**
 * Generate RSS 2.0 feed for a board
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const baseUrl = new URL(request.url).origin

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, title, description')
      .eq('slug', slug)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Get recent posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, slug, content, created_at, updated_at, author:profiles!inner(email, nickname)')
      .eq('board_id', board.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) throw postsError

    // Generate RSS XML
    const rss = generateRSS({
      title: board.title,
      description: board.description || `${board.title} 게시판`,
      link: `${baseUrl}/board/${slug}`,
      language: 'ko',
      items: (posts || []).map((post: any) => ({
        title: post.title,
        link: `${baseUrl}/board/${slug}/${post.id}`,
        description: post.content?.substring(0, 200) || '',
        pubDate: new Date(post.created_at).toUTCString(),
        author: post.author.nickname || post.author.email,
        guid: `${baseUrl}/board/${slug}/${post.id}`,
      })),
    })

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('RSS generation error:', error)
    return NextResponse.json({ error: 'Failed to generate RSS' }, { status: 500 })
  }
}

/**
 * Generate RSS 2.0 feed for all boards
 */
export async function getAllBoardsRSS(request: Request) {
  const baseUrl = new URL(request.url).origin

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get all boards
    const { data: boards } = await supabase
      .from('boards')
      .select('id, slug, title, description')
      .eq('is_hidden', false)

    // Get recent posts from all boards
    const { data: posts }: any = await supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        content,
        created_at,
        updated_at,
        board:boards!inner(id, slug, title)
        author:profiles!inner(email, nickname)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    const rss = generateRSS({
      title: 'Rhymix TS - 전체 게시판',
      description: '모든 게시판의 최신 게시글',
      link: baseUrl,
      language: 'ko',
      items: (posts || []).map((post: any) => ({
        title: post.title,
        link: `${baseUrl}/board/${post.board.slug}/${post.id}`,
        description: post.content?.substring(0, 200) || '',
        pubDate: new Date(post.created_at).toUTCString(),
        author: post.author.nickname || post.author.email,
        category: post.board.title,
        guid: `${baseUrl}/board/${post.board.slug}/${post.id}`,
      })),
    })

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (error) {
    console.error('RSS generation error:', error)
    return NextResponse.json({ error: 'Failed to generate RSS' }, { status: 500 })
  }
}

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  author?: string
  category?: string
  guid: string
}

interface RSSFeed {
  title: string
  description: string
  link: string
  language: string
  items: RSSItem[]
}

function generateRSS(feed: RSSFeed): string {
  const { title, description, link, language, items } = feed

  const itemsXml = items
    .map((item) => {
      let itemXml = `    <item>\n`
      itemXml += `      <title>${escapeXml(item.title)}</title>\n`
      itemXml += `      <link>${escapeXml(item.link)}</link>\n`
      itemXml += `      <description>${escapeXml(item.description)}</description>\n`
      itemXml += `      <pubDate>${item.pubDate}</pubDate>\n`
      itemXml += `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>\n`
      if (item.author) {
        itemXml += `      <author>${escapeXml(item.author)}</author>\n`
      }
      if (item.category) {
        itemXml += `      <category>${escapeXml(item.category)}</category>\n`
      }
      itemXml += `    </item>`
      return itemXml
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <language>${language}</language>
    <atom:link href="${escapeXml(link + '/rss')}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
