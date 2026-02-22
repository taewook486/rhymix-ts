import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentDetail } from '@/components/document/DocumentDetail'
import { getDocumentVersions } from '@/app/actions/document'
import type { DocumentWithAuthor } from '@/types/document'

interface DocumentPageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get document
  const { data: document, error } = await supabase
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
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !document) {
    notFound()
  }

  // Check visibility permissions
  const isAuthor = user?.id === document.author_id
  const profileResult = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : null
  const profile = profileResult?.data
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
  const canEdit = isAuthor || isAdmin

  // Check visibility access
  if (document.visibility === 'private' && !isAuthor && !isAdmin) {
    notFound()
  }
  if (document.visibility === 'member' && !user) {
    notFound()
  }
  if (document.visibility === 'admin' && !isAdmin) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_view_count', {
    table_name: 'documents',
    row_id: id,
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentDetail
        document={document as unknown as DocumentWithAuthor}
        canEdit={canEdit}
        onShowVersionHistory={() => {
          // Version history will be handled by client component
        }}
      />
    </div>
  )
}
