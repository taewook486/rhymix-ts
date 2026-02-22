'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'
import type { Profile, ProfileUpdate, UserRole } from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  PASSWORD_MISMATCH: '현재 비밀번호가 올바르지 않습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  UPLOAD_FAILED: '업로드에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Member Filter Types
// =====================================================

export interface MemberFilters {
  role?: UserRole
  search?: string
  page?: number
  limit?: number
  sort?: 'created_at' | 'last_login_at' | 'display_name'
  order?: 'asc' | 'desc'
}

// =====================================================
// Member Actions
// =====================================================

/**
 * Update user profile
 */
export async function updateProfile(userId: UUID, data: ProfileUpdate): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Users can only update their own profile (unless admin)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    if (user.id !== userId && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Filter out fields that non-admins cannot update
    let updateData = { ...data }
    if (!isAdmin) {
      delete updateData.role // Non-admins cannot change role
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: updatedProfile as Profile, message: '프로필이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateProfile:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Verify old password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password: oldPassword,
    })

    if (signInError) {
      return { success: false, error: ERROR_MESSAGES.PASSWORD_MISMATCH }
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error('Error changing password:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, message: '비밀번호가 변경되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in changePassword:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(userId: string, file: File): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)' }
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: '파일 크기는 2MB를 초과할 수 없습니다.' }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`
    const bucketName = 'avatars'

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file, {
      upsert: true,
    })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return { success: false, error: ERROR_MESSAGES.UPLOAD_FAILED }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating avatar URL:', updateError)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: publicUrl, message: '아바타가 업로드되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in uploadAvatar:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get members with filters
 */
export async function getMembers(filters: MemberFilters = {}): Promise<ActionResult<Profile[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check admin role for full access
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    const { role, search, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters
    const offset = (page - 1) * limit

    let query = supabase.from('profiles').select('*')

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Non-admins can only see public info
    if (!isAdmin) {
      query = query.select('id, display_name, avatar_url, bio, created_at')
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching members:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (data || []) as Profile[] }
  } catch (error) {
    console.error('Unexpected error in getMembers:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update member role (admin only)
 */
export async function updateMemberRole(userId: UUID, role: string): Promise<ActionResult<Profile>> {
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

    // Validate role
    const validRoles: UserRole[] = ['admin', 'moderator', 'user', 'guest']
    if (!validRoles.includes(role as UserRole)) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        role: role as UserRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: updatedProfile as Profile, message: '회원 등급이 변경되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateMemberRole:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
