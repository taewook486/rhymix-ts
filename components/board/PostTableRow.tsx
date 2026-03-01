'use client'

import Link from 'next/link'
import { Eye, MessageCircle, ThumbsUp, Lock } from 'lucide-react'
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
  thumbnail_url?: string | null
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

interface PostTableRowProps {
  post: PostWithAuthor
  boardSlug: string
  index: number
  totalCount: number
  currentPage: number
  perPage: number
  translations: {
    notice: string
    secret: string
  }
}

export function PostTableRow({
  post,
  boardSlug,
  index,
  totalCount,
  currentPage,
  perPage,
  translations,
}: PostTableRowProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m`
      }
      return `${diffHours}h`
    } else if (diffDays < 7) {
      return `${diffDays}d`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
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

  // Calculate post number (for pagination display)
  const postNumber = totalCount - (currentPage - 1) * perPage - index

  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/50',
        post.is_notice && 'bg-primary/5'
      )}
    >
      {/* Number column */}
      <td className="py-3 px-4 text-center text-sm text-muted-foreground w-16">
        {post.is_notice ? (
          <Badge variant="default" className="text-xs">
            {translations.notice}
          </Badge>
        ) : (
          postNumber
        )}
      </td>

      {/* Title column */}
      <td className="py-3 px-4">
        <Link
          href={`/board/${boardSlug}/post/${post.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          {post.category && (
            <Badge variant="outline" className="text-xs shrink-0">
              {post.category.name}
            </Badge>
          )}
          {post.is_secret && (
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          <span className={cn('text-sm truncate', post.is_notice && 'font-semibold')}>
            {post.title}
          </span>
          {post.comment_count > 0 && (
            <span className="text-xs text-primary shrink-0">
              [{formatNumber(post.comment_count)}]
            </span>
          )}
        </Link>
      </td>

      {/* Author column */}
      <td className="py-3 px-4 text-center w-28">
        <span className="text-sm text-muted-foreground">
          {post.author?.display_name || post.author_name || 'Anonymous'}
        </span>
      </td>

      {/* Date column */}
      <td className="py-3 px-4 text-center w-24">
        <span className="text-sm text-muted-foreground">
          {formatDate(post.created_at)}
        </span>
      </td>

      {/* Views column */}
      <td className="py-3 px-4 text-center w-16">
        <span className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          <Eye className="w-3 h-3" />
          {formatNumber(post.view_count)}
        </span>
      </td>

      {/* Votes column */}
      <td className="py-3 px-4 text-center w-16">
        <span className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          {formatNumber(post.vote_count)}
        </span>
      </td>
    </tr>
  )
}
