import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

async function getPointStats() {
  const supabase = await createClient()

  // Get total points in system
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, metadata')
    .not('metadata->points', 'is', null)

  return {
    totalMembers: profiles?.length || 0,
    profiles: profiles || [],
  }
}

function PointsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default async function AdminPointsPage() {
  const stats = await getPointStats()

  return (
    <Suspense fallback={<PointsSkeleton />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Points</h1>
          <p className="text-muted-foreground">Manage member points and rewards</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members with Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Point Configuration</CardTitle>
            <CardDescription>
              Configure point rules and rewards for member activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Point system configuration will be available in a future update.
              This feature is part of the Rhymix migration roadmap.
            </p>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
