'use client'

import { useState, useCallback } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import { CommentEditor } from './CommentEditor'
import { cn } from '@/lib/utils'
import type { CommentWithAuthor, CreateCommentInput } from '@/types/board'

interface CommentListProps {
  comments: CommentWithAuthor[]
  postId: string
  currentUserId?: string | null
  postAuthorId?: string | null
  onCreateComment: (input: CreateCommentInput) => Promise<{ success: boolean; error?: string }>
  onUpdateComment: (commentId: string, content: string, isSecret?: boolean) => Promise<{ success: boolean; error?: string }>
  onDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>
  onVoteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>
  className?: string
  maxDepth?: number
}

export function CommentList({
  comments,
  postId,
  currentUserId,
  postAuthorId,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onVoteComment,
  className,
  maxDepth = 5,
}: CommentListProps) {
  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null)
  const [editingComment, setEditingComment] = useState<CommentWithAuthor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalComments = countAllComments(comments)

  function countAllComments(commentList: CommentWithAuthor[]): number {
    return commentList.reduce((count, comment) => {
      return count + 1 + (comment.children ? countAllComments(comment.children) : 0)
    }, 0)
  }

  const handleReply = useCallback((comment: CommentWithAuthor) => {
    setReplyingTo(comment)
    setEditingComment(null)
    setError(null)
  }, [])

  const handleEdit = useCallback((comment: CommentWithAuthor) => {
    setEditingComment(comment)
    setReplyingTo(null)
    setError(null)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
    setError(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingComment(null)
    setError(null)
  }, [])

  const handleSubmitComment = async (content: string, isSecret: boolean) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const input: CreateCommentInput = {
        post_id: postId,
        content,
        is_secret: isSecret,
        ...(replyingTo && { parent_id: replyingTo.id }),
      }

      const result = await onCreateComment(input)

      if (result.success) {
        setReplyingTo(null)
      } else {
        setError(result.error || 'Failed to create comment')
      }

      return result
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitEdit = async (content: string, isSecret: boolean) => {
    if (!editingComment) return { success: false, error: 'No comment to edit' }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onUpdateComment(editingComment.id, content, isSecret)

      if (result.success) {
        setEditingComment(null)
      } else {
        setError(result.error || 'Failed to update comment')
      }

      return result
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onDeleteComment(commentId)

      if (!result.success) {
        setError(result.error || 'Failed to delete comment')
      }

      return result
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVote = async (commentId: string) => {
    setError(null)
    const result = await onVoteComment(commentId)

    if (!result.success) {
      setError(result.error || 'Failed to vote')
    }

    return result
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h2 className="text-lg font-semibold">
            Comments ({totalComments})
          </h2>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* New comment form */}
        <div className="mb-6">
          <CommentForm
            onSubmit={handleSubmitComment}
            isSubmitting={isSubmitting}
            placeholder="Write a comment..."
            submitLabel="Post Comment"
          />
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {comments.map((comment) => (
              <div key={comment.id}>
                {/* Reply form if replying to this comment */}
                {replyingTo?.id === comment.id && (
                  <div className="py-4 bg-muted/30 rounded-lg px-4 mb-2">
                    <div className="text-sm text-muted-foreground mb-2">
                      Replying to {comment.author?.display_name || 'Anonymous'}
                    </div>
                    <CommentForm
                      onSubmit={handleSubmitComment}
                      onCancel={handleCancelReply}
                      isSubmitting={isSubmitting}
                      placeholder="Write a reply..."
                      submitLabel="Post Reply"
                    />
                  </div>
                )}

                {/* Edit form if editing this comment */}
                {editingComment?.id === comment.id && (
                  <div className="py-4 bg-muted/30 rounded-lg px-4 mb-2">
                    <CommentEditor
                      comment={comment}
                      onSubmit={handleSubmitEdit}
                      onCancel={handleCancelEdit}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                )}

                {/* Comment item */}
                {!editingComment?.id.startsWith(comment.id) && (
                  <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    isPostAuthor={postAuthorId === currentUserId}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onVote={handleVote}
                    maxDepth={maxDepth}
                  />
                )}

                {/* Nested replies with reply forms */}
                {comment.children && comment.children.length > 0 && (
                  <div>
                    {comment.children.map((child) => (
                      <div key={child.id}>
                        {replyingTo?.id === child.id && (
                          <div className="ml-6 pl-4 py-4 bg-muted/30 rounded-lg px-4 mb-2">
                            <div className="text-sm text-muted-foreground mb-2">
                              Replying to {child.author?.display_name || 'Anonymous'}
                            </div>
                            <CommentForm
                              onSubmit={handleSubmitComment}
                              onCancel={handleCancelReply}
                              isSubmitting={isSubmitting}
                              placeholder="Write a reply..."
                              submitLabel="Post Reply"
                            />
                          </div>
                        )}

                        {editingComment?.id === child.id ? (
                          <div className="ml-6 pl-4 py-4 bg-muted/30 rounded-lg px-4 mb-2">
                            <CommentEditor
                              comment={child}
                              onSubmit={handleSubmitEdit}
                              onCancel={handleCancelEdit}
                              isSubmitting={isSubmitting}
                            />
                          </div>
                        ) : (
                          <CommentItem
                            comment={child}
                            currentUserId={currentUserId}
                            isPostAuthor={postAuthorId === currentUserId}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onVote={handleVote}
                            depth={1}
                            maxDepth={maxDepth}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
