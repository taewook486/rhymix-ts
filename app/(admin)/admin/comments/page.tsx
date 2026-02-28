import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

async function getCommentStats() {
  const supabase = await createClient()

  // Get comment counts
  const { count: totalComments } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })

  const { count: publishedComments } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: trashComments } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trash')

  return {
    total: totalComments || 0,
    published: publishedComments || 0,
    trash: trashComments || 0,
  }
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default async function AdminCommentsPage() {
  const stats = await getCommentStats()

  return (
    <Suspense fallback={<CommentsSkeleton />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-muted-foreground">Manage comments across all content</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
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
              <CardTitle className="text-sm font-medium">In Trash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trash}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comment Management</CardTitle>
            <CardDescription>
              View, moderate, and manage comments across the site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Full comment management features will be available in a future update.
              This includes bulk moderation, spam detection, and user filtering.
            </p>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
