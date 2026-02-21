import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  MessageSquare,
  FileText,
  Settings,
  BarChart3,
  Shield,
  LayoutGrid,
  Menu as MenuIcon,
  Package,
  Activity
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createClient()

  try {
    // Get user count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get post count (from posts table)
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    // Get board count
    const { count: boardCount } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })

    // Get recent activities
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, created_at, boards(title)')
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      userCount: userCount || 0,
      postCount: postCount || 0,
      boardCount: boardCount || 0,
      recentPosts: recentPosts || [],
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      userCount: 0,
      postCount: 0,
      boardCount: 0,
      recentPosts: [],
    }
  }
}

function StatCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: string
  value: number | string
  description: string
  icon: React.ReactNode
  href?: string
}) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card className="h-full">{content}</Card>
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage your site settings and content</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

async function DashboardContent() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Welcome back! Manage your Rhymix TS site.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.userCount}
          description="Registered members"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          href="/admin/members"
        />
        <StatCard
          title="Total Posts"
          value={stats.postCount}
          description="Across all boards"
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          href="/admin/posts"
        />
        <StatCard
          title="Boards"
          value={stats.boardCount}
          description="Active forums"
          icon={<LayoutGrid className="h-4 w-4 text-muted-foreground" />}
          href="/admin/boards"
        />
        <StatCard
          title="Online Now"
          value="0"
          description="Active visitors"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/boards/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Create Board
                </CardTitle>
                <CardDescription>
                  Create a new discussion board
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/pages/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Page
                </CardTitle>
                <CardDescription>
                  Create a static page
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/menus">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MenuIcon className="h-5 w-5" />
                  Manage Menus
                </CardTitle>
                <CardDescription>
                  Configure navigation menus
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      {stats.recentPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest content from your community</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentPosts.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {post.boards?.title || 'Unknown Board'}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Menu Sections */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Administration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Management
              </CardTitle>
              <CardDescription>Manage users and roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/members">
                  <Users className="mr-2 h-4 w-4" />
                  All Members
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/groups">
                  <Shield className="mr-2 h-4 w-4" />
                  User Groups
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/permissions">
                  <Shield className="mr-2 h-4 w-4" />
                  Permissions
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Content Management
              </CardTitle>
              <CardDescription>Boards, pages, and media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/boards">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Boards
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/pages">
                  <FileText className="mr-2 h-4 w-4" />
                  Pages
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/media">
                  <Package className="mr-2 h-4 w-4" />
                  Media Library
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MenuIcon className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Menus, themes, and layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/menus">
                  <MenuIcon className="mr-2 h-4 w-4" />
                  Menus
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/widgets">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Widgets
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/themes">
                  <Settings className="mr-2 h-4 w-4" />
                  Themes
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Site settings and advanced options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  General Settings
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/modules">
                  <Package className="mr-2 h-4 w-4" />
                  Modules & Addons
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
