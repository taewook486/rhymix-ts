'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import {
  type NotificationSettingsFormData,
  notificationSettingsUpdateSchema,
} from '@/lib/validations/notification-settings'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  NOT_FOUND: '설정을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '설정 수정에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface NotificationSettings {
  id: string
  enable_notification_types: {
    signup: boolean
    login: boolean
    document: boolean
    comment: boolean
    vote: boolean
    scrap: boolean
    mention: boolean
    message: boolean
  }
  enable_notification_channels: {
    email: boolean
    sms: boolean
    push: boolean
    web: boolean
  }
  notification_center_enabled: boolean
  notification_center_limit: number
  notification_center_order: 'latest' | 'oldest' | 'type'
  realtime_notification_enabled: boolean
  realtime_notification_sound: boolean
  realtime_notification_desktop: boolean
  notification_retention_days: number
  created_at: string
  updated_at: string
}

export interface UserNotificationSettings {
  id: string
  user_id: string
  notification_types: Record<string, boolean>
  notification_channels: Record<string, boolean>
  mute_all: boolean
  do_not_disturb: boolean
  do_not_disturb_start: string
  do_not_disturb_end: string
  created_at: string
  updated_at: string
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if user is admin
 */
async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, error: ERROR_MESSAGES.UNAUTHORIZED }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return { isAdmin: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
  }

  if (profile.role !== 'admin') {
    return { isAdmin: false, userId: user.id, error: ERROR_MESSAGES.PERMISSION_DENIED }
  }

  return { isAdmin: true, userId: user.id }
}

// =====================================================
// Actions
// =====================================================

/**
 * Get notification settings (WHW-060, WHW-061, WHW-062)
 * Admin only - retrieves global notification settings
 */
export async function getNotificationSettings(): Promise<ActionResult<NotificationSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching notification settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as NotificationSettings }
  } catch (error) {
    console.error('Unexpected error in getNotificationSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update notification settings (WHW-060, WHW-061, WHW-062)
 * Admin only - updates global notification settings
 */
export async function updateNotificationSettings(
  data: NotificationSettingsFormData
): Promise<ActionResult<NotificationSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = notificationSettingsUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('notification_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating notification settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'notification_settings',
      target_uuid: updatedSettings.id,
      description_text: '알림 설정 수정',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: currentSettings,
        new_values: validationResult.data,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedSettings as NotificationSettings,
      message: '알림 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateNotificationSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get user notification settings
 * Admin only - retrieves all users' notification preferences
 */
export async function getAllUserNotificationSettings(): Promise<ActionResult<UserNotificationSettings[]>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error: fetchError } = await supabase
      .from('user_notification_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching user notification settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: (data || []) as UserNotificationSettings[] }
  } catch (error) {
    console.error('Unexpected error in getAllUserNotificationSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Reset user notification settings to defaults
 * Admin only - resets a user's notification preferences
 */
export async function resetUserNotificationSettings(
  userId: string
): Promise<ActionResult<UserNotificationSettings>> {
  try {
    const { isAdmin: admin, userId: adminId, error } = await isAdmin()
    if (!admin || !adminId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Delete user's custom settings (will fall back to global defaults)
    const { error: deleteError } = await supabase
      .from('user_notification_settings')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error resetting user notification settings:', deleteError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: adminId,
      action_text: 'reset',
      target_type_text: 'user_notification_settings',
      target_uuid: userId,
      description_text: '사용자 알림 설정 초기화',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: { user_id: userId },
      severity_text: 'warning',
      module_text: 'admin',
    })

    return {
      success: true,
      data: null as unknown as UserNotificationSettings,
      message: '사용자 알림 설정이 초기화되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in resetUserNotificationSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
