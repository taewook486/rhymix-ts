import { notFound } from 'next/navigation'
import { BoardList } from '@/components/board'
import { createClient } from '@/lib/supabase/server'
import type { Database, PostListItem as DbPostListItem, Category as DbCategory } from '@/lib/supabase/database.types'

type Board = Database['public']['Tables']['boards']['Row']
type Category = DbCategory
type PostListItem = DbPostListItem & {
  category?: Category | null
  author?: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

const ITEMS_PER_PAGE = 20

interface BoardPageProps {
  params: Promise<{ boardId: string }>
  searchParams: Promise<{
    page?: string
    q?: string
    category?: string
  }>
}

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const { boardId } = await params
  const resolvedSearchParams = await searchParams
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10)
  const searchQuery = resolvedSearchParams.q || ''
  const selectedCategory = resolvedSearchParams.category || ''

  const supabase = await createClient()

  // Get board by slug
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', boardId)
    .single()

  if (boardError || !board) {
    notFound()
  }

  // Get categories for this board
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('board_id', board.id)
    .eq('is_hidden', false)
    .order('order_index', { ascending: true })

  // Build post query
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
      excerpt,
      status,
      is_notice,
      is_secret,
      view_count,
      vote_count,
      comment_count,
      created_at,
      updated_at,
      category:categories(id, name, slug),
      author:profiles!posts_author_id_fkey(display_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('board_id', board.id)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false })

  // Apply search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
  }

  // Apply category filter
  if (selectedCategory) {
    query = query.eq('category_id', selectedCategory)
  }

  // Apply pagination
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1
  query = query.range(from, to)

  const { data: posts, count } = await query

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

  return (
    <div className="container mx-auto py-8 px-4">
      <BoardList
        board={board}
        posts={(posts as unknown as PostListItem[]) || []}
        categories={categories || []}
        currentPage={currentPage}
        totalPages={totalPages}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />
    </div>
  )
}
