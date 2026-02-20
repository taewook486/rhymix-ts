import { notFound, redirect } from 'next/navigation'
import { PostForm } from '@/components/board'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row']
type Post = Database['public']['Tables']['posts']['Row']

interface EditPostPageProps {
  params: Promise<{
    boardId: string
    postId: string
  }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { boardId, postId } = await params

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/board/${boardId}/post/${postId}/edit`)
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

  // Get post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    notFound()
  }

  // Check if user is author
  if (post.author_id !== user.id) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      redirect(`/board/${boardId}/post/${postId}`)
    }
  }

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('board_id', board.id)
    .eq('is_hidden', false)
    .order('order_index', { ascending: true })

  async function updatePost(data: {
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
      throw new Error('You must be logged in to edit a post')
    }

    // Parse tags
    const tags = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    // Update post
    const { error } = await supabase
      .from('posts')
      .update({
        title: data.title,
        content: data.content,
        category_id: data.category_id || null,
        is_secret: data.is_secret || false,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) {
      throw new Error(error.message)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
      <PostForm
        boardSlug={boardId}
        categories={categories || []}
        initialData={{
          id: post.id,
          title: post.title,
          content: post.content,
          category_id: post.category_id,
          is_secret: post.is_secret,
          tags: post.tags || [],
        }}
        onSubmit={updatePost}
        isEditing={true}
      />
    </div>
  )
}
