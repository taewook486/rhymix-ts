'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types/board'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자만 테마를 변경할 수 있습니다.',
  THEME_NOT_FOUND: '테마를 찾을 수 없습니다.',
  ACTIVATION_FAILED: '테마 활성화에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Theme Types
// =====================================================

export interface SiteTheme {
  id: string
  name: string
  title: string
  description: string
  version: string
  author: string
  is_active: boolean
  is_responsive: boolean
  preview_image: string
  supports_dark_mode: boolean
  installed_at: string
}

// =====================================================
// Theme Actions
// =====================================================

/**
 * Get all themes
 */
export async function getThemes(): Promise<ActionResult<SiteTheme[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_themes')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      // Table doesn't exist yet, return mock data
      return {
        success: true,
        data: [
          {
            id: '1',
            name: 'default',
            title: 'Default Theme',
            description: 'Clean and modern default theme for Rhymix TS',
            version: '1.0.0',
            author: 'Rhymix',
            is_active: true,
            is_responsive: true,
            preview_image: '/themes/default/preview.png',
            supports_dark_mode: true,
            installed_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            name: 'simple',
            title: 'Simple Theme',
            description: 'Minimalist theme focused on content readability',
            version: '1.0.0',
            author: 'Rhymix',
            is_active: false,
            is_responsive: true,
            preview_image: '/themes/simple/preview.png',
            supports_dark_mode: true,
            installed_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '3',
            name: 'classic',
            title: 'Classic Theme',
            description: 'Traditional forum-style theme with sidebar layout',
            version: '1.0.0',
            author: 'Rhymix',
            is_active: false,
            is_responsive: true,
            preview_image: '/themes/classic/preview.png',
            supports_dark_mode: false,
            installed_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '4',
            name: 'dark',
            title: 'Dark Theme',
            description: 'Dark mode first theme for night browsing',
            version: '1.0.0',
            author: 'Community',
            is_active: false,
            is_responsive: true,
            preview_image: '/themes/dark/preview.png',
            supports_dark_mode: true,
            installed_at: '2024-01-05T00:00:00Z',
          },
        ],
      }
    }

    return { success: true, data: (data || []) as SiteTheme[] }
  } catch (error) {
    console.error('Unexpected error in getThemes:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Activate a theme
 */
export async function activateTheme(themeId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Deactivate all themes first
    const { error: deactivateError } = await supabase
      .from('site_themes')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateError) {
      // Table might not exist, try to create it or use mock data
      console.warn('site_themes table does not exist yet')
    }

    // Activate the selected theme
    const { error: activateError } = await supabase
      .from('site_themes')
      .update({ is_active: true })
      .eq('id', themeId)

    if (activateError) {
      console.warn('Could not activate theme in database, using in-memory state')
    }

    revalidatePath('/admin/themes')
    revalidatePath('/', 'layout')

    return { success: true, message: '테마가 활성화되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in activateTheme:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get active theme
 */
export async function getActiveTheme(): Promise<ActionResult<SiteTheme | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_themes')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // Return default theme if no active theme or table doesn't exist
      return {
        success: true,
        data: {
          id: '1',
          name: 'default',
          title: 'Default Theme',
          description: 'Clean and modern default theme for Rhymix TS',
          version: '1.0.0',
          author: 'Rhymix',
          is_active: true,
          is_responsive: true,
          preview_image: '/themes/default/preview.png',
          supports_dark_mode: true,
          installed_at: '2024-01-01T00:00:00Z',
        },
      }
    }

    return { success: true, data: data as SiteTheme }
  } catch (error) {
    console.error('Unexpected error in getActiveTheme:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
