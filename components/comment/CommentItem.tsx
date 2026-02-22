'use client'

import { useState } from 'react'
import { ThumbsUp, MessageCircle, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { CommentWithAuthor } from '@/types/board'

interface CommentItemProps {
  comment: CommentWithAuthor
  currentUserId?: string | null
  isPostAuthor?: boolean
  onReply?: (comment: CommentWithAuthor) => void
  onEdit?: (comment: CommentWithAuthor) => void
  onDelete?: (commentId: string) => void
  onVote?: (commentId: string) => void
  depth?: number
  maxDepth?: number
}

export function CommentItem({
  comment,
  currentUserId,
  isPostAuthor = false,
  onReply,
  onEdit,
  onDelete,
  onVote,
  depth = 0,
  maxDepth = 5,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const isOwner = comment.author_id === currentUserId
  const canEdit = isOwner
  const canDelete = isOwner || isPostAuthor
  const canReply = depth < maxDepth

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
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

  const handleReply = () => {
    onReply?.(comment)
  }

  const handleEdit = () => {
    onEdit?.(comment)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete?.(comment.id)
    }
  }

  const handleVote = () => {
    onVote?.(comment.id)
  }

  // Check if comment is hidden/blinded
  const isHidden = comment.status === 'hidden' || comment.status === 'trash'

  // Check if secret comment should be visible
  const canViewSecret = isOwner || isPostAuthor || !comment.is_secret

  // Render hidden/blinded comment
  if (isHidden) {
    return (
      <div className={cn('py-4', depth > 0 && 'ml-6 pl-4 border-l-2 border-muted')}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
          <EyeOff className="w-4 h-4" />
          <span>This comment has been hidden</span>
        </div>
        {comment.children && comment.children.length > 0 && (
          <div className="mt-2">
            {comment.children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                currentUserId={currentUserId}
                isPostAuthor={isPostAuthor}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onVote={onVote}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render secret comment for non-authorized users
  if (comment.is_secret && !canViewSecret) {
    return (
      <div className={cn('py-4', depth > 0 && 'ml-6 pl-4 border-l-2 border-muted')}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
          <Lock className="w-4 h-4" />
          <span>This is a secret comment</span>
        </div>
        {comment.children && comment.children.length > 0 && (
          <div className="mt-2">
            {comment.children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                currentUserId={currentUserId}
                isPostAuthor={isPostAuthor}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onVote={onVote}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn('group py-4', depth > 0 && 'ml-6 pl-4 border-l-2 border-muted')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getAuthorInitials(comment.author?.display_name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">
              {comment.author?.display_name || comment.author_name || 'Anonymous'}
            </span>
            {comment.is_secret && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Secret
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground italic">(edited)</span>
            )}
          </div>

          {/* Comment text */}
          <p className="text-sm whitespace-pre-wrap break-words mb-2">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Vote button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleVote}
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {formatNumber(comment.vote_count)}
            </Button>

            {/* Reply button */}
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleReply}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}

            {/* Edit/Delete actions (visible on hover) */}
            {showActions && (canEdit || canDelete) && (
              <div className="flex items-center gap-1">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleEdit}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Nested replies */}
          {comment.children && comment.children.length > 0 && (
            <div className="mt-2">
              {isExpanded ? (
                comment.children.map((child) => (
                  <CommentItem
                    key={child.id}
                    comment={child}
                    currentUserId={currentUserId}
                    isPostAuthor={isPostAuthor}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVote={onVote}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                  />
                ))
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Show {comment.children.length} {comment.children.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
