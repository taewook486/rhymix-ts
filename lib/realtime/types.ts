/**
 * Realtime notification types for Supabase
 */

import type { Comment, Post, Notification, UUID } from '@/lib/supabase/database.types'

/**
 * Realtime event types
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Base realtime payload structure
 */
export interface RealtimePayload<T = Record<string, unknown>> {
  commit_timestamp: string
  eventType: RealtimeEventType
  schema: string
  table: string
  new: T
  old: Partial<T>
  errors: string[] | null
}

/**
 * Comment realtime payload
 */
export interface CommentRealtimePayload extends RealtimePayload<Comment> {
  table: 'comments'
}

/**
 * Post realtime payload
 */
export interface PostRealtimePayload extends RealtimePayload<Post> {
  table: 'posts'
}

/**
 * Notification realtime payload
 */
export interface NotificationRealtimePayload extends RealtimePayload<Notification> {
  table: 'notifications'
}

/**
 * Options for post subscription
 */
export interface PostSubscriptionOptions {
  /** Board ID to filter by */
  boardId?: UUID
  /** Post ID to filter by (for comments on specific post) */
  postId?: UUID
  /** Callback when a new post is created */
  onNewPost?: (post: Post) => void
  /** Callback when a post is updated */
  onPostUpdate?: (post: Post, oldPost: Partial<Post>) => void
  /** Callback when a post is deleted */
  onPostDelete?: (post: Partial<Post>) => void
  /** Enable the subscription */
  enabled?: boolean
}

/**
 * Options for comment subscription
 */
export interface CommentSubscriptionOptions {
  /** Post ID to filter comments */
  postId: UUID
  /** Callback when a new comment is created */
  onNewComment?: (comment: Comment) => void
  /** Callback when a comment is updated */
  onCommentUpdate?: (comment: Comment, oldComment: Partial<Comment>) => void
  /** Callback when a comment is deleted */
  onCommentDelete?: (comment: Partial<Comment>) => void
  /** Enable the subscription */
  enabled?: boolean
}

/**
 * Options for notification subscription
 */
export interface NotificationSubscriptionOptions {
  /** User ID to filter notifications */
  userId: UUID
  /** Callback when a new notification is created */
  onNewNotification?: (notification: Notification) => void
  /** Callback when a notification is read */
  onNotificationRead?: (notification: Notification) => void
  /** Callback when a notification is deleted */
  onNotificationDelete?: (notification: Partial<Notification>) => void
  /** Enable the subscription */
  enabled?: boolean
}

/**
 * Realtime notification toast options
 */
export interface RealtimeToastOptions {
  /** Whether to show toast for new comments */
  showCommentToasts?: boolean
  /** Whether to show toast for new posts */
  showPostToasts?: boolean
  /** Whether to show toast for notifications */
  showNotificationToasts?: boolean
  /** Custom toast duration in milliseconds */
  toastDuration?: number
  /** Whether to play sound on new notification */
  playSound?: boolean
}

/**
 * Realtime subscription status
 */
export interface RealtimeSubscriptionStatus {
  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Last error message if any */
  error?: string
  /** Number of reconnection attempts */
  reconnectAttempts: number
  /** Timestamp of last connection */
  lastConnected?: Date
}

/**
 * Realtime notification context value
 */
export interface RealtimeNotificationContextValue {
  /** Whether realtime is connected */
  isConnected: boolean
  /** Connection status */
  status: RealtimeSubscriptionStatus['status']
  /** Number of unread notifications */
  unreadCount: number
  /** Mark a notification as read */
  markAsRead: (notificationId: UUID) => Promise<void>
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>
  /** Reconnect realtime */
  reconnect: () => void
  /** Disconnect realtime */
  disconnect: () => void
}

/**
 * Board activity update
 */
export interface BoardActivityUpdate {
  /** Board ID */
  boardId: UUID
  /** Type of activity */
  type: 'new_post' | 'new_comment' | 'post_update'
  /** Post involved in the activity */
  postId: UUID
  /** Comment ID if activity is a comment */
  commentId?: UUID
  /** Author name */
  authorName?: string
  /** Timestamp */
  timestamp: Date
}

/**
 * Comment notification data
 */
export interface CommentNotificationData {
  /** Comment content preview */
  excerpt: string
  /** Author name */
  authorName: string
  /** Post title */
  postTitle: string
  /** Post ID */
  postId: UUID
  /** Comment ID */
  commentId: UUID
  /** Whether it's a reply to user's comment */
  isReply: boolean
  /** Timestamp */
  timestamp: Date
}

/**
 * Post notification data
 */
export interface PostNotificationData {
  /** Post title */
  title: string
  /** Post excerpt */
  excerpt: string
  /** Author name */
  authorName: string
  /** Board name */
  boardName?: string
  /** Post ID */
  postId: UUID
  /** Board ID */
  boardId: UUID
  /** Timestamp */
  timestamp: Date
}
