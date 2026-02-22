// Document module type definitions

import type {
  UUID,
  TIMESTAMPTZ,
  DocumentStatus,
  DocumentVisibility,
  DocumentVersionChangeType,
} from '@/lib/supabase/database.types'

// =====================================================
// Query Parameter Types
// =====================================================

export interface DocumentQueryParams {
  page?: number
  limit?: number
  search?: string
  module?: string
  author_id?: UUID
  status?: DocumentStatus
  visibility?: DocumentVisibility
  language?: string
  tags?: string[]
  categories?: string[]
  is_featured?: boolean
  is_sticky?: boolean
  sort?: 'created_at' | 'updated_at' | 'published_at' | 'view_count' | 'like_count' | 'title'
  order?: 'asc' | 'desc'
  date_from?: TIMESTAMPTZ
  date_to?: TIMESTAMPTZ
}

// =====================================================
// Input Types for Mutations
// =====================================================

export interface CreateDocumentInput {
  module: string
  title: string
  content: string
  content_html?: string
  excerpt?: string
  slug?: string
  template?: string
  layout?: string
  language?: string
  tags?: string[]
  categories?: string[]
  status?: DocumentStatus
  visibility?: DocumentVisibility
  password?: string
  is_featured?: boolean
  is_sticky?: boolean
  allow_comment?: boolean
  allow_ping?: boolean
}

export interface UpdateDocumentInput {
  title?: string
  content?: string
  content_html?: string
  excerpt?: string
  slug?: string
  template?: string
  layout?: string
  language?: string
  tags?: string[]
  categories?: string[]
  status?: DocumentStatus
  visibility?: DocumentVisibility
  password?: string
  is_featured?: boolean
  is_sticky?: boolean
  allow_comment?: boolean
  allow_ping?: boolean
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

export interface DocumentWithAuthor {
  id: UUID
  module: string
  title: string
  content: string
  content_html: string | null
  excerpt: string | null
  slug: string | null
  author_id: UUID | null
  status: DocumentStatus
  visibility: DocumentVisibility
  password: string | null
  template: string
  layout: string
  language: string
  tags: string[]
  categories: string[]
  version: number
  view_count: number
  like_count: number
  comment_count: number
  is_featured: boolean
  is_sticky: boolean
  allow_comment: boolean
  allow_ping: boolean
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  published_at: TIMESTAMPTZ | null
  author?: {
    id: UUID
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface DocumentVersionWithAuthor {
  id: UUID
  document_id: UUID
  version: number
  title: string
  content: string
  content_html: string | null
  excerpt: string | null
  author_id: UUID | null
  author_name: string | null
  change_summary: string | null
  change_type: DocumentVersionChangeType
  created_at: TIMESTAMPTZ
  author?: {
    id: UUID
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface DocumentVersionDiff {
  oldVersion: DocumentVersionWithAuthor
  newVersion: DocumentVersionWithAuthor
  additions: number
  deletions: number
  changes: Array<{
    type: 'add' | 'delete' | 'unchanged'
    content: string
    lineNumber: number
  }>
}
