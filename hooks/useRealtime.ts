'use client'

import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Supabase Realtime subscription options
 */
export interface RealtimeSubscriptionOptions<T extends AnyRecord = AnyRecord> {
  /** Table name to subscribe to */
  table: string
  /** Schema name (default: 'public') */
  schema?: string
  /** Optional filter for the subscription (e.g., 'user_id=eq.123') */
  filter?: string
  /** Event types to listen to (default: all) */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  /** Callback for INSERT events */
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** Callback for UPDATE events */
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** Callback for DELETE events */
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** Callback for all events */
  onAll?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** Enable the subscription (default: true) */
  enabled?: boolean
}

/**
 * Return type for useRealtime hook
 */
export interface UseRealtimeReturn {
  /** The channel instance */
  channel: RealtimeChannel | null
  /** Subscription status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Manually unsubscribe */
  unsubscribe: () => void
  /** Manually resubscribe */
  resubscribe: () => void
}

/**
 * Hook for subscribing to Supabase Realtime changes
 *
 * @example
 * ```tsx
 * // Subscribe to all comment changes
 * useRealtime({
 *   table: 'comments',
 *   onInsert: (payload) => {
 *     console.log('New comment:', payload.new)
 *   }
 * })
 *
 * // Subscribe to specific post comments
 * useRealtime({
 *   table: 'comments',
 *   filter: 'post_id=eq.123',
 *   onInsert: (payload) => {
 *     toast({ title: 'New comment!', description: payload.new.content })
 *   }
 * })
 * ```
 */
export function useRealtime<T extends AnyRecord = AnyRecord>(
  options: RealtimeSubscriptionOptions<T>
): UseRealtimeReturn {
  const {
    table,
    schema = 'public',
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onAll,
    enabled = true,
  } = options

  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const statusRef = useRef<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')

  const handleEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      // Call the specific event handler
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload)
          break
        case 'UPDATE':
          onUpdate?.(payload)
          break
        case 'DELETE':
          onDelete?.(payload)
          break
      }
      // Always call the onAll handler
      onAll?.(payload)
    },
    [onInsert, onUpdate, onDelete, onAll]
  )

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
      statusRef.current = 'disconnected'
    }
  }, [])

  const subscribe = useCallback(() => {
    if (!enabled) {
      return
    }

    // Unsubscribe from existing channel
    unsubscribe()

    statusRef.current = 'connecting'

    // Create a unique channel name
    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ''}`

    // Create and configure the channel
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: '' },
      },
    })

    // Configure the postgres changes listener
    const postgresConfig = {
      event,
      schema,
      table,
      ...(filter && { filter }),
    }

    channel.on(
      'postgres_changes' as const,
      postgresConfig,
      (payload: RealtimePostgresChangesPayload<T>) => {
        handleEvent(payload)
      }
    )

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        statusRef.current = 'connected'
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        statusRef.current = status === 'CHANNEL_ERROR' ? 'error' : 'disconnected'
      }
    })

    channelRef.current = channel
  }, [supabase, table, schema, filter, event, enabled, handleEvent, unsubscribe])

  const resubscribe = useCallback(() => {
    subscribe()
  }, [subscribe])

  // Subscribe on mount or when options change
  useEffect(() => {
    subscribe()

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return {
    channel: channelRef.current,
    status: statusRef.current,
    unsubscribe,
    resubscribe,
  }
}

/**
 * Hook for subscribing to multiple tables at once
 *
 * @example
 * ```tsx
 * useRealtimeMulti([
 *   { table: 'posts', filter: 'board_id=eq.123', onInsert: handleNewPost },
 *   { table: 'comments', filter: 'post_id=eq.456', onInsert: handleNewComment },
 * ])
 * ```
 */
export function useRealtimeMulti<T extends AnyRecord = AnyRecord>(
  subscriptions: RealtimeSubscriptionOptions<T>[]
): {
  channels: RealtimeChannel[]
  unsubscribeAll: () => void
  resubscribeAll: () => void
} {
  const channelsRef = useRef<RealtimeChannel[]>([])

  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach((channel) => channel.unsubscribe())
    channelsRef.current = []
  }, [])

  const resubscribeAll = useCallback(() => {
    unsubscribeAll()
    // The useEffect will handle resubscription
  }, [unsubscribeAll])

  useEffect(() => {
    const supabase = createClient()
    channelsRef.current = []

    subscriptions.forEach((sub) => {
      if (!sub.enabled && sub.enabled !== undefined) {
        return
      }

      const channelName = `realtime:${sub.schema || 'public'}:${sub.table}${sub.filter ? `:${sub.filter}` : ''}`

      const channel = supabase.channel(channelName)

      const postgresConfig = {
        event: sub.event || '*',
        schema: sub.schema || 'public',
        table: sub.table,
        ...(sub.filter && { filter: sub.filter }),
      }

      channel.on(
        'postgres_changes' as const,
        postgresConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          switch (payload.eventType) {
            case 'INSERT':
              sub.onInsert?.(payload)
              break
            case 'UPDATE':
              sub.onUpdate?.(payload)
              break
            case 'DELETE':
              sub.onDelete?.(payload)
              break
          }
          sub.onAll?.(payload)
        }
      )

      channel.subscribe()
      channelsRef.current.push(channel)
    })

    return () => {
      unsubscribeAll()
    }
  }, [subscriptions, unsubscribeAll])

  return {
    channels: channelsRef.current,
    unsubscribeAll,
    resubscribeAll,
  }
}

export default useRealtime
