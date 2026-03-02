'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import type {
  NotificationLog,
  NotificationDailyStats,
  UserNotificationStats,
} from '@/types/notification-logs'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  DELETE_FAILED: '로그 삭제에 실패했습니다.',
  RETRY_FAILED: '재시도 요청에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface NotificationLogFilters {
  user_id?: string
  status?: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'rejected'
  notification_type?: 'signup' | 'login' | 'document' | 'comment' | 'vote' | 'scrap' | 'mention' | 'message' | 'system'
  channel?: 'email' | 'sms' | 'push' | 'web'
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export interface NotificationLogListResponse {
  logs: NotificationLog[]
  total: number
  page: number
  limit: number
  totalPages: number
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
 * Get notification logs with filtering (WHW-072)
 * Admin only - retrieves notification delivery logs
 */
export async function getNotificationLogs(
  filters: NotificationLogFilters = {}
): Promise<ActionResult<NotificationLogListResponse>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.notification_type) {
      query = query.eq('notification_type', filters.notification_type)
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel)
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    // Get paginated results
    const { data, error: fetchError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Error fetching notification logs:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return {
      success: true,
      data: {
        logs: (data || []) as NotificationLog[],
        total: count || 0,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getNotificationLogs:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get notification statistics summary
 * Admin only - retrieves aggregated statistics
 */
export async function getNotificationStats(
  days: number = 30
): Promise<ActionResult<{
  totalSent: number
  totalDelivered: number
  totalFailed: number
  deliveryRate: number
  byChannel: Record<string, number>
  byType: Record<string, number>
  byStatus: Record<string, number>
}>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get logs for the specified period
    const { data, error: fetchError } = await supabase
      .from('notification_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (fetchError) {
      console.error('Error fetching notification stats:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const logs = data || []

    // Calculate statistics
    const totalSent = logs.filter((l) => l.status === 'sent').length
    const totalDelivered = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length
    const totalFailed = logs.filter((l) => ['failed', 'bounced', 'rejected'].includes(l.status)).length
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0

    // Group by channel
    const byChannel: Record<string, number> = {}
    logs.forEach((log) => {
      if (log.status === 'sent') {
        byChannel[log.channel] = (byChannel[log.channel] || 0) + 1
      }
    })

    // Group by type
    const byType: Record<string, number> = {}
    logs.forEach((log) => {
      if (log.status === 'sent') {
        byType[log.notification_type] = (byType[log.notification_type] || 0) + 1
      }
    })

    // Group by status
    const byStatus: Record<string, number> = {}
    logs.forEach((log) => {
      byStatus[log.status] = (byStatus[log.status] || 0) + 1
    })

    return {
      success: true,
      data: {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        byChannel,
        byType,
        byStatus,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getNotificationStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get daily notification statistics
 * Admin only - retrieves daily aggregated stats from materialized view
 */
export async function getDailyNotificationStats(
  days: number = 30
): Promise<ActionResult<NotificationDailyStats[]>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error: fetchError } = await supabase
      .from('notification_daily_stats')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (fetchError) {
      console.error('Error fetching daily notification stats:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (data || []) as NotificationDailyStats[] }
  } catch (error) {
    console.error('Unexpected error in getDailyNotificationStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete old notification logs
 * Admin only - manually triggers cleanup of old logs
 */
export async function deleteOldNotificationLogs(): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Call the cleanup function
    const { data, error: rpcError } = await supabase.rpc('delete_old_notification_logs')

    if (rpcError) {
      console.error('Error deleting old notification logs:', rpcError)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'cleanup',
      target_type_text: 'notification_logs',
      target_uuid: null,
      description_text: '오래된 알림 로그 삭제',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: { deleted_count: data },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: { deletedCount: data || 0 },
      message: '오래된 알림 로그가 삭제되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in deleteOldNotificationLogs:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Retry failed notification
 * Admin only - manually retry a failed notification
 */
export async function retryNotification(
  logId: string
): Promise<ActionResult<NotificationLog>> {
  try {
    const { isAdmin: admin, userId, error } = await isAdmin()
    if (!admin || !userId) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get the log
    const { data: log, error: fetchError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (fetchError || !log) {
      return { success: false, error: '로그를 찾을 수 없습니다.' }
    }

    // Check if retryable
    if (log.status !== 'failed') {
      return { success: false, error: '실패한 알림만 재시도할 수 있습니다.' }
    }

    if (log.retry_count >= log.max_retries) {
      return { success: false, error: '최대 재시도 횟수를 초과했습니다.' }
    }

    // Update log for retry
    const { data: updatedLog, error: updateError } = await supabase
      .from('notification_logs')
      .update({
        status: 'pending',
        retry_count: log.retry_count + 1,
        next_retry_at: new Date().toISOString(),
      })
      .eq('id', logId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error retrying notification:', updateError)
      return { success: false, error: ERROR_MESSAGES.RETRY_FAILED }
    }

    // Add audit log
    await supabase.rpc('log_activity', {
      user_uuid: userId,
      action_text: 'retry',
      target_type_text: 'notification_logs',
      target_uuid: logId,
      description_text: '알림 발송 재시도',
      ip_addr: null,
      user_agent_text: null,
      metadata_json: {
        notification_type: log.notification_type,
        channel: log.channel,
        retry_count: log.retry_count + 1,
      },
      severity_text: 'info',
      module_text: 'admin',
    })

    return {
      success: true,
      data: updatedLog as NotificationLog,
      message: '알림이 재시도 대기열에 추가되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in retryNotification:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get user notification statistics
 * Admin only - retrieves stats for a specific user
 */
export async function getUserNotificationStats(
  userId: string,
  days: number = 30
): Promise<ActionResult<UserNotificationStats>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error: rpcError } = await supabase.rpc('get_user_notification_stats', {
      p_user_id: userId,
      p_days: days,
    })

    if (rpcError) {
      console.error('Error fetching user notification stats:', rpcError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return {
      success: true,
      data: data as unknown as UserNotificationStats,
    }
  } catch (error) {
    console.error('Unexpected error in getUserNotificationStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Refresh notification statistics materialized view
 * Admin only - manually refresh the stats view
 */
export async function refreshNotificationStats(): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { isAdmin: admin, error } = await isAdmin()
    if (!admin) {
      return { success: false, error: error || ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { error: rpcError } = await supabase.rpc('refresh_notification_stats')

    if (rpcError) {
      console.error('Error refreshing notification stats:', rpcError)
      return { success: false, error: '통계 새로고침에 실패했습니다.' }
    }

    return {
      success: true,
      data: { success: true },
      message: '알림 통계가 새로고침되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in refreshNotificationStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
