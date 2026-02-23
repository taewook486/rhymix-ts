'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Group {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  is_default: boolean
  is_admin: boolean
  is_system: boolean
  config: Record<string, any>
  member_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GroupInput {
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  is_default?: boolean
  is_admin?: boolean
  is_system?: boolean
  config?: Record<string, any>
}

export interface GroupUpdate extends Partial<GroupInput> {
  name?: string
  slug?: string
}

export interface GroupMember {
  id: string
  user_id: string
  group_id: string
  is_leader: boolean
  added_by: string | null
  expires_at: string | null
  created_at: string
  profile?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    email: string
  }[]
}

// Internal type for the raw Supabase response
interface GroupMemberRaw {
  id: string
  user_id: string
  group_id: string
  is_leader: boolean
  added_by: string | null
  expires_at: string | null
  created_at: string
  profile?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    email: string
  }[]
}

export interface CreateGroupResponse {
  success: boolean
  data?: Group
  error?: string
}

export interface UpdateGroupResponse {
  success: boolean
  data?: Group
  error?: string
}

export interface DeleteGroupResponse {
  success: boolean
  error?: string
}

export interface GetGroupsResponse {
  success: boolean
  data?: Group[]
  error?: string
}

export interface GetGroupResponse {
  success: boolean
  data?: Group
  error?: string
}

export interface GetGroupMembersResponse {
  success: boolean
  data?: GroupMember[]
  error?: string
}

export interface AddMemberResponse {
  success: boolean
  error?: string
}

export interface RemoveMemberResponse {
  success: boolean
  error?: string
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all groups (excluding deleted)
 */
export async function getGroups(includeDeleted = false): Promise<GetGroupsResponse> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: data as Group[] }
  } catch (error) {
    console.error('Get groups error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get groups'
    }
  }
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<GetGroupResponse> {
  try {
    if (!groupId) {
      return { success: false, error: 'Group ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as Group }
  } catch (error) {
    console.error('Get group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get group'
    }
  }
}

/**
 * Get a group by slug
 */
export async function getGroupBySlug(slug: string): Promise<GetGroupResponse> {
  try {
    if (!slug) {
      return { success: false, error: 'Slug is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as Group }
  } catch (error) {
    console.error('Get group by slug error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get group'
    }
  }
}

/**
 * Create a new group
 */
export async function createGroup(input: GroupInput): Promise<CreateGroupResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Validate input
    if (!input.name || !input.slug) {
      return { success: false, error: 'Name and slug are required' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_-]+$/
    if (!slugRegex.test(input.slug)) {
      return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
    }

    // Check if slug already exists
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', input.slug)
      .is('deleted_at', null)
      .single()

    if (existingGroup) {
      return { success: false, error: 'Slug already exists' }
    }

    // Create group
    const groupData = {
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      is_default: input.is_default || false,
      is_admin: input.is_admin || false,
      is_system: input.is_system || false,
      config: input.config || {},
      member_count: 0
    }

    const { data, error } = await supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/groups')
    revalidatePath('/admin/permissions')

    return { success: true, data: data as Group }
  } catch (error) {
    console.error('Create group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group'
    }
  }
}

/**
 * Update an existing group
 */
export async function updateGroup(groupId: string, input: GroupUpdate): Promise<UpdateGroupResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Validate group exists
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id, is_system')
      .eq('id', groupId)
      .single()

    if (!existingGroup) {
      return { success: false, error: 'Group not found' }
    }

    // Prevent modifying system groups' critical fields
    if (existingGroup.is_system) {
      if (input.slug || input.is_system !== undefined) {
        return { success: false, error: 'Cannot modify system group fields' }
      }
    }

    // Validate slug format if provided
    if (input.slug) {
      const slugRegex = /^[a-z0-9_-]+$/
      if (!slugRegex.test(input.slug)) {
        return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
      }

      // Check if new slug already exists
      const { data: slugGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', groupId)
        .is('deleted_at', null)
        .single()

      if (slugGroup) {
        return { success: false, error: 'Slug already exists' }
      }
    }

    // Build update data
    const updateData: any = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.description !== undefined) updateData.description = input.description
    if (input.icon !== undefined) updateData.icon = input.icon
    if (input.color !== undefined) updateData.color = input.color
    if (input.config !== undefined) updateData.config = input.config

    // Update group
    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/groups')
    revalidatePath('/admin/permissions')

    return { success: true, data: data as Group }
  } catch (error) {
    console.error('Update group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update group'
    }
  }
}

/**
 * Delete a group (soft delete)
 */
export async function deleteGroup(groupId: string): Promise<DeleteGroupResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Check if group exists and is not a system group
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id, is_system, is_default')
      .eq('id', groupId)
      .single()

    if (!existingGroup) {
      return { success: false, error: 'Group not found' }
    }

    if (existingGroup.is_system) {
      return { success: false, error: 'Cannot delete system groups' }
    }

    if (existingGroup.is_default) {
      return { success: false, error: 'Cannot delete default groups' }
    }

    // Soft delete group
    const { error } = await supabase
      .from('groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', groupId)

    if (error) {
      throw error
    }

    revalidatePath('/admin/groups')
    revalidatePath('/admin/permissions')

    return { success: true }
  } catch (error) {
    console.error('Delete group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete group'
    }
  }
}

/**
 * Get members of a group
 */
export async function getGroupMembers(groupId: string): Promise<GetGroupMembersResponse> {
  try {
    if (!groupId) {
      return { success: false, error: 'Group ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_groups')
      .select(`
        id,
        user_id,
        group_id,
        is_leader,
        added_by,
        expires_at,
        created_at,
        profile:profiles(id, display_name, avatar_url, email)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform the data to handle the profile array from Supabase
    const members: GroupMember[] = (data || []).map((item: any) => ({
      ...item,
      profile: item.profile?.[0] || null
    }))

    return { success: true, data: members }
  } catch (error) {
    console.error('Get group members error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get group members'
    }
  }
}

/**
 * Add a member to a group
 */
export async function addGroupMember(
  groupId: string,
  userId: string,
  isLeader = false
): Promise<AddMemberResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Check if group exists
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single()

    if (!group) {
      return { success: false, error: 'Group not found' }
    }

    // Check if user exists
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if user is already in group
    const { data: existingMember } = await supabase
      .from('user_groups')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return { success: false, error: 'User is already a member of this group' }
    }

    // Add user to group
    const { error } = await supabase
      .from('user_groups')
      .insert({
        group_id: groupId,
        user_id: userId,
        is_leader: isLeader,
        added_by: user.data.user.id
      })

    if (error) {
      throw error
    }

    // Update group member count
    const { data: currentGroup } = await supabase
      .from('groups')
      .select('member_count')
      .eq('id', groupId)
      .single()

    if (currentGroup) {
      await supabase
        .from('groups')
        .update({ member_count: (currentGroup.member_count || 0) + 1 })
        .eq('id', groupId)
    }

    revalidatePath('/admin/groups')

    return { success: true }
  } catch (error) {
    console.error('Add group member error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add member to group'
    }
  }
}

/**
 * Remove a member from a group
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<RemoveMemberResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Remove user from group
    const { error } = await supabase
      .from('user_groups')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    // Update group member count
    const { data: currentGroup } = await supabase
      .from('groups')
      .select('member_count')
      .eq('id', groupId)
      .single()

    if (currentGroup && currentGroup.member_count > 0) {
      await supabase
        .from('groups')
        .update({ member_count: currentGroup.member_count - 1 })
        .eq('id', groupId)
    }

    revalidatePath('/admin/groups')

    return { success: true }
  } catch (error) {
    console.error('Remove group member error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member from group'
    }
  }
}

/**
 * Get user's groups
 */
export async function getUserGroups(userId: string): Promise<GetGroupsResponse> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_groups')
      .select(`
        group:groups(
          id,
          name,
          slug,
          description,
          icon,
          color,
          is_default,
          is_admin,
          is_system
        )
      `)
      .eq('user_id', userId)
      .is('groups.deleted_at', null)

    if (error) {
      throw error
    }

    const groups = (data || [])
      .map((item: any) => item.group)
      .filter((group: any) => group !== null)

    return { success: true, data: groups as Group[] }
  } catch (error) {
    console.error('Get user groups error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user groups'
    }
  }
}
