'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '관리자 권한이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  BOARD_NOT_FOUND: '게시판을 찾을 수 없습니다.',
  MEMBER_NOT_FOUND: '회원을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Types
// =====================================================

export interface SiteConfig {
  id: UUID
  site_name: string
  site_description: string | null
  timezone: string
  language: string
  meta_title: string | null
  meta_description: string | null
  allow_registration: boolean
  email_verification: boolean
  admin_approval: boolean
  created_at: string
  updated_at: string
}

export interface SiteConfigInput {
  site_name?: string
  site_description?: string
  timezone?: string
  language?: string
  meta_title?: string
  meta_description?: string
  allow_registration?: boolean
  email_verification?: boolean
  admin_approval?: boolean
}

export interface Board {
  id: UUID
  name: string
  slug: string
  description: string | null
  is_active: boolean
  is_locked: boolean
  post_count: number
  created_at: string
  updated_at: string
}

export interface BoardInput {
  name: string
  slug: string
  description?: string
  is_active?: boolean
  is_locked?: boolean
}

export interface Member {
  id: UUID
  email: string
  display_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  last_login_at: string | null
  metadata: Record<string, any> | null
}

// =====================================================
// Helper Functions
// =====================================================

async function checkAdminAccess(): Promise<{ user: any; profile: any } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    return null
  }

  return { user, profile }
}

// =====================================================
// Site Config Actions
// =====================================================

export async function getSiteConfig(): Promise<ActionResult<SiteConfig>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('site_config').select('*').single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching site config:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    if (!data) {
      // Return default config if not exists
      return {
        success: true,
        data: {
          id: '',
          site_name: 'Rhymix TS',
          site_description: '',
          timezone: 'Asia/Seoul',
          language: 'ko',
          meta_title: null,
          meta_description: null,
          allow_registration: true,
          email_verification: true,
          admin_approval: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error in getSiteConfig:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function updateSiteConfig(input: SiteConfigInput): Promise<ActionResult<SiteConfig>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Check if config exists
    const { data: existingConfig } = await supabase.from('site_config').select('id').single()

    let result

    if (existingConfig) {
      // Update existing config
      result = await supabase
        .from('site_config')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select()
        .single()
    } else {
      // Create new config
      result = await supabase.from('site_config').insert(input).select().single()
    }

    const { data, error } = result

    if (error) {
      console.error('Error updating site config:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data, message: '설정이 저장되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateSiteConfig:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Board Actions
// =====================================================

export async function getAdminBoards(): Promise<ActionResult<Board[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching boards:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Transform is_hidden to is_active for frontend
    const boards = (data || []).map((board: any) => ({
      ...board,
      name: board.title,
      is_active: !board.is_hidden,
    }))

    return { success: true, data: boards }
  } catch (error) {
    console.error('Unexpected error in getAdminBoards:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function createBoard(input: BoardInput): Promise<ActionResult<Board>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('boards')
      .insert({
        title: input.name,
        slug: input.slug,
        description: input.description || null,
        is_hidden: input.is_active === false,
        is_locked: input.is_locked || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Transform is_hidden to is_active for frontend
    const board = {
      ...data,
      name: data.title,
      is_active: !data.is_hidden,
    }

    return { success: true, data: board, message: '게시판이 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createBoard:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function updateBoard(boardId: UUID, input: Partial<BoardInput>): Promise<ActionResult<Board>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Transform input to match database schema
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) {
      updateData.title = input.name
    }
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    if (input.is_active !== undefined) {
      updateData.is_hidden = input.is_active === false
    }
    if (input.is_locked !== undefined) {
      updateData.is_locked = input.is_locked
    }

    const { data, error } = await supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Transform is_hidden to is_active for frontend
    const board = {
      ...data,
      name: data.title,
      is_active: !data.is_hidden,
    }

    return { success: true, data: board, message: '게시판이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateBoard:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function deleteBoard(boardId: UUID): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { error } = await supabase.from('boards').delete().eq('id', boardId)

    if (error) {
      console.error('Error deleting board:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, message: '게시판이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deleteBoard:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Member Actions
// =====================================================

export async function getAdminMembers(): Promise<ActionResult<Member[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, created_at, last_login_at, metadata')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching members:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error in getAdminMembers:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function updateMemberRole(memberId: UUID, role: string): Promise<ActionResult<Member>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!['admin', 'moderator', 'user', 'guest'].includes(role)) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select('id, email, display_name, avatar_url, role, created_at, last_login_at, metadata')
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data, message: '회원 권한이 변경되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateMemberRole:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function suspendMember(memberId: UUID): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Update user metadata to mark as suspended
    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: { suspended: true, suspended_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error suspending member:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, message: '회원이 정지되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in suspendMember:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function unsuspendMember(memberId: UUID): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: { suspended: false },
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error unsuspending member:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, message: '회원 정지가 해제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in unsuspendMember:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function deleteMember(memberId: UUID): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Prevent deleting own account
    if (access.user.id === memberId) {
      return { success: false, error: '자신의 계정은 삭제할 수 없습니다.' }
    }

    // Delete from profiles (cascade will handle auth.users if configured)
    const { error } = await supabase.from('profiles').delete().eq('id', memberId)

    if (error) {
      console.error('Error deleting member:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, message: '회원이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deleteMember:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Dashboard Stats Actions
// =====================================================

export async function getDashboardStats(): Promise<
  ActionResult<{
    userCount: number
    postCount: number
    commentCount: number
    boardCount: number
  }>
> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const [usersResult, postsResult, commentsResult, boardsResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('boards').select('*', { count: 'exact', head: true }),
    ])

    return {
      success: true,
      data: {
        userCount: usersResult.count || 0,
        postCount: postsResult.count || 0,
        commentCount: commentsResult.count || 0,
        boardCount: boardsResult.count || 0,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function getRecentActivities(limit: number = 10): Promise<
  ActionResult<
    Array<{
      id: string
      type: 'post' | 'comment' | 'member'
      title: string
      user_name: string | null
      created_at: string
    }>
  >
> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, author_name, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Get recent comments
    const { data: recentComments } = await supabase
      .from('comments')
      .select('id, content, author_name, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Get recent members
    const { data: recentMembers } = await supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Combine and sort activities
    const activities: Array<{
      id: string
      type: 'post' | 'comment' | 'member'
      title: string
      user_name: string | null
      created_at: string
    }> = []

    ;(recentPosts || []).forEach((post) => {
      activities.push({
        id: post.id,
        type: 'post',
        title: post.title,
        user_name: post.author_name,
        created_at: post.created_at,
      })
    })

    ;(recentComments || []).forEach((comment) => {
      activities.push({
        id: comment.id,
        type: 'comment',
        title: comment.content?.substring(0, 50) || 'Comment',
        user_name: comment.author_name,
        created_at: comment.created_at,
      })
    })

    ;(recentMembers || []).forEach((member) => {
      activities.push({
        id: member.id,
        type: 'member',
        title: 'New member joined',
        user_name: member.display_name,
        created_at: member.created_at,
      })
    })

    // Sort by created_at and limit
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { success: true, data: activities.slice(0, limit) }
  } catch (error) {
    console.error('Unexpected error in getRecentActivities:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Modules Types
// =====================================================

export interface Module {
  id: string
  name: string
  title: string
  description: string | null
  version: string
  is_active: boolean
  is_core: boolean
  author: string
  installed_at: string
}

// =====================================================
// Analytics Types
// =====================================================

export interface AnalyticsData {
  stats: {
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalViews: number
  }
  growth: {
    users: number
    posts: number
    comments: number
    views: number
  }
  topContent: Array<{
    id: string
    title: string
    views: number
    type: string
  }>
  recentActivity: Array<{
    id: string
    action: string
    user: string
    time: string
  }>
}

// =====================================================
// Groups Actions
// Import from groups.ts: getGroups, getGroup, getGroupBySlug, createGroup, updateGroup, deleteGroup, getGroupMembers, addGroupMember, removeGroupMember, getUserGroups
// Types: Group, GroupInput, GroupUpdate, GroupMember
// =====================================================

// =====================================================
// Permissions Actions
// Import from permissions.ts: getPermissions, getPermission, getPermissionBySlug, createPermission, updatePermission, deletePermission, getGroupPermissions, assignPermissionToGroup, revokePermissionFromGroup, getUserPermissions, hasPermission
// Types: Permission, PermissionInput, PermissionUpdate, GroupPermission
// =====================================================

// =====================================================
// Modules Actions
// =====================================================

/**
 * Get all installed modules
 * TODO: Replace mock data with actual Supabase query when modules table is created
 */
export async function getModules(): Promise<ActionResult<Module[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // TODO: Implement actual Supabase query
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('modules')
    //   .select('*')
    //   .order('is_core', { ascending: false })
    //   .order('name', { ascending: true })
    //
    // if (error) {
    //   console.error('Error fetching modules:', error)
    //   return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    // }
    //
    // return { success: true, data: data || [] }

    // Mock data for now - replace when modules table is implemented
    const mockModules: Module[] = [
      {
        id: '1',
        name: 'board',
        title: 'Board Module',
        description: 'Forum and discussion board functionality',
        version: '1.0.0',
        is_active: true,
        is_core: true,
        author: 'Rhymix',
        installed_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'member',
        title: 'Member Module',
        description: 'User registration and profile management',
        version: '1.0.0',
        is_active: true,
        is_core: true,
        author: 'Rhymix',
        installed_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'document',
        title: 'Document Module',
        description: 'Document and wiki content management',
        version: '1.0.0',
        is_active: true,
        is_core: true,
        author: 'Rhymix',
        installed_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '4',
        name: 'comment',
        title: 'Comment Module',
        description: 'Comment system for posts and documents',
        version: '1.0.0',
        is_active: true,
        is_core: true,
        author: 'Rhymix',
        installed_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '5',
        name: 'rss',
        title: 'RSS Feed Module',
        description: 'RSS feed generation for content',
        version: '1.0.0',
        is_active: false,
        is_core: false,
        author: 'Rhymix',
        installed_at: '2024-01-05T00:00:00Z',
      },
    ]

    return { success: true, data: mockModules }
  } catch (error) {
    console.error('Unexpected error in getModules:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Toggle module active status
 * TODO: Replace mock response with actual Supabase update when modules table is created
 */
export async function toggleModule(id: string, isActive: boolean): Promise<ActionResult<Module>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!id) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase update
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('modules')
    //   .update({
    //     is_active: isActive,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', id)
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error toggling module:', error)
    //   return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    // }
    //
    // return {
    //   success: true,
    //   data,
    //   message: isActive ? '모듈이 활성화되었습니다.' : '모듈이 비활성화되었습니다.',
    // }

    // Mock response for now
    const mockModule: Module = {
      id,
      name: 'module',
      title: 'Module',
      description: null,
      version: '1.0.0',
      is_active: isActive,
      is_core: false,
      author: 'Rhymix',
      installed_at: new Date().toISOString(),
    }

    return {
      success: true,
      data: mockModule,
      message: isActive ? '모듈이 활성화되었습니다.' : '모듈이 비활성화되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in toggleModule:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Pages Actions
// Import from pages.ts: getPages, getPage, getPageBySlug, getHomepage, createPage, updatePage, deletePage, incrementPageViewCount, getPagesByAuthor, getPublishedPages
// Types: Page, PageInput, PageUpdate
// =====================================================

// =====================================================
// Analytics Actions
// =====================================================

/**
 * Get analytics data for the admin dashboard
 */
export async function getAnalytics(): Promise<ActionResult<AnalyticsData>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Helper function to calculate growth percentage
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    // Helper function to format time ago
    const formatTimeAgo = (dateString: string): string => {
      const now = new Date()
      const date = new Date(dateString)
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (seconds < 60) return `${seconds} seconds ago`
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }

    // Get current stats
    const [usersCount, postsCount, commentsCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    ])

    // Get total views from posts and pages
    const [postsViewsData, pagesViewsData] = await Promise.all([
      supabase.from('posts').select('view_count').is('deleted_at', null),
      supabase.from('pages').select('view_count'),
    ])

    const postsViews = postsViewsData.data?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0
    const pagesViews = pagesViewsData.data?.reduce((sum, page) => sum + (page.view_count || 0), 0) || 0
    const totalViews = postsViews + pagesViews

    // Get previous month stats for growth calculation
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const [lastMonthUsers, lastMonthPosts, lastMonthComments] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', lastMonth.toISOString()),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('created_at', lastMonth.toISOString()),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('created_at', lastMonth.toISOString()),
    ])

    // Get top content by views (posts and pages combined)
    const [topPosts, topPages] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, view_count')
        .is('deleted_at', null)
        .order('view_count', { ascending: false })
        .limit(5),
      supabase
        .from('pages')
        .select('id, title, view_count')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(5),
    ])

    // Combine and sort top content
    const allContent = [
      ...(topPosts.data || []).map(item => ({ ...item, type: 'post' as const })),
      ...(topPages.data || []).map(item => ({ ...item, type: 'page' as const })),
    ].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)

    const topContent = allContent.map(item => ({
      id: item.id,
      title: item.title,
      views: item.view_count || 0,
      type: item.type,
    }))

    // Get recent activity from recent posts, comments, and new users
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [recentPosts, recentComments, recentUsers] = await Promise.all([
      supabase
        .from('posts')
        .select('id, created_at, profiles!inner(display_name)')
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('comments')
        .select('id, created_at, profiles!inner(display_name)')
        .is('deleted_at', null)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('profiles')
        .select('id, created_at, display_name')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    // Build recent activity list
    const recentActivity: Array<{ id: string; action: string; user: string; time: string }> = []

    recentPosts.data?.forEach(post => {
      recentActivity.push({
        id: post.id,
        action: 'New post',
        user: (post as any).profiles?.display_name || 'Unknown',
        time: formatTimeAgo(post.created_at),
      })
    })

    recentComments.data?.forEach(comment => {
      recentActivity.push({
        id: comment.id,
        action: 'Comment added',
        user: (comment as any).profiles?.display_name || 'Unknown',
        time: formatTimeAgo(comment.created_at),
      })
    })

    recentUsers.data?.forEach(user => {
      recentActivity.push({
        id: user.id,
        action: 'User registered',
        user: user.display_name || 'Unknown',
        time: formatTimeAgo(user.created_at),
      })
    })

    // Sort by time and limit
    recentActivity.sort((a, b) => b.time.localeCompare(a.time))
    recentActivity.splice(5)

    return {
      success: true,
      data: {
        stats: {
          totalUsers: usersCount.count || 0,
          totalPosts: postsCount.count || 0,
          totalComments: commentsCount.count || 0,
          totalViews,
        },
        growth: {
          users: calculateGrowth(usersCount.count || 0, lastMonthUsers.count || 0),
          posts: calculateGrowth(postsCount.count || 0, lastMonthPosts.count || 0),
          comments: calculateGrowth(commentsCount.count || 0, lastMonthComments.count || 0),
          views: 0, // Would need historical views tracking
        },
        topContent,
        recentActivity,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getAnalytics:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Activity Log Types
// =====================================================

export interface ActivityLog {
  id: UUID
  user_id: UUID | null
  action: string
  target_type: string | null
  target_id: UUID | null
  description: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  module: string | null
  created_at: string
  // Joined fields
  user_email?: string
  user_display_name?: string
}

export interface ActivityLogFilters {
  user_id?: UUID
  action?: string
  target_type?: string
  severity?: string
  module?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface ActivityLogExport {
  logs: ActivityLog[]
  total_count: number
  filtered_count: number
  export_date: string
  filters: ActivityLogFilters
}

// =====================================================
// Activity Log Actions
// =====================================================

export async function getActivityLogs(
  page: number = 1,
  perPage: number = 50,
  filters: ActivityLogFilters = {}
): Promise<ActionResult<{ logs: ActivityLog[]; total_count: number }>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Build query with filters
    let query = supabase
      .from('activity_log')
      .select('*, profiles!inner(email, display_name)', { count: 'exact' })

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.target_type) {
      query = query.eq('target_type', filters.target_type)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.module) {
      query = query.eq('module', filters.module)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,metadata.ilike.%${filters.search}%`)
    }

    // Apply pagination and ordering
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching activity logs:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Transform data to include user fields
    const logs: ActivityLog[] = (data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      description: log.description,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      metadata: log.metadata,
      severity: log.severity,
      module: log.module,
      created_at: log.created_at,
      user_email: log.profiles?.email,
      user_display_name: log.profiles?.display_name,
    }))

    return {
      success: true,
      data: {
        logs,
        total_count: count || 0,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getActivityLogs:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function getActivityLogById(logId: UUID): Promise<ActionResult<ActivityLog>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_log')
      .select('*, profiles!inner(email, display_name)')
      .eq('id', logId)
      .single()

    if (error) {
      console.error('Error fetching activity log:', error)
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    const log: ActivityLog = {
      id: data.id,
      user_id: data.user_id,
      action: data.action,
      target_type: data.target_type,
      target_id: data.target_id,
      description: data.description,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      metadata: data.metadata,
      severity: data.severity,
      module: data.module,
      created_at: data.created_at,
      user_email: (data as any).profiles?.email,
      user_display_name: (data as any).profiles?.display_name,
    }

    return { success: true, data: log }
  } catch (error) {
    console.error('Unexpected error in getActivityLogById:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function getActivityLogFilters(): Promise<{
  actions: string[]
  target_types: string[]
  severities: string[]
  modules: string[]
}> {
  try {
    const supabase = await createClient()

    // Get distinct values for filters
    const [actionsResult, targetTypesResult, modulesResult] = await Promise.all([
      supabase.from('activity_log').select('action'),
      supabase.from('activity_log').select('target_type'),
      supabase.from('activity_log').select('module'),
    ])

    const actions = [...new Set((actionsResult.data || []).map((l: any) => l.action))].filter(Boolean).sort()
    const target_types = [
      ...new Set((targetTypesResult.data || []).map((l: any) => l.target_type)),
    ]
      .filter(Boolean)
      .sort()
    const modules = [...new Set((modulesResult.data || []).map((l: any) => l.module))].filter(Boolean).sort()

    const severities = ['debug', 'info', 'warning', 'error', 'critical']

    return {
      actions,
      target_types,
      severities,
      modules,
    }
  } catch (error) {
    console.error('Unexpected error in getActivityLogFilters:', error)
    return {
      actions: [],
      target_types: [],
      severities: ['debug', 'info', 'warning', 'error', 'critical'],
      modules: [],
    }
  }
}

export async function exportActivityLogsToCsv(
  filters: ActivityLogFilters = {}
): Promise<ActionResult<ActivityLogExport>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Get all logs matching filters (no pagination for export)
    let query = supabase
      .from('activity_log')
      .select('*, profiles!inner(email, display_name)', { count: 'exact' })

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.target_type) {
      query = query.eq('target_type', filters.target_type)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.module) {
      query = query.eq('module', filters.module)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,metadata.ilike.%${filters.search}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(10000) // Max export limit

    if (error) {
      console.error('Error exporting activity logs:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const logs: ActivityLog[] = (data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      description: log.description,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      metadata: log.metadata,
      severity: log.severity,
      module: log.module,
      created_at: log.created_at,
      user_email: (log as any).profiles?.email,
      user_display_name: (log as any).profiles?.display_name,
    }))

    const exportData: ActivityLogExport = {
      logs,
      total_count: count || 0,
      filtered_count: logs.length,
      export_date: new Date().toISOString(),
      filters,
    }

    return { success: true, data: exportData }
  } catch (error) {
    console.error('Unexpected error in exportActivityLogsToCsv:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

export async function getRecentActivityLogs(limit: number = 20): Promise<ActionResult<ActivityLog[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_log')
      .select('*, profiles!inner(email, display_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent activity logs:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const logs: ActivityLog[] = (data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      description: log.description,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      metadata: log.metadata,
      severity: log.severity,
      module: log.module,
      created_at: log.created_at,
      user_email: (log as any).profiles?.email,
      user_display_name: (log as any).profiles?.display_name,
    }))

    return { success: true, data: logs }
  } catch (error) {
    console.error('Unexpected error in getRecentActivityLogs:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
