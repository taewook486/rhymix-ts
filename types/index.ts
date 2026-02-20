// Shared TypeScript type definitions

export interface User {
  id: string
  email: string
  display_name?: string | null
  avatar_url?: string | null
  role: 'admin' | 'user' | 'guest'
}

export interface Board {
  id: string
  slug: string
  title: string
  description?: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface Post {
  id: string
  board_id: string
  title: string
  content: string
  author_id?: string | null
  status: 'draft' | 'published' | 'trash'
  category_id?: string | null
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string | null
  deleted_at?: string | null
}

export interface Comment {
  id: string
  post_id: string
  parent_id?: string | null
  author_id?: string | null
  content: string
  status: 'visible' | 'hidden' | 'trash'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  board_id: string
  parent_id?: string | null
  name: string
  slug: string
  order_index: number
}

// Form input types
export interface CreatePostInput {
  boardId: string
  boardSlug: string
  title: string
  content: string
  categoryId?: string
}

export interface UpdatePostInput {
  title: string
  content: string
  categoryId?: string
}

export interface CreateCommentInput {
  postId: string
  content: string
  parentId?: string
}

export interface UpdateProfileInput {
  displayName?: string
  avatarUrl?: string
}
