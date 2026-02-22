import { NextResponse } from 'next/server'

/**
 * Generate RSS 2.0 feed for documents
 */
export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get recent documents
    const { data: documents } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        slug,
        content,
        excerpt,
        created_at,
        updated_at,
        author:profiles!inner(email, nickname)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)

    const rss = generateRSS({
      title: 'Rhymix TS - 문서',
      description: '최신 문서',
      link: `${baseUrl}/documents`,
      language: 'ko',
      items: (documents || []).map((doc: any) => ({
        title: doc.title,
        link: `${baseUrl}/documents/${doc.slug || doc.id}`,
        description: doc.excerpt || doc.content?.substring(0, 200) || '',
        pubDate: new Date(doc.created_at).toUTCString(),
        author: doc.author.nickname || doc.author.email,
        guid: `${baseUrl}/documents/${doc.slug || doc.id}`,
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
