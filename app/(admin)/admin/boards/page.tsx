import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { BoardsTable, CreateBoardDialog } from './BoardsTable'

async function getBoards() {
  const supabase = await createClient()

  const { data, error } = await supabase.from('boards').select('*').order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching boards:', error)
    return []
  }

  return data || []
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

export default async function AdminBoardsPage() {
  const boards = await getBoards()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-muted-foreground">Manage discussion boards and forums</p>
        </div>
        <CreateBoardDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </CreateBoardDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Boards</CardTitle>
          <CardDescription>Create and manage discussion boards</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<BoardsSkeleton />}>
            <BoardsTable boards={boards} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
