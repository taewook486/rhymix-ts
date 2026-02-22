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
  Activity,
  MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '@/components/admin/StatCard'
import { RecentActivity } from '@/components/admin/RecentActivity'

async function getDashboardStats() {
  const supabase = await createClient()

  try {
    // Get counts in parallel
    const [usersResult, postsResult, commentsResult, boardsResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('boards').select('*', { count: 'exact', head: true }),
    ])

    // Get recent activities
    const [recentPosts, recentComments, recentMembers] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, author_name, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('comments')
        .select('id, content, author_name, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('id, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Combine activities
    const activities: Array<{
      id: string
      type: 'post' | 'comment' | 'member'
      title: string
      user_name: string | null
      created_at: string
    }> = []

    ;(recentPosts.data || []).forEach((post) => {
      activities.push({
        id: post.id,
        type: 'post',
        title: post.title,
        user_name: post.author_name,
        created_at: post.created_at,
      })
    })

    ;(recentComments.data || []).forEach((comment) => {
      activities.push({
        id: comment.id,
        type: 'comment',
        title: comment.content?.substring(0, 50) || 'Comment',
        user_name: comment.author_name,
        created_at: comment.created_at,
      })
    })

    ;(recentMembers.data || []).forEach((member) => {
      activities.push({
        id: member.id,
        type: 'member',
        title: 'New member joined',
        user_name: member.display_name,
        created_at: member.created_at,
      })
    })

    // Sort by created_at
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return {
      userCount: usersResult.count || 0,
      postCount: postsResult.count || 0,
      commentCount: commentsResult.count || 0,
      boardCount: boardsResult.count || 0,
      activities: activities.slice(0, 10),
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      userCount: 0,
      postCount: 0,
      commentCount: 0,
      boardCount: 0,
      activities: [],
    }
  }
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
        <p className="text-muted-foreground">Welcome back! Manage your Rhymix TS site.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.userCount}
          description="Registered members"
          icon={<Users className="h-4 w-4" />}
          href="/admin/members"
        />
        <StatCard
          title="Total Posts"
          value={stats.postCount}
          description="Across all boards"
          icon={<FileText className="h-4 w-4" />}
          href="/admin/boards"
        />
        <StatCard
          title="Comments"
          value={stats.commentCount}
          description="Total comments"
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Boards"
          value={stats.boardCount}
          description="Active forums"
          icon={<LayoutGrid className="h-4 w-4" />}
          href="/admin/boards"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/boards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Create Board
                </CardTitle>
                <CardDescription>Create a new discussion board</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/documents/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Page
                </CardTitle>
                <CardDescription>Create a static page</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/menus">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MenuIcon className="h-5 w-5" />
                  Manage Menus
                </CardTitle>
                <CardDescription>Configure navigation menus</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity activities={stats.activities} />

        {/* Admin Menu Sections */}
        <div className="space-y-6">
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
