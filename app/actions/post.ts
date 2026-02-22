'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'
import type { Post, PostInsert, PostUpdate, PostStatus, PostVisibility } from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  POST_NOT_FOUND: '게시글을 찾을 수 없습니다.',
  BOARD_NOT_FOUND: '게시판을 찾을 수 없습니다.',
  BOARD_LOCKED: '게시판이 잠겨있습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Post Filter Types
// =====================================================

export interface PostFilters {
  board_id?: UUID
  category_id?: UUID
  author_id?: UUID
  status?: PostStatus
  visibility?: PostVisibility
  is_notice?: boolean
  is_secret?: boolean
  tags?: string[]
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  sort?: 'created_at' | 'updated_at' | 'view_count' | 'vote_count' | 'comment_count'
  order?: 'asc' | 'desc'
}

// =====================================================
// Post Actions
// =====================================================

/**
 * Create a new post
 */
export async function createPost(data: PostInsert): Promise<ActionResult<Post>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if board is locked
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('is_locked')
      .eq('id', data.board_id)
      .single()

    if (boardError || !board) {
      return { success: false, error: ERROR_MESSAGES.BOARD_NOT_FOUND }
    }

    if (board.is_locked) {
      return { success: false, error: ERROR_MESSAGES.BOARD_LOCKED }
    }

    // Get author display name
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

    // Create excerpt from content
    const excerpt = data.excerpt || (data.content ? data.content.replace(/<[^>]*>/g, '').substring(0, 200) : '')

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        board_id: data.board_id,
        category_id: data.category_id || null,
        author_id: user.id,
        author_name: profile?.display_name || null,
        title: data.title,
        content: data.content,
        content_html: data.content_html || null,
        excerpt,
        status: data.status || 'published',
        visibility: data.visibility || 'all',
        is_secret: data.is_secret || false,
        is_notice: data.is_notice || false,
        tags: data.tags || [],
        allow_comment: data.allow_comment !== false,
        notify_message: data.notify_message || false,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Update board post count via RPC
    await supabase.rpc('increment_board_post_count', { board_uuid: data.board_id })

    return { success: true, data: post as Post, message: '게시글이 등록되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createPost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a post
 */
export async function updatePost(id: UUID, data: PostUpdate): Promise<ActionResult<Post>> {
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
    const { data: post, error: postError } = await supabase.from('posts').select('author_id').eq('id', id).single()

    if (postError || !post) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    // Get user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (post.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Create excerpt from content if content is updated
    const updateData: Record<string, unknown> = { ...data }
    if (data.content) {
      updateData.excerpt = data.excerpt || data.content.replace(/<[^>]*>/g, '').substring(0, 200)
    }

    // Set published_at if status changed to published
    if (data.status === 'published') {
      updateData.published_at = new Date().toISOString()
    }

    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating post:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: updatedPost as Post, message: '게시글이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updatePost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a post (soft delete)
 */
export async function deletePost(id: UUID): Promise<ActionResult> {
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
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, board_id')
      .eq('id', id)
      .single()

    if (postError || !post) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    // Get user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (post.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Soft delete
    const { error } = await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', id)

    if (error) {
      console.error('Error deleting post:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    // Update board post count via RPC
    await supabase.rpc('decrement_board_post_count', { board_uuid: post.board_id })

    return { success: true, message: '게시글이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deletePost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get posts with filters
 */
export async function getPosts(filters: PostFilters = {}): Promise<ActionResult<Post[]>> {
  try {
    const supabase = await createClient()
    const {
      board_id,
      category_id,
      author_id,
      status = 'published',
      visibility,
      is_notice,
      is_secret,
      tags,
      search,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
    } = filters

    const offset = (page - 1) * limit

    let query = supabase
      .from('posts')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)

    // Apply filters
    if (board_id) {
      query = query.eq('board_id', board_id)
    }

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (visibility) {
      query = query.eq('visibility', visibility)
    }

    if (typeof is_notice === 'boolean') {
      query = query.eq('is_notice', is_notice)
    }

    if (typeof is_secret === 'boolean') {
      query = query.eq('is_secret', is_secret)
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
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

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (data || []) as Post[] }
  } catch (error) {
    console.error('Unexpected error in getPosts:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a post by ID
 */
export async function getPostById(id: UUID): Promise<ActionResult<Post>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('posts').select('*').eq('id', id).is('deleted_at', null).single()

    if (error || !data) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    return { success: true, data: data as Post }
  } catch (error) {
    console.error('Unexpected error in getPostById:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Increment view count for a post
 */
export async function incrementViewCount(postId: UUID): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Use RPC function to increment view count atomically
    const { error } = await supabase.rpc('increment_view_count', {
      table_name: 'posts',
      row_id: postId,
    })

    if (error) {
      console.error('Error incrementing view count:', error)
      // Don't return error to user, this is a non-critical operation
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in incrementViewCount:', error)
    return { success: true } // Don't fail the request for this
  }
}

/**
 * Vote for a post (up or down)
 */
export async function votePost(postId: UUID, voteType: 'up' | 'down'): Promise<ActionResult<{ vote_count: number; vote_type: 'up' | 'down' | null; has_voted: boolean }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      // Remove existing vote
      await supabase.from('votes').delete().eq('id', existingVote.id)

      // Decrement vote count
      await supabase.rpc('decrement_vote_count', {
        table_name: 'posts',
        row_id: postId,
        count_field: existingVote.vote_type === 'up' ? 'vote_count' : 'blamed_count',
      })

      // Get updated count
      const { data: post } = await supabase.from('posts').select('vote_count').eq('id', postId).single()

      return {
        success: true,
        data: {
          vote_count: post?.vote_count || 0,
          vote_type: null,
          has_voted: false,
        },
      }
    }

    // Create new vote
    const { error: voteError } = await supabase.from('votes').insert({
      target_type: 'post',
      target_id: postId,
      user_id: user.id,
      vote_type: voteType,
    })

    if (voteError) {
      console.error('Error creating vote:', voteError)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Increment vote count
    await supabase.rpc('increment_vote_count', {
      table_name: 'posts',
      row_id: postId,
      count_field: voteType === 'up' ? 'vote_count' : 'blamed_count',
    })

    // Get updated count
    const { data: post } = await supabase.from('posts').select('vote_count').eq('id', postId).single()

    return {
      success: true,
      data: {
        vote_count: post?.vote_count || 0,
        vote_type: voteType,
        has_voted: true,
      },
      message: voteType === 'up' ? '추천했습니다.' : '비추천했습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in votePost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
