'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck, Trash2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notification, NotificationType, UUID } from '@/lib/supabase/database.types'

/**
 * Props for NotificationBell component
 */
export interface NotificationBellProps {
  /** User ID to fetch notifications for */
  userId: UUID
  /** Show dropdown on click (default: true) */
  showDropdown?: boolean
  /** Maximum number of notifications to show in dropdown */
  maxItems?: number
  /** Link prefix for notification actions (e.g., '/ko') */
  localePrefix?: string
  /** Custom class name */
  className?: string
  /** Callback when notification is clicked */
  onNotificationClick?: (notification: Notification) => void
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'comment':
      return '💬'
    case 'mention':
      return '@'
    case 'like':
      return '❤️'
    case 'reply':
      return '↩️'
    case 'system':
      return '🔔'
    case 'admin':
      return '⚠️'
    default:
      return '📌'
  }
}

/**
 * Format notification content for display
 */
function formatNotificationContent(notification: Notification): {
  title: string
  description: string
} {
  return {
    title: notification.title,
    description: notification.content || '',
  }
}

/**
 * Notification bell component with dropdown
 *
 * Displays a notification bell icon with unread count badge.
 * Clicking the bell shows a dropdown with recent notifications.
 *
 * @example
 * ```tsx
 * function Header({ user }: { user: User }) {
 *   return (
 *     <div className="flex items-center gap-4">
 *       <NotificationBell
 *         userId={user.id}
 *         localePrefix="/ko"
 *         maxItems={10}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function NotificationBell({
  userId,
  showDropdown = true,
  maxItems = 10,
  localePrefix = '',
  className,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    realtimeStatus,
  } = useNotifications({
    userId,
    realtime: true,
    showToast: true,
    limit: maxItems,
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Call custom handler
    onNotificationClick?.(notification)

    // Navigate if there's an action URL
    if (notification.action_url) {
      // Close dropdown
      setIsOpen(false)
    }
  }

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  // Handle delete notification
  const handleDelete = async (e: React.MouseEvent, notificationId: UUID) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
  }

  // Display notifications (limited)
  const displayNotifications = notifications.slice(0, maxItems)

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {/* Realtime status indicator */}
        {realtimeStatus === 'connected' && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
        )}
        {realtimeStatus === 'connecting' && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border bg-popover shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-7 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Failed to load notifications</p>
                <Button variant="ghost" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {displayNotifications.map((notification) => {
                  const { title, description } = formatNotificationContent(notification)

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-accent transition-colors relative group',
                        !notification.is_read && 'bg-accent/50',
                        notification.isNew && 'animate-pulse-once'
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <span className="text-lg flex-shrink-0">
                          {notification.icon || getNotificationIcon(notification.type)}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm truncate',
                              !notification.is_read && 'font-semibold'
                            )}
                          >
                            {title}
                          </p>
                          {description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.timeAgo}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="h-6 w-6 p-0"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t text-center">
              <Link
                href={`${localePrefix}/notifications`}
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
