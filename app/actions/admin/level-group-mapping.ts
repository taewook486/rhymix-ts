'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import {
  type LevelGroupMappingFormData,
  type LevelGroupFormData,
  levelGroupMappingUpdateSchema,
  levelGroupSchema,
} from '@/lib/validations/point-settings'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  NOT_FOUND: '설정을 찾을 수 없습니다.',
  GROUP_NOT_FOUND: '그룹을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '설정 수정에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface LevelGroupMapping {
  id: string
  group_sync_mode: 'replace' | 'add'
  point_decrease_mode: 'keep' | 'demote'
  created_at: string
  updated_at: string
}

export interface LevelGroup {
  id: string
  level: number
  group_id: string | null
  created_at: string
}

export interface Group {
  id: string
  title: string
  description: string | null
  is_default: boolean
  created_at: string
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
 * Get level-group mapping settings (WHW-043)
 * Admin only - retrieves level-group synchronization settings
 */
export async function getLevelGroupMapping(): Promise<ActionResult<LevelGroupMapping>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get settings (single row)
    const { data, error: fetchError } = await supabase
      .from('level_group_mapping')
      .select('*')
      .limit(1)
      .single()

    if (fetchError) {
      console.error('Error fetching level-group mapping:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as LevelGroupMapping }
  } catch (error) {
    console.error('Unexpected error in getLevelGroupMapping:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update level-group mapping settings (WHW-043)
 * Admin only - updates level-group synchronization settings
 */
export async function updateLevelGroupMapping(
  data: LevelGroupMappingFormData
): Promise<ActionResult<LevelGroupMapping>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = levelGroupMappingUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current settings for audit log
    const { data: currentSettings } = await supabase
      .from('level_group_mapping')
      .select('*')
      .limit(1)
      .single()

    // Update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('level_group_mapping')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings?.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating level-group mapping:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'level_group_mapping',
      target_uuid: updatedSettings.id,
      description_text: '레벨-그룹 연동 설정 수정',
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
      data: updatedSettings as LevelGroupMapping,
      message: '레벨-그룹 연동 설정이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateLevelGroupMapping:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get all level-group assignments (WHW-043)
 * Admin only - retrieves all level to group mappings
 */
export async function getLevelGroups(): Promise<ActionResult<LevelGroup[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all level-group assignments ordered by level
    const { data, error: fetchError } = await supabase
      .from('level_groups')
      .select('*')
      .order('level', { ascending: true })

    if (fetchError) {
      console.error('Error fetching level groups:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as LevelGroup[] }
  } catch (error) {
    console.error('Unexpected error in getLevelGroups:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update single level's group assignment (WHW-043)
 * Admin only - updates which group is assigned to a specific level
 */
export async function updateLevelGroup(
  level: number,
  groupId: string | null
): Promise<ActionResult<LevelGroup>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = levelGroupSchema.safeParse({ level, group_id: groupId })
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Check if group exists (if groupId is provided)
    if (groupId) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .single()

      if (groupError || !group) {
        return { success: false, error: ERROR_MESSAGES.GROUP_NOT_FOUND }
      }
    }

    // Upsert level-group assignment
    const { data: updatedLevelGroup, error: upsertError } = await supabase
      .from('level_groups')
      .upsert(
        {
          level,
          group_id: groupId,
        },
        {
          onConflict: 'level',
        }
      )
      .select('*')
      .single()

    if (upsertError) {
      console.error('Error updating level group:', upsertError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'level_group',
      target_uuid: updatedLevelGroup.id,
      description_text: `레벨 ${level} 그룹 할당 수정`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        level,
        group_id: groupId,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedLevelGroup as LevelGroup,
      message: `레벨 ${level}의 그룹 할당이 수정되었습니다.`,
    }
  } catch (error) {
    console.error('Unexpected error in updateLevelGroup:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get available groups for dropdown (WHW-043)
 * Admin only - retrieves all groups for selection in level-group mapping UI
 */
export async function getGroupsList(): Promise<ActionResult<Group[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all groups ordered by title
    const { data, error: fetchError } = await supabase
      .from('groups')
      .select('id, title, description, is_default, created_at')
      .order('title', { ascending: true })

    if (fetchError) {
      console.error('Error fetching groups:', fetchError)
      return { success: false, error: ERROR_MESSAGES.GROUP_NOT_FOUND }
    }

    return { success: true, data: data as Group[] }
  } catch (error) {
    console.error('Unexpected error in getGroupsList:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
