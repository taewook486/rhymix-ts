'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Props for NotificationBadge component
 */
export interface NotificationBadgeProps {
  /** Number of unread notifications */
  count: number
  /** Maximum number to display (e.g., 99 shows "99+") */
  max?: number
  /** Custom class name */
  className?: string
  /** Show zero count (default: false) */
  showZero?: boolean
  /** Badge variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
}

/**
 * Notification badge component
 *
 * Displays unread notification count with formatting.
 * Shows "99+" when count exceeds max value.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { unreadCount } = useNotifications({ userId: user.id })
 *   return <NotificationBadge count={unreadCount} max={99} />
 * }
 * ```
 */
export function NotificationBadge({
  count,
  max = 99,
  className,
  showZero = false,
  variant = 'destructive',
}: NotificationBadgeProps) {
  // Don't show if count is 0 and showZero is false
  if (!showZero && count === 0) {
    return null
  }

  // Format count
  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <Badge
      variant={variant}
      className={cn(
        'h-5 min-w-5 px-1 text-xs flex items-center justify-center',
        className
      )}
    >
      {displayCount}
    </Badge>
  )
}

export default NotificationBadge
