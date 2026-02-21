import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Settings, Save } from 'lucide-react'

async function getSiteSettings() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching settings:', error)
    return {
      site_name: '',
      site_description: '',
      timezone: 'Asia/Seoul',
      language: 'ko',
    }
  }

  return data || {
    site_name: '',
    site_description: '',
    timezone: 'Asia/Seoul',
    language: 'ko',
  }
}

function SettingsForm({ settings }: { settings: any }) {
  return (
    <form className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="site_name">Site Name</Label>
          <Input
            id="site_name"
            name="site_name"
            defaultValue={settings.site_name}
            placeholder="My Community"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="site_description">Site Description</Label>
          <Textarea
            id="site_description"
            name="site_description"
            defaultValue={settings.site_description}
            placeholder="A community for sharing ideas and discussions"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone || 'Asia/Seoul'}
              placeholder="Asia/Seoul"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              name="language"
              defaultValue={settings.language || 'ko'}
              placeholder="ko"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-24 w-full bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure site-wide settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Manage your site configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SettingsSkeleton />}>
            {/* @ts-ignore - async component */}
            <SettingsWrapper />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>
              Search engine optimization options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                placeholder="Default meta title for search engines"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                placeholder="Default meta description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
            <CardDescription>
              Configure user registration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow_registration">Allow Registration</Label>
              <Input id="allow_registration" type="checkbox" className="w-auto" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email_verification">Email Verification</Label>
              <Input id="email_verification" type="checkbox" defaultChecked className="w-auto" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="admin_approval">Admin Approval</Label>
              <Input id="admin_approval" type="checkbox" className="w-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function SettingsWrapper() {
  const settings = await getSiteSettings()
  return <SettingsForm settings={settings} />
}
