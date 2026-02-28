'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Clock,
  User,
} from 'lucide-react'
import { ViewCount } from '@/components/common/ViewCount'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Types for Supabase responses with joined relations
interface PostAuthor {
  display_name: string | null
  avatar_url: string | null
}

interface PostCategory {
  id: string
  name: string
  slug: string
}

interface PostWithRelations {
  id: string
  board_id: string
  category_id: string | null
  author_id: string | null
  author_name: string | null
  title: string
  content: string
  content_html: string | null
  excerpt: string | null
  status: string
  is_notice: boolean
  is_secret: boolean
  view_count: number
  vote_count: number
  comment_count: number
  tags: string[]
  created_at: string
  updated_at: string
  category?: PostCategory | null
  author?: PostAuthor | null
  files?: {
    id: string
    filename: string
    original_filename: string
    mime_type: string
    file_size: number
    cdn_url: string | null
    storage_path: string
  }[]
}

interface CommentWithAuthor {
  id: string
  post_id: string
  parent_id: string | null
  author_id: string | null
  author_name: string | null
  content: string
  status: string
  is_secret: boolean
  vote_count: number
  depth: number
  created_at: string
  updated_at: string
  author?: PostAuthor | null
  children?: CommentWithAuthor[]
}

interface PostDetailProps {
  post: PostWithRelations
  comments: CommentWithAuthor[]
  boardSlug: string
}

export function PostDetail({ post, comments, boardSlug }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getAuthorInitials = (name: string | null | undefined) => {
    if (!name) return 'A'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Build comment tree
  const buildCommentTree = (flatComments: CommentWithAuthor[]) => {
    const commentMap = new Map<string, CommentWithAuthor>()
    const rootComments: CommentWithAuthor[] = []

    flatComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, children: [] })
    })

    flatComments.forEach((comment) => {
      const node = commentMap.get(comment.id)!
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(node)
        }
      } else {
        rootComments.push(node)
      }
    })

    return rootComments
  }

  const CommentItem = ({
    comment,
    depth = 0,
  }: {
    comment: CommentWithAuthor
    depth?: number
  }) => (
    <div
      className={cn(
        'flex gap-3 py-4',
        depth > 0 && 'ml-8 pl-4 border-l-2 border-muted'
      )}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={comment.author?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {getAuthorInitials(comment.author?.display_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.author?.display_name || 'Anonymous'}
          </span>
          {comment.is_secret && (
            <Badge variant="secondary" className="text-xs">
              Secret
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <ThumbsUp className="w-3 h-3 mr-1" />
            {formatNumber(comment.vote_count)}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            Reply
          </Button>
        </div>
        {comment.children &&
          comment.children.map((child) => (
            <CommentItem key={child.id} comment={child} depth={depth + 1} />
          ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/board/${boardSlug}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to {boardSlug}
      </Link>

      {/* Post */}
      <Card>
        <CardHeader className="space-y-4">
          {/* Title and badges */}
          <div className="flex flex-wrap items-center gap-2">
            {post.is_notice && (
              <Badge variant="default">Notice</Badge>
            )}
            {post.is_secret && (
              <Badge variant="secondary">Secret</Badge>
            )}
            {post.category && (
              <Badge variant="outline">{post.category.name}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{post.title}</h1>

          {/* Author and meta */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {getAuthorInitials(post.author?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {post.author?.display_name || post.author_name || 'Anonymous'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{formatNumber(post.view_count)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                <span>{formatNumber(post.vote_count)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{formatNumber(post.comment_count)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="py-6">
          {/* Content */}
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: post.content_html || post.content,
            }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t">
            <Button
              variant={isLiked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Like
            </Button>
            <Button variant="outline" size="sm">
              <ThumbsDown className="w-4 h-4 mr-2" />
              Dislike
            </Button>
            <Button
              variant={isBookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            Comments ({post.comment_count})
          </h2>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="divide-y">
              {buildCommentTree(comments).map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
