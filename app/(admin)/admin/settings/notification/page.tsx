import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import { NotificationSettingsForm } from './NotificationSettingsForm'

async function getNotificationSettings() {
  const supabase = await createClient()

  // Get site notification settings from site_config
  const { data: siteConfig, error } = await supabase
    .from('site_config')
    .select('notification_settings')
    .single()

  if (error) {
    console.error('Error fetching notification settings:', error)
    return getDefaultSettings()
  }

  return siteConfig?.notification_settings || getDefaultSettings()
}

function getDefaultSettings() {
  return {
    // WHW-062 settings
    display_use: true,
    always_display: false,
    user_config_list: ['comment', 'mention', 'like'] as const,
    force_receive: [] as string[],

    // Notification type settings
    comment: {
      web: true,
      mail: false,
      sms: false,
      push: true,
    },
    comment_reply: {
      web: true,
      mail: false,
      sms: false,
      push: true,
    },
    mention: {
      web: true,
      mail: false,
      sms: false,
      push: true,
    },
    like: {
      web: true,
      mail: false,
      sms: false,
      push: false,
    },
    scrap: {
      web: true,
      mail: false,
      sms: false,
      push: false,
    },
    message: {
      web: true,
      mail: false,
      sms: false,
      push: true,
    },
    admin: {
      web: true,
      mail: true,
      sms: false,
      push: true,
    },
    custom: {
      web: false,
      mail: false,
      sms: false,
      push: false,
    },
  }
}

function NotificationSettingsSkeleton() {
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

export default async function NotificationSettingsPage() {
  const settings = await getNotificationSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">알림 설정</h1>
        <p className="text-muted-foreground">사이트 전체 알림 및 알림 채널을 구성합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 유형별 설정
          </CardTitle>
          <CardDescription>
            각 알림 유형에 대해 표시 여부와 발송 채널을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<NotificationSettingsSkeleton />}>
            <NotificationSettingsForm settings={settings} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
