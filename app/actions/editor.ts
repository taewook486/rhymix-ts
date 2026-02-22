'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Autosave {
  id: string
  user_id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  content: string
  content_html: string
  excerpt: string
  metadata: Record<string, any>
  saved_at: string
  expires_at: string
}

export interface SaveAutosaveInput {
  target_type: 'post' | 'page' | 'comment'
  target_id?: string
  title?: string
  content: string
  content_html?: string
  excerpt?: string
  metadata?: Record<string, any>
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Save or update autosave draft
 */
export async function saveAutosave(input: SaveAutosaveInput): Promise<{
  success: boolean
  data?: Autosave
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Upsert autosave
    const { data, error } = await supabase
      .from('editor_autosave')
      .upsert({
        user_id: user.data.user.id,
        target_type: input.target_type,
        target_id: input.target_id || null,
        title: input.title || '',
        content: input.content,
        content_html: input.content_html || null,
        excerpt: input.excerpt || null,
        metadata: input.metadata || {},
        saved_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: data as Autosave }
  } catch (error) {
    console.error('Save autosave error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save autosave'
    }
  }
}

/**
 * Get autosave for a specific target
 */
export async function getAutosave(targetType: string, targetId?: string): Promise<{
  success: boolean
  data?: Autosave | null
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
      .eq('user_id', user.data.user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId || null)
      .gt('expires_at', new Date().toISOString())
      .order('saved_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      throw error
    }

    return { success: true, data: data as Autosave || null }
  } catch (error) {
    console.error('Get autosave error:', error)
    // Return success with null data if no autosave exists
    if ((error as any)?.code === 'PGRST116') {
      return { success: true, data: null }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get autosave'
    }
  }
}

/**
 * Delete autosave
 */
export async function deleteAutosave(targetType: string, targetId?: string): Promise<{
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
      .eq('user_id', user.data.user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId || null)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Delete autosave error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete autosave'
    }
  }
}

/**
 * Clean up expired autosaves (can be run periodically)
 */
export async function cleanupExpiredAutosaves(): Promise<{
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
    console.error('Cleanup autosaves error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup autosaves',
      deleted: 0
    }
  }
}
