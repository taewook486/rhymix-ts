import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileCard } from '@/components/member/ProfileCard'
import { UserStats } from '@/components/member/UserStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PublicProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', username)
    .single()

  if (error || !profile) {
    notFound()
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProfileCard profile={profile} />
        </div>

        <div className="md:col-span-2">
          <UserStats />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground py-8">
                No recent activity to display.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
