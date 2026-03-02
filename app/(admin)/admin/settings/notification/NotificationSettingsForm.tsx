'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, CheckCircle2, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { updateNotificationChannelSettings } from '@/app/actions/notifications'
import { useToast } from '@/hooks/use-toast'

interface NotificationChannel {
  web: boolean
  mail: boolean
  sms: boolean
  push: boolean
}

interface NotificationSettingsData {
  // WHW-062 settings
  display_use: boolean
  always_display: boolean
  user_config_list: string[]
  force_receive: string[]

  // Notification type settings
  comment: NotificationChannel
  comment_reply: NotificationChannel
  mention: NotificationChannel
  like: NotificationChannel
  scrap: NotificationChannel
  message: NotificationChannel
  admin: NotificationChannel
  custom: NotificationChannel
}

const NOTIFICATION_TYPES = [
  { key: 'comment', label: '댓글', icon: Bell },
  { key: 'comment_reply', label: '대댓글', icon: Bell },
  { key: 'mention', label: '멘션', icon: Bell },
  { key: 'like', label: '추천', icon: Bell },
  { key: 'scrap', label: '스크랩', icon: Bell },
  { key: 'message', label: '쪽지', icon: MessageSquare },
  { key: 'admin', label: '관리자', icon: Bell },
  { key: 'custom', label: '커스텀', icon: Bell },
] as const

const CHANNEL_TYPES = [
  { key: 'web', label: '웹', icon: Bell },
  { key: 'mail', label: '메일', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'push', label: '푸시', icon: Smartphone },
] as const

export function NotificationSettingsForm({
  settings,
}: {
  settings: NotificationSettingsData
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<NotificationSettingsData>(settings)
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
        const result = await updateNotificationChannelSettings(formData)

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
            description: result.error || '알림 설정 저장에 실패했습니다.',
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

  const handleToggle = (type: keyof NotificationSettingsData, channel?: keyof NotificationChannel) => {
    setHasChanges(true)

    if (channel) {
      // Toggle specific channel for notification type
      setFormData((prev) => ({
        ...prev,
        [type]: {
          ...(prev[type] as NotificationChannel),
          [channel]: !(prev[type] as NotificationChannel)[channel],
        },
      }))
    } else {
      // Toggle boolean setting
      setFormData((prev) => ({
        ...prev,
        [type]: !prev[type],
      }))
    }
  }

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    startTransition(async () => {
      const result = await updateNotificationChannelSettings(formData)

      if (result.success) {
        toast({
          title: '저장 성공',
          description: '알림 설정이 저장되었습니다.',
        })
        setHasChanges(false)
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: result.error || '알림 설정 저장에 실패했습니다.',
        })
      }
    })
  }

  return (
    <form onSubmit={handleManualSave} className="space-y-6">
      {/* WHW-062 Display Settings */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">표시 설정 (WHW-062)</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="display_use">알림 표시 사용</Label>
              <p className="text-xs text-muted-foreground">
                알림 기능을 사용합니다.
              </p>
            </div>
            <Switch
              id="display_use"
              checked={formData.display_use}
              onCheckedChange={(checked) => handleToggle('display_use' as keyof NotificationSettingsData)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="always_display">항상 표시</Label>
              <p className="text-xs text-muted-foreground">
                사용자 설정과 무관하게 항상 알림을 표시합니다.
              </p>
            </div>
            <Switch
              id="always_display"
              checked={formData.always_display}
              onCheckedChange={(checked) => handleToggle('always_display' as keyof NotificationSettingsData)}
            />
          </div>
        </div>
      </div>

      {/* Notification Type Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">알림 유형별 채널 설정</h3>
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

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="basic">기본</TabsTrigger>
            <TabsTrigger value="advanced">고급</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {NOTIFICATION_TYPES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold">{label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {CHANNEL_TYPES.map(({ key: channelKey, label: channelLabel }) => (
                    <div key={channelKey} className="flex items-center justify-between space-x-2">
                      <Label htmlFor={`${key}-${channelKey}`} className="text-sm">
                        {channelLabel}
                      </Label>
                      <Switch
                        id={`${key}-${channelKey}`}
                        checked={(formData[key as keyof NotificationSettingsData] as NotificationChannel)[channelKey]}
                        onCheckedChange={(checked) =>
                          handleToggle(
                            key as keyof NotificationSettingsData,
                            channelKey as keyof NotificationChannel
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {NOTIFICATION_TYPES.slice(0, 5).map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold">{label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {CHANNEL_TYPES.map(({ key: channelKey, label: channelLabel }) => (
                    <div key={channelKey} className="flex items-center justify-between space-x-2">
                      <Label htmlFor={`${key}-${channelKey}`} className="text-sm">
                        {channelLabel}
                      </Label>
                      <Switch
                        id={`${key}-${channelKey}`}
                        checked={(formData[key as keyof NotificationSettingsData] as NotificationChannel)[channelKey]}
                        onCheckedChange={(checked) =>
                          handleToggle(
                            key as keyof NotificationSettingsData,
                            channelKey as keyof NotificationChannel
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            {NOTIFICATION_TYPES.slice(5).map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold">{label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {CHANNEL_TYPES.map(({ key: channelKey, label: channelLabel }) => (
                    <div key={channelKey} className="flex items-center justify-between space-x-2">
                      <Label htmlFor={`${key}-${channelKey}`} className="text-sm">
                        {channelLabel}
                      </Label>
                      <Switch
                        id={`${key}-${channelKey}`}
                        checked={(formData[key as keyof NotificationSettingsData] as NotificationChannel)[channelKey]}
                        onCheckedChange={(checked) =>
                          handleToggle(
                            key as keyof NotificationSettingsData,
                            channelKey as keyof NotificationChannel
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </form>
  )
}
