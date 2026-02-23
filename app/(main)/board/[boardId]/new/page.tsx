import { notFound, redirect } from 'next/navigation'
import { PostForm } from '@/components/board'
import { createClient } from '@/lib/supabase/server'
import { createPost as createPostAction } from '@/app/actions/board'
import type { Database } from '@/lib/supabase/database.types'
import type { BoardConfig } from '@/types/board'

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

  // Get board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', boardId)
    .single()

  if (boardError || !board) {
    notFound()
  }

  // Get board config
  const boardConfig = (board.config as BoardConfig) || {}
  const allowAnonymous = boardConfig.allow_anonymous || false

  // Redirect to login if not logged in and guest posting not allowed
  if (!user && !allowAnonymous) {
    redirect(`/signin?redirect=/board/${boardId}/new`)
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
    guest_name?: string
    guest_password?: string
    captcha_token?: string
    captcha_answer?: string
  }) {
    'use server'

    // Parse tags
    const tags = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    const result = await createPostAction({
      board_id: board.id,
      title: data.title,
      content: data.content,
      category_id: data.category_id || undefined,
      is_secret: data.is_secret || false,
      tags,
      status: 'published',
      is_guest: !!(data.guest_name && data.guest_password),
      guest_name: data.guest_name,
      guest_password: data.guest_password,
      captcha_token: data.captcha_token,
      captcha_answer: data.captcha_answer,
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to create post')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      <PostForm
        boardSlug={boardId}
        categories={categories || []}
        boardConfig={boardConfig}
        isLoggedIn={!!user}
        onSubmit={createPost}
        isEditing={false}
      />
    </div>
  )
}
