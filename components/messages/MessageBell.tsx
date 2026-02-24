'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Mail, Check, CheckCheck, Trash2, X, Loader2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useMessages } from '@/hooks/useMessages'
import type { UUID } from '@/lib/supabase/database.types'

/**
 * Props for MessageBell component
 */
export interface MessageBellProps {
  /** User ID to fetch messages for */
  userId: UUID
  /** Show dropdown on click (default: true) */
  showDropdown?: boolean
  /** Maximum number of messages to show in dropdown */
  maxItems?: number
  /** Link prefix for message actions (e.g., '/ko') */
  localePrefix?: string
  /** Custom class name */
  className?: string
  /** Callback when message is clicked */
  onMessageClick?: (messageId: UUID) => void
}

/**
 * Message bell component with dropdown
 *
 * Displays a message bell icon with unread count badge.
 * Clicking the bell shows a dropdown with recent messages.
 *
 * @example
 * ```tsx
 * function Header({ user }: { user: User }) {
 *   return (
 *     <div className="flex items-center gap-4">
 *       <MessageBell
 *         userId={user.id}
 *         localePrefix="/ko"
 *         maxItems={5}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function MessageBell({
  userId,
  showDropdown = true,
  maxItems = 5,
  localePrefix = '',
  className,
  onMessageClick,
}: MessageBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteMessage,
  } = useMessages({
    userId,
    folder: 'inbox',
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

  // Handle message click
  const handleMessageClick = async (messageId: UUID) => {
    // Mark as read
    const message = messages.find((m) => m.id === messageId)
    if (message && !message.is_read) {
      await markAsRead(messageId)
    }

    // Call custom handler
    onMessageClick?.(messageId)

    // Close dropdown
    setIsOpen(false)
  }

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  // Handle delete message
  const handleDelete = async (e: React.MouseEvent, messageId: UUID) => {
    e.stopPropagation()
    await deleteMessage(messageId)
  }

  // Display messages (limited)
  const displayMessages = messages.slice(0, maxItems)

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Mail className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border bg-popover shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">Messages</h3>
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
                <p>Failed to load messages</p>
                <Button variant="ghost" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : displayMessages.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message.id)}
                    className={cn(
                      'p-3 cursor-pointer hover:bg-accent transition-colors relative group',
                      !message.is_read && 'bg-accent/50'
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm truncate',
                            !message.is_read && 'font-semibold'
                          )}
                        >
                          {message.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!message.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(message.id)
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
                          onClick={(e) => handleDelete(e, message.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!message.is_read && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {messages.length > 0 && (
            <div className="p-2 border-t text-center">
              <Link
                href={`${localePrefix}/messages`}
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all messages
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MessageBell
