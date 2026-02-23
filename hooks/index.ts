/**
 * Realtime Hooks Index
 *
 * Export all realtime-related hooks for easy importing
 */

// Core realtime hook
export { useRealtime, useRealtimeMulti } from './useRealtime'
export type {
  RealtimeSubscriptionOptions,
  UseRealtimeReturn,
} from './useRealtime'

// Notifications hook with realtime support
export { useNotifications } from './useNotifications'
export type {
  NotificationWithMeta,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from './useNotifications'

// Toast hook (re-export for convenience)
export { useToast, toast } from './use-toast'
