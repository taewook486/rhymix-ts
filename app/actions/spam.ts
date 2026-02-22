'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface SpamConfig {
  enable_link_check: boolean
  max_links_count: number
  enable_keyword_filter: boolean
  blocked_keywords: string[]
  enable_frequency_limit: boolean
  max_posts_per_hour: number
  enable_captcha: boolean
}

export interface SpamCheckResult {
  is_spam: boolean
  reason?: string
  score: number
  details?: string[]
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get spam configuration
 */
export async function getSpamConfig(): Promise<{
  success: boolean
  data?: SpamConfig
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Get config from site_settings table
    const { data, error } = await supabase
      .from('site_settings')
      .select('config')
      .eq('key', 'spam_filter')
      .single()

    if (error && error.code !== 'PGRST116') throw error

    const config = data?.config || {}

    // Return default config if not set
    return {
      success: true,
      data: {
        enable_link_check: config.enable_link_check ?? true,
        max_links_count: config.max_links_count ?? 3,
        enable_keyword_filter: config.enable_keyword_filter ?? true,
        blocked_keywords: config.blocked_keywords || [],
        enable_frequency_limit: config.enable_frequency_limit ?? true,
        max_posts_per_hour: config.max_posts_per_hour ?? 5,
        enable_captcha: config.enable_captcha ?? false,
      },
    }
  } catch (error) {
    console.error('Get spam config error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get spam config'
    }
  }
}

/**
 * Update spam configuration
 */
export async function updateSpamConfig(config: Partial<SpamConfig>): Promise<{
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
      .from('site_settings')
      .upsert({
        key: 'spam_filter',
        config,
      })

    if (error) throw error

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error) {
    console.error('Update spam config error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update spam config'
    }
  }
}

/**
 * Check content for spam
 */
export async function checkSpam(content: string, userId?: string): Promise<SpamCheckResult> {
  try {
    const config = await getSpamConfig()
    if (!config.success) {
      return { is_spam: false, score: 0 }
    }

    const settings = config.data!
    let spamScore = 0
    const reasons: string[] = []

    // 1. Link check
    if (settings.enable_link_check) {
      const linkMatches = content.match(/https?:\/\//g) || []
      if (linkMatches.length > settings.max_links_count) {
        spamScore += 50
        reasons.push(`Too many links (${linkMatches.length}/${settings.max_links_count})`)
      }
    }

    // 2. Keyword filter
    if (settings.enable_keyword_filter && settings.blocked_keywords.length > 0) {
      const lowerContent = content.toLowerCase()
      for (const keyword of settings.blocked_keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          spamScore += 30
          reasons.push(`Blocked keyword found: ${keyword}`)
        }
      }
    }

    // 3. Frequency limit
    if (settings.enable_frequency_limit && userId) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId)
        .gte('created_at', oneHourAgo)

      if ((recentPosts?.length || 0) >= settings.max_posts_per_hour) {
        spamScore += 40
        reasons.push(`Too many posts (${recentPosts?.length}/${settings.max_posts_per_hour} per hour)`)
      }
    }

    // Determine if spam
    const isSpam = spamScore >= 50

    return {
      is_spam: isSpam,
      reason: reasons.join(', ') || undefined,
      score: spamScore,
      details: reasons,
    }
  } catch (error) {
    console.error('Spam check error:', error)
    // Default to not spam on error
    return { is_spam: false, score: 0 }
  }
}

/**
 * Get spam queue (posts flagged as spam)
 */
export async function getSpamQueue(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Get posts with spam_flag
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!inner(email, nickname),
        board:boards!inner(slug, title)
      `)
      .eq('spam_flag', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Get spam queue error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get spam queue'
    }
  }
}

/**
 * Approve spam post
 */
export async function approveSpamPost(postId: string): Promise<{
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
      .from('posts')
      .update({ spam_flag: false })
      .eq('id', postId)

    if (error) throw error

    revalidatePath('/admin/spam')
    return { success: true }
  } catch (error) {
    console.error('Approve spam post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve post'
    }
  }
}

/**
 * Reject spam post (delete)
 */
export async function rejectSpamPost(postId: string): Promise<{
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
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) throw error

    revalidatePath('/admin/spam')
    return { success: true }
  } catch (error) {
    console.error('Reject spam post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject post'
    }
  }
}
