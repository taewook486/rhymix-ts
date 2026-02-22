import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Settings, Save } from 'lucide-react'
import { SettingsForm, SEOSettings, RegistrationSettings } from './SettingsForm'

async function getSiteSettings() {
  const supabase = await createClient()

  const { data, error } = await supabase.from('site_config').select('*').single()

  if (error) {
    console.error('Error fetching settings:', error)
    return {
      site_name: 'Rhymix TS',
      site_description: '',
      timezone: 'Asia/Seoul',
      language: 'ko',
      meta_title: '',
      meta_description: '',
      allow_registration: true,
      email_verification: true,
      admin_approval: false,
    }
  }

  return data || {
    site_name: 'Rhymix TS',
    site_description: '',
    timezone: 'Asia/Seoul',
    language: 'ko',
    meta_title: '',
    meta_description: '',
    allow_registration: true,
    email_verification: true,
    admin_approval: false,
  }
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

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure site-wide settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Manage your site configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>Search engine optimization options</CardDescription>
          </CardHeader>
          <CardContent>
            <SEOSettings settings={settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
            <CardDescription>Configure user registration options</CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationSettings settings={settings} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
