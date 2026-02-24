'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Draft {
  id: string
  user_id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  content: string
  content_html: string | null
  excerpt: string | null
  metadata: Record<string, any>
  saved_at: string
  expires_at: string
}

export interface DraftListItem {
  id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  excerpt: string | null
  saved_at: string
  expires_at: string
}

// =====================================================
// Server Actions
// =====================================================

/**
 * 모든 드래프트 목록 가져오기
 * Get all drafts for the current user
 */
export async function getAllDrafts(): Promise<{
  success: boolean
  data?: DraftListItem[]
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('editor_autosave')
      .select('id, target_type, target_id, title, excerpt, saved_at, expires_at')
      .eq('user_id', user.data.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('saved_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data as DraftListItem[] }
  } catch (error) {
    console.error('Get all drafts error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get drafts'
    }
  }
}

/**
 * 드래프트 복구하기
 * Restore a specific draft
 */
export async function restoreDraft(draftId: string): Promise<{
  success: boolean
  data?: Draft
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('editor_autosave')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.data.user.id)
      .single()

    if (error) throw error

    return { success: true, data: data as Draft }
  } catch (error) {
    console.error('Restore draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore draft'
    }
  }
}

/**
 * 드래프트 삭제하기
 * Delete a specific draft
 */
export async function deleteDraft(draftId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('editor_autosave')
      .delete()
      .eq('id', draftId)
      .eq('user_id', user.data.user.id)

    if (error) throw error

    revalidatePath('/member/drafts')

    return { success: true }
  } catch (error) {
    console.error('Delete draft error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete draft'
    }
  }
}

/**
 * 만료된 드래프트 정리하기
 * Clean up expired drafts (can be run periodically)
 */
export async function cleanupExpiredDrafts(): Promise<{
  success: boolean
  deleted: number
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_autosaves')

    if (error) throw error

    return {
      success: true,
      deleted: data as number
    }
  } catch (error) {
    console.error('Cleanup drafts error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup drafts',
      deleted: 0
    }
  }
}
