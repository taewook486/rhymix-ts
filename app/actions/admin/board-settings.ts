'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import type { BoardConfig, BoardWithConfig } from '@/types/board'
import {
  boardConfigUpdateSchema,
  type BoardConfigFormData,
} from '@/lib/validations/board-config'
import { z } from 'zod'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  BOARD_NOT_FOUND: '게시판을 찾을 수 없습니다.',
  SETTINGS_NOT_FOUND: '설정을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '설정 수정에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface EditorSettings {
  id: string
  editor_skin: 'ckeditor' | 'simpleeditor' | 'textarea'
  color_scheme: 'mondo' | 'mondo-dark' | 'mondo-lisa'
  editor_height: number
  toolbar_set: 'basic' | 'advanced'
  hide_toolbar: boolean
  font_family: string
  font_size: number
  line_height: number
  enabled_tools: string[]
  created_at: string
  updated_at: string
}

export type EditorSettingsUpdate = Partial<
  Omit<EditorSettings, 'id' | 'created_at' | 'updated_at'>
>

// =====================================================
// Validation Schemas
// =====================================================

const EditorSettingsSchema = z.object({
  editor_skin: z.enum(['ckeditor', 'simpleeditor', 'textarea']).optional(),
  color_scheme: z.enum(['mondo', 'mondo-dark', 'mondo-lisa']).optional(),
  editor_height: z.number().int().min(100).max(2000).optional(),
  toolbar_set: z.enum(['basic', 'advanced']).optional(),
  hide_toolbar: z.boolean().optional(),
  font_family: z.string().max(100).optional(),
  font_size: z.number().int().min(8).max(72).optional(),
  line_height: z.number().min(1.0).max(3.0).optional(),
  enabled_tools: z.array(z.string()).optional(),
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
// Board Settings Actions
// =====================================================

/**
 * Get board configuration by board ID (admin only)
 */
export async function getBoardSettings(boardId: string): Promise<ActionResult<BoardConfig>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get board with config
    const { data, error: fetchError } = await supabase
      .from('boards')
      .select('config')
      .eq('id', boardId)
      .single()

    if (fetchError || !data) {
      console.error('Error fetching board settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.BOARD_NOT_FOUND }
    }

    return { success: true, data: data.config as BoardConfig }
  } catch (error) {
    console.error('Unexpected error in getBoardSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update board configuration (admin only)
 */
export async function updateBoardSettings(
  boardId: string,
  data: BoardConfigFormData
): Promise<ActionResult<BoardConfig>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input using Zod schema
    const validationResult = boardConfigUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current config for audit log
    const { data: currentBoard } = await supabase
      .from('boards')
      .select('config, title')
      .eq('id', boardId)
      .single()

    if (!currentBoard) {
      return { success: false, error: ERROR_MESSAGES.BOARD_NOT_FOUND }
    }

    // Merge with existing config (partial update)
    const currentConfig = (currentBoard.config as BoardConfig) || {}
    const updatedConfig = {
      ...currentConfig,
      ...validationResult.data,
    }

    // Update board config
    const { data: updatedBoard, error: updateError } = await supabase
      .from('boards')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId)
      .select('config')
      .single()

    if (updateError) {
      console.error('Error updating board settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'board_settings',
      target_uuid: boardId,
      description_text: `게시판 설정 수정: ${currentBoard.title || boardId}`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: currentConfig,
        new_values: validationResult.data,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedBoard.config as BoardConfig,
      message: '게시판 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateBoardSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get all boards with their settings (admin only)
 */
export async function getAllBoardSettings(): Promise<ActionResult<BoardWithConfig[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all boards with config
    const { data, error: fetchError } = await supabase
      .from('boards')
      .select(`
        id,
        slug,
        title,
        description,
        content,
        icon,
        banner_url,
        config,
        skin,
        list_order,
        sort_order,
        view_count,
        post_count,
        comment_count,
        is_notice,
        is_hidden,
        is_locked,
        is_secret,
        admin_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching all board settings:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data as BoardWithConfig[] }
  } catch (error) {
    console.error('Unexpected error in getAllBoardSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Editor Settings Actions
// =====================================================

/**
 * Get global editor settings (admin only)
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
      return { success: false, error: ERROR_MESSAGES.SETTINGS_NOT_FOUND }
    }

    return { success: true, data: data as EditorSettings }
  } catch (error) {
    console.error('Unexpected error in getEditorSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update global editor settings (admin only)
 */
export async function updateEditorSettings(
  data: EditorSettingsUpdate
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

    if (!currentSettings) {
      return { success: false, error: ERROR_MESSAGES.SETTINGS_NOT_FOUND }
    }

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('editor_settings')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating editor settings:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

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
      data: updatedSettings as EditorSettings,
      message: '에디터 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateEditorSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
