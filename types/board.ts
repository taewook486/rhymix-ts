// Board module type definitions

import type { UUID, TIMESTAMPTZ, PostStatus, CommentStatus } from '@/lib/supabase/database.types'

// =====================================================
// Query Parameter Types
// =====================================================

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  category_id?: UUID
  author_id?: UUID
  status?: PostStatus
  is_notice?: boolean
  is_secret?: boolean
  tags?: string[]
  sort?: 'created_at' | 'updated_at' | 'view_count' | 'vote_count' | 'comment_count'
  order?: 'asc' | 'desc'
  date_from?: TIMESTAMPTZ
  date_to?: TIMESTAMPTZ
}

export interface CommentQueryParams {
  page?: number
  limit?: number
  status?: CommentStatus
  is_secret?: boolean
}

// =====================================================
// Input Types for Mutations
// =====================================================

export interface CreatePostInput {
  board_id: UUID
  category_id?: UUID
  title: string
  content: string
  content_html?: string
  excerpt?: string
  tags?: string[]
  is_secret?: boolean
  is_notice?: boolean
  status?: PostStatus
  visibility?: 'all' | 'member' | 'admin' | 'only_me'
  allow_comment?: boolean
  notify_message?: boolean
}

export interface UpdatePostInput {
  title?: string
  content?: string
  content_html?: string
  excerpt?: string
  category_id?: UUID | null
  tags?: string[]
  is_secret?: boolean
  is_notice?: boolean
  status?: PostStatus
  visibility?: 'all' | 'member' | 'admin' | 'only_me'
  allow_comment?: boolean
  notify_message?: boolean
}

export interface CreateCommentInput {
  post_id: UUID
  parent_id?: UUID
  content: string
  content_html?: string
  is_secret?: boolean
}

export interface UpdateCommentInput {
  content?: string
  content_html?: string
  is_secret?: boolean
  status?: CommentStatus
}

export interface CreateCategoryInput {
  board_id: UUID
  parent_id?: UUID
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  order_index?: number
}

export interface UpdateCategoryInput {
  name?: string
  slug?: string
  description?: string
  icon?: string
  color?: string
  order_index?: number
  is_hidden?: boolean
  is_locked?: boolean
}

// =====================================================
// Response Types
// =====================================================

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PostWithAuthor {
  id: UUID
  board_id: UUID
  category_id: UUID | null
  author_id: UUID | null
  author_name: string | null
  title: string
  content: string
  excerpt: string | null
  status: PostStatus
  is_notice: boolean
  is_secret: boolean
  view_count: number
  vote_count: number
  comment_count: number
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  published_at: TIMESTAMPTZ | null
  author?: {
    id: UUID
    display_name: string | null
    avatar_url: string | null
  } | null
  category?: {
    id: UUID
    name: string
    slug: string
  } | null
}

export interface CommentWithAuthor {
  id: UUID
  post_id: UUID
  parent_id: UUID | null
  author_id: UUID | null
  author_name: string | null
  content: string
  status: CommentStatus
  is_secret: boolean
  vote_count: number
  depth: number
  path: string
  order_index: number
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  author?: {
    id: UUID
    display_name: string | null
    avatar_url: string | null
  } | null
  author_array?: {
    id: UUID
    display_name: string | null
    avatar_url: string | null
  }[]
  children?: CommentWithAuthor[]
}

export interface CategoryWithChildren {
  id: UUID
  board_id: UUID
  parent_id: UUID | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  order_index: number
  depth: number
  post_count: number
  is_hidden: boolean
  is_locked: boolean
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  children?: CategoryWithChildren[]
}

export interface VoteResult {
  vote_count: number
  vote_type: 'up' | 'down' | null
  has_voted: boolean
}
