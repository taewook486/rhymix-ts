'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Settings, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getPointSettings,
  updatePointSettings,
  type PointSettings,
} from '@/app/actions/admin/point-settings'
import {
  type PointSettingsFormData,
  pointSettingsUpdateSchema,
} from '@/lib/validations/point-settings'

export function PointSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<PointSettingsFormData>({
    resolver: zodResolver(pointSettingsUpdateSchema),
    defaultValues: {
      is_enabled: true,
      point_name: '포인트',
      max_level: 30,
      level_icon_type: 'default',
      level_icon_path: null,
      disable_download_on_low_point: false,
      disable_read_on_low_point: false,
      min_point_for_download: 0,
      min_point_for_read: 0,
    },
  })

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getPointSettings()

        if (result.success && result.data) {
          form.reset(result.data)
        } else {
          throw new Error(result.error || '설정을 불러오는데 실패했습니다.')
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: error instanceof Error ? error.message : '설정을 불러오는데 실패했습니다.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [form, toast])

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce(async (data: PointSettingsFormData) => {
      setIsSaving(true)
      try {
        const result = await updatePointSettings(data)

        if (result.success) {
          toast({
            title: '성공',
            description: result.message || '설정이 저장되었습니다.',
          })
          router.refresh()
        } else {
          throw new Error(result.error || '설정 저장에 실패했습니다.')
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: error instanceof Error ? error.message : '설정 저장에 실패했습니다.',
        })
      } finally {
        setIsSaving(false)
      }
    }, 500),
    [toast, router]
  )

  // Watch for form changes and auto-save
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (form.formState.isValid && !isLoading) {
        debouncedSave(data as PointSettingsFormData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">포인트 설정</h1>
          <p className="text-muted-foreground">포인트 시스템 기본 설정을 관리합니다</p>
        </div>
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">
            <Settings className="mr-2 h-4 w-4" />
            기본 설정
          </TabsTrigger>
          <TabsTrigger value="restriction">
            <Shield className="mr-2 h-4 w-4" />
            제한 설정
          </TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
              <CardDescription>포인트 시스템의 기본 동작을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Point System */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_enabled">포인트 시스템 사용</Label>
                  <p className="text-xs text-muted-foreground">
                    포인트 적립 및 사용 기능을 활성화합니다
                  </p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={form.watch('is_enabled')}
                  onCheckedChange={(checked) => form.setValue('is_enabled', checked)}
                />
              </div>

              {/* Point Name */}
              <div className="space-y-2">
                <Label htmlFor="point_name">포인트 이름</Label>
                <Input
                  id="point_name"
                  type="text"
                  placeholder="포인트"
                  {...form.register('point_name')}
                />
                {form.formState.errors.point_name && (
                  <p className="text-xs text-red-500">{form.formState.errors.point_name.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  사이트에서 사용할 포인트의 이름입니다 (예: 포인트, 마일리지, 경험치)
                </p>
              </div>

              {/* Max Level */}
              <div className="space-y-2">
                <Label htmlFor="max_level">최대 레벨</Label>
                <Input
                  id="max_level"
                  type="number"
                  min={1}
                  max={100}
                  {...form.register('max_level', { valueAsNumber: true })}
                />
                {form.formState.errors.max_level && (
                  <p className="text-xs text-red-500">{form.formState.errors.max_level.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  회원이 도달할 수 있는 최대 레벨입니다 (1-100)
                </p>
              </div>

              {/* Level Icon Type */}
              <div className="space-y-2">
                <Label htmlFor="level_icon_type">레벨 아이콘 타입</Label>
                <Select
                  value={form.watch('level_icon_type') || 'default'}
                  onValueChange={(value) =>
                    form.setValue('level_icon_type', value as 'default' | 'custom' | 'none')
                  }
                >
                  <SelectTrigger id="level_icon_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본 아이콘</SelectItem>
                    <SelectItem value="custom">사용자 정의</SelectItem>
                    <SelectItem value="none">아이콘 없음</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  회원 레벨을 표시할 아이콘 스타일을 선택합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restriction Settings Tab */}
        <TabsContent value="restriction">
          <Card>
            <CardHeader>
              <CardTitle>제한 설정</CardTitle>
              <CardDescription>포인트에 따른 기능 제한을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Disable Download on Low Point */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="disable_download_on_low_point">다운로드 제한</Label>
                  <p className="text-xs text-muted-foreground">
                    포인트가 부족한 회원의 파일 다운로드를 제한합니다
                  </p>
                </div>
                <Switch
                  id="disable_download_on_low_point"
                  checked={form.watch('disable_download_on_low_point')}
                  onCheckedChange={(checked) => form.setValue('disable_download_on_low_point', checked)}
                />
              </div>

              {/* Min Point for Download */}
              {form.watch('disable_download_on_low_point') && (
                <div className="space-y-2">
                  <Label htmlFor="min_point_for_download">다운로드 최소 포인트</Label>
                  <Input
                    id="min_point_for_download"
                    type="number"
                    min={0}
                    {...form.register('min_point_for_download', { valueAsNumber: true })}
                  />
                  {form.formState.errors.min_point_for_download && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.min_point_for_download.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    파일 다운로드에 필요한 최소 포인트입니다
                  </p>
                </div>
              )}

              {/* Disable Read on Low Point */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="disable_read_on_low_point">읽기 제한</Label>
                  <p className="text-xs text-muted-foreground">
                    포인트가 부족한 회원의 문서 열람을 제한합니다
                  </p>
                </div>
                <Switch
                  id="disable_read_on_low_point"
                  checked={form.watch('disable_read_on_low_point')}
                  onCheckedChange={(checked) => form.setValue('disable_read_on_low_point', checked)}
                />
              </div>

              {/* Min Point for Read */}
              {form.watch('disable_read_on_low_point') && (
                <div className="space-y-2">
                  <Label htmlFor="min_point_for_read">읽기 최소 포인트</Label>
                  <Input
                    id="min_point_for_read"
                    type="number"
                    min={0}
                    {...form.register('min_point_for_read', { valueAsNumber: true })}
                  />
                  {form.formState.errors.min_point_for_read && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.min_point_for_read.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    문서 열람에 필요한 최소 포인트입니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PointSettingsPage

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
