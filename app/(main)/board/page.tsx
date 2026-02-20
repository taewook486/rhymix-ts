import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageSquare, Users } from 'lucide-react'

export default async function BoardPage() {
  const supabase = await createClient()

  // Fetch all boards
  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('order_index', { ascending: true })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Board Index</h1>
        <p className="text-muted-foreground mt-2">
          Select a board to view posts
        </p>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/board/${board.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {board.title}
                  </CardTitle>
                  {board.description && (
                    <CardDescription>{board.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Posts
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Active
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Boards Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No boards have been configured yet. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
