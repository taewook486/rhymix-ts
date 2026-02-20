import { notFound } from 'next/navigation'
import { PostDetail } from '@/components/board'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type Post = Database['public']['Tables']['posts']['Row'] & {
  category?: Database['public']['Tables']['categories']['Row'] | null
  author?: {
    display_name: string | null
    avatar_url: string | null
  } | null
  files?: Database['public']['Tables']['files']['Row'][]
}

type Comment = Database['public']['Tables']['comments']['Row'] & {
  author?: {
    display_name: string | null
    avatar_url: string | null
  } | null
  children?: Comment[]
}

interface PostPageProps {
  params: Promise<{
    boardId: string
    postId: string
  }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { boardId, postId } = await params

  const supabase = await createClient()

  // Get board to verify it exists
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('slug')
    .eq('slug', boardId)
    .single()

  if (boardError || !board) {
    notFound()
  }

  // Get post with relations
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:profiles!posts_author_id_fkey(display_name, avatar_url),
      files(*)
    `
    )
    .eq('id', postId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single()

  if (postError || !post) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_view_count', {
    table_name: 'posts',
    row_id: postId,
  })

  // Get comments
  const { data: comments } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey(display_name, avatar_url)
    `
    )
    .eq('post_id', postId)
    .in('status', ['visible'])
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (
    <div className="container mx-auto py-8 px-4">
      <PostDetail
        post={post as Post}
        comments={(comments as Comment[]) || []}
        boardSlug={boardId}
      />
    </div>
  )
}
