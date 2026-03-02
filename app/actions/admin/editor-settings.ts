'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import { z } from 'zod'
import {
  type EditorSettings,
  type EditorSettingsFormData,
  editorSettingsUpdateSchema,
} from '@/lib/validations/editor-settings'

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
// Database Response Type
// =====================================================

interface EditorSettingsRow {
  id: string
  editor_skin: string
  color_scheme: string
  editor_height: number
  toolbar_set: string
  hide_toolbar: boolean
  font_family: string
  font_size: number
  line_height: number
  enabled_tools: string[]
  created_at: string
  updated_at: string
}

// =====================================================
// Validation Schemas
// =====================================================

const EditorSettingsSchema = editorSettingsUpdateSchema

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
 * Get editor settings (admin only)
 */
export async function getEditorSettings(): Promise<ActionResult<EditorSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('editor_settings')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching editor settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    const row = data as EditorSettingsRow

    return {
      success: true,
      data: {
        editor_skin: row.editor_skin as 'ckeditor' | 'simpleeditor' | 'textarea',
        color_scheme: row.color_scheme as 'mondo' | 'mondo-dark' | 'mondo-lisa',
        editor_height: row.editor_height,
        toolbar_set: row.toolbar_set as 'basic' | 'advanced',
        hide_toolbar: row.hide_toolbar,
        font_family: row.font_family,
        font_size: row.font_size,
        line_height: row.line_height,
        enabled_tools: row.enabled_tools,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getEditorSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update editor settings (admin only)
 */
export async function updateEditorSettings(
  data: EditorSettingsFormData
): Promise<ActionResult<EditorSettings>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = EditorSettingsSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('editor_settings')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('editor_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating editor settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    const row = updatedSettings as EditorSettingsRow

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'editor_settings',
      target_uuid: updatedSettings.id,
      description_text: '에디터 설정 수정',
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
      data: {
        editor_skin: row.editor_skin as 'ckeditor' | 'simpleeditor' | 'textarea',
        color_scheme: row.color_scheme as 'mondo' | 'mondo-dark' | 'mondo-lisa',
        editor_height: row.editor_height,
        toolbar_set: row.toolbar_set as 'basic' | 'advanced',
        hide_toolbar: row.hide_toolbar,
        font_family: row.font_family,
        font_size: row.font_size,
        line_height: row.line_height,
        enabled_tools: row.enabled_tools,
      },
      message: '에디터 설정이 저장되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateEditorSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
