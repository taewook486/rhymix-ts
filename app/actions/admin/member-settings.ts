'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import { z } from 'zod'

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

export interface MemberSettings {
  id: string
  enable_join: boolean
  enable_join_key: string | null
  enable_confirm: boolean
  authmail_expires: number
  member_profile_view: 'everyone' | 'member' | 'admin'
  allow_nickname_change: boolean
  update_nickname_log: boolean
  nickname_symbols: boolean
  nickname_spaces: boolean
  allow_duplicate_nickname: boolean
  password_strength: 'weak' | 'normal' | 'strong'
  password_hashing_algorithm: 'bcrypt' | 'argon2'
  password_hashing_work_factor: number
  password_hashing_auto_upgrade: boolean
  password_change_invalidate_other_sessions: boolean
  password_reset_method: 'email' | 'question' | 'admin'
  created_at: string
  updated_at: string
}

export type MemberSettingsUpdate = Partial<
  Omit<MemberSettings, 'id' | 'created_at' | 'updated_at'>
>

// =====================================================
// Validation Schemas
// =====================================================

const MemberSettingsSchema = z.object({
  enable_join: z.boolean().optional(),
  enable_join_key: z.string().nullable().optional(),
  enable_confirm: z.boolean().optional(),
  authmail_expires: z.number().int().positive().optional(),
  member_profile_view: z.enum(['everyone', 'member', 'admin']).optional(),
  allow_nickname_change: z.boolean().optional(),
  update_nickname_log: z.boolean().optional(),
  nickname_symbols: z.boolean().optional(),
  nickname_spaces: z.boolean().optional(),
  allow_duplicate_nickname: z.boolean().optional(),
  password_strength: z.enum(['weak', 'normal', 'strong']).optional(),
  password_hashing_algorithm: z.enum(['bcrypt', 'argon2']).optional(),
  password_hashing_work_factor: z.number().int().min(4).max(15).optional(),
  password_hashing_auto_upgrade: z.boolean().optional(),
  password_change_invalidate_other_sessions: z.boolean().optional(),
  password_reset_method: z.enum(['email', 'question', 'admin']).optional(),
})

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
 * Get member settings (admin only)
 */
export async function getMemberSettings(): Promise<ActionResult<MemberSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('member_settings')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching member settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as MemberSettings }
  } catch (error) {
    console.error('Unexpected error in getMemberSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update member settings (admin only)
 */
export async function updateMemberSettings(
  data: MemberSettingsUpdate
): Promise<ActionResult<MemberSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = MemberSettingsSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('member_settings')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('member_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating member settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'member_settings',
      target_uuid: updatedSettings.id,
      description_text: '회원 설정 수정',
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
      data: updatedSettings as MemberSettings,
      message: '회원 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateMemberSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
