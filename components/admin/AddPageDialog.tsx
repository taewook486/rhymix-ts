'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createPage } from '@/app/actions/pages'
import { useRouter } from 'next/navigation'

export function AddPageDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreatePage = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '페이지 제목을 입력해주세요.',
      })
      return
    }

    if (!slug.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '페이지 슬러그를 입력해주세요.',
      })
      return
    }

    // Validate slug format
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '슬러그는 소문자, 숫자, 하이픈, 언더스코어만 사용할 수 있습니다.',
      })
      return
    }

    setIsCreating(true)

    try {
      const result = await createPage({
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        status,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create page')
      }

      // Success
      setOpen(false)
      setTitle('')
      setSlug('')
      setContent('')
      setStatus('draft')

      toast({
        title: '페이지 생성 완료',
        description: `"${title}" 페이지가 생성되었습니다.`,
      })

      // Refresh the page to show the new page
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '페이지 생성 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setSlug(generatedSlug)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          새 페이지
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 페이지 만들기</DialogTitle>
          <DialogDescription>
            정적 페이지를 생성합니다. 소개 페이지, 연락처, 개인정보처리방침 등을 만들 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">제목</Label>
            <Input
              id="page-title"
              placeholder="예: 소개 페이지"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-slug">슬러그</Label>
            <Input
              id="page-slug"
              placeholder="예: about-us"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              URL 경로: /pages/{slug || 'about-us'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-status">상태</Label>
            <Select
              value={status}
              onValueChange={(value: 'draft' | 'published') => setStatus(value)}
              disabled={isCreating}
            >
              <SelectTrigger id="page-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-content">내용</Label>
            <Textarea
              id="page-content"
              placeholder="페이지 내용 (Markdown 지원)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreating}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            취소
          </Button>
          <Button onClick={handleCreatePage} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                페이지 만들기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
