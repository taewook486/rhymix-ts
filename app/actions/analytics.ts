'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'

// =====================================================
// Types
// =====================================================

export interface AnalyticsStats {
  totalUsers: number
  totalPosts: number
  totalDocuments: number
  totalComments: number
  totalPages: number
  totalViews: number
  newUsersToday: number
  newPostsToday: number
  activeUsersToday: number
}

export interface GrowthMetrics {
  usersGrowth: number
  postsGrowth: number
  commentsGrowth: number
  viewsGrowth: number
}

export interface DailyMetric {
  date: string
  posts: number
  comments: number
  views: number
  users: number
}

export interface TopContent {
  id: string
  title: string
  type: 'post' | 'document' | 'page'
  views: number
  author: string | null
  created_at: string
}

export interface RecentActivity {
  id: string
  type: 'post' | 'comment' | 'document' | 'user'
  action: string
  user: string
  time: string
}

export interface AnalyticsData {
  stats: AnalyticsStats
  growth: GrowthMetrics
  dailyMetrics: DailyMetric[]
  topContent: TopContent[]
  recentActivity: RecentActivity[]
}

export interface AnalyticsFilters {
  date_from?: string
  date_to?: string
  period?: '7d' | '30d' | '90d' | '1y'
}

// =====================================================
// Error Messages
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Login required.',
  PERMISSION_DENIED: 'Admin access required.',
  UNKNOWN_ERROR: 'Unknown error occurred.',
}

// =====================================================
// Analytics Actions
// =====================================================

/**
 * Get comprehensive analytics data
 */
export async function getAnalytics(
  filters?: AnalyticsFilters
): Promise<ActionResult<AnalyticsData>> {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Calculate date range
    const now = new Date()
    let dateFrom: Date
    const dateTo = filters?.date_to ? new Date(filters.date_to) : now

    switch (filters?.period) {
      case '7d':
        dateFrom = new Date(dateTo)
        dateFrom.setDate(dateFrom.getDate() - 7)
        break
      case '30d':
        dateFrom = new Date(dateTo)
        dateFrom.setDate(dateFrom.getDate() - 30)
        break
      case '90d':
        dateFrom = new Date(dateTo)
        dateFrom.setDate(dateFrom.getDate() - 90)
        break
      case '1y':
        dateFrom = new Date(dateTo)
        dateFrom.setFullYear(dateFrom.getFullYear() - 1)
        break
      default:
        dateFrom = filters?.date_from ? new Date(filters.date_from) : new Date(dateTo)
        dateFrom.setDate(dateFrom.getDate() - 30)
    }

    const dateFromStr = dateFrom.toISOString()
    const dateToStr = dateTo.toISOString()

    // Get counts in parallel
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalDocuments },
      { count: totalComments },
      { count: totalPages },
      { data: postsViews },
      { data: documentsViews },
      { count: newUsersToday },
      { count: newPostsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('pages').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('view_count'),
      supabase.from('documents').select('view_count'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', getTodayStart()),
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', getTodayStart()),
    ])

    // Calculate total views
    const totalViews =
      (postsViews?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0) +
      (documentsViews?.reduce((sum, d) => sum + (d.view_count || 0), 0) || 0)

    // Get daily metrics
    const dailyMetrics = await getDailyMetrics(dateFromStr, dateToStr)

    // Get growth metrics
    const growth = await getGrowthMetrics()

    // Get top content
    const topContent = await getTopContent()

    // Get recent activity
    const recentActivity = await getRecentActivity()

    return {
      success: true,
      data: {
        stats: {
          totalUsers: totalUsers || 0,
          totalPosts: totalPosts || 0,
          totalDocuments: totalDocuments || 0,
          totalComments: totalComments || 0,
          totalPages: totalPages || 0,
          totalViews,
          newUsersToday: newUsersToday || 0,
          newPostsToday: newPostsToday || 0,
          activeUsersToday: 0, // Would require session tracking
        },
        growth,
        dailyMetrics,
        topContent,
        recentActivity,
      },
    }
  } catch (error) {
    console.error('getAnalytics error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get daily metrics for chart
 */
async function getDailyMetrics(dateFrom: string, dateTo: string): Promise<DailyMetric[]> {
  const supabase = await createClient()

  // Get posts per day
  const { data: postsPerDay } = await supabase
    .from('posts')
    .select('created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)

  // Get comments per day
  const { data: commentsPerDay } = await supabase
    .from('comments')
    .select('created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)

  // Get users per day
  const { data: usersPerDay } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)

  // Aggregate by date
  const metricsMap = new Map<string, DailyMetric>()

  // Initialize all dates in range
  const current = new Date(dateFrom)
  const end = new Date(dateTo)
  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0]
    metricsMap.set(dateKey, {
      date: dateKey,
      posts: 0,
      comments: 0,
      views: 0,
      users: 0,
    })
    current.setDate(current.getDate() + 1)
  }

  // Count posts
  postsPerDay?.forEach((post) => {
    const dateKey = post.created_at.split('T')[0]
    const metric = metricsMap.get(dateKey)
    if (metric) metric.posts++
  })

  // Count comments
  commentsPerDay?.forEach((comment) => {
    const dateKey = comment.created_at.split('T')[0]
    const metric = metricsMap.get(dateKey)
    if (metric) metric.comments++
  })

  // Count users
  usersPerDay?.forEach((user) => {
    const dateKey = user.created_at.split('T')[0]
    const metric = metricsMap.get(dateKey)
    if (metric) metric.users++
  })

  return Array.from(metricsMap.values())
}

/**
 * Get growth metrics compared to previous period
 */
async function getGrowthMetrics(): Promise<GrowthMetrics> {
  const supabase = await createClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Current period counts
  const [
    { count: currentUsers },
    { count: currentPosts },
    { count: currentComments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  // Previous period counts
  const [
    { count: previousUsers },
    { count: previousPosts },
    { count: previousComments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo.toISOString()).lt('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo.toISOString()).lt('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo.toISOString()).lt('created_at', thirtyDaysAgo.toISOString()),
  ])

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    usersGrowth: calculateGrowth(currentUsers || 0, previousUsers || 0),
    postsGrowth: calculateGrowth(currentPosts || 0, previousPosts || 0),
    commentsGrowth: calculateGrowth(currentComments || 0, previousComments || 0),
    viewsGrowth: 0, // Would require historical view tracking
  }
}

/**
 * Get top content by views
 */
async function getTopContent(): Promise<TopContent[]> {
  const supabase = await createClient()

  const [{ data: topPosts }, { data: topDocuments }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, view_count, author_name, created_at')
      .order('view_count', { ascending: false })
      .limit(5),
    supabase
      .from('documents')
      .select('id, title, view_count, author_name, created_at')
      .order('view_count', { ascending: false })
      .limit(5),
  ])

  const allContent: TopContent[] = [
    ...(topPosts || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: 'post' as const,
      views: p.view_count || 0,
      author: p.author_name,
      created_at: p.created_at,
    })),
    ...(topDocuments || []).map((d) => ({
      id: d.id,
      title: d.title,
      type: 'document' as const,
      views: d.view_count || 0,
      author: d.author_name,
      created_at: d.created_at,
    })),
  ]

  return allContent.sort((a, b) => b.views - a.views).slice(0, 10)
}

/**
 * Get recent activity
 */
async function getRecentActivity(): Promise<RecentActivity[]> {
  const supabase = await createClient()

  const [{ data: recentPosts }, { data: recentComments }, { data: recentUsers }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('comments')
      .select('id, content, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const activities: RecentActivity[] = [
    ...(recentPosts || []).map((p) => ({
      id: p.id,
      type: 'post' as const,
      action: `Created post: ${p.title}`,
      user: p.author_name || 'Unknown',
      time: p.created_at,
    })),
    ...(recentComments || []).map((c) => ({
      id: c.id,
      type: 'comment' as const,
      action: 'Added a comment',
      user: c.author_name || 'Unknown',
      time: c.created_at,
    })),
    ...(recentUsers || []).map((u) => ({
      id: u.id,
      type: 'user' as const,
      action: 'Joined the site',
      user: u.display_name || 'New User',
      time: u.created_at,
    })),
  ]

  return activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10)
}

/**
 * Helper: Get today's start timestamp
 */
function getTodayStart(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

/**
 * Export analytics data as CSV
 */
export async function exportAnalytics(
  filters?: AnalyticsFilters
): Promise<ActionResult<string>> {
  try {
    const result = await getAnalytics(filters)

    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }

    const { stats, dailyMetrics, topContent } = result.data

    // Build CSV
    const rows: string[] = []

    // Stats section
    rows.push('Statistics')
    rows.push('Metric,Value')
    rows.push(`Total Users,${stats.totalUsers}`)
    rows.push(`Total Posts,${stats.totalPosts}`)
    rows.push(`Total Documents,${stats.totalDocuments}`)
    rows.push(`Total Comments,${stats.totalComments}`)
    rows.push(`Total Views,${stats.totalViews}`)
    rows.push('')

    // Daily metrics
    rows.push('Daily Metrics')
    rows.push('Date,Posts,Comments,Users')
    dailyMetrics.forEach((m) => {
      rows.push(`${m.date},${m.posts},${m.comments},${m.users}`)
    })
    rows.push('')

    // Top content
    rows.push('Top Content')
    rows.push('Title,Type,Views,Author')
    topContent.forEach((c) => {
      rows.push(`"${c.title}",${c.type},${c.views},"${c.author || 'Unknown'}"`)
    })

    return { success: true, data: rows.join('\n') }
  } catch (error) {
    console.error('exportAnalytics error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
