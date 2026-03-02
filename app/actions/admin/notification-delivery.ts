'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import {
  type NotificationDeliverySettingsFormData,
  notificationDeliverySettingsUpdateSchema,
} from '@/lib/validations/notification-delivery'

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

export interface NotificationDeliverySettings {
  id: string
  // SMTP settings (WHW-070)
  smtp_enabled: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password: string | null
  smtp_encryption: 'none' | 'ssl' | 'tls'
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_reply_to: string | null
  smtp_max_recipients: number
  smtp_timeout_seconds: number
  // SMS settings (WHW-071)
  sms_enabled: boolean
  sms_provider: 'default' | 'twilio' | 'nexmo' | 'alphasms' | 'custom'
  sms_api_key: string | null
  sms_api_secret: string | null
  sms_from_number: string | null
  sms_max_length: number
  sms_encoding: 'utf8' | 'euckr'
  sms_timeout_seconds: number
  // Push settings
  push_enabled: boolean
  push_provider: 'fcm' | 'apns' | 'onesignal' | 'custom'
  push_api_key: string | null
  push_apns_key_id: string | null
  push_apns_team_id: string | null
  push_apns_bundle_id: string | null
  push_fcm_server_key: string | null
  push_fcm_sender_id: string | null
  push_ttl_seconds: number
  push_sound: string
  // Web settings
  web_enabled: boolean
  web_require_permission: boolean
  web_vapid_public_key: string | null
  web_vapid_private_key: string | null
  web_subject: string
  // Rate limiting
  rate_limit_enabled: boolean
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  rate_limit_per_day: number
  // Retry settings
  retry_enabled: boolean
  retry_max_attempts: number
  retry_delay_seconds: number
  retry_backoff_multiplier: number
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
 * Get notification delivery settings (WHW-070, WHW-071)
 * Admin only - retrieves email/SMS/Push delivery settings
 */
export async function getNotificationDeliverySettings(): Promise<ActionResult<NotificationDeliverySettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('notification_delivery_settings')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching notification delivery settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as NotificationDeliverySettings }
  } catch (error) {
    console.error('Unexpected error in getNotificationDeliverySettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update notification delivery settings (WHW-070, WHW-071)
 * Admin only - updates email/SMS/Push delivery settings
 */
export async function updateNotificationDeliverySettings(
  data: NotificationDeliverySettingsFormData
): Promise<ActionResult<NotificationDeliverySettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = notificationDeliverySettingsUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('notification_delivery_settings')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('notification_delivery_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating notification delivery settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log with warning severity for sensitive settings
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'notification_delivery_settings',
      target_uuid: updatedSettings.id,
      description_text: '알림 발송 설정 수정 (SMTP/SMS/Push)',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: {
          smtp_enabled: currentSettings?.smtp_enabled,
          sms_enabled: currentSettings?.sms_enabled,
          push_enabled: currentSettings?.push_enabled,
          web_enabled: currentSettings?.web_enabled,
        },
        new_values: {
          smtp_enabled: validationResult.data.smtp_enabled,
          sms_enabled: validationResult.data.sms_enabled,
          push_enabled: validationResult.data.push_enabled,
          web_enabled: validationResult.data.web_enabled,
        },
      },
      severity_text: 'warning',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedSettings as NotificationDeliverySettings,
      message: '알림 발송 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateNotificationDeliverySettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Test SMTP connection
 * Admin only - validates SMTP settings by attempting connection
 */
export async function testSmtpConnection(): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get current SMTP settings
    const { data: settings } = await supabase
      .from('notification_delivery_settings')
      .select('smtp_enabled, smtp_host, smtp_port, smtp_username, smtp_encryption')
      .limit(1)
      .single()

    if (!settings?.smtp_enabled || !settings.smtp_host) {
      return {
        success: false,
        error: 'SMTP가 비활성화되어 있거나 설정이 완료되지 않았습니다.',
      }
    }

    // TODO: Implement actual SMTP connection test
    // This is a placeholder that always returns success for now
    return {
      success: true,
      data: { success: true, message: 'SMTP 연결 테스트는 아직 구현되지 않았습니다.' },
    }
  } catch (error) {
    console.error('Unexpected error in testSmtpConnection:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Test SMS connection
 * Admin only - validates SMS API settings
 */
export async function testSmsConnection(): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get current SMS settings
    const { data: settings } = await supabase
      .from('notification_delivery_settings')
      .select('sms_enabled, sms_provider, sms_api_key')
      .limit(1)
      .single()

    if (!settings?.sms_enabled || !settings.sms_api_key) {
      return {
        success: false,
        error: 'SMS가 비활성화되어 있거나 API 키가 설정되지 않았습니다.',
      }
    }

    // TODO: Implement actual SMS API test
    return {
      success: true,
      data: { success: true, message: 'SMS 연결 테스트는 아직 구현되지 않았습니다.' },
    }
  } catch (error) {
    console.error('Unexpected error in testSmsConnection:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Test Push connection
 * Admin only - validates Push notification settings
 */
export async function testPushConnection(): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get current Push settings
    const { data: settings } = await supabase
      .from('notification_delivery_settings')
      .select('push_enabled, push_provider, push_api_key, push_fcm_server_key')
      .limit(1)
      .single()

    if (!settings?.push_enabled) {
      return {
        success: false,
        error: 'Push 알림이 비활성화되어 있습니다.',
      }
    }

    if (settings.push_provider === 'fcm' && !settings.push_fcm_server_key) {
      return {
        success: false,
        error: 'FCM 서버 키가 설정되지 않았습니다.',
      }
    }

    // TODO: Implement actual Push connection test
    return {
      success: true,
      data: { success: true, message: 'Push 연결 테스트는 아직 구현되지 않았습니다.' },
    }
  } catch (error) {
    console.error('Unexpected error in testPushConnection:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
