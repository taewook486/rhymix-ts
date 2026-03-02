'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Users, UserCircle, Lock, Eye } from 'lucide-react'
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
  getMemberSettings,
  updateMemberSettings,
  type MemberSettings,
} from '@/app/actions/admin/member-settings'
import {
  memberSettingsSchema,
  memberSettingsUpdateSchema,
  type MemberSettingsFormData,
} from '@/lib/validations/member-settings'

export function MemberSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<MemberSettingsFormData>({
    resolver: zodResolver(memberSettingsUpdateSchema),
    defaultValues: {
      enable_join: true,
      enable_join_key: null,
      enable_confirm: true,
      authmail_expires: 86400,
      member_profile_view: 'member',
      allow_nickname_change: true,
      update_nickname_log: true,
      nickname_symbols: false,
      nickname_spaces: false,
      allow_duplicate_nickname: false,
      password_strength: 'normal',
      password_hashing_algorithm: 'bcrypt',
      password_hashing_work_factor: 10,
      password_hashing_auto_upgrade: true,
      password_change_invalidate_other_sessions: true,
      password_reset_method: 'email',
    },
  })

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getMemberSettings()

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
    debounce(async (data: MemberSettingsFormData) => {
      setIsSaving(true)
      try {
        const result = await updateMemberSettings(data)

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
        debouncedSave(data as MemberSettingsFormData)
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
          <h1 className="text-2xl font-bold">회원 설정</h1>
          <p className="text-muted-foreground">회원 관리 및 가입 설정을 관리합니다</p>
        </div>
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>

      <Tabs defaultValue="registration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registration">
            <Users className="mr-2 h-4 w-4" />
            가입 설정
          </TabsTrigger>
          <TabsTrigger value="nickname">
            <UserCircle className="mr-2 h-4 w-4" />
            닉네임 설정
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="mr-2 h-4 w-4" />
            비밀번호 설정
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Eye className="mr-2 h-4 w-4" />
            프로필 필드
          </TabsTrigger>
        </TabsList>

        {/* Registration Settings Tab */}
        <TabsContent value="registration">
          <Card>
            <CardHeader>
              <CardTitle>가입 설정</CardTitle>
              <CardDescription>회원 가입 관련 설정을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Join */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_join">회원 가입 허용</Label>
                  <p className="text-xs text-muted-foreground">
                    새로운 회원의 가입을 허용합니다
                  </p>
                </div>
                <Switch
                  id="enable_join"
                  checked={form.watch('enable_join')}
                  onCheckedChange={(checked) => form.setValue('enable_join', checked)}
                />
              </div>

              {/* Enable Join Key (shown only when enable_join is false) */}
              {!form.watch('enable_join') && (
                <div className="space-y-2">
                  <Label htmlFor="enable_join_key">가입 키</Label>
                  <Input
                    id="enable_join_key"
                    type="text"
                    placeholder="가입 키를 입력하세요"
                    {...form.register('enable_join_key')}
                  />
                  <p className="text-xs text-muted-foreground">
                    가입 키를 아는 사용자만 가입할 수 있습니다
                  </p>
                </div>
              )}

              {/* Enable Confirm */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_confirm">이메일 인증 필수</Label>
                  <p className="text-xs text-muted-foreground">
                    가입 시 이메일 인증을 필수로 합니다
                  </p>
                </div>
                <Switch
                  id="enable_confirm"
                  checked={form.watch('enable_confirm')}
                  onCheckedChange={(checked) => form.setValue('enable_confirm', checked)}
                />
              </div>

              {/* Authmail Expires */}
              <div className="space-y-2">
                <Label htmlFor="authmail_expires">인증 메일 만료 시간 (초)</Label>
                <Input
                  id="authmail_expires"
                  type="number"
                  min={60}
                  max={604800}
                  {...form.register('authmail_expires', { valueAsNumber: true })}
                />
                {form.formState.errors.authmail_expires && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.authmail_expires.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  최소 60초 (1분) ~ 최대 604800초 (7일)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nickname Settings Tab */}
        <TabsContent value="nickname">
          <Card>
            <CardHeader>
              <CardTitle>닉네임 설정</CardTitle>
              <CardDescription>닉네임 정책을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allow Nickname Change */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_nickname_change">닉네임 변경 허용</Label>
                  <p className="text-xs text-muted-foreground">
                    회원이 닉네임을 변경할 수 있습니다
                  </p>
                </div>
                <Switch
                  id="allow_nickname_change"
                  checked={form.watch('allow_nickname_change')}
                  onCheckedChange={(checked) => form.setValue('allow_nickname_change', checked)}
                />
              </div>

              {/* Update Nickname Log */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="update_nickname_log">닉네임 변경 기록</Label>
                  <p className="text-xs text-muted-foreground">
                    닉네임 변경 이력을 기록합니다
                  </p>
                </div>
                <Switch
                  id="update_nickname_log"
                  checked={form.watch('update_nickname_log')}
                  onCheckedChange={(checked) => form.setValue('update_nickname_log', checked)}
                />
              </div>

              {/* Nickname Symbols */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="nickname_symbols">특수문자 허용</Label>
                  <p className="text-xs text-muted-foreground">
                    닉네임에 특수문자 사용을 허용합니다
                  </p>
                </div>
                <Switch
                  id="nickname_symbols"
                  checked={form.watch('nickname_symbols')}
                  onCheckedChange={(checked) => form.setValue('nickname_symbols', checked)}
                />
              </div>

              {/* Nickname Spaces */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="nickname_spaces">공백 허용</Label>
                  <p className="text-xs text-muted-foreground">
                    닉네임에 공백 사용을 허용합니다
                  </p>
                </div>
                <Switch
                  id="nickname_spaces"
                  checked={form.watch('nickname_spaces')}
                  onCheckedChange={(checked) => form.setValue('nickname_spaces', checked)}
                />
              </div>

              {/* Allow Duplicate Nickname */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_duplicate_nickname">닉네임 중복 허용</Label>
                  <p className="text-xs text-muted-foreground">
                    동일한 닉네임을 여러 회원이 사용할 수 있습니다
                  </p>
                </div>
                <Switch
                  id="allow_duplicate_nickname"
                  checked={form.watch('allow_duplicate_nickname')}
                  onCheckedChange={(checked) => form.setValue('allow_duplicate_nickname', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Settings Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 설정</CardTitle>
              <CardDescription>비밀번호 정책을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Strength */}
              <div className="space-y-2">
                <Label htmlFor="password_strength">비밀번호 강도</Label>
                <Select
                  value={form.watch('password_strength') || 'normal'}
                  onValueChange={(value) =>
                    form.setValue('password_strength', value as 'weak' | 'normal' | 'strong')
                  }
                >
                  <SelectTrigger id="password_strength">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weak">약함</SelectItem>
                    <SelectItem value="normal">보통</SelectItem>
                    <SelectItem value="strong">강함</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Hashing Algorithm */}
              <div className="space-y-2">
                <Label htmlFor="password_hashing_algorithm">해싱 알고리즘</Label>
                <Select
                  value={form.watch('password_hashing_algorithm')}
                  onValueChange={(value) =>
                    form.setValue('password_hashing_algorithm', value as 'bcrypt' | 'argon2')
                  }
                >
                  <SelectTrigger id="password_hashing_algorithm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bcrypt">Bcrypt</SelectItem>
                    <SelectItem value="argon2">Argon2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Hashing Work Factor */}
              <div className="space-y-2">
                <Label htmlFor="password_hashing_work_factor">워크 팩터</Label>
                <Input
                  id="password_hashing_work_factor"
                  type="number"
                  min={4}
                  max={15}
                  {...form.register('password_hashing_work_factor', { valueAsNumber: true })}
                />
                {form.formState.errors.password_hashing_work_factor && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.password_hashing_work_factor.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  높을수록 보안이 강화되지만 로그인 속도가 느려집니다 (4-15)
                </p>
              </div>

              {/* Password Hashing Auto Upgrade */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password_hashing_auto_upgrade">자동 업그레이드</Label>
                  <p className="text-xs text-muted-foreground">
                    로그인 시 비밀번호 해시를 최신 알고리즘으로 자동 업그레이드합니다
                  </p>
                </div>
                <Switch
                  id="password_hashing_auto_upgrade"
                  checked={form.watch('password_hashing_auto_upgrade')}
                  onCheckedChange={(checked) =>
                    form.setValue('password_hashing_auto_upgrade', checked)
                  }
                />
              </div>

              {/* Password Change Invalidate Other Sessions */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password_change_invalidate_other_sessions">
                    다른 세션 무효화
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    비밀번호 변경 시 다른 모든 세션을 로그아웃합니다
                  </p>
                </div>
                <Switch
                  id="password_change_invalidate_other_sessions"
                  checked={form.watch('password_change_invalidate_other_sessions')}
                  onCheckedChange={(checked) =>
                    form.setValue('password_change_invalidate_other_sessions', checked)
                  }
                />
              </div>

              {/* Password Reset Method */}
              <div className="space-y-2">
                <Label htmlFor="password_reset_method">비밀번호 재설정 방법</Label>
                <Select
                  value={form.watch('password_reset_method') || 'email'}
                  onValueChange={(value) =>
                    form.setValue(
                      'password_reset_method',
                      value as 'email' | 'question' | 'admin'
                    )
                  }
                >
                  <SelectTrigger id="password_reset_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">이메일</SelectItem>
                    <SelectItem value="question">질문과 답변</SelectItem>
                    <SelectItem value="admin">관리자 승인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>프로필 필드</CardTitle>
              <CardDescription>회원 프로필 보기 권한을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Member Profile View */}
              <div className="space-y-2">
                <Label htmlFor="member_profile_view">프로필 보기 권한</Label>
                <Select
                  value={form.watch('member_profile_view')}
                  onValueChange={(value) =>
                    form.setValue('member_profile_view', value as 'everyone' | 'member' | 'admin')
                  }
                >
                  <SelectTrigger id="member_profile_view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">모든 사용자</SelectItem>
                    <SelectItem value="member">회원만</SelectItem>
                    <SelectItem value="admin">관리자만</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  회원 프로필 정보를 볼 수 있는 사용자 범위를 설정합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MemberSettingsPage

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
