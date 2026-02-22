'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, LayoutGrid } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createWidget } from '@/app/actions/widget'
import { widgetRegistry } from '@/lib/widgets/WidgetRegistry'

const WIDGET_POSITIONS = [
  { value: 'header', label: 'Header' },
  { value: 'content_top', label: 'Content Top' },
  { value: 'sidebar_left', label: 'Left Sidebar' },
  { value: 'sidebar_right', label: 'Right Sidebar' },
  { value: 'content_bottom', label: 'Content Bottom' },
  { value: 'footer', label: 'Footer' },
]

export function AddWidgetDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [position, setPosition] = useState('')
  const [isActive, setIsActive] = useState(true)

  const widgetTypes = widgetRegistry.getAll()

  const handleCreateWidget = () => {
    if (!name.trim() || !type || !position) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '필수 항목을 모두 입력해주세요.',
      })
      return
    }

    startTransition(async () => {
      const widgetDef = widgetRegistry.get(type)
      const result = await createWidget({
        name,
        title: title || widgetDef?.title || name,
        type,
        position,
        config: widgetDef?.defaultConfig || {},
        is_active: isActive,
      })

      if (result.success) {
        toast({
          title: '위젯 생성 완료',
          description: `"${title}" 위젯이 생성되었습니다.`,
        })
        setOpen(false)
        // Reset form
        setName('')
        setTitle('')
        setType('')
        setPosition('')
        setIsActive(true)
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: '오류',
          description: result.error || '위젯 생성에 실패했습니다.',
        })
      }
    })
  }

  const selectedWidget = type ? widgetRegistry.get(type) : null
  const availablePositions = selectedWidget
    ? WIDGET_POSITIONS.filter((p) => selectedWidget.allowedPositions.includes(p.value))
    : WIDGET_POSITIONS

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          위젯 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 위젯 추가</DialogTitle>
          <DialogDescription>
            사이트의 특정 영역에 표시할 위젯을 생성합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="widget-name">위젯 이름 *</Label>
            <Input
              id="widget-name"
              placeholder="예: latest_posts_main"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              위젯을 식별하는 고유한 이름
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget-title">표시 제목</Label>
            <Input
              id="widget-title"
              placeholder="예: 최신 게시글"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="widget-type">위젯 유형 *</Label>
              <Select value={type} onValueChange={setType} disabled={isPending}>
                <SelectTrigger id="widget-type">
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {widgetTypes.map((w) => (
                    <SelectItem key={w.name} value={w.name}>
                      <div className="flex items-center gap-2">
                        <span>{w.title}</span>
                        <Badge variant="outline" className="text-xs">{w.category}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="widget-position">위치 *</Label>
              <Select
                value={position}
                onValueChange={setPosition}
                disabled={isPending}
              >
                <SelectTrigger id="widget-position">
                  <SelectValue placeholder="위치 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedWidget && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">{selectedWidget.title}</p>
              <p className="text-xs text-muted-foreground">{selectedWidget.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="widget-active">활성화</Label>
            <Switch
              id="widget-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button onClick={handleCreateWidget} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                위젯 추가
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
