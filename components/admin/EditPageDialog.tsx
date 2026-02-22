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
import { Pencil, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EditPageDialogProps {
  page: {
    id: string
    title: string
    slug: string
    content: string
    status: 'draft' | 'published'
  }
  onDelete?: () => void
}

interface UpdatePageResponse {
  success: boolean
  error?: string
  message?: string
  page?: any
}

export function EditPageDialog({ page, onDelete }: EditPageDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [slug, setSlug] = useState(page.slug)
  const [content, setContent] = useState(page.content || '')
  const [status, setStatus] = useState<'draft' | 'published'>(page.status || 'draft')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleUpdatePage = async () => {
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

    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '슬러그는 소문자, 숫자, 하이픈만 사용할 수 있습니다.',
      })
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          status,
        }),
      })

      const data: UpdatePageResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '페이지 수정 실패')
      }

      // Success
      toast({
        title: '페이지 수정 완료',
        description: `${title} 페이지가 수정되었습니다.`,
      })

      setOpen(false)

      // Use setTimeout to avoid potential race conditions
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '페이지 수정 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeletePage = async () => {
    if (!confirm('정말 이 페이지를 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'DELETE',
      })

      const data: UpdatePageResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '페이지 삭제 실패')
      }

      // Success
      toast({
        title: '페이지 삭제 완료',
        description: `${title} 페이지가 삭제되었습니다.`,
      })

      setOpen(false)

      if (onDelete) {
        onDelete()
      }

      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '페이지 삭제 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          편집
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>페이지 편집</DialogTitle>
          <DialogDescription>
            페이지 내용과 설정을 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">제목</Label>
            <Input
              id="edit-title"
              placeholder="예: 소개 페이지"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUpdating || isDeleting}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-slug">슬러그</Label>
            <Input
              id="edit-slug"
              placeholder="예: about-us"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isUpdating || isDeleting}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              URL 경로: /pages/{slug || 'about-us'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">상태</Label>
            <Select
              value={status}
              onValueChange={(value: 'draft' | 'published') => setStatus(value)}
              disabled={isUpdating || isDeleting}
            >
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">내용</Label>
            <Textarea
              id="edit-content"
              placeholder="페이지 내용 (Markdown 지원)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isUpdating || isDeleting}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDeletePage}
            disabled={isUpdating || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setTitle(page.title)
                setSlug(page.slug)
                setContent(page.content || '')
                setStatus(page.status || 'draft')
              }}
              disabled={isUpdating || isDeleting}
            >
              취소
            </Button>
            <Button onClick={handleUpdatePage} disabled={isUpdating || isDeleting}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
