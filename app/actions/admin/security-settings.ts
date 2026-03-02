'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import {
  type SecuritySettingsFormData,
  securitySettingsUpdateSchema,
} from '@/lib/validations/security-settings'

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

export interface SecuritySettings {
  id: string
  // WHW-050: 미디어 필터 (Media Filter)
  mediafilter_whitelist: string
  mediafilter_classes: string
  robot_user_agents: string
  // WHW-051: 관리자 접근 제어 (Admin Access Control)
  admin_allowed_ip: string
  admin_denied_ip: string
  // WHW-052: 세션 보안 (Session Security)
  autologin_lifetime: number
  autologin_refresh: boolean
  use_session_ssl: boolean
  use_cookies_ssl: boolean
  check_csrf_token: boolean
  use_nofollow: boolean
  use_httponly: boolean
  use_samesite: 'Strict' | 'Lax' | 'None'
  x_frame_options: 'DENY' | 'SAMEORIGIN'
  x_content_type_options: 'nosniff'
  // Timestamps
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
 * Get security settings (WHW-050, WHW-051, WHW-052)
 * Admin only - retrieves media filters, access control, and session security settings
 */
export async function getSecuritySettings(): Promise<ActionResult<SecuritySettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('security_settings')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching security settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return {
      success: true,
      data: {
        ...data,
        use_samesite: data.use_samesite as 'Strict' | 'Lax' | 'None',
        x_frame_options: data.x_frame_options as 'DENY' | 'SAMEORIGIN',
        x_content_type_options: data.x_content_type_options as 'nosniff',
      } as SecuritySettings,
    }
  } catch (error) {
    console.error('Unexpected error in getSecuritySettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update security settings (WHW-050, WHW-051, WHW-052)
 * Admin only - updates media filters, access control, and session security settings
 */
export async function updateSecuritySettings(
  data: SecuritySettingsFormData
): Promise<ActionResult<SecuritySettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = securitySettingsUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('security_settings')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('security_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating security settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'security_settings',
      target_uuid: updatedSettings.id,
      description_text: '보안 설정 수정',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: currentSettings,
        new_values: validationResult.data,
      },
      severity_text: 'warning', // Security changes are more important
      module_text: 'admin',
    })

    return {
      success: true,
      data: {
        ...updatedSettings,
        use_samesite: updatedSettings.use_samesite as 'Strict' | 'Lax' | 'None',
        x_frame_options: updatedSettings.x_frame_options as 'DENY' | 'SAMEORIGIN',
        x_content_type_options: updatedSettings.x_content_type_options as 'nosniff',
      } as SecuritySettings,
      message: '보안 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateSecuritySettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
