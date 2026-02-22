'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'
import type { Comment, CommentInsert, CommentUpdate, CommentStatus } from '@/lib/supabase/database.types'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  POST_NOT_FOUND: '게시글을 찾을 수 없습니다.',
  COMMENT_NOT_FOUND: '댓글을 찾을 수 없습니다.',
  POST_LOCKED: '댓글 작성이 제한된 게시글입니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Comment Actions
// =====================================================

/**
 * Create a new comment
 */
export async function createComment(data: CommentInsert): Promise<ActionResult<Comment>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if post allows comments
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('allow_comment, is_locked')
      .eq('id', data.post_id)
      .single()

    if (postError || !post) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    if (!post.allow_comment || post.is_locked) {
      return { success: false, error: ERROR_MESSAGES.POST_LOCKED }
    }

    // Get author display name
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

    // Calculate depth and path for threaded comments
    let depth = 0
    let path = ''
    let orderIndex = 0

    if (data.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('comments')
        .select('depth, path')
        .eq('id', data.parent_id)
        .single()

      if (!parentError && parent) {
        depth = parent.depth + 1
        path = parent.path ? `${parent.path}/${data.parent_id}` : data.parent_id
      }
    } else {
      // Get max order_index for root comments
      const { data: lastComment } = await supabase
        .from('comments')
        .select('order_index')
        .eq('post_id', data.post_id)
        .is('parent_id', null)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      orderIndex = (lastComment?.order_index || 0) + 1
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: data.post_id,
        parent_id: data.parent_id || null,
        author_id: user.id,
        author_name: profile?.display_name || null,
        content: data.content,
        content_html: data.content_html || null,
        is_secret: data.is_secret || false,
        depth,
        path,
        order_index: orderIndex,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data: comment as Comment, message: '댓글이 등록되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a comment
 */
export async function updateComment(id: UUID, data: CommentUpdate): Promise<ActionResult<Comment>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check ownership
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single()

    if (commentError || !comment) {
      return { success: false, error: ERROR_MESSAGES.COMMENT_NOT_FOUND }
    }

    if (comment.author_id !== user.id) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: updatedComment as Comment, message: '댓글이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(id: UUID): Promise<ActionResult> {
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
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single()

    if (commentError || !comment) {
      return { success: false, error: ERROR_MESSAGES.COMMENT_NOT_FOUND }
    }

    // Get user role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    if (comment.author_id !== user.id && !isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Soft delete
    const { error } = await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', id)

    if (error) {
      console.error('Error deleting comment:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, message: '댓글이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deleteComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get comments for a post
 */
export async function getComments(postId: UUID, status: CommentStatus = 'visible'): Promise<ActionResult<Comment[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Build comment tree
    const commentMap = new Map<string, Comment & { children?: Comment[] }>()
    const rootComments: (Comment & { children?: Comment[] })[] = []

    const comments = (data || []) as (Comment & { children?: Comment[] })[]

    comments.forEach((comment) => {
      comment.children = []
      commentMap.set(comment.id, comment)
    })

    commentMap.forEach((comment) => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)!.children!.push(comment)
      } else {
        rootComments.push(comment)
      }
    })

    return { success: true, data: rootComments }
  } catch (error) {
    console.error('Unexpected error in getComments:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Vote for a comment (up or down)
 */
export async function voteComment(
  commentId: UUID,
  voteType: 'up' | 'down'
): Promise<ActionResult<{ vote_count: number; vote_type: 'up' | 'down' | null; has_voted: boolean }>> {
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
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      // Remove existing vote
      await supabase.from('votes').delete().eq('id', existingVote.id)

      // Decrement vote count
      await supabase.rpc('decrement_vote_count', {
        table_name: 'comments',
        row_id: commentId,
        count_field: existingVote.vote_type === 'up' ? 'vote_count' : 'blamed_count',
      })

      // Get updated count
      const { data: comment } = await supabase.from('comments').select('vote_count').eq('id', commentId).single()

      return {
        success: true,
        data: {
          vote_count: comment?.vote_count || 0,
          vote_type: null,
          has_voted: false,
        },
      }
    }

    // Create new vote
    const { error: voteError } = await supabase.from('votes').insert({
      target_type: 'comment',
      target_id: commentId,
      user_id: user.id,
      vote_type: voteType,
    })

    if (voteError) {
      console.error('Error creating vote:', voteError)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Increment vote count
    await supabase.rpc('increment_vote_count', {
      table_name: 'comments',
      row_id: commentId,
      count_field: voteType === 'up' ? 'vote_count' : 'blamed_count',
    })

    // Get updated count
    const { data: comment } = await supabase.from('comments').select('vote_count').eq('id', commentId).single()

    return {
      success: true,
      data: {
        vote_count: comment?.vote_count || 0,
        vote_type: voteType,
        has_voted: true,
      },
      message: voteType === 'up' ? '추천했습니다.' : '비추천했습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in voteComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
