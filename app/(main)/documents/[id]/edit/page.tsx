import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentForm } from '../../new/DocumentForm'
import type { DocumentWithAuthor } from '@/types/document'

interface EditDocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/member/signin?redirect=/documents/${id}/edit`)
  }

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

  // Check permissions
  const isAuthor = user.id === document.author_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  if (!isAuthor && !isAdmin) {
    redirect(`/documents/${id}`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentForm mode="edit" document={document as unknown as DocumentWithAuthor} />
    </div>
  )
}
