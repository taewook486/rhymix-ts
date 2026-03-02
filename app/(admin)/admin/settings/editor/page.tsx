'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Settings, Type, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getEditorSettings,
  updateEditorSettings,
} from '@/app/actions/admin/editor-settings'
import {
  editorSettingsUpdateSchema,
  type EditorSettingsFormData,
  TOOLBAR_TOOL_CATEGORIES,
  FONT_FAMILIES,
} from '@/lib/validations/editor-settings'

export function EditorSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<EditorSettingsFormData>({
    resolver: zodResolver(editorSettingsUpdateSchema),
    defaultValues: {
      editor_skin: 'ckeditor',
      color_scheme: 'mondo',
      editor_height: 300,
      toolbar_set: 'basic',
      hide_toolbar: false,
      font_family: 'sans-serif',
      font_size: 14,
      line_height: 1.5,
      enabled_tools: ['bold', 'italic', 'underline', 'strike', 'fontSize', 'fontFamily', 'link', 'unlink'],
    },
  })

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getEditorSettings()

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
    debounce(async (data: EditorSettingsFormData) => {
      setIsSaving(true)
      try {
        const result = await updateEditorSettings(data)

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
        debouncedSave(data as EditorSettingsFormData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, isLoading])

  // Handle tool toggle
  const handleToolToggle = (toolId: string, checked: boolean) => {
    const currentTools = form.getValues('enabled_tools') || []
    if (checked) {
      form.setValue('enabled_tools', [...currentTools, toolId])
    } else {
      form.setValue('enabled_tools', currentTools.filter((t) => t !== toolId))
    }
  }

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
          <h1 className="text-2xl font-bold">에디터 설정</h1>
          <p className="text-muted-foreground">에디터 스킨, 폰트, 도구 모음 설정을 관리합니다</p>
        </div>
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            <Settings className="mr-2 h-4 w-4" />
            기본 설정
          </TabsTrigger>
          <TabsTrigger value="font">
            <Type className="mr-2 h-4 w-4" />
            폰트 설정
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="mr-2 h-4 w-4" />
            도구 모음
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Editor Basic Settings (WHW-030) */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
              <CardDescription>에디터 스킨, 색상, 높이 등 기본 설정을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Editor Skin */}
              <div className="space-y-2">
                <Label htmlFor="editor_skin">에디터 스킨</Label>
                <Select
                  value={form.watch('editor_skin') || 'ckeditor'}
                  onValueChange={(value) =>
                    form.setValue('editor_skin', value as 'ckeditor' | 'simpleeditor' | 'textarea')
                  }
                >
                  <SelectTrigger id="editor_skin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ckeditor">CKEditor</SelectItem>
                    <SelectItem value="simpleeditor">Simple Editor</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  사용할 에디터 유형을 선택합니다
                </p>
              </div>

              {/* Color Scheme */}
              <div className="space-y-2">
                <Label htmlFor="color_scheme">색상 테마</Label>
                <Select
                  value={form.watch('color_scheme') || 'mondo'}
                  onValueChange={(value) =>
                    form.setValue('color_scheme', value as 'mondo' | 'mondo-dark' | 'mondo-lisa')
                  }
                >
                  <SelectTrigger id="color_scheme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mondo">Mondo (기본)</SelectItem>
                    <SelectItem value="mondo-dark">Mondo Dark</SelectItem>
                    <SelectItem value="mondo-lisa">Mondo Lisa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  에디터의 색상 테마를 선택합니다
                </p>
              </div>

              {/* Editor Height */}
              <div className="space-y-2">
                <Label htmlFor="editor_height">에디터 높이 (px)</Label>
                <Input
                  id="editor_height"
                  type="number"
                  min={100}
                  max={2000}
                  {...form.register('editor_height', { valueAsNumber: true })}
                />
                {form.formState.errors.editor_height && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.editor_height.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  에디터의 기본 높이를 설정합니다 (100px ~ 2000px)
                </p>
              </div>

              {/* Toolbar Set */}
              <div className="space-y-2">
                <Label htmlFor="toolbar_set">도구 모음 세트</Label>
                <Select
                  value={form.watch('toolbar_set') || 'basic'}
                  onValueChange={(value) =>
                    form.setValue('toolbar_set', value as 'basic' | 'advanced')
                  }
                >
                  <SelectTrigger id="toolbar_set">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">기본</SelectItem>
                    <SelectItem value="advanced">고급</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  기본은 자주 사용하는 도구만, 고급은 모든 도구를 포함합니다
                </p>
              </div>

              {/* Hide Toolbar */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hide_toolbar">도구 모음 숨기기</Label>
                  <p className="text-xs text-muted-foreground">
                    에디터 상단의 도구 모음을 숨깁니다
                  </p>
                </div>
                <Switch
                  id="hide_toolbar"
                  checked={form.watch('hide_toolbar') || false}
                  onCheckedChange={(checked) => form.setValue('hide_toolbar', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Font Settings (WHW-031) */}
        <TabsContent value="font">
          <Card>
            <CardHeader>
              <CardTitle>폰트 설정</CardTitle>
              <CardDescription>에디터의 폰트 종류, 크기, 줄 간격을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Font Family */}
              <div className="space-y-2">
                <Label htmlFor="font_family">폰트 종류</Label>
                <Select
                  value={form.watch('font_family') || 'sans-serif'}
                  onValueChange={(value) => form.setValue('font_family', value)}
                >
                  <SelectTrigger id="font_family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  에디터의 기본 폰트를 선택합니다
                </p>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label htmlFor="font_size">폰트 크기 (px)</Label>
                <Input
                  id="font_size"
                  type="number"
                  min={8}
                  max={72}
                  {...form.register('font_size', { valueAsNumber: true })}
                />
                {form.formState.errors.font_size && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.font_size.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  기본 폰트 크기를 설정합니다 (8px ~ 72px)
                </p>
              </div>

              {/* Line Height */}
              <div className="space-y-2">
                <Label htmlFor="line_height">줄 간격</Label>
                <Input
                  id="line_height"
                  type="number"
                  step={0.1}
                  min={1.0}
                  max={3.0}
                  {...form.register('line_height', { valueAsNumber: true })}
                />
                {form.formState.errors.line_height && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.line_height.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  줄 사이의 간격을 설정합니다 (1.0 ~ 3.0)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Toolbar Tools (WHW-032) */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>도구 모음 도구</CardTitle>
              <CardDescription>에디터 도구 모음에 표시할 도구를 선택합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(TOOLBAR_TOOL_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey} className="space-y-3">
                  <h4 className="text-sm font-medium">{category.label}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {category.tools.map((tool) => (
                      <div key={tool.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tool-${tool.id}`}
                          checked={form.watch('enabled_tools')?.includes(tool.id) || false}
                          onCheckedChange={(checked) =>
                            handleToolToggle(tool.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`tool-${tool.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {tool.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  선택한 도구가 에디터 도구 모음에 표시됩니다. 도구는 카테고리별로 그룹화되어 표시됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EditorSettingsPage

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
