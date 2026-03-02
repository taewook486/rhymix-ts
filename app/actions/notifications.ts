'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID, Notification, NotificationInsert, NotificationSettings } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'

// Re-export types for convenience
export type {
  Notification,
  NotificationInsert,
  NotificationSettings,
} from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '알림을 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '알림 업데이트에 실패했습니다.',
  DELETE_FAILED: '알림 삭제에 실패했습니다.',
  SETTINGS_UPDATE_FAILED: '알림 설정 업데이트에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
} as const

// =====================================================
// Notification Actions
// =====================================================

/**
 * Mark all notifications as read for a user
 *
 * @param userId - User ID to mark notifications for
 * @returns ActionResult indicating success or failure
 */
export async function markAllNotificationsAsRead(userId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Verify user owns the notifications
    if (user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Mark all as read error:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark all as read error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a notification
 *
 * @param notificationId - Notification ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteNotification(notificationId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if notification exists and belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    if (notification.user_id !== user.id) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (deleteError) {
      console.error('Delete notification error:', deleteError)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete notification error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Mark a single notification as read
 *
 * @param notificationId - Notification ID to mark as read
 * @returns ActionResult indicating success or failure
 */
export async function markNotificationAsRead(notificationId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if notification exists and belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    if (notification.user_id !== user.id) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (updateError) {
      console.error('Mark as read error:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark as read error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Notification Settings Actions
// =====================================================

/**
 * Get notification settings for a user
 *
 * @param userId - User ID to get settings for
 * @returns Notification settings or error
 */
export async function getNotificationSettings(
  userId: UUID
): Promise<ActionResult<NotificationSettings>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Verify user owns the settings
    if (user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: profile.notification_settings as NotificationSettings }
  } catch (error) {
    console.error('Get notification settings error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update notification settings for a user
 *
 * @param userId - User ID to update settings for
 * @param settings - New notification settings
 * @returns ActionResult indicating success or failure
 */
export async function updateNotificationSettings(
  userId: UUID,
  settings: Partial<NotificationSettings>
): Promise<ActionResult<NotificationSettings>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Verify user owns the settings
    if (user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Get current settings
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single()

    if (fetchError || !currentProfile) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    // Merge settings
    const currentSettings = (currentProfile.notification_settings || {}) as NotificationSettings
    const updatedSettings: NotificationSettings = {
      ...currentSettings,
      ...settings,
    }

    // Update settings
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        notification_settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('notification_settings')
      .single()

    if (updateError || !updatedProfile) {
      console.error('Update notification settings error:', updateError)
      return { success: false, error: ERROR_MESSAGES.SETTINGS_UPDATE_FAILED }
    }

    return { success: true, data: updatedProfile.notification_settings as NotificationSettings }
  } catch (error) {
    console.error('Update notification settings error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Notification Creation (System Use)
// =====================================================

/**
 * Create a notification (for system use only)
 * This should be called from other server actions when events occur
 *
 * @param notification - Notification data to insert
 * @returns Created notification or error
 */
export async function createNotification(
  notification: NotificationInsert
): Promise<ActionResult<Notification>> {
  try {
    const supabase = await createClient()

    // Validate required fields
    if (!notification.user_id || !notification.type || !notification.title) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // Create notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title.trim(),
        content: notification.content?.trim() || null,
        action_url: notification.action_url || null,
        action_label: notification.action_label || null,
        icon: notification.icon || null,
        metadata: notification.metadata || {},
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Create notification error:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Create notification error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get notifications for a user with pagination
 *
 * @param userId - User ID to get notifications for
 * @param options - Query options (limit, offset, is_read)
 * @returns List of notifications or error
 */
export async function getNotifications(options: {
  userId: UUID
  limit?: number
  offset?: number
  isRead?: boolean
}): Promise<ActionResult<Notification[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Verify user owns the notifications
    if (user.id !== options.userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', options.userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options.isRead !== undefined) {
      query = query.eq('is_read', options.isRead)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get notifications error:', error)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Get notifications error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get unread notification count for a user
 *
 * @param userId - User ID to get count for
 * @returns Unread count or error
 */
export async function getUnreadNotificationCount(
  userId: UUID
): Promise<ActionResult<{ count: number }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Verify user owns the notifications
    if (user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Get unread count error:', error)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: { count: count || 0 } }
  } catch (error) {
    console.error('Get unread count error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Admin Notification Channel Settings
// =====================================================

export interface NotificationChannel {
  web: boolean
  mail: boolean
  sms: boolean
  push: boolean
}

export interface NotificationChannelSettings {
  display_use: boolean
  always_display: boolean
  user_config_list: string[]
  force_receive: string[]
  comment: NotificationChannel
  comment_reply: NotificationChannel
  mention: NotificationChannel
  like: NotificationChannel
  scrap: NotificationChannel
  message: NotificationChannel
  admin: NotificationChannel
  custom: NotificationChannel
}

/**
 * Update site-wide notification channel settings (Admin only)
 *
 * @param settings - Notification channel settings to update
 * @returns ActionResult indicating success or failure
 */
export async function updateNotificationChannelSettings(
  settings: NotificationChannelSettings
): Promise<ActionResult<NotificationChannelSettings>> {
  try {
    const supabase = await createClient()

    // Check authentication and admin permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    // Get current site config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('site_config')
      .select('*')
      .single()

    if (fetchError || !currentConfig) {
      // Create if not exists
      const { data: newConfig, error: createError } = await supabase
        .from('site_config')
        .insert({
          notification_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .select('notification_settings')
        .single()

      if (createError || !newConfig) {
        console.error('Create notification settings error:', createError)
        return { success: false, error: '알림 설정 저장에 실패했습니다.' }
      }

      return { success: true, data: newConfig.notification_settings as NotificationChannelSettings }
    }

    // Update existing config
    const { data: updatedConfig, error: updateError } = await supabase
      .from('site_config')
      .update({
        notification_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConfig.id)
      .select('notification_settings')
      .single()

    if (updateError || !updatedConfig) {
      console.error('Update notification settings error:', updateError)
      return { success: false, error: '알림 설정 저장에 실패했습니다.' }
    }

    return { success: true, data: updatedConfig.notification_settings as NotificationChannelSettings }
  } catch (error) {
    console.error('Update notification channel settings error:', error)
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
  }
}

/**
 * Get delivery settings for notification channels (Admin only)
 *
 * @returns Delivery settings or error
 */
export async function getDeliverySettings(): Promise<
  ActionResult<{
    smtp: {
      host: string
      port: number
      user: string
      password: string
      security: 'none' | 'ssl' | 'tls'
    }
    sender: {
      name: string
      email: string
    }
    sms: {
      api_key: string
      api_secret: string
      from_number: string
    }
    push: {
      enabled: boolean
      server_key: string
    }
  }>
> {
  try {
    const supabase = await createClient()

    // Check authentication and admin permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    // Get delivery settings from site_config
    const { data: siteConfig, error } = await supabase
      .from('site_config')
      .select('delivery_settings')
      .single()

    if (error || !siteConfig) {
      return {
        success: true,
        data: {
          smtp: {
            host: '',
            port: 587,
            user: '',
            password: '',
            security: 'tls',
          },
          sender: {
            name: '',
            email: '',
          },
          sms: {
            api_key: '',
            api_secret: '',
            from_number: '',
          },
          push: {
            enabled: false,
            server_key: '',
          },
        },
      }
    }

    return { success: true, data: siteConfig.delivery_settings as any }
  } catch (error) {
    console.error('Get delivery settings error:', error)
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
  }
}

/**
 * Update delivery settings for notification channels (Admin only)
 *
 * @param settings - Delivery settings to update
 * @returns ActionResult indicating success or failure
 */
export async function updateDeliverySettings(
  settings: any
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication and admin permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    // Get current site config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('site_config')
      .select('*')
      .single()

    if (fetchError || !currentConfig) {
      // Create if not exists
      const { error: createError } = await supabase.from('site_config').insert({
        delivery_settings: settings,
        updated_at: new Date().toISOString(),
      })

      if (createError) {
        console.error('Create delivery settings error:', createError)
        return { success: false, error: '발송 설정 저장에 실패했습니다.' }
      }

      return { success: true }
    }

    // Update existing config
    const { error: updateError } = await supabase
      .from('site_config')
      .update({
        delivery_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConfig.id)

    if (updateError) {
      console.error('Update delivery settings error:', updateError)
      return { success: false, error: '발송 설정 저장에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Update delivery settings error:', error)
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
  }
}

/**
 * Get notification logs (Admin only)
 *
 * @param options - Query options
 * @returns Notification logs or error
 */
export async function getNotificationLogs(options: {
  type?: 'mail' | 'sms' | 'push'
  status?: 'success' | 'error'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient()

    // Check authentication and admin permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    // TODO: Implement notification logs table query
    // For now, return empty array
    return { success: true, data: [] }
  } catch (error) {
    console.error('Get notification logs error:', error)
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
  }
}
