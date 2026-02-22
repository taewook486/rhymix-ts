import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentForm } from '@/app/(main)/documents/new/DocumentForm'

interface NewDocumentPageProps {
  params: Promise<{ locale: string }>
}

export default async function NewDocumentPage({ params }: NewDocumentPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/signin?redirect=/${locale}/documents/new`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentForm mode="create" />
    </div>
  )
}
