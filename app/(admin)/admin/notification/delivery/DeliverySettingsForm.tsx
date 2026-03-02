'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, CheckCircle2, Mail, MessageSquare, Bell } from 'lucide-react'
import { updateDeliverySettings } from '@/app/actions/notifications'
import { useToast } from '@/hooks/use-toast'

interface SMTPSettings {
  host: string
  port: number
  user: string
  password: string
  security: 'none' | 'ssl' | 'tls'
}

interface SenderSettings {
  name: string
  email: string
}

interface SMSSettings {
  api_key: string
  api_secret: string
  from_number: string
}

interface PushSettings {
  enabled: boolean
  server_key: string
}

interface DeliverySettingsData {
  smtp: SMTPSettings
  sender: SenderSettings
  sms: SMSSettings
  push: PushSettings
}

export function DeliverySettingsForm({
  settings,
}: {
  settings: DeliverySettingsData
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<DeliverySettingsData>(settings)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced auto-save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSaveStatus('saving')

    saveTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await updateDeliverySettings(formData)

        if (result.success) {
          setSaveStatus('saved')
          setHasChanges(false)
          router.refresh()

          // Reset status after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('idle')
          toast({
            variant: 'destructive',
            title: '저장 실패',
            description: result.error || '발송 설정 저장에 실패했습니다.',
          })
        }
      })
    }, 500)
  }, [formData, router, toast])

  useEffect(() => {
    if (hasChanges) {
      debouncedSave()
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, hasChanges, debouncedSave])

  const handleChange = (section: keyof DeliverySettingsData, field: string, value: any) => {
    setHasChanges(true)
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }))
  }

  const handleToggle = (section: keyof DeliverySettingsData, field: string) => {
    setHasChanges(true)
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: !(prev[section] as any)[field],
      },
    }))
  }

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    startTransition(async () => {
      const result = await updateDeliverySettings(formData)

      if (result.success) {
        toast({
          title: '저장 성공',
          description: '발송 설정이 저장되었습니다.',
        })
        setHasChanges(false)
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: result.error || '발송 설정 저장에 실패했습니다.',
        })
      }
    })
  }

  return (
    <form onSubmit={handleManualSave} className="space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center text-sm text-green-600">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              저장됨
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              저장 중...
            </span>
          )}
          <Button type="submit" size="sm" disabled={isPending || saveStatus === 'saving'}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                저장
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            푸시
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-4 mt-4">
          {/* SMTP Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SMTP 설정</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">
                  SMTP 호스트 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.gmail.com"
                  value={formData.smtp.host}
                  onChange={(e) => handleChange('smtp', 'host', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">
                  포트 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp_port"
                  type="number"
                  placeholder="587"
                  value={formData.smtp.port}
                  onChange={(e) => handleChange('smtp', 'port', parseInt(e.target.value) || 587)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_user">
                  사용자명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp_user"
                  placeholder="user@example.com"
                  value={formData.smtp.user}
                  onChange={(e) => handleChange('smtp', 'user', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">
                  비밀번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.smtp.password}
                  onChange={(e) => handleChange('smtp', 'password', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_security">
                  보안 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.smtp.security}
                  onValueChange={(value) => handleChange('smtp', 'security', value)}
                >
                  <SelectTrigger id="smtp_security">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Sender Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">발신자 정보</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sender_name">발신자 이름</Label>
                <Input
                  id="sender_name"
                  placeholder="내 사이트"
                  value={formData.sender.name}
                  onChange={(e) => handleChange('sender', 'name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_email">
                  발신자 이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sender_email"
                  type="email"
                  placeholder="noreply@example.com"
                  value={formData.sender.email}
                  onChange={(e) => handleChange('sender', 'email', e.target.value)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SMS API 설정</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms_api_key">
                  API 키 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sms_api_key"
                  placeholder="your-api-key"
                  value={formData.sms.api_key}
                  onChange={(e) => handleChange('sms', 'api_key', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms_api_secret">
                  API 시크릿 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sms_api_secret"
                  type="password"
                  placeholder="your-api-secret"
                  value={formData.sms.api_secret}
                  onChange={(e) => handleChange('sms', 'api_secret', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms_from_number">
                  발신 번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sms_from_number"
                  placeholder="01012345678"
                  value={formData.sms.from_number}
                  onChange={(e) => handleChange('sms', 'from_number', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  SMS 발송에 사용할 발신자 번호를 입력하세요. (하이픈 제외)
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="push" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">푸시 알림 설정</h3>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="push_enabled">푸시 알림 사용</Label>
                <p className="text-xs text-muted-foreground">
                  모바일 앱 푸시 알림을 활성화합니다.
                </p>
              </div>
              <Switch
                id="push_enabled"
                checked={formData.push.enabled}
                onCheckedChange={(checked) => handleToggle('push', 'enabled')}
              />
            </div>

            {formData.push.enabled && (
              <div className="space-y-2">
                <Label htmlFor="push_server_key">
                  FCM 서버 키 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="push_server_key"
                  type="password"
                  placeholder="your-fcm-server-key"
                  value={formData.push.server_key}
                  onChange={(e) => handleChange('push', 'server_key', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Firebase Cloud Messaging 서버 키를 입력하세요.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}
