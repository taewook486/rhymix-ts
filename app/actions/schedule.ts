'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'

// =====================================================
// Types
// =====================================================

export type ScheduleableContentType = 'post' | 'document' | 'page'

export interface ScheduledContent {
  id: UUID
  content_type: ScheduleableContentType
  content_id: UUID
  title: string
  scheduled_publish_at: string
  status: 'pending' | 'published' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
  published_at: string | null
  error_message: string | null
}

export interface ScheduleContentInput {
  content_type: ScheduleableContentType
  content_id: UUID
  scheduled_publish_at: string // ISO date string
}

export interface ScheduledContentFilters {
  content_type?: ScheduleableContentType
  status?: 'pending' | 'published' | 'failed' | 'cancelled'
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

// =====================================================
// Error Messages
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Login required.',
  NOT_FOUND: 'Content not found.',
  PERMISSION_DENIED: 'Permission denied.',
  INVALID_DATE: 'Invalid schedule date.',
  PAST_DATE: 'Schedule date must be in the future.',
  ALREADY_SCHEDULED: 'Content is already scheduled.',
  CREATE_FAILED: 'Failed to create schedule.',
  UPDATE_FAILED: 'Failed to update schedule.',
  DELETE_FAILED: 'Failed to delete schedule.',
  UNKNOWN_ERROR: 'Unknown error occurred.',
}

// =====================================================
// Schedule Actions
// =====================================================

/**
 * Schedule content for future publication
 */
export async function scheduleContent(
  input: ScheduleContentInput
): Promise<ActionResult<ScheduledContent>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Validate date
    const scheduledDate = new Date(input.scheduled_publish_at)
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: ERROR_MESSAGES.INVALID_DATE }
    }

    if (scheduledDate <= new Date()) {
      return { success: false, error: ERROR_MESSAGES.PAST_DATE }
    }

    // Check if content exists and user has permission
    let contentTitle: string
    let tableName: string

    switch (input.content_type) {
      case 'post':
        tableName = 'posts'
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('id, title, author_id')
          .eq('id', input.content_id)
          .single()

        if (postError || !post) {
          return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
        }

        if (post.author_id !== user.id) {
          // Check if user is admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (!profile || profile.role !== 'admin') {
            return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
          }
        }

        contentTitle = post.title
        break

      case 'document':
        tableName = 'documents'
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('id, title, author_id')
          .eq('id', input.content_id)
          .single()

        if (docError || !doc) {
          return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
        }

        if (doc.author_id !== user.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (!profile || profile.role !== 'admin') {
            return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
          }
        }

        contentTitle = doc.title
        break

      case 'page':
        tableName = 'pages'
        const { data: page, error: pageError } = await supabase
          .from('pages')
          .select('id, title, author_id')
          .eq('id', input.content_id)
          .single()

        if (pageError || !page) {
          return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
        }

        if (page.author_id !== user.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (!profile || profile.role !== 'admin') {
            return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
          }
        }

        contentTitle = page.title
        break

      default:
        return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    // Check if already scheduled
    const { data: existing } = await supabase
      .from('scheduled_content')
      .select('id')
      .eq('content_type', input.content_type)
      .eq('content_id', input.content_id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return { success: false, error: ERROR_MESSAGES.ALREADY_SCHEDULED }
    }

    // Create schedule
    const { data: schedule, error } = await supabase
      .from('scheduled_content')
      .insert({
        content_type: input.content_type,
        content_id: input.content_id,
        title: contentTitle,
        scheduled_publish_at: input.scheduled_publish_at,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create schedule:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data: schedule }
  } catch (error) {
    console.error('scheduleContent error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get scheduled content list
 */
export async function getScheduledContent(
  filters?: ScheduledContentFilters
): Promise<ActionResult<ScheduledContent[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    let query = supabase
      .from('scheduled_content')
      .select('*')
      .order('scheduled_publish_at', { ascending: true })

    // Apply filters
    if (filters?.content_type) {
      query = query.eq('content_type', filters.content_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('scheduled_publish_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('scheduled_publish_at', filters.date_to)
    }

    // Pagination
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch scheduled content:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('getScheduledContent error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update scheduled content
 */
export async function updateScheduledContent(
  id: UUID,
  updates: Partial<Pick<ScheduledContent, 'scheduled_publish_at' | 'status'>>
): Promise<ActionResult<ScheduledContent>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Validate date if provided
    if (updates.scheduled_publish_at) {
      const scheduledDate = new Date(updates.scheduled_publish_at)
      if (isNaN(scheduledDate.getTime())) {
        return { success: false, error: ERROR_MESSAGES.INVALID_DATE }
      }

      if (scheduledDate <= new Date()) {
        return { success: false, error: ERROR_MESSAGES.PAST_DATE }
      }
    }

    const { data, error } = await supabase
      .from('scheduled_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update scheduled content:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data }
  } catch (error) {
    console.error('updateScheduledContent error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Cancel scheduled content
 */
export async function cancelScheduledContent(
  id: UUID
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    const { error } = await supabase
      .from('scheduled_content')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      console.error('Failed to cancel scheduled content:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error('cancelScheduledContent error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Process pending scheduled content (called by cron job)
 * This publishes content that has reached its scheduled time
 */
export async function processScheduledContent(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()

    // Get all pending content that should be published
    const now = new Date().toISOString()
    const { data: pending, error: fetchError } = await supabase
      .from('scheduled_content')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_publish_at', now)

    if (fetchError) {
      console.error('Failed to fetch pending content:', fetchError)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    if (!pending || pending.length === 0) {
      return { success: true, data: 0 }
    }

    let publishedCount = 0

    // Process each scheduled item
    for (const item of pending) {
      try {
        // Update content status to published
        let tableName: string
        switch (item.content_type) {
          case 'post':
            tableName = 'posts'
            break
          case 'document':
            tableName = 'documents'
            break
          case 'page':
            tableName = 'pages'
            break
          default:
            continue
        }

        const { error: publishError } = await supabase
          .from(tableName)
          .update({
            status: 'published',
            published_at: now,
          })
          .eq('id', item.content_id)

        if (publishError) {
          // Mark as failed
          await supabase
            .from('scheduled_content')
            .update({
              status: 'failed',
              error_message: publishError.message,
            })
            .eq('id', item.id)

          console.error(`Failed to publish ${item.content_type} ${item.content_id}:`, publishError)
          continue
        }

        // Mark schedule as completed
        const { error: completeError } = await supabase
          .from('scheduled_content')
          .update({
            status: 'published',
            published_at: now,
          })
          .eq('id', item.id)

        if (completeError) {
          console.error('Failed to update schedule status:', completeError)
        } else {
          publishedCount++
        }
      } catch (itemError) {
        console.error(`Error processing scheduled item ${item.id}:`, itemError)
      }
    }

    return { success: true, data: publishedCount }
  } catch (error) {
    console.error('processScheduledContent error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get upcoming scheduled content count
 */
export async function getScheduledContentStats(): Promise<
  ActionResult<{
    pending: number
    published_today: number
    failed: number
  }>
> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    // Get pending count
    const { count: pending } = await supabase
      .from('scheduled_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get published today count
    const { count: publishedToday } = await supabase
      .from('scheduled_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', todayStr)

    // Get failed count
    const { count: failed } = await supabase
      .from('scheduled_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    return {
      success: true,
      data: {
        pending: pending || 0,
        published_today: publishedToday || 0,
        failed: failed || 0,
      },
    }
  } catch (error) {
    console.error('getScheduledContentStats error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
