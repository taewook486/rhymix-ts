import { createClient } from './server'
import { randomUUID } from 'crypto'

// Storage bucket types
export type StorageBucket = 'avatars' | 'attachments' | 'images'

// File size limits in bytes
export const FILE_SIZE_LIMITS: Record<StorageBucket, number> = {
  avatars: 2 * 1024 * 1024, // 2MB
  attachments: 10 * 1024 * 1024, // 10MB
  images: 5 * 1024 * 1024, // 5MB
}

// Allowed MIME types per bucket
export const ALLOWED_MIME_TYPES: Record<StorageBucket, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  attachments: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
}

// Error messages in Korean
const ERROR_MESSAGES = {
  INVALID_BUCKET: '유효하지 않은 버킷입니다.',
  FILE_TOO_LARGE: '파일 크기가 제한을 초과했습니다.',
  INVALID_FILE_TYPE: '허용되지 않는 파일 형식입니다.',
  UPLOAD_FAILED: '파일 업로드에 실패했습니다.',
  DELETE_FAILED: '파일 삭제에 실패했습니다.',
  LIST_FAILED: '파일 목록을 가져오는데 실패했습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
}

export interface UploadResult {
  publicUrl: string
  path: string
}

export interface FileInfo {
  name: string
  path: string
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
}

/**
 * Validate file before upload
 */
function validateFile(bucket: StorageBucket, file: File): { valid: boolean; error?: string } {
  // Check file size
  const sizeLimit = FILE_SIZE_LIMITS[bucket]
  if (file.size > sizeLimit) {
    const limitMB = sizeLimit / (1024 * 1024)
    return {
      valid: false,
      error: `${ERROR_MESSAGES.FILE_TOO_LARGE} (최대 ${limitMB}MB)`,
    }
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[bucket]
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `${ERROR_MESSAGES.INVALID_FILE_TYPE} (허용: ${allowedTypes.join(', ')})`,
    }
  }

  return { valid: true }
}

/**
 * Generate unique filename with UUID
 */
function generateUniqueFilename(originalName: string): string {
  const uuid = randomUUID()
  const extension = originalName.split('.').pop()?.toLowerCase() || ''
  const sanitizedExtension = extension.replace(/[^a-z0-9]/g, '').slice(0, 10)

  return sanitizedExtension ? `${uuid}.${sanitizedExtension}` : uuid
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(bucket, file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED)
  }

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(file.name)
  const fullPath = path ? `${path}/${uniqueFilename}` : uniqueFilename

  // Upload file
  const { data, error } = await supabase.storage.from(bucket).upload(fullPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${error.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return {
    publicUrl,
    path: data.path,
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED)
  }

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`${ERROR_MESSAGES.DELETE_FAILED}: ${error.message}`)
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * List files in a bucket path
 */
export async function listFiles(
  bucket: StorageBucket,
  path?: string
): Promise<string[]> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED)
  }

  const { data, error } = await supabase.storage.from(bucket).list(path || '', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) {
    console.error('List error:', error)
    throw new Error(`${ERROR_MESSAGES.LIST_FAILED}: ${error.message}`)
  }

  // Filter out folders and return file paths
  return data
    .filter((item) => item.metadata !== null)
    .map((item) => (path ? `${path}/${item.name}` : item.name))
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  return uploadFile('avatars', `users/${userId}`, file)
}

/**
 * Upload attachment for post
 */
export async function uploadAttachment(
  boardId: string,
  postId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile('attachments', `boards/${boardId}/${postId}`, file)
}

/**
 * Upload general image
 */
export async function uploadImage(category: string, file: File): Promise<UploadResult> {
  return uploadFile('images', category, file)
}
