import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal } from 'lucide-react'

async function getBoards() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching boards:', error)
    return []
  }

  return data || []
}

function BoardsTable({ boards }: { boards: any[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Posts</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No boards found
              </TableCell>
            </TableRow>
          ) : (
            boards.map((board) => (
              <TableRow key={board.id}>
                <TableCell className="font-medium">{board.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {board.description || 'No description'}
                </TableCell>
                <TableCell>{board.post_count || 0}</TableCell>
                <TableCell>
                  <Badge variant={board.is_active ? 'default' : 'secondary'}>
                    {board.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function BoardsSkeleton() {
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

export default function AdminBoardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-muted-foreground">
            Manage discussion boards and forums
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Boards</CardTitle>
          <CardDescription>
            Create and manage discussion boards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<BoardsSkeleton />}>
            {/* @ts-ignore - async component */}
            <BoardsWrapper />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function BoardsWrapper() {
  const boards = await getBoards()
  return <BoardsTable boards={boards} />
}
