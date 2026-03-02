'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import {
  type PointRuleFormData,
  pointRuleUpdateSchema,
  pointRuleSchema,
} from '@/lib/validations/point-settings'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  NOT_FOUND: '규칙을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '규칙 수정에 실패했습니다.',
  BATCH_UPDATE_FAILED: '일괄 수정에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface PointRule {
  id: string
  action: string
  name: string
  description: string | null
  point: number
  revert_on_delete: boolean
  daily_limit: number | null
  per_content_limit: number | null
  except_notice: boolean
  except_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PointRuleUpdate {
  name?: string
  description?: string | null
  point?: number
  revert_on_delete?: boolean
  daily_limit?: number | null
  per_content_limit?: number | null
  except_notice?: boolean
  except_admin?: boolean
  is_active?: boolean
}

export interface PointRuleBatchUpdate {
  id: string
  data: PointRuleFormData
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
 * Get all point rules (WHW-042)
 * Admin only - retrieves all point award/deduct rules
 */
export async function getPointRules(): Promise<ActionResult<PointRule[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all rules ordered by action name
    const { data, error: fetchError } = await supabase
      .from('point_rules')
      .select('*')
      .order('action', { ascending: true })

    if (fetchError) {
      console.error('Error fetching point rules:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as PointRule[] }
  } catch (error) {
    console.error('Unexpected error in getPointRules:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get single point rule by action (WHW-042)
 * Admin only - retrieves a specific point rule by its action identifier
 */
export async function getPointRule(action: string): Promise<ActionResult<PointRule>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get rule by action
    const { data, error: fetchError } = await supabase
      .from('point_rules')
      .select('*')
      .eq('action', action)
      .single()

    if (fetchError) {
      console.error('Error fetching point rule:', fetchError)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    return { success: true, data: data as PointRule }
  } catch (error) {
    console.error('Unexpected error in getPointRule:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update single point rule (WHW-042)
 * Admin only - updates a specific point rule
 */
export async function updatePointRule(
  id: string,
  data: PointRuleFormData
): Promise<ActionResult<PointRule>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate input
    const validationResult = pointRuleUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    // Get current rule for audit log
    const { data: currentRule } = await supabase
      .from('point_rules')
      .select('*')
      .eq('id', id)
      .single()

    // Update rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('point_rules')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating point rule:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'update',
      target_type_text: 'point_rule',
      target_uuid: id,
      description_text: `포인트 규칙 수정: ${currentRule?.name || id}`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: currentRule,
        new_values: validationResult.data,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedRule as PointRule,
      message: '포인트 규칙이 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updatePointRule:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Batch update multiple point rules (WHW-042)
 * Admin only - updates multiple point rules in a single transaction
 */
export async function updatePointRulesBatch(
  rules: PointRuleBatchUpdate[]
): Promise<ActionResult<PointRule[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate all inputs
    for (const rule of rules) {
      const validationResult = pointRuleUpdateSchema.safeParse(rule.data)
      if (!validationResult.success) {
        console.error('Validation error for rule:', rule.id, validationResult.error)
        return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
      }
    }

    const supabase = await createClient()

    // Get current rules for audit log
    const ruleIds = rules.map((r) => r.id)
    const { data: currentRules } = await supabase
      .from('point_rules')
      .select('*')
      .in('id', ruleIds)

    // Update each rule
    const updatedRules: PointRule[] = []
    const errors: string[] = []

    for (const rule of rules) {
      const validationResult = pointRuleUpdateSchema.safeParse(rule.data)
      if (!validationResult.success) continue

      const { data: updatedRule, error: updateError } = await supabase
        .from('point_rules')
        .update({
          ...validationResult.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id)
        .select('*')
        .single()

      if (updateError) {
        errors.push(rule.id)
        console.error('Error updating point rule:', rule.id, updateError)
      } else {
        updatedRules.push(updatedRule as PointRule)
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `${ERROR_MESSAGES.BATCH_UPDATE_FAILED} (${errors.length}개 실패)`,
      }
    }

    // Add audit log for batch update
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'batch_update',
      target_type_text: 'point_rules',
      target_uuid: null,
      description_text: `포인트 규칙 일괄 수정: ${rules.length}개`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        old_values: currentRules,
        rule_count: rules.length,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedRules,
      message: `${updatedRules.length}개의 포인트 규칙이 수정되었습니다.`,
    }
  } catch (error) {
    console.error('Unexpected error in updatePointRulesBatch:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
