'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type {
  DocumentQueryParams,
  CreateDocumentInput,
  UpdateDocumentInput,
  ActionResult,
  PaginatedResponse,
  DocumentWithAuthor,
  DocumentVersionWithAuthor,
  DocumentVersionDiff,
} from '@/types/document'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 문서를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  DOCUMENT_NOT_FOUND: '문서를 찾을 수 없습니다.',
  VERSION_NOT_FOUND: '버전을 찾을 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  RESTORE_FAILED: '복원에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Transform Supabase join result to extract single object from array
 */
function transformDocumentData(doc: any): DocumentWithAuthor {
  return {
    ...doc,
    author: Array.isArray(doc.author) ? doc.author[0] || null : doc.author,
  }
}

function transformVersionData(version: any): DocumentVersionWithAuthor {
  return {
    ...version,
    author: Array.isArray(version.author) ? version.author[0] || null : version.author,
  }
}

// =====================================================
// Document Actions
// =====================================================

/**
 * Get paginated documents
 */
export async function getDocuments(
  params: DocumentQueryParams = {}
): Promise<ActionResult<PaginatedResponse<DocumentWithAuthor>>> {
  try {
    const supabase = await createClient()
    const {
      page = 1,
      limit = 20,
      search,
      module,
      author_id,
      status = 'published',
      visibility,
      language,
      tags,
      categories,
      is_featured,
      is_sticky,
      sort = 'created_at',
      order = 'desc',
      date_from,
      date_to,
    } = params

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('documents')
      .select(
        `
        id,
        module,
        title,
        content,
        content_html,
        excerpt,
        slug,
        author_id,
        status,
        visibility,
        password,
        template,
        layout,
        language,
        tags,
        categories,
        version,
        view_count,
        like_count,
        comment_count,
        is_featured,
        is_sticky,
        allow_comment,
        allow_ping,
        created_at,
        updated_at,
        published_at,
        author:profiles!documents_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .eq('status', status)
      .is('deleted_at', null)

    // Apply filters
    if (module) {
      query = query.eq('module', module)
    }

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (visibility) {
      query = query.eq('visibility', visibility)
    }

    if (language) {
      query = query.eq('language', language)
    }

    if (typeof is_featured === 'boolean') {
      query = query.eq('is_featured', is_featured)
    }

    if (typeof is_sticky === 'boolean') {
      query = query.eq('is_sticky', is_sticky)
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    if (categories && categories.length > 0) {
      query = query.overlaps('categories', categories)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Full-text search
    if (search && search.trim()) {
      query = query.textSearch('search_vector', search.trim(), {
        type: 'websearch',
        config: 'english',
      })
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: {
        data: data?.map(transformDocumentData) || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    }
  } catch (error) {
    console.error('Unexpected error in getDocuments:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a single document with details
 */
export async function getDocument(documentId: UUID): Promise<ActionResult<DocumentWithAuthor>> {
  try {
    const supabase = await createClient()

    // Increment view count
    await supabase.rpc('increment_view_count', {
      table_name: 'documents',
      row_id: documentId,
    })

    const { data, error } = await supabase
      .from('documents')
      .select(
        `
        id,
        module,
        title,
        content,
        content_html,
        excerpt,
        slug,
        author_id,
        status,
        visibility,
        password,
        template,
        layout,
        language,
        tags,
        categories,
        version,
        view_count,
        like_count,
        comment_count,
        is_featured,
        is_sticky,
        allow_comment,
        allow_ping,
        created_at,
        updated_at,
        published_at,
        author:profiles!documents_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return { success: false, error: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
    }

    return { success: true, data: transformDocumentData(data) }
  } catch (error) {
    console.error('Unexpected error in getDocument:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new document
 */
export async function createDocument(input: CreateDocumentInput): Promise<ActionResult<DocumentWithAuthor>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Create excerpt from content
    const excerpt = input.excerpt || input.content.replace(/<[^>]*>/g, '').substring(0, 200)

    const { data, error } = await supabase
      .from('documents')
      .insert({
        module: input.module,
        title: input.title,
        content: input.content,
        content_html: input.content_html || null,
        excerpt,
        slug: input.slug || null,
        author_id: user.id,
        status: input.status || 'draft',
        visibility: input.visibility || 'public',
        password: input.password || null,
        template: input.template || 'default',
        layout: input.layout || 'default',
        language: input.language || 'ko',
        tags: input.tags || [],
        categories: input.categories || [],
        is_featured: input.is_featured || false,
        is_sticky: input.is_sticky || false,
        allow_comment: input.allow_comment !== false,
        allow_ping: input.allow_ping !== false,
        version: 1,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
      })
      .select(
        `
        id,
        module,
        title,
        content,
        content_html,
        excerpt,
        slug,
        author_id,
        status,
        visibility,
        password,
        template,
        layout,
        language,
        tags,
        categories,
        version,
        view_count,
        like_count,
        comment_count,
        is_featured,
        is_sticky,
        allow_comment,
        allow_ping,
        created_at,
        updated_at,
        published_at,
        author:profiles!documents_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Create initial version record
    const displayName = (
      await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    ).data?.display_name

    await supabase.from('document_versions').insert({
      document_id: data.id,
      version: 1,
      title: input.title,
      content: input.content,
      content_html: input.content_html || null,
      excerpt,
      author_id: user.id,
      author_name: displayName,
      change_summary: 'Initial creation',
      change_type: 'create',
    })

    return { success: true, data: transformDocumentData(data), message: '문서가 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createDocument:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: UUID,
  input: UpdateDocumentInput
): Promise<ActionResult<DocumentWithAuthor>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check ownership or admin
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('author_id, version')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return { success: false, error: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
    }

    // Get user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (doc.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Create excerpt from content
    const excerpt = input.content ? input.content.replace(/<[^>]*>/g, '').substring(0, 200) : undefined

    const updateData: Record<string, unknown> = {
      ...input,
      excerpt,
    }

    // Set published_at if status changed to published
    if (input.status === 'published') {
      updateData.published_at = new Date().toISOString()
    }

    // Increment version
    const newVersion = doc.version + 1
    updateData.version = newVersion

    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select(
        `
        id,
        module,
        title,
        content,
        content_html,
        excerpt,
        slug,
        author_id,
        status,
        visibility,
        password,
        template,
        layout,
        language,
        tags,
        categories,
        version,
        view_count,
        like_count,
        comment_count,
        is_featured,
        is_sticky,
        allow_comment,
        allow_ping,
        created_at,
        updated_at,
        published_at,
        author:profiles!documents_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    // Create version record
    const displayName = (
      await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    ).data?.display_name

    await supabase.from('document_versions').insert({
      document_id: documentId,
      version: newVersion,
      title: data.title,
      content: data.content,
      content_html: data.content_html,
      excerpt: data.excerpt,
      author_id: user.id,
      author_name: displayName,
      change_summary: input.status === 'published' ? 'Published' : 'Updated',
      change_type: input.status === 'published' ? 'publish' : 'update',
    })

    return { success: true, data: transformDocumentData(data), message: '문서가 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateDocument:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Soft delete a document
 */
export async function deleteDocument(documentId: UUID): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check ownership or admin
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('author_id')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return { success: false, error: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
    }

    // Get user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (doc.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Soft delete
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)

    if (error) {
      console.error('Error deleting document:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, message: '문서가 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deleteDocument:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Version Actions
// =====================================================

/**
 * Get version history for a document
 */
export async function getDocumentVersions(documentId: UUID): Promise<ActionResult<DocumentVersionWithAuthor[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('document_versions')
      .select(
        `
        id,
        document_id,
        version,
        title,
        content,
        content_html,
        excerpt,
        author_id,
        author_name,
        change_summary,
        change_type,
        created_at,
        author:profiles!document_versions_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('document_id', documentId)
      .order('version', { ascending: false })

    if (error) {
      console.error('Error fetching document versions:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data?.map(transformVersionData) || [] }
  } catch (error) {
    console.error('Unexpected error in getDocumentVersions:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a specific version
 */
export async function getDocumentVersion(
  documentId: UUID,
  version: number
): Promise<ActionResult<DocumentVersionWithAuthor>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('document_versions')
      .select(
        `
        id,
        document_id,
        version,
        title,
        content,
        content_html,
        excerpt,
        author_id,
        author_name,
        change_summary,
        change_type,
        created_at,
        author:profiles!document_versions_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('document_id', documentId)
      .eq('version', version)
      .single()

    if (error || !data) {
      return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND }
    }

    return { success: true, data: transformVersionData(data) }
  } catch (error) {
    console.error('Unexpected error in getDocumentVersion:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Compare two versions
 */
export async function compareDocumentVersions(
  documentId: UUID,
  oldVersion: number,
  newVersion: number
): Promise<ActionResult<DocumentVersionDiff>> {
  try {
    const supabase = await createClient()

    // Get both versions
    const [oldResult, newResult] = await Promise.all([
      getDocumentVersion(documentId, oldVersion),
      getDocumentVersion(documentId, newVersion),
    ])

    if (!oldResult.success || !oldResult.data) {
      return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND }
    }

    if (!newResult.success || !newResult.data) {
      return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND }
    }

    const oldContent = oldResult.data.content.split('\n')
    const newContent = newResult.data.content.split('\n')

    // Simple line-by-line diff
    const changes: DocumentVersionDiff['changes'] = []
    const maxLines = Math.max(oldContent.length, newContent.length)

    let additions = 0
    let deletions = 0

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldContent[i]
      const newLine = newContent[i]

      if (oldLine === undefined) {
        changes.push({ type: 'add', content: newLine, lineNumber: i + 1 })
        additions++
      } else if (newLine === undefined) {
        changes.push({ type: 'delete', content: oldLine, lineNumber: i + 1 })
        deletions++
      } else if (oldLine !== newLine) {
        changes.push({ type: 'delete', content: oldLine, lineNumber: i + 1 })
        changes.push({ type: 'add', content: newLine, lineNumber: i + 1 })
        additions++
        deletions++
      } else {
        changes.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 })
      }
    }

    return {
      success: true,
      data: {
        oldVersion: oldResult.data,
        newVersion: newResult.data,
        additions,
        deletions,
        changes,
      },
    }
  } catch (error) {
    console.error('Unexpected error in compareDocumentVersions:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Restore a document to a specific version
 */
export async function restoreDocumentVersion(
  documentId: UUID,
  version: number
): Promise<ActionResult<DocumentWithAuthor>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Get the version to restore
    const versionResult = await getDocumentVersion(documentId, version)
    if (!versionResult.success || !versionResult.data) {
      return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND }
    }

    const versionData = versionResult.data

    // Get current document
    const { data: doc } = await supabase
      .from('documents')
      .select('author_id, version')
      .eq('id', documentId)
      .single()

    if (!doc) {
      return { success: false, error: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
    }

    // Check ownership or admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (doc.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Update document with version content
    const newVersion = doc.version + 1

    const { data, error } = await supabase
      .from('documents')
      .update({
        title: versionData.title,
        content: versionData.content,
        content_html: versionData.content_html,
        excerpt: versionData.excerpt,
        version: newVersion,
      })
      .eq('id', documentId)
      .select(
        `
        id,
        module,
        title,
        content,
        content_html,
        excerpt,
        slug,
        author_id,
        status,
        visibility,
        password,
        template,
        layout,
        language,
        tags,
        categories,
        version,
        view_count,
        like_count,
        comment_count,
        is_featured,
        is_sticky,
        allow_comment,
        allow_ping,
        created_at,
        updated_at,
        published_at,
        author:profiles!documents_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error) {
      console.error('Error restoring document:', error)
      return { success: false, error: ERROR_MESSAGES.RESTORE_FAILED }
    }

    // Create version record for restore
    const displayName = (
      await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    ).data?.display_name

    await supabase.from('document_versions').insert({
      document_id: documentId,
      version: newVersion,
      title: versionData.title,
      content: versionData.content,
      content_html: versionData.content_html,
      excerpt: versionData.excerpt,
      author_id: user.id,
      author_name: displayName,
      change_summary: `Restored from version ${version}`,
      change_type: 'restore',
    })

    return { success: true, data: transformDocumentData(data), message: '문서가 복원되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in restoreDocumentVersion:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
