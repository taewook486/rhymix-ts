'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, X, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { NotificationBadge } from './NotificationBadge'
import type { UUID, NotificationWithMeta } from '@/lib/supabase/database.types'

/**
 * Props for NotificationCenter component
 */
export interface NotificationCenterProps {
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
  onNotificationClick?: (notification: NotificationWithMeta) => void
  /** Show settings button (default: true) */
  showSettingsButton?: boolean
}

/**
 * Notification center component with dropdown
 *
 * Displays a notification bell icon with unread count badge.
 * Clicking the bell shows a dropdown with recent notifications.
 * Includes mark all read, settings, and view all links.
 *
 * @example
 * ```tsx
 * function Header({ user }: { user: User }) {
 *   return (
 *     <div className="flex items-center gap-4">
 *       <NotificationCenter
 *         userId={user.id}
 *         localePrefix="/ko"
 *         maxItems={10}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function NotificationCenter({
  userId,
  showDropdown = true,
  maxItems = 10,
  localePrefix = '',
  className,
  onNotificationClick,
  showSettingsButton = true,
}: NotificationCenterProps) {
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
    refresh,
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
  const handleNotificationClick = async (notification: NotificationWithMeta) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Call custom handler
    onNotificationClick?.(notification)

    // Close dropdown after navigation (will be handled by Link)
    setTimeout(() => setIsOpen(false), 100)
  }

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  // Handle delete notification
  const handleDelete = async (notificationId: UUID) => {
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
        {/* Unread badge */}
        <NotificationBadge count={unreadCount} max={99} />

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
              {showSettingsButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to settings (handled by Link if inside)
                    window.location.href = `${localePrefix}/notifications/settings`
                  }}
                  className="h-7 w-7 p-0"
                  title="Notification settings"
                >
                  <Settings className="h-4 w-4" />
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
                <Button variant="ghost" size="sm" className="mt-2" onClick={refresh}>
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
                {displayNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    onMarkRead={markAsRead}
                    onDelete={handleDelete}
                    localePrefix={localePrefix}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t text-center">
              <a
                href={`${localePrefix}/notifications`}
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
