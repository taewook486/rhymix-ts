import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Settings } from 'lucide-react'
import { DeliverySettingsForm } from './DeliverySettingsForm'

async function getDeliverySettings() {
  const supabase = await createClient()

  const { data: siteConfig, error } = await supabase
    .from('site_config')
    .select('delivery_settings')
    .single()

  if (error) {
    console.error('Error fetching delivery settings:', error)
    return getDefaultSettings()
  }

  return siteConfig?.delivery_settings || getDefaultSettings()
}

function getDefaultSettings() {
  return {
    smtp: {
      host: '',
      port: 587,
      user: '',
      password: '',
      security: 'tls' as const,
    },
    sender: {
      name: '',
      email: '',
    },
    sms: {
      api_key: '',
      api_secret: '',
      from_number: '',
    },
    push: {
      enabled: false,
      server_key: '',
    },
  }
}

function DeliverySettingsSkeleton() {
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

export default async function DeliverySettingsPage() {
  const settings = await getDeliverySettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">발송 설정</h1>
        <p className="text-muted-foreground">SMTP, SMS, 푸시 알림 발송을 위한 설정을 구성합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            알림 발송 설정
          </CardTitle>
          <CardDescription>
            이메일, SMS, 푸시 알림 발송을 위한 서버 설정을 구성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<DeliverySettingsSkeleton />}>
            <DeliverySettingsForm settings={settings} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
