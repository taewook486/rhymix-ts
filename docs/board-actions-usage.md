# Board Server Actions Usage Guide

This guide demonstrates how to use the Board server actions in your frontend components.

## Importing Actions

```typescript
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getCategories,
  createCategory,
  updateCategory,
  toggleVote,
} from '@/app/actions'
```

## Post Actions

### 1. Get Paginated Posts

```typescript
'use client'

import { getPosts } from '@/app/actions'
import { useState, useEffect } from 'react'

function PostList({ boardId }: { boardId: string }) {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchPosts() {
      const result = await getPosts(boardId, {
        page,
        limit: 20,
        sort: 'created_at',
        order: 'desc',
        search: 'keyword', // optional
        category_id: 'category-uuid', // optional
      })

      if (result.success && result.data) {
        setPosts(result.data.data)
        console.log('Pagination:', result.data.pagination)
      } else {
        console.error('Error:', result.error)
      }
    }

    fetchPosts()
  }, [boardId, page])

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>by {post.author?.display_name || 'Anonymous'}</p>
          <span>Views: {post.view_count}</span>
        </div>
      ))}
    </div>
  )
}
```

### 2. Get Single Post

```typescript
import { getPost } from '@/app/actions'

async function PostDetail({ postId }: { postId: string }) {
  const result = await getPost(postId)

  if (!result.success) {
    return <div>Error: {result.error}</div>
  }

  const post = result.data

  return (
    <div>
      <h1>{post.title}</h1>
      <div>Category: {post.category?.name}</div>
      <div>Author: {post.author?.display_name}</div>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <div>Views: {post.view_count} | Votes: {post.vote_count}</div>
    </div>
  )
}
```

### 3. Create Post

```typescript
'use client'

import { createPost } from '@/app/actions'
import { useRouter } from 'next/navigation'

function CreatePostForm({ boardId }: { boardId: string }) {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    const result = await createPost({
      board_id: boardId,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category_id: formData.get('category_id') as string || undefined,
      tags: ['tag1', 'tag2'],
      is_secret: formData.get('is_secret') === 'on',
    })

    if (result.success && result.data) {
      router.push(`/board/${boardId}/post/${result.data.id}`)
    } else {
      alert(result.error)
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <select name="category_id">
        <option value="">Select Category</option>
        {/* categories */}
      </select>
      <label>
        <input type="checkbox" name="is_secret" />
        Secret Post
      </label>
      <button type="submit">Create Post</button>
    </form>
  )
}
```

### 4. Update Post

```typescript
import { updatePost } from '@/app/actions'

async function handleUpdatePost(postId: string, updates: {
  title?: string
  content?: string
  category_id?: string
}) {
  const result = await updatePost(postId, updates)

  if (result.success) {
    console.log('Post updated:', result.data)
    return result.data
  } else {
    throw new Error(result.error)
  }
}
```

### 5. Delete Post

```typescript
import { deletePost } from '@/app/actions'

async function handleDeletePost(postId: string) {
  const result = await deletePost(postId)

  if (result.success) {
    console.log(result.message) // "게시글이 삭제되었습니다."
    return true
  } else {
    throw new Error(result.error)
  }
}
```

## Comment Actions

### 1. Get Comments (Threaded)

```typescript
import { getComments } from '@/app/actions'

function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState([])

  useEffect(() => {
    async function fetchComments() {
      const result = await getComments(postId)

      if (result.success && result.data) {
        setComments(result.data) // Tree structure with children
      }
    }

    fetchComments()
  }, [postId])

  const renderComment = (comment: CommentWithAuthor) => (
    <div key={comment.id} style={{ marginLeft: comment.depth * 20 }}>
      <div>{comment.author?.display_name}</div>
      <div>{comment.content}</div>
      <div>Votes: {comment.vote_count}</div>
      {comment.children?.map(child => renderComment(child))}
    </div>
  )

  return (
    <div>
      {comments.map(comment => renderComment(comment))}
    </div>
  )
}
```

### 2. Create Comment

```typescript
import { createComment } from '@/app/actions'

async function handleSubmitComment(
  postId: string,
  content: string,
  parentId?: string
) {
  const result = await createComment({
    post_id: postId,
    parent_id: parentId, // For nested replies
    content,
    is_secret: false,
  })

  if (result.success) {
    console.log('Comment created:', result.data)
    return result.data
  } else {
    throw new Error(result.error)
  }
}
```

### 3. Update Comment

```typescript
import { updateComment } from '@/app/actions'

async function handleUpdateComment(commentId: string, content: string) {
  const result = await updateComment(commentId, { content })

  if (result.success) {
    return result.data
  } else {
    throw new Error(result.error)
  }
}
```

### 4. Delete Comment

```typescript
import { deleteComment } from '@/app/actions'

async function handleDeleteComment(commentId: string) {
  const result = await deleteComment(commentId)

  if (result.success) {
    console.log(result.message) // "댓글이 삭제되었습니다."
  } else {
    throw new Error(result.error)
  }
}
```

## Category Actions

### 1. Get Categories (Hierarchical)

```typescript
import { getCategories } from '@/app/actions'

function CategoryTree({ boardId }: { boardId: string }) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    async function fetchCategories() {
      const result = await getCategories(boardId)

      if (result.success && result.data) {
        setCategories(result.data)
      }
    }

    fetchCategories()
  }, [boardId])

  const renderCategory = (category: CategoryWithChildren) => (
    <div key={category.id}>
      <div>
        {category.icon} {category.name} ({category.post_count})
      </div>
      {category.children?.map(child => (
        <div style={{ marginLeft: 20 }}>
          {renderCategory(child)}
        </div>
      ))}
    </div>
  )

  return (
    <div>
      {categories.map(category => renderCategory(category))}
    </div>
  )
}
```

### 2. Create Category (Admin Only)

```typescript
import { createCategory } from '@/app/actions'

async function handleCreateCategory(
  boardId: string,
  name: string,
  slug: string,
  parentId?: string
) {
  const result = await createCategory({
    board_id: boardId,
    name,
    slug,
    parent_id: parentId,
    description: 'Category description',
    icon: '📁',
    color: '#FF5733',
    order_index: 0,
  })

  if (result.success) {
    return result.data
  } else {
    throw new Error(result.error)
  }
}
```

### 3. Update Category (Admin Only)

```typescript
import { updateCategory } from '@/app/actions'

async function handleUpdateCategory(
  categoryId: string,
  updates: {
    name?: string
    slug?: string
    description?: string
    icon?: string
    color?: string
    order_index?: number
    is_hidden?: boolean
    is_locked?: boolean
  }
) {
  const result = await updateCategory(categoryId, updates)

  if (result.success) {
    return result.data
  } else {
    throw new Error(result.error)
  }
}
```

## Vote Actions

### Toggle Vote

```typescript
import { toggleVote } from '@/app/actions'
import { useState } from 'react'

function VoteButton({ type, id }: { type: 'post' | 'comment', id: string }) {
  const [voteData, setVoteData] = useState({
    vote_count: 0,
    has_voted: false,
    vote_type: null,
  })

  async function handleVote(voteType: 'up' | 'down') {
    const result = await toggleVote(type, id, voteType)

    if (result.success && result.data) {
      setVoteData({
        vote_count: result.data.vote_count,
        has_voted: result.data.has_voted,
        vote_type: result.data.vote_type,
      })
    } else {
      alert(result.error)
    }
  }

  return (
    <div>
      <button
        onClick={() => handleVote('up')}
        style={{
          color: voteData.vote_type === 'up' ? 'blue' : 'black'
        }}
      >
        ▲ Upvote
      </button>
      <span>{voteData.vote_count}</span>
      <button
        onClick={() => handleVote('down')}
        style={{
          color: voteData.vote_type === 'down' ? 'red' : 'black'
        }}
      >
        ▼ Downvote
      </button>
    </div>
  )
}
```

## Query Parameters

### Post Query Options

```typescript
const queryParams: QueryParams = {
  page: 1,                    // Page number (default: 1)
  limit: 20,                  // Items per page (default: 20)
  search: 'keyword',          // Full-text search
  category_id: 'uuid',        // Filter by category
  author_id: 'uuid',          // Filter by author
  status: 'published',        // Post status (default: 'published')
  is_notice: false,           // Filter notices
  is_secret: false,           // Filter secret posts
  tags: ['tag1', 'tag2'],    // Filter by tags
  sort: 'created_at',         // Sort field (created_at, updated_at, view_count, vote_count, comment_count)
  order: 'desc',              // Sort order ('asc' or 'desc')
  date_from: '2024-01-01',    // Date range start
  date_to: '2024-12-31',      // Date range end
}
```

## Error Handling

All actions return `ActionResult<T>` with the following structure:

```typescript
interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string      // Korean error message
  message?: string    // Success message (Korean)
}
```

### Common Error Messages (Korean)

- `로그인이 필요합니다.` - Authentication required
- `게시판을 찾을 수 없습니다.` - Board not found
- `게시글을 찾을 수 없습니다.` - Post not found
- `댓글을 찾을 수 없습니다.` - Comment not found
- `권한이 없습니다.` - Permission denied
- `게시판이 잠겨있습니다.` - Board is locked
- `댓글 작성이 제한된 게시글입니다.` - Comments disabled
- `입력값이 올바르지 않습니다.` - Invalid input
- `생성에 실패했습니다.` - Creation failed
- `수정에 실패했습니다.` - Update failed
- `삭제에 실패했습니다.` - Delete failed

## TypeScript Types

Import types from `@/types/board`:

```typescript
import type {
  QueryParams,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  PostWithAuthor,
  CommentWithAuthor,
  CategoryWithChildren,
  PaginatedResponse,
  ActionResult,
  VoteResult,
} from '@/types/board'
```

## Notes

1. **Authentication**: Most actions require user authentication via Supabase Auth
2. **Permissions**: RLS policies are enforced automatically
3. **Soft Delete**: Posts and comments use soft delete (deleted_at field)
4. **View Count**: Automatically incremented when fetching a single post
5. **Comment Threading**: Comments support unlimited nesting with depth/path tracking
6. **Category Hierarchy**: Categories support up to 5 levels of nesting
7. **Full-text Search**: Uses PostgreSQL full-text search with ranking
8. **Pagination**: All list endpoints return pagination metadata

## Database Migrations

Before using these actions, ensure you've run the Supabase migrations:

```bash
# Run migrations
npx supabase db push

# Or manually apply migrations in order:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_helper_functions.sql
```
