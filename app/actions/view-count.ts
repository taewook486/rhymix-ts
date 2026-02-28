'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'

// =====================================================
// Types
// =====================================================

export interface ViewCountRecord {
  id: string
  target_type: 'post' | 'document' | 'page' | 'comment'
  target_id: string
  view_count: number
  last_viewed_at: string
}

export interface ViewStats {
  total_views: number
  today_views: number
  this_week_views: number
  this_month_views: number
}

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  INVALID_TARGET: '유효하지 않은 대상입니다.',
  RECORD_FAILED: '조회수 기록에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// View Count Actions
// =====================================================

/**
 * Record a view and increment view count
 * This function handles both the view log and count increment
 */
export async function recordView(
  targetType: 'post' | 'document' | 'page' | 'comment',
  targetId: UUID
): Promise<{
  success: boolean
  data?: ViewCountRecord
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get user info if available
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get client IP from headers (not available in server actions, using user_id or null)
    const viewerId = user?.id || null
    const viewerIp = null // Server actions can't access client IP directly

    // Check if view was already recorded recently (within 1 hour for same viewer)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: existingRecord } = await supabase
      .from('view_logs')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('viewer_id', viewerId)
      .gte('created_at', oneHourAgo)
      .single()

    // If viewed recently, don't count again
    if (existingRecord) {
      const { data: currentRecord } = await supabase
        .from('view_counts')
        .select('*')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .single()

      return {
        success: true,
        data: currentRecord as ViewCountRecord,
      }
    }

    // Record the view log
    const { error: logError } = await supabase.from('view_logs').insert({
      target_type: targetType,
      target_id: targetId,
      viewer_id: viewerId,
      viewer_ip: viewerIp,
    })

    if (logError) {
      console.error('Error recording view log:', logError)
    }

    // Increment or create view count
    const { data: existingCount } = await supabase
      .from('view_counts')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    if (existingCount) {
      // Increment existing count
      const { data: updatedRecord, error } = await supabase
        .from('view_counts')
        .update({
          view_count: existingCount.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', existingCount.id)
        .select('*')
        .single()

      if (error) {
        console.error('Error incrementing view count:', error)
        return { success: false, error: ERROR_MESSAGES.RECORD_FAILED }
      }

      return { success: true, data: updatedRecord as ViewCountRecord }
    } else {
      // Create new count record
      const { data: newRecord, error } = await supabase
        .from('view_counts')
        .insert({
          target_type: targetType,
          target_id: targetId,
          view_count: 1,
          last_viewed_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating view count:', error)
        return { success: false, error: ERROR_MESSAGES.RECORD_FAILED }
      }

      return { success: true, data: newRecord as ViewCountRecord }
    }
  } catch (error) {
    console.error('Unexpected error in recordView:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get view count for a specific target
 */
export async function getViewCount(
  targetType: 'post' | 'document' | 'page' | 'comment',
  targetId: UUID
): Promise<{
  success: boolean
  data?: number
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('view_counts')
      .select('view_count')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    if (error) {
      // Return 0 if no record exists
      return { success: true, data: 0 }
    }

    return { success: true, data: data?.view_count || 0 }
  } catch (error) {
    console.error('Unexpected error in getViewCount:', error)
    return { success: true, data: 0 }
  }
}

/**
 * Get detailed view statistics for a target
 */
export async function getViewStats(
  targetType: 'post' | 'document' | 'page' | 'comment',
  targetId: UUID
): Promise<{
  success: boolean
  data?: ViewStats
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get total views
    const { data: countRecord } = await supabase
      .from('view_counts')
      .select('view_count')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    const totalViews = countRecord?.view_count || 0

    // Get today's views
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayViews } = await supabase
      .from('view_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .gte('created_at', today.toISOString())

    // Get this week's views
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const { count: weekViews } = await supabase
      .from('view_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .gte('created_at', weekAgo.toISOString())

    // Get this month's views
    const monthAgo = new Date()
    monthAgo.setDate(1)
    monthAgo.setHours(0, 0, 0, 0)

    const { count: monthViews } = await supabase
      .from('view_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .gte('created_at', monthAgo.toISOString())

    return {
      success: true,
      data: {
        total_views: totalViews,
        today_views: todayViews || 0,
        this_week_views: weekViews || 0,
        this_month_views: monthViews || 0,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getViewStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get most viewed content
 */
export async function getMostViewed(
  targetType: 'post' | 'document' | 'page' | 'comment',
  limit = 10,
  timeRange: 'all' | 'today' | 'week' | 'month' = 'all'
): Promise<{
  success: boolean
  data?: ViewCountRecord[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('view_counts')
      .select('*')
      .eq('target_type', targetType)
      .order('view_count', { ascending: false })
      .limit(limit)

    // Apply time range filter if needed
    if (timeRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case 'today':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate = new Date()
          startDate.setDate(1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('last_viewed_at', startDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting most viewed:', error)
      return { success: true, data: [] }
    }

    return { success: true, data: (data || []) as ViewCountRecord[] }
  } catch (error) {
    console.error('Unexpected error in getMostViewed:', error)
    return { success: true, data: [] }
  }
}

/**
 * Increment view count for documents (compatibility function)
 */
export async function incrementDocumentViewCount(
  documentId: UUID
): Promise<{ success: boolean }> {
  try {
    const result = await recordView('document', documentId)

    if (!result.success) {
      console.error('Error incrementing document view count:', result.error)
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in incrementDocumentViewCount:', error)
    return { success: true } // Don't fail the request for this
  }
}

/**
 * Increment view count for pages (compatibility function)
 */
export async function incrementPageViewCount(
  pageId: UUID
): Promise<{ success: boolean }> {
  try {
    const result = await recordView('page', pageId)

    if (!result.success) {
      console.error('Error incrementing page view count:', result.error)
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in incrementPageViewCount:', error)
    return { success: true } // Don't fail the request for this
  }
}
