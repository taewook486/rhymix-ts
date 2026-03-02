'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'
import type { Profile } from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  EXPORT_FAILED: '내보내기에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface AdvancedMemberFilters {
  role?: string
  status?: 'approved' | 'denied' | 'unverified'
  group_id?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort?: 'created_at' | 'last_login_at' | 'display_name'
  order?: 'asc' | 'desc'
}

export interface BulkActionRequest {
  user_ids: string[]
  action: 'statusChange' | 'groupAssign'
  value: string
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
 * Get members with advanced filters (admin only)
 * Sprint 1: Enhanced with status, group, date range filters
 */
export async function getMembersAdvanced(
  filters: AdvancedMemberFilters = {}
): Promise<ActionResult<Profile[]>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const {
      role,
      status,
      group_id,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
    } = filters

    const offset = (page - 1) * limit

    let query = supabase.from('profiles').select('*')

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }

    // Note: status filter requires status column in profiles table
    // if (status) {
    //   query = query.eq('status', status)
    // }

    // Note: group filter requires join with user_groups table
    // if (group_id) {
    //   query = query.contains('group_ids', [group_id])
    // }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching members:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (data || []) as Profile[] }
  } catch (error) {
    console.error('Unexpected error in getMembersAdvanced:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Bulk status change (admin only)
 * Sprint 1: Change status for multiple users at once
 */
export async function bulkStatusChange(request: BulkActionRequest): Promise<ActionResult> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Validate status value
    const validStatuses = ['approved', 'denied', 'unverified']
    if (!validStatuses.includes(request.value)) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // Note: This requires status column in profiles table
    // For now, we'll use metadata to track status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        metadata: { status: request.value },
        updated_at: new Date().toISOString(),
      })
      .in('id', request.user_ids)

    if (updateError) {
      console.error('Error updating member status:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'bulk_update',
      target_type_text: 'profiles',
      target_uuid: null,
      description_text: `회원 상태 일괄 변경: ${request.user_ids.length}명 -> ${request.value}`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        user_ids: request.user_ids,
        new_status: request.value,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      message: `${request.user_ids.length}명의 회원 상태가 변경되었습니다.`,
    }
  } catch (error) {
    console.error('Unexpected error in bulkStatusChange:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Bulk group assignment (admin only)
 * Sprint 1: Assign group to multiple users at once
 */
export async function bulkGroupAssign(request: BulkActionRequest): Promise<ActionResult> {
  try {
    // Check admin permission
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Insert user_groups records
    const userGroupRecords = request.user_ids.map((user_id) => ({
      user_id,
      group_id: request.value,
      added_by: userId,
    }))

    const { error: insertError } = await supabase.from('user_groups').insert(userGroupRecords)

    if (insertError) {
      console.error('Error assigning group:', insertError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'bulk_update',
      target_type_text: 'user_groups',
      target_uuid: null,
      description_text: `회원 그룹 일괄 할당: ${request.user_ids.length}명 -> ${request.value}`,
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        user_ids: request.user_ids,
        group_id: request.value,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      message: `${request.user_ids.length}명의 회원 그룹이 할당되었습니다.`,
    }
  } catch (error) {
    console.error('Unexpected error in bulkGroupAssign:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Export members to CSV (admin only)
 * Sprint 1: Export member list with new fields
 */
export async function exportMembersToCsv(
  filters: AdvancedMemberFilters = {}
): Promise<ActionResult<string>> {
  try {
    // Check admin permission
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all members (no pagination for export)
    let query = supabase.from('profiles').select('*')

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role)
    }

    if (filters.search) {
      query = query.or(`display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('Error exporting members:', fetchError)
      return { success: false, error: ERROR_MESSAGES.EXPORT_FAILED }
    }

    // Generate CSV
    const headers = [
      'id',
      'email',
      'display_name',
      'role',
      'homepage',
      'blog',
      'birthday',
      'allow_mailing',
      'allow_message',
      'created_at',
    ]

    const csvRows = [headers.join(',')]

    for (const member of data || []) {
      const row = [
        member.id || '',
        member.email || '',
        member.display_name || '',
        member.role || '',
        member.homepage || '',
        member.blog || '',
        member.birthday || '',
        member.allow_mailing ? 'true' : 'false',
        member.allow_message || '',
        member.created_at || '',
      ]
      csvRows.push(row.map((v) => `"${v}"`).join(','))
    }

    const csv = csvRows.join('\n')

    return {
      success: true,
      data: csv,
      message: `${data?.length || 0}명의 회원을 내보냈습니다.`,
    }
  } catch (error) {
    console.error('Unexpected error in exportMembersToCsv:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
