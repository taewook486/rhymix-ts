'use client'

import Link from 'next/link'
import { Eye, MessageCircle, ThumbsUp, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Post type that matches Supabase response with joined relations
export interface PostWithAuthor {
  id: string
  board_id: string
  category_id: string | null
  author_id: string | null
  author_name: string | null
  title: string
  excerpt: string | null
  status: string
  is_notice: boolean
  is_secret: boolean
  view_count: number
  vote_count: number
  comment_count: number
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    slug: string
  } | null
  author?: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface PostItemProps {
  post: PostWithAuthor
  boardSlug: string
}

export function PostItem({ post, boardSlug }: PostItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`
      }
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <Link href={`/board/${boardSlug}/post/${post.id}`}>
      <Card
        className={cn(
          'transition-colors hover:bg-accent/50 cursor-pointer',
          post.is_notice && 'border-l-4 border-l-primary'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-1">
                {post.is_notice && (
                  <Badge variant="default" className="text-xs shrink-0">
                    Notice
                  </Badge>
                )}
                {post.is_secret && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Secret
                  </Badge>
                )}
                {post.category && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {post.category.name}
                  </Badge>
                )}
                <h3 className="font-medium text-base truncate">{post.title}</h3>
              </div>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {post.excerpt}
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {/* Author */}
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{post.author?.display_name || post.author_name || 'Anonymous'}</span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.created_at)}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{formatNumber(post.view_count)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{formatNumber(post.vote_count)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{formatNumber(post.comment_count)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
