import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentForm } from './DocumentForm'

export default async function NewDocumentPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/member/signin?redirect=/documents/new')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentForm mode="create" />
    </div>
  )
}
