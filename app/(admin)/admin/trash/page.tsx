import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { Trash2, RotateCcw } from 'lucide-react'

async function getTrashStats() {
  const supabase = await createClient()

  const { count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trash')

  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trash')

  return {
    documents: documentCount || 0,
    comments: commentCount || 0,
  }
}

function TrashSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default async function AdminTrashPage() {
  const stats = await getTrashStats()

  return (
    <Suspense fallback={<TrashSkeleton />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trash</h1>
            <p className="text-muted-foreground">Manage deleted content</p>
          </div>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Empty All Trash
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents in Trash</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.documents > 0 ? 'Can be restored or permanently deleted' : 'No documents in trash'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments in Trash</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.comments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.comments > 0 ? 'Can be restored or permanently deleted' : 'No comments in trash'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trash Management</CardTitle>
            <CardDescription>
              View and manage all deleted content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Full trash management features will be available in a future update.
              This includes bulk restore, permanent delete, and automatic cleanup settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
