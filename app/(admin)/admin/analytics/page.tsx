import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, FileText, MessageSquare, Eye, Activity, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Skeleton component
function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

// Get analytics data from Supabase
async function getAnalytics() {
  const supabase = await createClient()

  // Get counts in parallel
  const [
    { count: totalUsers },
    { count: totalPosts },
    { count: totalComments },
    { data: topPosts },
    { data: topDocuments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('id, title, view_count').order('view_count', { ascending: false }).limit(5),
    supabase.from('documents').select('id, title, view_count').order('view_count', { ascending: false }).limit(5),
  ])

  // Get total views from posts and documents
  const { data: postsViews } = await supabase.from('posts').select('view_count')
  const { data: documentsViews } = await supabase.from('documents').select('view_count')

  const totalViews =
    (postsViews?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0) +
    (documentsViews?.reduce((sum, d) => sum + (d.view_count || 0), 0) || 0)

  // Combine top content
  const topContent = [
    ...(topPosts || []).map((p) => ({ id: p.id, title: p.title, views: p.view_count, type: 'post' })),
    ...(topDocuments || []).map((d) => ({ id: d.id, title: d.title, views: d.view_count, type: 'document' })),
  ]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  // Get recent activity from posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, created_at, author_id')
    .order('created_at', { ascending: false })
    .limit(5)

  const recentActivity = (recentPosts || []).map((post) => ({
    id: post.id,
    action: 'New post',
    user: post.author_id || 'Unknown',
    time: new Date(post.created_at).toLocaleString(),
  }))

  return {
    stats: {
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      totalViews,
    },
    growth: {
      users: 0,
      posts: 0,
      comments: 0,
      views: 0,
    },
    topContent,
    recentActivity,
  }
}

// Stat Card Component
function StatCard({
  title,
  value,
  growth,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  growth: number
  icon: any
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <TrendingUp className="h-3 w-3" />
          <span className={growth >= 0 ? 'text-green-600' : 'text-red-600'}>
            {growth >= 0 ? '+' : ''}
            {growth}%
          </span>
          <span>from last month</span>
        </p>
      </CardContent>
    </Card>
  )
}

export default async function AdminAnalyticsPage() {
  const analytics = await getAnalytics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Site statistics and performance metrics</p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Users"
            value={analytics.stats.totalUsers}
            growth={analytics.growth.users}
            icon={Users}
            color="text-blue-500"
          />
          <StatCard
            title="Total Posts"
            value={analytics.stats.totalPosts}
            growth={analytics.growth.posts}
            icon={FileText}
            color="text-green-500"
          />
          <StatCard
            title="Total Comments"
            value={analytics.stats.totalComments}
            growth={analytics.growth.comments}
            icon={MessageSquare}
            color="text-purple-500"
          />
          <StatCard
            title="Total Views"
            value={analytics.stats.totalViews}
            growth={analytics.growth.views}
            icon={Eye}
            color="text-orange-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Content
              </CardTitle>
              <CardDescription>Most viewed posts and documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topContent.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{item.views.toLocaleString()} views</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest actions on the site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{activity.user}</span>
                        <span className="text-muted-foreground"> {activity.action.toLowerCase()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Site activity over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chart visualization requires analytics library integration</p>
                <p className="text-sm">Consider integrating: Chart.js, Recharts, or Tremor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Suspense>
    </div>
  )
}
