import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileCard } from '@/components/member/ProfileCard'
import { ProfileEditor } from '@/components/member/ProfileEditor'
import { AvatarUpload } from '@/components/member/AvatarUpload'
import { UserStats } from '@/components/member/UserStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/member/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/member/signin')
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="mb-8 text-3xl font-bold">My Profile</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProfileCard profile={profile} showEmail showStats />
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="edit" className="space-y-4">
            <TabsList>
              <TabsTrigger value="edit">Edit Profile</TabsTrigger>
              <TabsTrigger value="avatar">Change Avatar</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="edit">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileEditor profile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avatar">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                </CardHeader>
                <CardContent>
                  <AvatarUpload
                    currentAvatarUrl={profile.avatar_url}
                    userId={profile.id}
                    displayName={profile.display_name}
                    email={profile.email}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <UserStats />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
