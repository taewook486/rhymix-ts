'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyCaptcha } from '@/lib/captcha'
import { createHash } from 'crypto'
import type { UUID } from '@/lib/supabase/database.types'
import type {
  QueryParams,
  CommentQueryParams,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ActionResult,
  PaginatedResponse,
  PostWithAuthor,
  CommentWithAuthor,
  CategoryWithChildren,
  VoteResult,
  BoardConfig,
} from '@/types/board'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  BOARD_NOT_FOUND: '게시판을 찾을 수 없습니다.',
  POST_NOT_FOUND: '게시글을 찾을 수 없습니다.',
  COMMENT_NOT_FOUND: '댓글을 찾을 수 없습니다.',
  CATEGORY_NOT_FOUND: '카테고리를 찾을 수 없습니다.',
  BOARD_LOCKED: '게시판이 잠겨있습니다.',
  POST_LOCKED: '댓글 작성이 제한된 게시글입니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '생성에 실패했습니다.',
  UPDATE_FAILED: '수정에 실패했습니다.',
  DELETE_FAILED: '삭제에 실패했습니다.',
  ALREADY_VOTED: '이미 투표하셨습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Transform Supabase join result to extract single object from array
 * Supabase returns foreign key joins as arrays, so we need to extract the first element
 */
function transformPostData(post: any): PostWithAuthor {
  return {
    ...post,
    author: Array.isArray(post.author) ? post.author[0] || null : post.author,
    category: Array.isArray(post.category) ? post.category[0] || null : post.category,
  }
}

function transformCommentData(comment: any): CommentWithAuthor {
  return {
    ...comment,
    author: Array.isArray(comment.author) ? comment.author[0] || null : comment.author,
  }
}

// =====================================================
// Post Actions
// =====================================================

/**
 * Get paginated posts for a board
 */
export async function getPosts(
  boardId: UUID,
  params: QueryParams = {}
): Promise<ActionResult<PaginatedResponse<PostWithAuthor>>> {
  try {
    const supabase = await createClient()
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      author_id,
      status = 'published',
      is_notice,
      is_secret,
      tags,
      sort = 'created_at',
      order = 'desc',
      date_from,
      date_to,
    } = params

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        board_id,
        category_id,
        author_id,
        author_name,
        title,
        content,
        excerpt,
        status,
        is_notice,
        is_secret,
        view_count,
        vote_count,
        comment_count,
        created_at,
        updated_at,
        published_at,
        author:profiles!posts_author_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        category:categories (
          id,
          name,
          slug
        )
      `,
        { count: 'exact' }
      )
      .eq('board_id', boardId)
      .eq('status', status)
      .is('deleted_at', null)

    // Apply filters
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (author_id) {
      query = query.eq('author_id', author_id)
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

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: {
        data: data?.map(transformPostData) || [],
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
    console.error('Unexpected error in getPosts:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a single post with details
 */
export async function getPost(postId: UUID): Promise<ActionResult<PostWithAuthor>> {
  try {
    const supabase = await createClient()

    // Increment view count
    await supabase.rpc('increment_view_count', {
      table_name: 'posts',
      row_id: postId,
    })

    const { data, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        board_id,
        category_id,
        author_id,
        author_name,
        title,
        content,
        excerpt,
        status,
        is_notice,
        is_secret,
        view_count,
        vote_count,
        comment_count,
        created_at,
        updated_at,
        published_at,
        author:profiles!posts_author_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        category:categories (
          id,
          name,
          slug
        )
      `
      )
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    return { success: true, data: transformPostData(data) }
  } catch (error) {
    console.error('Unexpected error in getPost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new post
 */
export async function createPost(input: CreatePostInput): Promise<ActionResult<PostWithAuthor>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get board configuration
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('is_locked, config')
      .eq('id', input.board_id)
      .single()

    if (boardError || !board) {
      return { success: false, error: ERROR_MESSAGES.BOARD_NOT_FOUND }
    }

    if (board.is_locked) {
      return { success: false, error: ERROR_MESSAGES.BOARD_LOCKED }
    }

    const config = (board.config as BoardConfig) || {}
    const allowAnonymous = config.allow_anonymous || false
    const allowCaptcha = config.allow_captcha || false

    // Handle guest posting
    if (!user) {
      // Check if guest posting is allowed
      if (!allowAnonymous) {
        return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
      }

      // Verify captcha if required
      if (allowCaptcha && input.captcha_token && input.captcha_answer) {
        const isCaptchaValid = verifyCaptcha(input.captcha_token, input.captcha_answer)
        if (!isCaptchaValid) {
          return { success: false, error: '캡차 인증에 실패했습니다. 다시 시도해주세요.' }
        }
      } else if (allowCaptcha) {
        return { success: false, error: '캡차 인증이 필요합니다.' }
      }

      // Validate guest name and password
      if (!input.guest_name || input.guest_name.trim().length < 2) {
        return { success: false, error: '이름을 2자 이상 입력해주세요.' }
      }
      if (!input.guest_password || input.guest_password.length < 4) {
        return { success: false, error: '비밀번호를 4자 이상 입력해주세요.' }
      }
    }

    // Create excerpt from content
    const excerpt = input.excerpt || input.content.replace(/<[^>]*>/g, '').substring(0, 200)

    // Hash guest password if provided
    const guestPasswordHash = input.guest_password
      ? createHash('sha256').update(input.guest_password).digest('hex')
      : null

    const insertData: Record<string, unknown> = {
      board_id: input.board_id,
      category_id: input.category_id || null,
      author_id: user?.id || null,
      author_name: user
        ? (await supabase.from('profiles').select('display_name').eq('id', user.id).single())
            .data?.display_name
        : input.guest_name,
      author_password: guestPasswordHash,
      title: input.title,
      content: input.content,
      content_html: input.content_html || null,
      excerpt,
      status: input.status || 'published',
      visibility: input.visibility || 'all',
      is_secret: input.is_secret || false,
      is_notice: input.is_notice || false,
      tags: input.tags || [],
      allow_comment: input.allow_comment !== false,
      notify_message: input.notify_message || false,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
      ip_address: null, // IP would be captured at edge level
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select(
        `
        id,
        board_id,
        category_id,
        author_id,
        author_name,
        title,
        content,
        excerpt,
        status,
        is_notice,
        is_secret,
        view_count,
        vote_count,
        comment_count,
        created_at,
        updated_at,
        published_at,
        author:profiles!posts_author_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        category:categories (
          id,
          name,
          slug
        )
      `
      )
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Update board post count
    await supabase.rpc('increment_board_post_count', { board_uuid: input.board_id })

    return { success: true, data: transformPostData(data), message: '게시글이 등록되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createPost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a post
 */
export async function updatePost(
  postId: UUID,
  input: UpdatePostInput
): Promise<ActionResult<PostWithAuthor>> {
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
      .eq('id', postId)
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

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select(
        `
        id,
        board_id,
        category_id,
        author_id,
        author_name,
        title,
        content,
        excerpt,
        status,
        is_notice,
        is_secret,
        view_count,
        vote_count,
        comment_count,
        created_at,
        updated_at,
        published_at,
        author:profiles!posts_author_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        category:categories (
          id,
          name,
          slug
        )
      `
      )
      .single()

    if (error) {
      console.error('Error updating post:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: transformPostData(data), message: '게시글이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updatePost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Soft delete a post
 */
export async function deletePost(postId: UUID): Promise<ActionResult> {
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
      .eq('id', postId)
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
    const { error } = await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    // Update board post count
    await supabase.rpc('decrement_board_post_count', { board_uuid: post.board_id })

    return { success: true, message: '게시글이 삭제되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in deletePost:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Comment Actions
// =====================================================

/**
 * Get comments for a post
 */
export async function getComments(
  postId: UUID,
  params: CommentQueryParams = {}
): Promise<ActionResult<CommentWithAuthor[]>> {
  try {
    const supabase = await createClient()
    const { status = 'visible' } = params

    const { data, error } = await supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        parent_id,
        author_id,
        author_name,
        content,
        status,
        is_secret,
        vote_count,
        depth,
        path,
        order_index,
        created_at,
        updated_at,
        author:profiles!comments_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('post_id', postId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Build comment tree
    const commentMap = new Map<string, CommentWithAuthor>()
    const rootComments: CommentWithAuthor[] = []

    const transformedComments = (data || []).map(transformCommentData)

    transformedComments.forEach((comment) => {
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
 * Create a comment
 */
export async function createComment(input: CreateCommentInput): Promise<ActionResult<CommentWithAuthor>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if post allows comments and get board config for guest posting
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        allow_comment,
        is_locked,
        board:boards (
          config
        )
      `)
      .eq('id', input.post_id)
      .single()

    if (postError || !post) {
      return { success: false, error: ERROR_MESSAGES.POST_NOT_FOUND }
    }

    if (!post.allow_comment || post.is_locked) {
      return { success: false, error: ERROR_MESSAGES.POST_LOCKED }
    }

    const boardConfig = ((post.board as any)?.config as BoardConfig) || {}
    const allowAnonymous = boardConfig.allow_anonymous || false
    const allowCaptcha = boardConfig.allow_captcha || false

    // Handle guest commenting
    if (!user) {
      // Check if guest commenting is allowed
      if (!allowAnonymous) {
        return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
      }

      // Verify captcha if required
      if (allowCaptcha && input.captcha_token && input.captcha_answer) {
        const isCaptchaValid = verifyCaptcha(input.captcha_token, input.captcha_answer)
        if (!isCaptchaValid) {
          return { success: false, error: '캡차 인증에 실패했습니다. 다시 시도해주세요.' }
        }
      } else if (allowCaptcha) {
        return { success: false, error: '캡차 인증이 필요합니다.' }
      }

      // Validate guest name and password
      if (!input.guest_name || input.guest_name.trim().length < 2) {
        return { success: false, error: '이름을 2자 이상 입력해주세요.' }
      }
      if (!input.guest_password || input.guest_password.length < 4) {
        return { success: false, error: '비밀번호를 4자 이상 입력해주세요.' }
      }
    }

    // Calculate depth and path for threaded comments
    let depth = 0
    let path = ''
    let orderIndex = 0

    if (input.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('comments')
        .select('depth, path')
        .eq('id', input.parent_id)
        .single()

      if (!parentError && parent) {
        depth = parent.depth + 1
        path = parent.path ? `${parent.path}/${input.parent_id}` : input.parent_id
      }
    } else {
      // Get max order_index for root comments
      const { data: lastComment } = await supabase
        .from('comments')
        .select('order_index')
        .eq('post_id', input.post_id)
        .is('parent_id', null)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      orderIndex = (lastComment?.order_index || 0) + 1
    }

    // Hash guest password if provided
    const guestPasswordHash = input.guest_password
      ? createHash('sha256').update(input.guest_password).digest('hex')
      : null

    const insertData: Record<string, unknown> = {
      post_id: input.post_id,
      parent_id: input.parent_id || null,
      author_id: user?.id || null,
      author_name: user
        ? (await supabase.from('profiles').select('display_name').eq('id', user.id).single()).data?.display_name
        : input.guest_name,
      author_password: guestPasswordHash,
      content: input.content,
      content_html: input.content_html || null,
      is_secret: input.is_secret || false,
      depth,
      path,
      order_index: orderIndex,
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select(
        `
        id,
        post_id,
        parent_id,
        author_id,
        author_name,
        content,
        status,
        is_secret,
        vote_count,
        depth,
        path,
        order_index,
        created_at,
        updated_at,
        author:profiles!comments_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data: transformCommentData(data), message: '댓글이 등록되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: UUID,
  input: UpdateCommentInput
): Promise<ActionResult<CommentWithAuthor>> {
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
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return { success: false, error: ERROR_MESSAGES.COMMENT_NOT_FOUND }
    }

    if (comment.author_id !== user.id) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { data, error } = await supabase
      .from('comments')
      .update(input)
      .eq('id', commentId)
      .select(
        `
        id,
        post_id,
        parent_id,
        author_id,
        author_name,
        content,
        status,
        is_secret,
        vote_count,
        depth,
        path,
        order_index,
        created_at,
        updated_at,
        author:profiles!comments_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: transformCommentData(data) as CommentWithAuthor, message: '댓글이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateComment:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: UUID): Promise<ActionResult> {
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
      .eq('id', commentId)
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
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)

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

// =====================================================
// Category Actions
// =====================================================

/**
 * Get categories for a board
 */
export async function getCategories(boardId: UUID): Promise<ActionResult<CategoryWithChildren[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Build category tree
    const categoryMap = new Map<string, CategoryWithChildren>()
    const rootCategories: CategoryWithChildren[] = []

    ;(data as CategoryWithChildren[]).forEach((category) => {
      category.children = []
      categoryMap.set(category.id, category)
    })

    categoryMap.forEach((category) => {
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        categoryMap.get(category.parent_id)!.children!.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    return { success: true, data: rootCategories }
  } catch (error) {
    console.error('Unexpected error in getCategories:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a category
 */
export async function createCategory(input: CreateCategoryInput): Promise<ActionResult<CategoryWithChildren>> {
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

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Calculate depth and path for hierarchical categories
    let depth = 0
    let path = ''

    if (input.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('depth, path')
        .eq('id', input.parent_id)
        .single()

      if (!parentError && parent) {
        depth = parent.depth + 1
        path = parent.path ? `${parent.path}/${input.parent_id}` : input.parent_id
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        board_id: input.board_id,
        parent_id: input.parent_id || null,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        icon: input.icon || null,
        color: input.color || null,
        order_index: input.order_index || 0,
        depth,
        path,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return {
      success: true,
      data: { ...(data as CategoryWithChildren), children: [] },
      message: '카테고리가 생성되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in createCategory:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a category
 */
export async function updateCategory(
  categoryId: UUID,
  input: UpdateCategoryInput
): Promise<ActionResult<CategoryWithChildren>> {
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

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const { data, error } = await supabase
      .from('categories')
      .update(input)
      .eq('id', categoryId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return {
      success: true,
      data: { ...(data as CategoryWithChildren), children: [] },
      message: '카테고리가 수정되었습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in updateCategory:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Vote Actions
// =====================================================

/**
 * Toggle vote for a post or comment
 */
export async function toggleVote(
  targetType: 'post' | 'comment',
  targetId: UUID,
  voteType: 'up' | 'down' = 'up'
): Promise<ActionResult<VoteResult>> {
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
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      // Remove existing vote
      await supabase.from('votes').delete().eq('id', existingVote.id)

      // Decrement vote count
      const countField = existingVote.vote_type === 'up' ? 'vote_count' : 'blamed_count'
      await supabase.rpc('decrement_vote_count', {
        table_name: targetType === 'post' ? 'posts' : 'comments',
        row_id: targetId,
        count_field: countField,
      })

      // Get updated count
      const { data: target } = await supabase
        .from(targetType === 'post' ? 'posts' : 'comments')
        .select('vote_count')
        .eq('id', targetId)
        .single()

      return {
        success: true,
        data: {
          vote_count: target?.vote_count || 0,
          vote_type: null,
          has_voted: false,
        },
      }
    }

    // Create new vote
    const { error: voteError } = await supabase.from('votes').insert({
      target_type: targetType,
      target_id: targetId,
      user_id: user.id,
      vote_type: voteType,
    })

    if (voteError) {
      console.error('Error creating vote:', voteError)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    // Increment vote count
    const countField = voteType === 'up' ? 'vote_count' : 'blamed_count'
    await supabase.rpc('increment_vote_count', {
      table_name: targetType === 'post' ? 'posts' : 'comments',
      row_id: targetId,
      count_field: countField,
    })

    // Get updated count
    const { data: target } = await supabase
      .from(targetType === 'post' ? 'posts' : 'comments')
      .select('vote_count')
      .eq('id', targetId)
      .single()

    return {
      success: true,
      data: {
        vote_count: target?.vote_count || 0,
        vote_type: voteType,
        has_voted: true,
      },
      message: voteType === 'up' ? '추천했습니다.' : '비추천했습니다.',
    }
  } catch (error) {
    console.error('Unexpected error in toggleVote:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Board Management Actions
// =====================================================

export interface BoardFilters {
  is_hidden?: boolean
  is_notice?: boolean
  is_locked?: boolean
  search?: string
}

/**
 * Create a new board
 */
export async function createBoard(input: {
  slug: string
  title: string
  description?: string
  content?: string
  icon?: string
  banner_url?: string
  config?: Record<string, unknown>
  skin?: string
  list_order?: string
  sort_order?: string
  is_notice?: boolean
  is_hidden?: boolean
  is_locked?: boolean
  is_secret?: boolean
  admin_id?: string
}): Promise<ActionResult<{ id: UUID; slug: string; title: string }>> {
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

    // Check if slug already exists
    const { data: existingBoard } = await supabase.from('boards').select('id').eq('slug', input.slug).single()

    if (existingBoard) {
      return { success: false, error: '이미 존재하는 게시판 슬러그입니다.' }
    }

    const { data, error } = await supabase
      .from('boards')
      .insert({
        slug: input.slug,
        title: input.title,
        description: input.description || null,
        content: input.content || null,
        icon: input.icon || null,
        banner_url: input.banner_url || null,
        config: input.config || {},
        skin: input.skin || 'default',
        list_order: input.list_order || 'latest',
        sort_order: input.sort_order || 'desc',
        is_notice: input.is_notice || false,
        is_hidden: input.is_hidden || false,
        is_locked: input.is_locked || false,
        is_secret: input.is_secret || false,
        admin_id: input.admin_id || user.id,
      })
      .select('id, slug, title')
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data: data as { id: UUID; slug: string; title: string }, message: '게시판이 생성되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in createBoard:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update a board
 */
export async function updateBoard(
  boardId: UUID,
  input: {
    title?: string
    description?: string
    content?: string
    icon?: string
    banner_url?: string
    config?: Record<string, unknown>
    skin?: string
    list_order?: string
    sort_order?: string
    is_notice?: boolean
    is_hidden?: boolean
    is_locked?: boolean
    is_secret?: boolean
    admin_id?: string
  }
): Promise<ActionResult<{ id: UUID; slug: string; title: string }>> {
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

    const { data, error } = await supabase
      .from('boards')
      .update(input)
      .eq('id', boardId)
      .select('id, slug, title')
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data: data as { id: UUID; slug: string; title: string }, message: '게시판이 수정되었습니다.' }
  } catch (error) {
    console.error('Unexpected error in updateBoard:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a board (soft delete)
 */
export async function deleteBoard(boardId: UUID): Promise<ActionResult> {
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

    // Soft delete
    const { error } = await supabase.from('boards').update({ deleted_at: new Date().toISOString() }).eq('id', boardId)

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

/**
 * Get all boards with optional filters
 */
export async function getBoards(filters: BoardFilters = {}): Promise<ActionResult<Array<{
  id: UUID
  slug: string
  title: string
  description: string | null
  icon: string | null
  banner_url: string | null
  post_count: number
  comment_count: number
  is_notice: boolean
  is_hidden: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
}>>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('boards')
      .select(`
        id,
        slug,
        title,
        description,
        icon,
        banner_url,
        post_count,
        comment_count,
        is_notice,
        is_hidden,
        is_locked,
        created_at,
        updated_at
      `)
      .is('deleted_at', null)
      .order('title', { ascending: true })

    // Apply filters
    if (typeof filters.is_hidden === 'boolean') {
      query = query.eq('is_hidden', filters.is_hidden)
    }

    if (typeof filters.is_notice === 'boolean') {
      query = query.eq('is_notice', filters.is_notice)
    }

    if (typeof filters.is_locked === 'boolean') {
      query = query.eq('is_locked', filters.is_locked)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching boards:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error in getBoards:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a board by slug
 */
export async function getBoardBySlug(slug: string): Promise<ActionResult<{
  id: UUID
  slug: string
  title: string
  description: string | null
  content: string | null
  icon: string | null
  banner_url: string | null
  config: Record<string, unknown>
  skin: string
  list_order: string
  sort_order: string
  view_count: number
  post_count: number
  comment_count: number
  is_notice: boolean
  is_hidden: boolean
  is_locked: boolean
  is_secret: boolean
  admin_id: UUID | null
  created_at: string
  updated_at: string
}>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return { success: false, error: ERROR_MESSAGES.BOARD_NOT_FOUND }
    }

    return { success: true, data: data as typeof data & { config: Record<string, unknown> } }
  } catch (error) {
    console.error('Unexpected error in getBoardBySlug:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
