'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PopularPostsWidgetProps {
  config: {
    title: string
    limit: number
    period: 'day' | 'week' | 'month' | 'all'
  }
  title: string
}

interface Post {
  id: string
  title: string
  slug: string
  board: { slug: string }[]
  created_at: string
  read_count: number
}

export function PopularPostsWidget({ config, title }: PopularPostsWidgetProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [config.period, config.limit])

  const loadPosts = async () => {
    try {
      const supabase = createClient()

      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          created_at,
          read_count,
          board:boards!inner(slug)
        `)
        .eq('status', 'published')
        .order('read_count', { ascending: false })
        .limit(config.limit || 5)

      // Filter by period
      if (config.period !== 'all') {
        const now = new Date()
        let startDate: Date | undefined

        switch (config.period) {
          case 'day':
            startDate = new Date(now.setHours(0, 0, 0, 0))
            break
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7))
            break
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1))
            break
          default:
            break
        }

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString())
        }
      }

      const { data, error } = await query

      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      console.error('Failed to load popular posts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {title || config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(config.limit)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title || config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">게시글이 없습니다</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post, index) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.board[0]?.slug}/${post.id}`}
                  className="block group"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.read_count || 0}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
