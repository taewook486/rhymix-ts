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

    return { success: true, data: data || [] }
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
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        is_active: input.is_active !== false,
        is_locked: input.is_locked || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data, message: '게시판이 생성되었습니다.' }
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

    const { data, error } = await supabase
      .from('boards')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data, message: '게시판이 수정되었습니다.' }
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
// Groups Types
// =====================================================

export interface Group {
  id: string
  name: string
  description: string | null
  user_count: number
  created_at: string
}

export interface GroupInput {
  name: string
  description?: string
}

export interface GroupUpdate {
  name?: string
  description?: string
}

// =====================================================
// Permissions Types
// =====================================================

export interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  groups: string[]
  created_at: string
}

export interface PermissionInput {
  name: string
  description?: string
  module: string
}

export interface PermissionUpdate {
  name?: string
  description?: string
  module?: string
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
// Pages Types
// =====================================================

export interface Page {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  author: string
  view_count: number
  created_at: string
  updated_at: string
}

export interface PageInput {
  title: string
  slug: string
  content: string
  status?: 'draft' | 'published'
}

export interface PageUpdate {
  title?: string
  slug?: string
  content?: string
  status?: 'draft' | 'published'
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
// =====================================================

/**
 * Get all user groups
 * TODO: Replace mock data with actual Supabase query when groups table is created
 */
export async function getGroups(): Promise<ActionResult<Group[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // TODO: Implement actual Supabase query
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('groups')
    //   .select(`
    //     id,
    //     name,
    //     description,
    //     created_at,
    //     user_groups(count)
    //   `)
    //   .order('created_at', { ascending: false })
    //
    // if (error) {
    //   console.error('Error fetching groups:', error)
    //   return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    // }
    //
    // const groups: Group[] = (data || []).map((group) => ({
    //   id: group.id,
    //   name: group.name,
    //   description: group.description,
    //   user_count: group.user_groups?.[0]?.count || 0,
    //   created_at: group.created_at,
    // }))
    //
    // return { success: true, data: groups }

    // Mock data for now - replace when groups table is implemented
    const mockGroups: Group[] = [
      {
        id: '1',
        name: 'Administrators',
        description: 'Full system access',
        user_count: 3,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Moderators',
        description: 'Content moderation permissions',
        user_count: 5,
        created_at: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        name: 'Members',
        description: 'Regular user permissions',
        user_count: 42,
        created_at: '2024-01-03T00:00:00Z',
      },
    ]

    return { success: true, data: mockGroups }
  } catch (error) {
    console.error('Unexpected error in getGroups:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new user group
 * TODO: Replace mock data with actual Supabase insert when groups table is created
 */
export async function createGroup(name: string, description: string): Promise<ActionResult<Group>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!name || name.trim().length === 0) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase insert
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('groups')
    //   .insert({
    //     name: name.trim(),
    //     description: description?.trim() || null,
    //   })
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error creating group:', error)
    //   return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    // }
    //
    // return { success: true, data: { ...data, user_count: 0 }, message: '그룹이 생성되었습니다.' }

    // Mock response for now
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || null,
      user_count: 0,
      created_at: new Date().toISOString(),
    }

    return { success: true, data: newGroup, message: '그룹이 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createGroup:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update an existing user group
 * TODO: Replace mock data with actual Supabase update when groups table is created
 */
export async function updateGroup(id: string, data: GroupUpdate): Promise<ActionResult<Group>> {
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
    // const { data: updatedGroup, error } = await supabase
    //   .from('groups')
    //   .update({
    //     ...data,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', id)
    //   .select(`
    //     id,
    //     name,
    //     description,
    //     created_at,
    //     user_groups(count)
    //   `)
    //   .single()
    //
    // if (error) {
    //   console.error('Error updating group:', error)
    //   return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    // }
    //
    // return { success: true, data: updatedGroup, message: '그룹이 수정되었습니다.' }

    // Mock response for now
    const mockGroup: Group = {
      id,
      name: data.name || 'Updated Group',
      description: data.description || null,
      user_count: 0,
      created_at: new Date().toISOString(),
    }

    return { success: true, data: mockGroup, message: '그룹이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateGroup:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a user group
 * TODO: Replace mock response with actual Supabase delete when groups table is created
 */
export async function deleteGroup(id: string): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!id) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase delete
    // const supabase = await createClient()
    // const { error } = await supabase.from('groups').delete().eq('id', id)
    //
    // if (error) {
    //   console.error('Error deleting group:', error)
    //   return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    // }
    //
    // return { success: true, message: '그룹이 삭제되었습니다.' }

    return { success: true, message: '그룹이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deleteGroup:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Permissions Actions
// =====================================================

/**
 * Get all permissions
 * TODO: Replace mock data with actual Supabase query when permissions table is created
 */
export async function getPermissions(): Promise<ActionResult<Permission[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // TODO: Implement actual Supabase query
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('permissions')
    //   .select(`
    //     id,
    //     name,
    //     description,
    //     module,
    //     created_at,
    //     group_permissions(
    //       groups(name)
    //     )
    //   `)
    //   .order('module', { ascending: true })
    //   .order('name', { ascending: true })
    //
    // if (error) {
    //   console.error('Error fetching permissions:', error)
    //   return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    // }
    //
    // const permissions: Permission[] = (data || []).map((perm) => ({
    //   id: perm.id,
    //   name: perm.name,
    //   description: perm.description,
    //   module: perm.module,
    //   groups: perm.group_permissions?.map((gp: any) => gp.groups?.name).filter(Boolean) || [],
    //   created_at: perm.created_at,
    // }))
    //
    // return { success: true, data: permissions }

    // Mock data for now - replace when permissions table is implemented
    const mockPermissions: Permission[] = [
      {
        id: '1',
        name: 'board.create',
        description: 'Create new posts',
        module: 'board',
        groups: ['Administrators', 'Moderators', 'Members'],
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'board.delete',
        description: 'Delete posts',
        module: 'board',
        groups: ['Administrators', 'Moderators'],
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'user.manage',
        description: 'Manage users',
        module: 'member',
        groups: ['Administrators'],
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '4',
        name: 'settings.update',
        description: 'Update site settings',
        module: 'admin',
        groups: ['Administrators'],
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '5',
        name: 'comment.moderate',
        description: 'Moderate comments',
        module: 'comment',
        groups: ['Administrators', 'Moderators'],
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    return { success: true, data: mockPermissions }
  } catch (error) {
    console.error('Unexpected error in getPermissions:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new permission
 * TODO: Replace mock data with actual Supabase insert when permissions table is created
 */
export async function createPermission(
  name: string,
  description: string,
  module: string
): Promise<ActionResult<Permission>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!name || !module) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase insert
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('permissions')
    //   .insert({
    //     name: name.trim(),
    //     description: description?.trim() || null,
    //     module: module.trim(),
    //   })
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error creating permission:', error)
    //   return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    // }
    //
    // return { success: true, data: { ...data, groups: [] }, message: '권한이 생성되었습니다.' }

    // Mock response for now
    const newPermission: Permission = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || null,
      module: module.trim(),
      groups: [],
      created_at: new Date().toISOString(),
    }

    return { success: true, data: newPermission, message: '권한이 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createPermission:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update an existing permission
 * TODO: Replace mock data with actual Supabase update when permissions table is created
 */
export async function updatePermission(id: string, data: PermissionUpdate): Promise<ActionResult<Permission>> {
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
    // const { data: updatedPermission, error } = await supabase
    //   .from('permissions')
    //   .update({
    //     ...data,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', id)
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error updating permission:', error)
    //   return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    // }
    //
    // return { success: true, data: { ...updatedPermission, groups: [] }, message: '권한이 수정되었습니다.' }

    // Mock response for now
    const mockPermission: Permission = {
      id,
      name: data.name || 'updated.permission',
      description: data.description || null,
      module: data.module || 'general',
      groups: [],
      created_at: new Date().toISOString(),
    }

    return { success: true, data: mockPermission, message: '권한이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updatePermission:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a permission
 * TODO: Replace mock response with actual Supabase delete when permissions table is created
 */
export async function deletePermission(id: string): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!id) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase delete
    // const supabase = await createClient()
    // const { error } = await supabase.from('permissions').delete().eq('id', id)
    //
    // if (error) {
    //   console.error('Error deleting permission:', error)
    //   return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    // }
    //
    // return { success: true, message: '권한이 삭제되었습니다.' }

    return { success: true, message: '권한이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deletePermission:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Assign a permission to a group
 * TODO: Replace mock response with actual Supabase insert when group_permissions table is created
 */
export async function assignPermissionToGroup(
  groupId: string,
  permissionId: string
): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!groupId || !permissionId) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase insert
    // const supabase = await createClient()
    // const { error } = await supabase.from('group_permissions').insert({
    //   group_id: groupId,
    //   permission_id: permissionId,
    // })
    //
    // if (error) {
    //   console.error('Error assigning permission to group:', error)
    //   return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    // }
    //
    // return { success: true, message: '권한이 그룹에 할당되었습니다.' }

    return { success: true, message: '권한이 그룹에 할당되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in assignPermissionToGroup:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

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
// =====================================================

/**
 * Get all static pages
 * TODO: Replace mock data with actual Supabase query when pages table is created
 */
export async function getPages(): Promise<ActionResult<Page[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // TODO: Implement actual Supabase query
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('pages')
    //   .select('*')
    //   .order('updated_at', { ascending: false })
    //
    // if (error) {
    //   console.error('Error fetching pages:', error)
    //   return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    // }
    //
    // return { success: true, data: data || [] }

    // Mock data for now - replace when pages table is implemented
    const mockPages: Page[] = [
      {
        id: '1',
        title: 'About Us',
        slug: 'about',
        content: 'Learn about our company...',
        status: 'published',
        author: 'admin',
        view_count: 1234,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      },
      {
        id: '2',
        title: 'Contact',
        slug: 'contact',
        content: 'Get in touch with us...',
        status: 'published',
        author: 'admin',
        view_count: 567,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z',
      },
      {
        id: '3',
        title: 'Privacy Policy',
        slug: 'privacy',
        content: 'Our privacy policy...',
        status: 'published',
        author: 'admin',
        view_count: 890,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      },
      {
        id: '4',
        title: 'Terms of Service',
        slug: 'terms',
        content: 'Terms and conditions...',
        status: 'published',
        author: 'admin',
        view_count: 445,
        created_at: '2024-01-04T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
      },
      {
        id: '5',
        title: 'FAQ Draft',
        slug: 'faq-draft',
        content: 'Frequently asked questions...',
        status: 'draft',
        author: 'admin',
        view_count: 0,
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
      },
    ]

    return { success: true, data: mockPages }
  } catch (error) {
    console.error('Unexpected error in getPages:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new static page
 * TODO: Replace mock data with actual Supabase insert when pages table is created
 */
export async function createPage(
  title: string,
  slug: string,
  content: string,
  status: 'draft' | 'published' = 'draft'
): Promise<ActionResult<Page>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!title || !slug) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase insert
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('pages')
    //   .insert({
    //     title: title.trim(),
    //     slug: slug.trim().toLowerCase(),
    //     content: content || '',
    //     status,
    //     author: access.user.email || 'unknown',
    //     view_count: 0,
    //   })
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error creating page:', error)
    //   return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    // }
    //
    // return { success: true, data, message: '페이지가 생성되었습니다.' }

    // Mock response for now
    const newPage: Page = {
      id: crypto.randomUUID(),
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      content: content || '',
      status,
      author: 'admin',
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return { success: true, data: newPage, message: '페이지가 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createPage:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update an existing static page
 * TODO: Replace mock data with actual Supabase update when pages table is created
 */
export async function updatePage(id: string, data: PageUpdate): Promise<ActionResult<Page>> {
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
    // const { data: updatedPage, error } = await supabase
    //   .from('pages')
    //   .update({
    //     ...data,
    //     slug: data.slug?.trim().toLowerCase(),
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', id)
    //   .select()
    //   .single()
    //
    // if (error) {
    //   console.error('Error updating page:', error)
    //   return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    // }
    //
    // return { success: true, data: updatedPage, message: '페이지가 수정되었습니다.' }

    // Mock response for now
    const mockPage: Page = {
      id,
      title: data.title || 'Updated Page',
      slug: data.slug?.toLowerCase() || 'updated-page',
      content: data.content || '',
      status: data.status || 'draft',
      author: 'admin',
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return { success: true, data: mockPage, message: '페이지가 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updatePage:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a static page
 * TODO: Replace mock response with actual Supabase delete when pages table is created
 */
export async function deletePage(id: string): Promise<ActionResult> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    if (!id) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // TODO: Implement actual Supabase delete
    // const supabase = await createClient()
    // const { error } = await supabase.from('pages').delete().eq('id', id)
    //
    // if (error) {
    //   console.error('Error deleting page:', error)
    //   return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    // }
    //
    // return { success: true, message: '페이지가 삭제되었습니다.' }

    return { success: true, message: '페이지가 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deletePage:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Analytics Actions
// =====================================================

/**
 * Get analytics data for the admin dashboard
 * TODO: Replace mock data with actual Supabase queries for real analytics
 */
export async function getAnalytics(): Promise<ActionResult<AnalyticsData>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // TODO: Implement actual Supabase queries
    // const supabase = await createClient()
    //
    // // Get current stats
    // const [usersResult, postsResult, commentsResult] = await Promise.all([
    //   supabase.from('profiles').select('*', { count: 'exact', head: true }),
    //   supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    //   supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    // ])
    //
    // // Get views from post metadata or analytics table
    // const { data: viewsData } = await supabase
    //   .from('posts')
    //   .select('view_count')
    //   .is('deleted_at', null)
    //
    // const totalViews = viewsData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0
    //
    // // Get previous month stats for growth calculation
    // const lastMonth = new Date()
    // lastMonth.setMonth(lastMonth.getMonth() - 1)
    //
    // const [lastMonthUsers, lastMonthPosts, lastMonthComments] = await Promise.all([
    //   supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', lastMonth.toISOString()),
    //   supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('created_at', lastMonth.toISOString()),
    //   supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('created_at', lastMonth.toISOString()),
    // ])
    //
    // // Calculate growth percentages
    // const calculateGrowth = (current: number, previous: number) => {
    //   if (previous === 0) return current > 0 ? 100 : 0
    //   return Math.round(((current - previous) / previous) * 100)
    // }
    //
    // // Get top content by views
    // const { data: topContent } = await supabase
    //   .from('posts')
    //   .select('id, title, view_count')
    //   .is('deleted_at', null)
    //   .order('view_count', { ascending: false })
    //   .limit(5)
    //
    // // Get recent activity
    // const { data: recentActivity } = await supabase
    //   .from('activity_log')
    //   .select('id, action, user_id, created_at, profiles(display_name)')
    //   .order('created_at', { ascending: false })
    //   .limit(5)
    //
    // return {
    //   success: true,
    //   data: {
    //     stats: {
    //       totalUsers: usersResult.count || 0,
    //       totalPosts: postsResult.count || 0,
    //       totalComments: commentsResult.count || 0,
    //       totalViews,
    //     },
    //     growth: {
    //       users: calculateGrowth(usersResult.count || 0, lastMonthUsers.count || 0),
    //       posts: calculateGrowth(postsResult.count || 0, lastMonthPosts.count || 0),
    //       comments: calculateGrowth(commentsResult.count || 0, lastMonthComments.count || 0),
    //       views: 23, // Placeholder - would need analytics table
    //     },
    //     topContent: topContent?.map(item => ({
    //       id: item.id,
    //       title: item.title,
    //       views: item.view_count || 0,
    //       type: 'post',
    //     })) || [],
    //     recentActivity: recentActivity?.map(activity => ({
    //       id: activity.id,
    //       action: activity.action,
    //       user: activity.profiles?.display_name || 'Unknown',
    //       time: formatTimeAgo(activity.created_at),
    //     })) || [],
    //   },
    // }

    // Mock data for now - replace when analytics implementation is ready
    const mockAnalytics: AnalyticsData = {
      stats: {
        totalUsers: 156,
        totalPosts: 842,
        totalComments: 2341,
        totalViews: 45678,
      },
      growth: {
        users: 12,
        posts: 8,
        comments: 15,
        views: 23,
      },
      topContent: [
        { id: '1', title: 'Welcome to Rhymix TS', views: 1234, type: 'post' },
        { id: '2', title: 'Getting Started Guide', views: 987, type: 'document' },
        { id: '3', title: 'API Documentation', views: 765, type: 'document' },
        { id: '4', title: 'Community Guidelines', views: 543, type: 'post' },
        { id: '5', title: 'FAQ', views: 432, type: 'document' },
      ],
      recentActivity: [
        { id: '1', action: 'New post', user: 'john_doe', time: '5 minutes ago' },
        { id: '2', action: 'Comment added', user: 'jane_smith', time: '15 minutes ago' },
        { id: '3', action: 'User registered', user: 'new_user', time: '1 hour ago' },
        { id: '4', action: 'Document updated', user: 'admin', time: '2 hours ago' },
        { id: '5', action: 'New board created', user: 'admin', time: '3 hours ago' },
      ],
    }

    return { success: true, data: mockAnalytics }
  } catch (error) {
    console.error('Unexpected error in getAnalytics:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
