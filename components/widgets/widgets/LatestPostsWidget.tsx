'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, User, Calendar as CalendarIcon, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface LatestPostsWidgetProps {
  config: {
    title: string
    boardIds: string[]
    limit: number
    showAuthor: boolean
    showDate: boolean
    showThumbnail: boolean
  }
  title: string
}

interface Post {
  id: string
  title: string
  slug: string
  board: { slug: string }[]
  author: { email: string; nickname?: string }[]
  created_at: string
  read_count: number
  thumbnail?: string
}

export function LatestPostsWidget({ config, title }: LatestPostsWidgetProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [config.boardIds, config.limit])

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
          board:boards!inner(slug),
          author:profiles!inner(email, nickname)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(config.limit || 5)

      // Filter by boards if specified
      if (config.boardIds && config.boardIds.length > 0) {
        query = query.in('board_id', config.boardIds)
      }

      const { data, error } = await query

      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title || config.title}</CardTitle>
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
          <FileText className="h-4 w-4" />
          {title || config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">게시글이 없습니다</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.board[0]?.slug}/${post.id}`}
                  className="block group"
                >
                  <div className="flex items-start gap-2">
                    {config.showThumbnail && post.thumbnail && (
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {config.showAuthor && post.author[0] && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author[0].nickname || post.author[0].email.split('@')[0]}
                          </span>
                        )}
                        {config.showDate && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.read_count || 0}
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
