import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, File, ChevronRight } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const supabase = await createClient()

  // Get post count
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  // Get document count
  const { count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Get user count
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Get recent posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    postCount: postCount || 0,
    documentCount: documentCount || 0,
    userCount: userCount || 0,
    recentPosts: recentPosts || [],
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="container mx-auto py-8">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Rhymix TS!</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Modern React/Next.js CMS built with Supabase
        </p>
        <Button asChild>
          <Link href="/board">
            Get Started <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts Section */}
      {stats.recentPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest community posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="block"
                >
                  <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                    <h3 className="font-medium">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      {stats.recentPosts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Explore the features of Rhymix TS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild variant="outline">
                <Link href="/board">
                  <FileText className="mr-2 h-4 w-4" />
                  Visit Board
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/documents">
                  <File className="mr-2 h-4 w-4" />
                  Documents
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
