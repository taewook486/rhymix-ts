import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Eye, EyeOff, Clock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Skeleton component
function PagesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Get pages from documents table (module='page')
async function getPages() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('module', 'page')
    .order('updated_at', { ascending: false })

  if (error) throw error

  // Transform data to match expected format
  const pages = await Promise.all(
    (data || []).map(async (doc) => {
      // Get author display name separately
      let authorName = 'Unknown'
      if (doc.author_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', doc.author_id)
          .single()
        authorName = profile?.display_name || 'Unknown'
      }

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug || '',
        content: doc.content,
        status: doc.status,
        author: authorName,
        view_count: doc.view_count,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }
    })
  )

  return pages
}

// Pages Table Component
function PagesTable({ pages }: { pages: any[] }) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pages found. Create your first page to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Author</TableHead>
          <TableHead className="text-center">Views</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((page) => (
          <TableRow key={page.id}>
            <TableCell className="font-medium">{page.title}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{page.slug}</code>
            </TableCell>
            <TableCell>
              <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                {page.status === 'published' ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Published
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Draft
                  </>
                )}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                {page.author}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline">{page.view_count.toLocaleString()}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(page.updated_at).toLocaleDateString()}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function AdminPagesPage() {
  const pages = await getPages()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground">Manage static pages and content</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Page
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Pages
          </CardTitle>
          <CardDescription>Create and manage static content pages</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PagesSkeleton />}>
            <PagesTable pages={pages} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.filter((p) => p.status === 'published').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.filter((p) => p.status === 'draft').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.reduce((sum, p) => sum + p.view_count, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
