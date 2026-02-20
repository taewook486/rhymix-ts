import { notFound, redirect } from 'next/navigation'
import { PostForm } from '@/components/board'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row']

interface NewPostPageProps {
  params: Promise<{ boardId: string }>
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { boardId } = await params

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/board/${boardId}/new`)
  }

  // Get board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', boardId)
    .single()

  if (boardError || !board) {
    notFound()
  }

  // Check if board allows posting
  if (board.is_locked) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Board Locked</h1>
          <p className="text-muted-foreground">
            This board is currently locked and does not accept new posts.
          </p>
        </div>
      </div>
    )
  }

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('board_id', board.id)
    .eq('is_hidden', false)
    .eq('is_locked', false)
    .order('order_index', { ascending: true })

  async function createPost(data: {
    title: string
    content: string
    category_id?: string
    is_secret?: boolean
    tags?: string
  }) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('You must be logged in to create a post')
    }

    // Parse tags
    const tags = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    // Create post
    const { error } = await supabase.from('posts').insert({
      board_id: board.id,
      author_id: user.id,
      title: data.title,
      content: data.content,
      category_id: data.category_id || null,
      is_secret: data.is_secret || false,
      tags,
      status: 'published',
      published_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      <PostForm
        boardSlug={boardId}
        categories={categories || []}
        onSubmit={createPost}
        isEditing={false}
      />
    </div>
  )
}
