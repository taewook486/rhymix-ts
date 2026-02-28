import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

async function getDocumentStats() {
  const supabase = await createClient()

  // Get document counts
  const { count: totalDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  const { count: publishedDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: draftDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  const { count: trashDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trash')

  return {
    total: totalDocuments || 0,
    published: publishedDocuments || 0,
    draft: draftDocuments || 0,
    trash: trashDocuments || 0,
  }
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default async function AdminDocumentsPage() {
  const stats = await getDocumentStats()

  return (
    <Suspense fallback={<DocumentsSkeleton />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage all documents across the site</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Trash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trash}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Management</CardTitle>
            <CardDescription>
              View, edit, and manage all documents across all modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Full document management features will be available in a future update.
              This includes bulk operations, search, and advanced filtering.
            </p>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
