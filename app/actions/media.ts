'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface MediaFile {
  id: string
  target_type: string
  target_id: string
  author_id: string
  filename: string
  original_filename: string
  mime_type: string
  file_size: number
  width?: number
  height?: number
  duration?: number
  storage_path: string
  cdn_url: string
  thumbnail_path?: string
  is_image: boolean
  is_video: boolean
  is_audio: boolean
  is_document: boolean
  download_count: number
  status: 'active' | 'trash' | 'deleted'
  metadata: Record<string, any>
  created_at: string
}

export interface UploadFileInput {
  file: File
  target_type?: string
  target_id?: string
}

export interface UploadFileResponse {
  success: boolean
  data?: MediaFile
  error?: string
}

export interface DeleteFileResponse {
  success: boolean
  error?: string
}

export interface GetFilesResponse {
  success: boolean
  data?: MediaFile[]
  error?: string
}

// =====================================================
// Helper Functions
// =====================================================

function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}

async function uploadToSupabaseStorage(
  file: File,
  bucket: string = 'uploads'
): Promise<{ path: string; url: string }> {
  const supabase = await createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    path: data.path,
    url: publicUrl
  }
}

// Note: These functions won't work in server actions due to browser API limitations
// For now, we'll skip dimensions/duration extraction during server-side upload
async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  // Skip on server side - would need to be done client-side or with a proper image processing library
  return {}
}

async function getVideoDuration(file: File): Promise<number | undefined> {
  // Skip on server side - would need to be done client-side or with a proper video processing library
  return undefined
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Upload a file to Supabase Storage and save metadata to database
 */
export async function uploadFile(input: UploadFileInput): Promise<UploadFileResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { file, target_type = 'general', target_id } = input

    // Validate file
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { success: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/mp3',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: `File type ${file.type} is not allowed` }
    }

    // Upload to Supabase Storage
    const { path, url } = await uploadToSupabaseStorage(file)

    // Get dimensions/duration
    const dimensions = await getImageDimensions(file)
    const duration = await getVideoDuration(file)

    // Save metadata to database
    const supabase = await createClient()
    const category = getFileCategory(file.type)

    const fileData = {
      target_type,
      target_id: target_id || null,
      author_id: user.data.user.id,
      filename: file.name,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      duration: duration,
      storage_path: path,
      cdn_url: url,
      is_image: category === 'image',
      is_video: category === 'video',
      is_audio: category === 'audio',
      is_document: category === 'document',
      download_count: 0,
      status: 'active',
      metadata: {
        uploaded_via: 'admin'
      }
    }

    const { data, error } = await supabase
      .from('files')
      .insert(fileData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      // Rollback: delete from storage
      await supabase.storage.from('uploads').remove([path])
      return { success: false, error: `Failed to save file metadata: ${error.message}` }
    }

    revalidatePath('/admin/media')

    return { success: true, data: data as MediaFile }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    }
  }
}

/**
 * Delete a file from Supabase Storage and database
 */
export async function deleteFile(fileId: string): Promise<DeleteFileResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Get file info
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fetchError || !file) {
      return { success: false, error: 'File not found' }
    }

    // Check ownership or admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
    const isOwner = file.author_id === user.data.user.id

    if (!isAdmin && !isOwner) {
      return { success: false, error: 'Forbidden: You can only delete your own files' }
    }

    // Delete from storage
    if (file.storage_path) {
      const { error: deleteError } = await supabase.storage
        .from('uploads')
        .remove([file.storage_path])

      if (deleteError) {
        console.warn('Failed to delete from storage:', deleteError)
        // Continue with database deletion
      }
    }

    // Soft delete from database
    const { error: updateError } = await supabase
      .from('files')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', fileId)

    if (updateError) {
      throw updateError
    }

    revalidatePath('/admin/media')

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    }
  }
}

/**
 * Get files with optional filters
 */
export async function getFiles(filters?: {
  target_type?: string
  target_id?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<GetFilesResponse> {
  try {
    // Skip database access during build time
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'development' && process.env.CI) {
      return { success: true, data: [] }
    }

    const supabase = await createClient()

    let query = supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.target_type) {
      query = query.eq('target_type', filters.target_type)
    }

    if (filters?.target_id) {
      query = query.eq('target_id', filters.target_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      // By default, exclude deleted files
      query = query.neq('status', 'deleted')
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: data as MediaFile[] }
  } catch (error) {
    console.error('Get files error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get files'
    }
  }
}

/**
 * Batch delete files
 */
export async function deleteFiles(fileIds: string[]): Promise<{
  success: boolean
  deleted: string[]
  errors: Array<{ id: string; error: string }>
}> {
  const deleted: string[] = []
  const errors: Array<{ id: string; error: string }> = []

  for (const fileId of fileIds) {
    const result = await deleteFile(fileId)
    if (result.success) {
      deleted.push(fileId)
    } else {
      errors.push({ id: fileId, error: result.error || 'Unknown error' })
    }
  }

  return {
    success: errors.length === 0,
    deleted,
    errors
  }
}

/**
 * Update file metadata
 */
export async function updateFile(
  fileId: string,
  updates: Partial<Pick<MediaFile, 'filename' | 'metadata'>>
): Promise<{
  success: boolean
  data?: MediaFile
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Get file to check ownership
    const { data: file } = await supabase
      .from('files')
      .select('author_id')
      .eq('id', fileId)
      .single()

    if (!file) {
      return { success: false, error: 'File not found' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
    const isOwner = file.author_id === user.data.user.id

    if (!isAdmin && !isOwner) {
      return { success: false, error: 'Forbidden' }
    }

    // Update file
    const { data, error } = await supabase
      .from('files')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as MediaFile }
  } catch (error) {
    console.error('Update file error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update file'
    }
  }
}
