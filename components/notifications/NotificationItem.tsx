'use client'

import React from 'react'
import Link from 'next/link'
import { Check, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotificationWithMeta, UUID } from '@/lib/supabase/database.types'

/**
 * Props for NotificationItem component
 */
export interface NotificationItemProps {
  /** Notification data */
  notification: NotificationWithMeta
  /** Whether to show actions on hover */
  showActions?: boolean
  /** Callback when notification is clicked */
  onClick?: (notification: NotificationWithMeta) => void
  /** Callback when mark as read is clicked */
  onMarkRead?: (notificationId: UUID) => void
  /** Callback when delete is clicked */
  onDelete?: (notificationId: UUID) => void
  /** Custom class name */
  className?: string
  /** Link prefix for navigation (e.g., '/ko') */
  localePrefix?: string
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    comment: '💬',
    mention: '@',
    like: '❤️',
    reply: '↩️',
    system: '🔔',
    admin: '⚠️',
  }
  return iconMap[type] || '📌'
}

/**
 * Notification item component
 *
 * Displays a single notification with icon, title, content, and actions.
 *
 * @example
 * ```tsx
 * function NotificationList() {
 *   const { notifications, markAsRead, deleteNotification } = useNotifications({ userId })
 *   return (
 *     <div>
 *       {notifications.map((notification) => (
 *         <NotificationItem
 *           key={notification.id}
 *           notification={notification}
 *           onMarkRead={markAsRead}
 *           onDelete={deleteNotification}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function NotificationItem({
  notification,
  showActions = true,
  onClick,
  onMarkRead,
  onDelete,
  className,
  localePrefix = '',
}: NotificationItemProps) {
  // Handle click
  const handleClick = () => {
    onClick?.(notification)
  }

  // Handle mark as read
  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkRead?.(notification.id)
  }

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(notification.id)
  }

  // Render content wrapper (link or div)
  const contentWrapper = notification.action_url ? (
    <Link
      href={`${localePrefix}${notification.action_url}`}
      onClick={handleClick}
      className={cn(
        'p-3 cursor-pointer hover:bg-accent transition-colors relative group',
        !notification.is_read && 'bg-accent/50',
        notification.isNew && 'animate-pulse-once',
        className
      )}
    >
      {renderContent()}
    </Link>
  ) : (
    <div
      onClick={handleClick}
      className={cn(
        'p-3 cursor-pointer hover:bg-accent transition-colors relative group',
        !notification.is_read && 'bg-accent/50',
        notification.isNew && 'animate-pulse-once',
        className
      )}
    >
      {renderContent()}
    </div>
  )

  function renderContent() {
    return (
      <>
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
              {notification.title}
            </p>
            {notification.content && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {notification.content}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {notification.timeAgo}
            </p>
          </div>

          {/* Action label indicator */}
          {notification.action_url && notification.action_label && (
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && onMarkRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkRead}
                  className="h-6 w-6 p-0"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.is_read && (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
        )}
      </>
    )
  }

  return contentWrapper
}

export default NotificationItem
