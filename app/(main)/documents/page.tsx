import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentList } from '@/components/document/DocumentList'
import type { DocumentWithAuthor } from '@/types/document'

const ITEMS_PER_PAGE = 20

interface DocumentsPageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const resolvedSearchParams = await searchParams
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10)
  const searchQuery = resolvedSearchParams.q || ''
  const statusFilter = resolvedSearchParams.status || 'published'

  const supabase = await createClient()

  // Check authentication for draft viewing
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Build query
  let query = supabase
    .from('documents')
    .select(
      `
      id,
      module,
      title,
      content,
      content_html,
      excerpt,
      slug,
      author_id,
      status,
      visibility,
      password,
      template,
      layout,
      language,
      tags,
      categories,
      version,
      view_count,
      like_count,
      comment_count,
      is_featured,
      is_sticky,
      allow_comment,
      allow_ping,
      created_at,
      updated_at,
      published_at,
      author:profiles!documents_author_id_fkey(id, display_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null)

  // Apply status filter
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  // Apply search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
  }

  // Apply pagination
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1
  query = query.range(from, to)

  // Sort by sticky first, then by updated_at
  query = query.order('is_sticky', { ascending: false })
  query = query.order('updated_at', { ascending: false })

  const { data: documents, count } = await query

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

  // Handler functions for client component
  const handleSearchChange = async (value: string) => {
    'use server'
    const params = new URLSearchParams()
    if (value) params.set('q', value)
    if (statusFilter !== 'published') params.set('status', statusFilter)
    redirect(`/documents?${params.toString()}`)
  }

  const handleStatusChange = async (value: string) => {
    'use server'
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (value !== 'published') params.set('status', value)
    redirect(`/documents?${params.toString()}`)
  }

  const handleCreateNew = async () => {
    'use server'
    redirect('/documents/new')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentList
        documents={(documents as unknown as DocumentWithAuthor[]) || []}
        currentPage={currentPage}
        totalPages={totalPages}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onCreateNew={handleCreateNew}
      />
    </div>
  )
}
