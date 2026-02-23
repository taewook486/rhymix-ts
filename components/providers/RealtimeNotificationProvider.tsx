'use client'

import React, { createContext, useContext, useCallback, useMemo } from 'react'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useRealtime, useRealtimeMulti } from '@/hooks/useRealtime'
import { toast } from '@/hooks/use-toast'
import type { Comment, Post, UUID } from '@/lib/supabase/database.types'

/**
 * Context value for realtime notifications
 */
export interface RealtimeNotificationContextValue {
  /** Whether realtime is connected */
  isConnected: boolean
  /** Subscribe to a specific board's posts */
  subscribeToBoard: (boardId: UUID) => void
  /** Subscribe to a specific post's comments */
  subscribeToPost: (postId: UUID) => void
  /** Unsubscribe from all */
  unsubscribeAll: () => void
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextValue | null>(null)

/**
 * Options for the RealtimeNotificationProvider
 */
export interface RealtimeNotificationProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Whether to enable realtime notifications (default: true) */
  enabled?: boolean
  /** Show toast notifications for new comments (default: true) */
  showCommentToasts?: boolean
  /** Show toast notifications for new posts (default: true) */
  showPostToasts?: boolean
  /** Custom handler for new comments */
  onNewComment?: (comment: Comment) => void
  /** Custom handler for new posts */
  onNewPost?: (post: Post) => void
  /** Current user ID for filtering */
  userId?: UUID | null
}

/**
 * Provider component for realtime notifications
 *
 * Wrap your app (or a section) with this provider to enable realtime
 * notifications for posts and comments.
 *
 * @example
 * ```tsx
 * // In your root layout or app component
 * <RealtimeNotificationProvider
 *   userId={user?.id}
 *   showCommentToasts={true}
 *   showPostToasts={true}
 * >
 *   {children}
 * </RealtimeNotificationProvider>
 * ```
 */
export function RealtimeNotificationProvider({
  children,
  enabled = true,
  showCommentToasts = true,
  showPostToasts = true,
  onNewComment,
  onNewPost,
  userId,
}: RealtimeNotificationProviderProps) {
  // Handle new comment
  const handleNewComment = useCallback(
    (payload: RealtimePostgresChangesPayload<Comment>) => {
      if (payload.eventType !== 'INSERT') return

      const comment = payload.new as Comment

      // Call custom handler if provided
      onNewComment?.(comment)

      // Show toast notification
      if (showCommentToasts) {
        const authorName = comment.author_name || 'Someone'
        toast({
          title: 'New Comment',
          description: `${authorName} commented: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
        })
      }
    },
    [onNewComment, showCommentToasts]
  )

  // Handle new post
  const handleNewPost = useCallback(
    (payload: RealtimePostgresChangesPayload<Post>) => {
      if (payload.eventType !== 'INSERT') return

      const post = payload.new as Post

      // Call custom handler if provided
      onNewPost?.(post)

      // Show toast notification
      if (showPostToasts) {
        const authorName = post.author_name || 'Someone'
        toast({
          title: 'New Post',
          description: `${authorName} posted: "${post.title}"`,
        })
      }
    },
    [onNewPost, showPostToasts]
  )

  // Subscribe to global post changes (for logged-in users)
  const { status: postStatus } = useRealtime({
    table: 'posts',
    event: 'INSERT',
    enabled: enabled && !!userId,
    onInsert: handleNewPost,
  })

  const contextValue = useMemo<RealtimeNotificationContextValue>(
    () => ({
      isConnected: postStatus === 'connected',
      subscribeToBoard: () => {
        // Board-specific subscription is handled via useRealtime in components
        console.log('Board subscription requested - use useRealtime hook directly')
      },
      subscribeToPost: () => {
        // Post-specific subscription is handled via useRealtime in components
        console.log('Post subscription requested - use useRealtime hook directly')
      },
      unsubscribeAll: () => {
        // Cleanup is handled by the hook
        console.log('Unsubscribe all requested')
      },
    }),
    [postStatus]
  )

  return (
    <RealtimeNotificationContext.Provider value={contextValue}>
      {children}
    </RealtimeNotificationContext.Provider>
  )
}

/**
 * Hook to access realtime notification context
 */
export function useRealtimeNotifications(): RealtimeNotificationContextValue {
  const context = useContext(RealtimeNotificationContext)
  if (!context) {
    throw new Error('useRealtimeNotifications must be used within a RealtimeNotificationProvider')
  }
  return context
}

/**
 * Hook for subscribing to comments on a specific post
 *
 * @example
 * ```tsx
 * function PostView({ postId }: { postId: string }) {
 *   // This will automatically show toasts for new comments
 *   usePostComments(postId, {
 *     enabled: true,
 *     onNewComment: (comment) => {
 *       // Additional handling if needed
 *       console.log('New comment:', comment)
 *     }
 *   })
 *
 *   return <div>Post content...</div>
 * }
 * ```
 */
export function usePostComments(
  postId: UUID,
  options?: {
    enabled?: boolean
    showToasts?: boolean
    onNewComment?: (comment: Comment) => void
  }
) {
  const { enabled = true, showToasts = true, onNewComment } = options || {}

  const handleNewComment = useCallback(
    (payload: RealtimePostgresChangesPayload<Comment>) => {
      if (payload.eventType !== 'INSERT') return

      const comment = payload.new as Comment
      onNewComment?.(comment)

      if (showToasts) {
        const authorName = comment.author_name || 'Someone'
        toast({
          title: 'New Comment',
          description: `${authorName}: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
        })
      }
    },
    [onNewComment, showToasts]
  )

  const { status } = useRealtime({
    table: 'comments',
    filter: `post_id=eq.${postId}`,
    event: 'INSERT',
    enabled,
    onInsert: handleNewComment,
  })

  return { isConnected: status === 'connected', status }
}

/**
 * Hook for subscribing to posts in a specific board
 *
 * @example
 * ```tsx
 * function BoardView({ boardId }: { boardId: string }) {
 *   // This will automatically show toasts for new posts
 *   useBoardPosts(boardId, {
 *     enabled: true,
 *     onNewPost: (post) => {
 *       // Update local state or refetch
 *       console.log('New post:', post)
 *     }
 *   })
 *
 *   return <div>Board content...</div>
 * }
 * ```
 */
export function useBoardPosts(
  boardId: UUID,
  options?: {
    enabled?: boolean
    showToasts?: boolean
    onNewPost?: (post: Post) => void
  }
) {
  const { enabled = true, showToasts = true, onNewPost } = options || {}

  const handleNewPost = useCallback(
    (payload: RealtimePostgresChangesPayload<Post>) => {
      if (payload.eventType !== 'INSERT') return

      const post = payload.new as Post
      onNewPost?.(post)

      if (showToasts) {
        const authorName = post.author_name || 'Someone'
        toast({
          title: 'New Post',
          description: `${authorName}: "${post.title}"`,
        })
      }
    },
    [onNewPost, showToasts]
  )

  const { status } = useRealtime({
    table: 'posts',
    filter: `board_id=eq.${boardId}`,
    event: 'INSERT',
    enabled,
    onInsert: handleNewPost,
  })

  return { isConnected: status === 'connected', status }
}

export default RealtimeNotificationProvider
