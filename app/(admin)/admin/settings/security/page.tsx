'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Shield, Lock, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getSecuritySettings,
  updateSecuritySettings,
  type SecuritySettings,
} from '@/app/actions/admin/security-settings'
import {
  type SecuritySettingsFormData,
  securitySettingsUpdateSchema,
} from '@/lib/validations/security-settings'

export function SecuritySettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<SecuritySettingsFormData>({
    resolver: zodResolver(securitySettingsUpdateSchema),
    defaultValues: {
      // WHW-050: Media Filter
      mediafilter_whitelist: '',
      mediafilter_classes: '',
      robot_user_agents: '',
      // WHW-051: Access Control
      admin_allowed_ip: '',
      admin_denied_ip: '',
      // WHW-052: Session Security
      autologin_lifetime: 1209600,
      autologin_refresh: true,
      use_session_ssl: true,
      use_cookies_ssl: true,
      check_csrf_token: true,
      use_nofollow: true,
      use_httponly: true,
      use_samesite: 'Lax',
      x_frame_options: 'SAMEORIGIN',
      x_content_type_options: 'nosniff',
    },
  })

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getSecuritySettings()

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
    debounce(async (data: SecuritySettingsFormData) => {
      setIsSaving(true)
      try {
        const result = await updateSecuritySettings(data)

        if (result.success) {
          toast({
            title: '성공',
            description: result.message || '보안 설정이 저장되었습니다.',
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
        debouncedSave(data as SecuritySettingsFormData)
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
          <h1 className="text-2xl font-bold">보안 설정</h1>
          <p className="text-muted-foreground">사이트 보안 및 접근 제어를 관리합니다</p>
        </div>
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>

      <Tabs defaultValue="media" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="media">
            <Eye className="mr-2 h-4 w-4" />
            미디어 필터
          </TabsTrigger>
          <TabsTrigger value="access">
            <Lock className="mr-2 h-4 w-4" />
            접근 제어
          </TabsTrigger>
          <TabsTrigger value="session">
            <Shield className="mr-2 h-4 w-4" />
            세션 보안
          </TabsTrigger>
        </TabsList>

        {/* Media Filter Tab */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>미디어 필터</CardTitle>
              <CardDescription>
                외부 미디어 임베드 및 HTML 클래스 필터링을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Media Whitelist */}
              <div className="space-y-2">
                <Label htmlFor="mediafilter_whitelist">미디어 화이트리스트</Label>
                <Textarea
                  id="mediafilter_whitelist"
                  placeholder="youtube.com, vimeo.com, soundcloud.com"
                  rows={4}
                  {...form.register('mediafilter_whitelist')}
                />
                {form.formState.errors.mediafilter_whitelist && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.mediafilter_whitelist.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  허용할 외부 미디어 도메인을 쉼표로 구분하여 입력하세요
                </p>
              </div>

              {/* Allowed Classes */}
              <div className="space-y-2">
                <Label htmlFor="mediafilter_classes">허용된 HTML 클래스</Label>
                <Textarea
                  id="mediafilter_classes"
                  placeholder="video-wrapper, embed-responsive, iframe-container"
                  rows={4}
                  {...form.register('mediafilter_classes')}
                />
                {form.formState.errors.mediafilter_classes && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.mediafilter_classes.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  콘텐츠에서 허용할 HTML 클래스를 쉼표로 구분하여 입력하세요
                </p>
              </div>

              {/* Robot User Agents */}
              <div className="space-y-2">
                <Label htmlFor="robot_user_agents">로봇 사용자 에이전트</Label>
                <Textarea
                  id="robot_user_agents"
                  placeholder="Googlebot, Bingbot, Slurp"
                  rows={4}
                  {...form.register('robot_user_agents')}
                />
                {form.formState.errors.robot_user_agents && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.robot_user_agents.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  크롤러로 식별할 사용자 에이전트를 쉼표로 구분하여 입력하세요
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>접근 제어</CardTitle>
              <CardDescription>관리자 페이지 접근 IP 제한을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allowed IPs */}
              <div className="space-y-2">
                <Label htmlFor="admin_allowed_ip">허용 IP 주소</Label>
                <Textarea
                  id="admin_allowed_ip"
                  placeholder="192.168.1.1, 10.0.0.0/24"
                  rows={3}
                  {...form.register('admin_allowed_ip')}
                />
                {form.formState.errors.admin_allowed_ip && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.admin_allowed_ip.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  관리자 페이지에 접근할 수 있는 IP 주소를 쉼표로 구분하여 입력하세요 (CIDR 표기
                  가능)
                </p>
              </div>

              {/* Denied IPs */}
              <div className="space-y-2">
                <Label htmlFor="admin_denied_ip">차단 IP 주소</Label>
                <Textarea
                  id="admin_denied_ip"
                  placeholder="192.168.1.100, 10.0.0.50"
                  rows={3}
                  {...form.register('admin_denied_ip')}
                />
                {form.formState.errors.admin_denied_ip && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.admin_denied_ip.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  관리자 페이지 접근을 차단할 IP 주소를 쉼표로 구분하여 입력하세요
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Security Tab */}
        <TabsContent value="session">
          <Card>
            <CardHeader>
              <CardTitle>세션 보안</CardTitle>
              <CardDescription>세션 및 쿠키 보안 설정을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Autologin Lifetime */}
              <div className="space-y-2">
                <Label htmlFor="autologin_lifetime">자동 로그인 유지 기간 (초)</Label>
                <Input
                  id="autologin_lifetime"
                  type="number"
                  min={0}
                  max={31536000}
                  {...form.register('autologin_lifetime', { valueAsNumber: true })}
                />
                {form.formState.errors.autologin_lifetime && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.autologin_lifetime.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  자동 로그인 유지 기간입니다 (기본: 1209600초 = 14일)
                </p>
              </div>

              {/* Autologin Refresh */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autologin_refresh">자동 로그인 갱신</Label>
                  <p className="text-xs text-muted-foreground">
                    로그인 시 자동 로그인 기간을 갱신합니다
                  </p>
                </div>
                <Switch
                  id="autologin_refresh"
                  checked={form.watch('autologin_refresh')}
                  onCheckedChange={(checked) => form.setValue('autologin_refresh', checked)}
                />
              </div>

              {/* Use Session SSL */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use_session_ssl">세션 SSL 전용</Label>
                  <p className="text-xs text-muted-foreground">세션 쿠키를 HTTPS에서만 전송합니다</p>
                </div>
                <Switch
                  id="use_session_ssl"
                  checked={form.watch('use_session_ssl')}
                  onCheckedChange={(checked) => form.setValue('use_session_ssl', checked)}
                />
              </div>

              {/* Use Cookies SSL */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use_cookies_ssl">쿠키 SSL 전용</Label>
                  <p className="text-xs text-muted-foreground">모든 쿠키를 HTTPS에서만 전송합니다</p>
                </div>
                <Switch
                  id="use_cookies_ssl"
                  checked={form.watch('use_cookies_ssl')}
                  onCheckedChange={(checked) => form.setValue('use_cookies_ssl', checked)}
                />
              </div>

              {/* Check CSRF Token */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="check_csrf_token">CSRF 토큰 검사</Label>
                  <p className="text-xs text-muted-foreground">
                    폼 제출 시 CSRF 토큰을 검사합니다
                  </p>
                </div>
                <Switch
                  id="check_csrf_token"
                  checked={form.watch('check_csrf_token')}
                  onCheckedChange={(checked) => form.setValue('check_csrf_token', checked)}
                />
              </div>

              {/* Use Nofollow */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use_nofollow">외부 링크 nofollow</Label>
                  <p className="text-xs text-muted-foreground">
                    외부 링크에 nofollow 속성을 자동으로 추가합니다
                  </p>
                </div>
                <Switch
                  id="use_nofollow"
                  checked={form.watch('use_nofollow')}
                  onCheckedChange={(checked) => form.setValue('use_nofollow', checked)}
                />
              </div>

              {/* Use HttpOnly */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use_httponly">HttpOnly 쿠키</Label>
                  <p className="text-xs text-muted-foreground">
                    JavaScript에서 쿠키 접근을 차단합니다
                  </p>
                </div>
                <Switch
                  id="use_httponly"
                  checked={form.watch('use_httponly')}
                  onCheckedChange={(checked) => form.setValue('use_httponly', checked)}
                />
              </div>

              {/* SameSite */}
              <div className="space-y-2">
                <Label htmlFor="use_samesite">SameSite 정책</Label>
                <Select
                  value={form.watch('use_samesite') || 'Lax'}
                  onValueChange={(value) =>
                    form.setValue('use_samesite', value as 'Strict' | 'Lax' | 'None')
                  }
                >
                  <SelectTrigger id="use_samesite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strict">Strict (동일 사이트만)</SelectItem>
                    <SelectItem value="Lax">Lax (상위 수준 탐색 허용)</SelectItem>
                    <SelectItem value="None">None (모든 요청 허용)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  크로스 사이트 요청 시 쿠키 전송 정책을 설정합니다
                </p>
              </div>

              {/* X-Frame-Options */}
              <div className="space-y-2">
                <Label htmlFor="x_frame_options">X-Frame-Options</Label>
                <Select
                  value={form.watch('x_frame_options') || 'SAMEORIGIN'}
                  onValueChange={(value) =>
                    form.setValue('x_frame_options', value as 'DENY' | 'SAMEORIGIN')
                  }
                >
                  <SelectTrigger id="x_frame_options">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DENY">DENY (모든 프레임 차단)</SelectItem>
                    <SelectItem value="SAMEORIGIN">SAMEORIGIN (동일 출처만 허용)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  페이지가 iframe에 임베드되는 것을 방지합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecuritySettingsPage

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
