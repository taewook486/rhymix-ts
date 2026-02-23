'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import { toast } from './use-toast'
import type { Notification, UUID } from '@/lib/supabase/database.types'

/**
 * Notification with computed fields
 */
export interface NotificationWithMeta extends Notification {
  /** Time ago string (e.g., "5 minutes ago") */
  timeAgo?: string
  /** Whether this notification is new (just received) */
  isNew?: boolean
}

/**
 * Options for useNotifications hook
 */
export interface UseNotificationsOptions {
  /** User ID to fetch notifications for */
  userId: UUID | null | undefined
  /** Enable realtime subscriptions (default: true) */
  realtime?: boolean
  /** Show toast notifications for new items (default: true) */
  showToast?: boolean
  /** Maximum number of notifications to fetch */
  limit?: number
  /** Auto-mark notifications as read when viewed (default: false) */
  autoMarkRead?: boolean
}

/**
 * Return type for useNotifications hook
 */
export interface UseNotificationsReturn {
  /** List of notifications */
  notifications: NotificationWithMeta[]
  /** Number of unread notifications */
  unreadCount: number
  /** Whether notifications are loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Mark a specific notification as read */
  markAsRead: (notificationId: UUID) => Promise<void>
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>
  /** Delete a notification */
  deleteNotification: (notificationId: UUID) => Promise<void>
  /** Refresh notifications from server */
  refresh: () => Promise<void>
  /** Realtime subscription status */
  realtimeStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

/**
 * Format a date to a relative time string
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }

  return date.toLocaleDateString()
}

/**
 * Hook for managing notifications with realtime support
 *
 * @example
 * ```tsx
 * function NotificationList() {
 *   const { notifications, unreadCount, markAsRead } = useNotifications({
 *     userId: user?.id,
 *     realtime: true,
 *     showToast: true,
 *   })
 *
 *   return (
 *     <div>
 *       <h2>Notifications ({unreadCount})</h2>
 *       {notifications.map((n) => (
 *         <div key={n.id} className={n.is_read ? 'opacity-50' : ''}>
 *           {n.title}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useNotifications(options: UseNotificationsOptions): UseNotificationsReturn {
  const {
    userId,
    realtime = true,
    showToast = true,
    limit = 50,
    autoMarkRead = false,
  } = options

  const supabase = createClient()
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const newNotificationIds = useRef<Set<string>>(new Set())

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      const notificationsWithMeta: NotificationWithMeta[] = (data || []).map((n) => ({
        ...n,
        timeAgo: formatTimeAgo(n.created_at),
        isNew: newNotificationIds.current.has(n.id),
      }))

      setNotifications(notificationsWithMeta)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase, limit])

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: UUID) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId)

        if (updateError) {
          throw updateError
        }

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
        throw err
      }
    },
    [supabase]
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      throw err
    }
  }, [userId, supabase])

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId: UUID) => {
      try {
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)

        if (deleteError) {
          throw deleteError
        }

        // Update local state
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      } catch (err) {
        console.error('Failed to delete notification:', err)
        throw err
      }
    },
    [supabase]
  )

  // Handle realtime notification insert
  const handleNotificationInsert = useCallback(
    (payload: RealtimePostgresChangesPayload<Notification>) => {
      if (payload.eventType !== 'INSERT') return

      const newNotification = payload.new as Notification

      // Mark as new for highlighting
      newNotificationIds.current.add(newNotification.id)

      // Add to local state
      const notificationWithMeta: NotificationWithMeta = {
        ...newNotification,
        timeAgo: formatTimeAgo(newNotification.created_at),
        isNew: true,
      }

      setNotifications((prev) => [notificationWithMeta, ...prev])

      // Show toast notification
      if (showToast) {
        toast({
          title: newNotification.title,
          description: newNotification.content || undefined,
        })
      }

      // Remove "isNew" flag after 5 seconds
      setTimeout(() => {
        newNotificationIds.current.delete(newNotification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === newNotification.id ? { ...n, isNew: false } : n))
        )
      }, 5000)
    },
    [showToast]
  )

  // Handle realtime notification update
  const handleNotificationUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<Notification>) => {
      if (payload.eventType !== 'UPDATE') return

      const updatedNotification = payload.new as Notification

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === updatedNotification.id
            ? { ...n, ...updatedNotification, timeAgo: formatTimeAgo(updatedNotification.created_at) }
            : n
        )
      )
    },
    []
  )

  // Handle realtime notification delete
  const handleNotificationDelete = useCallback(
    (payload: RealtimePostgresChangesPayload<Notification>) => {
      if (payload.eventType !== 'DELETE') return

      const deletedNotification = payload.old as Partial<Notification>

      setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id))
    },
    []
  )

  // Subscribe to realtime notifications
  const { status: realtimeStatus } = useRealtime({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: realtime && !!userId,
    onInsert: handleNotificationInsert,
    onUpdate: handleNotificationUpdate,
    onDelete: handleNotificationDelete,
  })

  // Fetch notifications on mount and when userId changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Auto-mark as read when viewed (if enabled)
  useEffect(() => {
    if (autoMarkRead && unreadCount > 0) {
      // Mark as read after 3 seconds of viewing
      const timer = setTimeout(() => {
        markAllAsRead()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [autoMarkRead, unreadCount, markAllAsRead])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
    realtimeStatus,
  }
}

export default useNotifications
