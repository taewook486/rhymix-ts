'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'
import type { Setting, Json } from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  SETTING_NOT_FOUND: '설정을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Site Config Types
// =====================================================

export interface SiteConfigData {
  site_name: string
  site_description: string
  site_keywords: string[]
  site_url: string
  site_logo_url: string | null
  site_favicon_url: string | null
  site_language: string
  site_timezone: string
  site_email: string
  social_links: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
    github?: string
  }
  seo_settings: {
    meta_title_template: string
    meta_description_max_length: number
    og_image_default_url: string | null
    twitter_card_type: string
  }
  security_settings: {
    require_email_verification: boolean
    allow_registration: boolean
    min_password_length: number
    session_timeout_minutes: number
    max_login_attempts: number
  }
  feature_settings: {
    enable_comments: boolean
    enable_likes: boolean
    enable_sharing: boolean
    enable_notifications: boolean
    enable_search: boolean
  }
}

// =====================================================
// Settings Actions
// =====================================================

/**
 * Get settings by category
 */
export async function getSettings(category?: string): Promise<ActionResult<Setting[]>> {
  try {
    const supabase = await createClient()

    let query = supabase.from('settings').select('*')

    if (category) {
      query = query.eq('module', category)
    }

    const { data, error } = await query.order('key', { ascending: true })

    if (error) {
      console.error('Error fetching settings:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (data || []) as Setting[] }
  } catch (error) {
    console.error('Unexpected error in getSettings:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a single setting
 */
export async function updateSetting(key: string, value: Json): Promise<ActionResult<Setting>> {
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

    // Check if setting is editable
    const { data: existingSetting } = await supabase.from('settings').select('*').eq('key', key).single()

    if (!existingSetting) {
      return { success: false, error: ERROR_MESSAGES.SETTING_NOT_FOUND }
    }

    const { data, error } = await supabase
      .from('settings')
      .update({
        value,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    revalidatePath('/admin/settings')
    return { success: true, data: data as Setting, message: '설정이 저장되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateSetting:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get site configuration
 */
export async function getSiteConfig(): Promise<ActionResult<SiteConfigData>> {
  try {
    const supabase = await createClient()

    // Get all public site config settings
    const { data, error } = await supabase.from('settings').select('*').eq('module', 'site')

    if (error) {
      console.error('Error fetching site config:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Transform settings array into config object
    const config: Record<string, Json> = {}
    data?.forEach((setting) => {
      config[setting.key] = setting.value
    })

    // Default config values with proper type conversion
    const defaultConfig: SiteConfigData = {
      site_name: String(config.site_name ?? 'Rhymix-TS'),
      site_description: String(config.site_description ?? ''),
      site_keywords: Array.isArray(config.site_keywords) ? (config.site_keywords as string[]) : [],
      site_url: String(config.site_url ?? ''),
      site_logo_url: config.site_logo_url ? String(config.site_logo_url) : null,
      site_favicon_url: config.site_favicon_url ? String(config.site_favicon_url) : null,
      site_language: String(config.site_language ?? 'ko'),
      site_timezone: String(config.site_timezone ?? 'Asia/Seoul'),
      site_email: String(config.site_email ?? ''),
      social_links: (config.social_links as SiteConfigData['social_links'] | undefined) || {},
      seo_settings: (config.seo_settings as SiteConfigData['seo_settings'] | undefined) || {
        meta_title_template: '{title} | {site_name}',
        meta_description_max_length: 160,
        og_image_default_url: null,
        twitter_card_type: 'summary_large_image',
      },
      security_settings: (config.security_settings as SiteConfigData['security_settings'] | undefined) || {
        require_email_verification: true,
        allow_registration: true,
        min_password_length: 8,
        session_timeout_minutes: 1440,
        max_login_attempts: 5,
      },
      feature_settings: (config.feature_settings as SiteConfigData['feature_settings'] | undefined) || {
        enable_comments: true,
        enable_likes: true,
        enable_sharing: true,
        enable_notifications: true,
        enable_search: true,
      },
    }

    return { success: true, data: defaultConfig }
  } catch (error) {
    console.error('Unexpected error in getSiteConfig:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update site configuration
 */
export async function updateSiteConfig(config: Partial<SiteConfigData>): Promise<ActionResult> {
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

    // Update each setting in the config
    const updatePromises = Object.entries(config).map(([key, value]) =>
      supabase.from('settings').upsert(
        {
          module: 'site',
          key,
          value: value as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'module,key' }
      )
    )

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('Errors updating site config:', errors)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/', 'layout')
    return { success: true, message: '사이트 설정이 저장되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateSiteConfig:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
