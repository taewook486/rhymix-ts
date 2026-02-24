'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getMessages,
  getMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  getUnreadCount,
} from '@/app/actions/message'
import type {
  MessageListFilters,
  Message,
  MessageWithRelations,
  UUID,
} from '@/lib/supabase/database.types'

/**
 * Options for useMessages hook
 */
export interface UseMessagesOptions {
  /** User ID to fetch messages for */
  userId: UUID | null | undefined
  /** Folder to fetch (default: 'inbox') */
  folder?: 'inbox' | 'sent'
  /** Search query */
  search?: string
  /** Filter by read status */
  is_read?: boolean
  /** Limit results (default: 20) */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Return type for useMessages hook
 */
export interface UseMessagesReturn {
  /** List of messages */
  messages: Message[]
  /** Unread message count */
  unreadCount: number
  /** Whether messages are loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Get a specific message with relations */
  getMessage: (messageId: UUID) => Promise<MessageWithRelations | null>
  /** Mark a message as read */
  markAsRead: (messageId: UUID) => Promise<void>
  /** Mark all messages as read */
  markAllAsRead: () => Promise<void>
  /** Delete a message */
  deleteMessage: (messageId: UUID) => Promise<void>
  /** Refresh messages from server */
  refresh: () => Promise<void>
}

/**
 * Hook for managing messages
 *
 * @example
 * ```tsx
 * function MessageList({ user }: { user: User }) {
 *   const { messages, unreadCount, markAsRead, deleteMessage } = useMessages({
 *     userId: user.id,
 *     folder: 'inbox',
 *   })
 *
 *   return (
 *     <div>
 *       <h2>Inbox ({unreadCount})</h2>
 *       {messages.map((m) => (
 *         <div key={m.id}>
 *           <h3>{m.title}</h3>
 *           <p>{m.content}</p>
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const {
    userId,
    folder = 'inbox',
    search,
    is_read,
    limit = 20,
    offset = 0,
  } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch messages from server
  const fetchMessages = useCallback(async () => {
    if (!userId) {
      setMessages([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const filters: MessageListFilters = {
        folder,
        search,
        is_read,
        limit,
        offset,
      }

      const result = await getMessages(filters)

      if (result.success && result.data) {
        setMessages(result.data)
      } else {
        setError(new Error(result.error || 'Failed to fetch messages'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, folder, search, is_read, limit, offset])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0)
      return
    }

    try {
      const result = await getUnreadCount()

      if (result.success && result.data !== undefined) {
        setUnreadCount(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [userId])

  // Fetch a specific message
  const fetchMessage = useCallback(
    async (messageId: UUID): Promise<MessageWithRelations | null> => {
      try {
        const result = await getMessage(messageId)

        if (result.success && result.data) {
          return result.data
        } else {
          setError(new Error(result.error || 'Failed to fetch message'))
          return null
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch message'))
        return null
      }
    },
    []
  )

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: UUID) => {
    try {
      const result = await markAsRead(messageId)

      if (result.success) {
        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
        )
        // Update unread count
        await fetchUnreadCount()
      } else {
        setError(new Error(result.error || 'Failed to mark as read'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as read'))
    }
  }, [fetchUnreadCount])

  // Mark all messages as read
  const markAllMessagesAsRead = useCallback(async () => {
    try {
      const result = await markAllAsRead()

      if (result.success) {
        // Update local state
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
        // Update unread count
        await fetchUnreadCount()
      } else {
        setError(new Error(result.error || 'Failed to mark all as read'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all as read'))
    }
  }, [fetchUnreadCount])

  // Delete message
  const deleteMessageById = useCallback(async (messageId: UUID) => {
    try {
      const result = await deleteMessage(messageId)

      if (result.success) {
        // Remove from local state
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
        // Update unread count if needed
        await fetchUnreadCount()
      } else {
        setError(new Error(result.error || 'Failed to delete message'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete message'))
    }
  }, [fetchUnreadCount])

  // Fetch messages on mount and when options change
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Fetch unread count on mount and when userId changes
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  return {
    messages,
    unreadCount,
    isLoading,
    error,
    getMessage: fetchMessage,
    markAsRead: markMessageAsRead,
    markAllAsRead: markAllMessagesAsRead,
    deleteMessage: deleteMessageById,
    refresh: fetchMessages,
  }
}

export default useMessages
