'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { createPoll, updatePoll, deletePoll } from '@/app/actions/poll'
import { useToast } from '@/hooks/use-toast'

interface PollItemInput {
  title: string
}

export function PollCreator() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)

  const [title, setTitle] = useState('')
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single')
  const [maxChoices, setMaxChoices] = useState(1)
  const [stopDate, setStopDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<PollItemInput[]>([
    { title: '' },
    { title: '' },
  ])

  const addItem = () => {
    setItems([...items, { title: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 2) {
      setItems(items.filter((_, i) => i !== index))
    } else {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '최소 2개의 항목이 필요합니다.',
      })
    }
  }

  const updateItem = (index: number, title: string) => {
    const newItems = [...items]
    newItems[index].title = title
    setItems(newItems)
  }

  const handleCreate = async () => {
    const validItems = items.filter((item) => item.title.trim())

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '투표 제목을 입력해주세요.',
      })
      return
    }

    if (validItems.length < 2) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '최소 2개의 항목이 필요합니다.',
      })
      return
    }

    setIsCreating(true)

    const result = await createPoll({
      title,
      poll_type: pollType,
      max_choices: pollType === 'multiple' ? maxChoices : 1,
      stop_date: stopDate || undefined,
      items: validItems.map((item) => item.title),
    })

    if (result.success) {
      toast({
        title: '투표 생성 완료',
        description: '새 투표가 생성되었습니다.',
      })
      router.push('/admin/polls')
    } else {
      toast({
        variant: 'destructive',
        title: '오류',
        description: result.error || '투표 생성에 실패했습니다.',
      })
    }

    setIsCreating(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 투표 만들기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="poll-title">투표 제목 *</Label>
          <Input
            id="poll-title"
            placeholder="예: 가장 좋아하는 게임은?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isCreating}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="poll-type">투표 유형</Label>
            <select
              id="poll-type"
              value={pollType}
              onChange={(e) => setPollType(e.target.value as 'single' | 'multiple')}
              disabled={isCreating}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="single">단일 선택</option>
              <option value="multiple">복수 선택</option>
            </select>
          </div>

          {pollType === 'multiple' && (
            <div className="space-y-2">
              <Label htmlFor="max-choices">최대 선택 수</Label>
              <Input
                id="max-choices"
                type="number"
                min={1}
                max={10}
                value={maxChoices}
                onChange={(e) => setMaxChoices(parseInt(e.target.value))}
                disabled={isCreating}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stop-date">종료일 (선택)</Label>
          <Input
            id="stop-date"
            type="datetime-local"
            value={stopDate}
            onChange={(e) => setStopDate(e.target.value)}
            disabled={isCreating}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="is-active">즉시 게시</Label>
          <Switch
            id="is-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>항목 *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isCreating}
            >
              <Plus className="h-4 w-4 mr-1" />
              항목 추가
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <Input
                placeholder={`항목 ${index + 1}`}
                value={item.title}
                onChange={(e) => updateItem(index, e.target.value)}
                disabled={isCreating}
                className="flex-1"
              />
              {items.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={isCreating}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isCreating}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1"
          >
            {isCreating ? '생성 중...' : '투표 만들기'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
