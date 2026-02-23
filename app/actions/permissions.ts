'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Permission {
  id: string
  name: string
  slug: string
  description: string | null
  module: string
  permission_type: string
  config: Record<string, any>
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  system_groups?: string[]
}

export interface PermissionInput {
  name: string
  slug: string
  description?: string
  module: string
  permission_type?: string
  config?: Record<string, any>
  is_system?: boolean
  is_active?: boolean
  system_groups?: string[]
}

export interface PermissionUpdate extends Partial<PermissionInput> {
  name?: string
  slug?: string
}

// Internal type for the raw Supabase response
interface GroupPermissionRaw {
  id: string
  group_id: string
  permission_id: string
  config: Record<string, any>
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  created_at: string
  group?: {
    id: string
    name: string
    slug: string
  }[]
  permission?: {
    id: string
    name: string
    slug: string
  }[]
}

export interface GroupPermission {
  id: string
  group_id: string
  permission_id: string
  config: Record<string, any>
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  created_at: string
  group?: {
    id: string
    name: string
    slug: string
  }
  permission?: {
    id: string
    name: string
    slug: string
  }
}

export interface CreatePermissionResponse {
  success: boolean
  data?: Permission
  error?: string
}

export interface UpdatePermissionResponse {
  success: boolean
  data?: Permission
  error?: string
}

export interface DeletePermissionResponse {
  success: boolean
  error?: string
}

export interface GetPermissionsResponse {
  success: boolean
  data?: Permission[]
  error?: string
}

export interface GetPermissionResponse {
  success: boolean
  data?: Permission
  error?: string
}

export interface AssignPermissionResponse {
  success: boolean
  error?: string
}

export interface RevokePermissionResponse {
  success: boolean
  error?: string
}

export interface GetGroupPermissionsResponse {
  success: boolean
  data?: GroupPermission[]
  error?: string
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all permissions (active only by default)
 */
export async function getPermissions(includeInactive = false): Promise<GetPermissionsResponse> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('permissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: data as Permission[] }
  } catch (error) {
    console.error('Get permissions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get permissions'
    }
  }
}

/**
 * Get a single permission by ID
 */
export async function getPermission(permissionId: string): Promise<GetPermissionResponse> {
  try {
    if (!permissionId) {
      return { success: false, error: 'Permission ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('id', permissionId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as Permission }
  } catch (error) {
    console.error('Get permission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get permission'
    }
  }
}

/**
 * Get a permission by slug
 */
export async function getPermissionBySlug(slug: string): Promise<GetPermissionResponse> {
  try {
    if (!slug) {
      return { success: false, error: 'Slug is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as Permission }
  } catch (error) {
    console.error('Get permission by slug error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get permission'
    }
  }
}

/**
 * Create a new permission
 */
export async function createPermission(input: PermissionInput): Promise<CreatePermissionResponse> {
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
    if (!input.name || !input.slug || !input.module) {
      return { success: false, error: 'Name, slug, and module are required' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_.:-]+$/
    if (!slugRegex.test(input.slug)) {
      return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, underscores, colons, and dots' }
    }

    // Check if slug already exists
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('id')
      .eq('slug', input.slug)
      .single()

    if (existingPermission) {
      return { success: false, error: 'Slug already exists' }
    }

    // Create permission
    const permissionData = {
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      module: input.module,
      permission_type: input.permission_type || 'action',
      config: input.config || {},
      is_system: input.is_system || false,
      is_active: input.is_active !== undefined ? input.is_active : true,
      system_groups: input.system_groups || []
    }

    const { data, error } = await supabase
      .from('permissions')
      .insert(permissionData)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/permissions')
    revalidatePath('/admin/groups')

    return { success: true, data: data as Permission }
  } catch (error) {
    console.error('Create permission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create permission'
    }
  }
}

/**
 * Update an existing permission
 */
export async function updatePermission(permissionId: string, input: PermissionUpdate): Promise<UpdatePermissionResponse> {
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

    // Validate permission exists
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('id, is_system')
      .eq('id', permissionId)
      .single()

    if (!existingPermission) {
      return { success: false, error: 'Permission not found' }
    }

    // Prevent modifying system permissions' critical fields
    if (existingPermission.is_system) {
      if (input.slug || input.is_system !== undefined) {
        return { success: false, error: 'Cannot modify system permission fields' }
      }
    }

    // Validate slug format if provided
    if (input.slug) {
      const slugRegex = /^[a-z0-9_.:-]+$/
      if (!slugRegex.test(input.slug)) {
        return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, underscores, colons, and dots' }
      }

      // Check if new slug already exists
      const { data: slugPermission } = await supabase
        .from('permissions')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', permissionId)
        .single()

      if (slugPermission) {
        return { success: false, error: 'Slug already exists' }
      }
    }

    // Build update data
    const updateData: any = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.description !== undefined) updateData.description = input.description
    if (input.module !== undefined) updateData.module = input.module
    if (input.permission_type !== undefined) updateData.permission_type = input.permission_type
    if (input.config !== undefined) updateData.config = input.config
    if (input.is_active !== undefined) updateData.is_active = input.is_active
    if (input.system_groups !== undefined) updateData.system_groups = input.system_groups

    // Update permission
    const { data, error } = await supabase
      .from('permissions')
      .update(updateData)
      .eq('id', permissionId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/permissions')
    revalidatePath('/admin/groups')

    return { success: true, data: data as Permission }
  } catch (error) {
    console.error('Update permission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update permission'
    }
  }
}

/**
 * Delete a permission (soft delete by setting is_active to false)
 */
export async function deletePermission(permissionId: string): Promise<DeletePermissionResponse> {
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

    // Check if permission exists and is not a system permission
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('id, is_system')
      .eq('id', permissionId)
      .single()

    if (!existingPermission) {
      return { success: false, error: 'Permission not found' }
    }

    if (existingPermission.is_system) {
      return { success: false, error: 'Cannot delete system permissions' }
    }

    // Soft delete permission (set is_active to false)
    const { error } = await supabase
      .from('permissions')
      .update({ is_active: false })
      .eq('id', permissionId)

    if (error) {
      throw error
    }

    revalidatePath('/admin/permissions')
    revalidatePath('/admin/groups')

    return { success: true }
  } catch (error) {
    console.error('Delete permission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete permission'
    }
  }
}

/**
 * Get permissions assigned to a specific group
 */
export async function getGroupPermissions(groupId: string): Promise<GetGroupPermissionsResponse> {
  try {
    if (!groupId) {
      return { success: false, error: 'Group ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('group_permissions')
      .select(`
        id,
        group_id,
        permission_id,
        config,
        granted_by,
        granted_at,
        expires_at,
        created_at,
        group:groups(id, name, slug),
        permission:permissions(id, name, slug)
      `)
      .eq('group_id', groupId)
      .order('granted_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform the data to handle the nested arrays from Supabase
    const permissions: GroupPermission[] = (data || []).map((item: any) => ({
      ...item,
      group: item.group?.[0] || null,
      permission: item.permission?.[0] || null
    }))

    return { success: true, data: permissions }
  } catch (error) {
    console.error('Get group permissions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get group permissions'
    }
  }
}

/**
 * Assign a permission to a group
 */
export async function assignPermissionToGroup(
  groupId: string,
  permissionId: string,
  config?: Record<string, any>,
  expiresAt?: string
): Promise<AssignPermissionResponse> {
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
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .is('deleted_at', null)
      .single()

    if (!group) {
      return { success: false, error: 'Group not found' }
    }

    // Validate permission exists
    const { data: permission } = await supabase
      .from('permissions')
      .select('id')
      .eq('id', permissionId)
      .eq('is_active', true)
      .single()

    if (!permission) {
      return { success: false, error: 'Permission not found' }
    }

    // Check if permission is already assigned to group
    const { data: existingAssignment } = await supabase
      .from('group_permissions')
      .select('id')
      .eq('group_id', groupId)
      .eq('permission_id', permissionId)
      .single()

    if (existingAssignment) {
      return { success: false, error: 'Permission is already assigned to this group' }
    }

    // Assign permission to group
    const { error } = await supabase
      .from('group_permissions')
      .insert({
        group_id: groupId,
        permission_id: permissionId,
        config: config || {},
        granted_by: user.data.user.id,
        expires_at: expiresAt || null
      })

    if (error) {
      throw error
    }

    revalidatePath('/admin/groups')
    revalidatePath('/admin/permissions')

    return { success: true }
  } catch (error) {
    console.error('Assign permission to group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign permission to group'
    }
  }
}

/**
 * Revoke a permission from a group
 */
export async function revokePermissionFromGroup(groupId: string, permissionId: string): Promise<RevokePermissionResponse> {
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

    // Remove permission from group
    const { error } = await supabase
      .from('group_permissions')
      .delete()
      .eq('group_id', groupId)
      .eq('permission_id', permissionId)

    if (error) {
      throw error
    }

    revalidatePath('/admin/groups')
    revalidatePath('/admin/permissions')

    return { success: true }
  } catch (error) {
    console.error('Revoke permission from group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke permission from group'
    }
  }
}

/**
 * Get all permissions for a user (through their groups)
 */
export async function getUserPermissions(userId: string): Promise<GetPermissionsResponse> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()

    // Get all permissions for user's groups
    const { data, error } = await supabase
      .from('user_groups')
      .select(`
        permission:group_permissions(
          permission:permissions(
            id,
            name,
            slug,
            description,
            module,
            permission_type,
            config,
            is_system,
            is_active
          )
        )
      `)
      .eq('user_id', userId)
      .is('permission.permissions.is_active', true)

    if (error) {
      throw error
    }

    // Flatten the nested structure (Supabase returns arrays)
    const permissions = (data || [])
      .flatMap((item: any) => item.permission || [])
      .map((gp: any) => gp.permission || [])
      .flat()
      .filter((permission: any) => permission !== null)

    // Remove duplicates
    const uniquePermissions = permissions.filter((perm: any, index: number, self: any[]) =>
      index === self.findIndex((p: any) => p.id === perm.id)
    )

    return { success: true, data: uniquePermissions as Permission[] }
  } catch (error) {
    console.error('Get user permissions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user permissions'
    }
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(userId: string, permissionSlug: string): Promise<boolean> {
  try {
    if (!userId || !permissionSlug) {
      return false
    }

    const { success, data } = await getUserPermissions(userId)

    if (!success || !data) {
      return false
    }

    // Check if user has admin role (always true)
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin') {
      return true
    }

    // Check if permission exists in user's permissions
    return data.some((perm) => perm.slug === permissionSlug)
  } catch (error) {
    console.error('Has permission error:', error)
    return false
  }
}
