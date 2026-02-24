'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getAllDrafts, deleteDraft, type DraftListItem } from '@/app/actions/draft'
import { cn } from '@/lib/utils'

// =====================================================
// Types
// =====================================================

interface DraftManagerProps {
  /** 드래프트 복구 핸들러 */
  onRestoreDraft: (draftId: string) => void
  /** 현재 보드 ID (게시글 작성 시) */
  boardId?: string
  /** 커스텀 클래스명 */
  className?: string
}

// =====================================================
// Helper Components
// =====================================================

/**
 * 개별 드래프트 아이템
 * Individual draft item
 */
function DraftItem({
  draft,
  onRestore,
  onDelete,
}: {
  draft: DraftListItem
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(draft.id)
    setIsDeleting(false)
  }

  const getTargetTypeText = (type: string) => {
    switch (type) {
      case 'post':
        return '게시글'
      case 'page':
        return '페이지'
      case 'comment':
        return '댓글'
      default:
        return type
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}초 전`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}분 전`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  return (
    <div className="p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              {getTargetTypeText(draft.target_type)}
            </span>
          </div>
          <h4 className="font-medium text-sm truncate mb-1">
            {draft.title || '제목 없음'}
          </h4>
          {draft.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {draft.excerpt}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{getTimeAgo(draft.saved_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(draft.id)}
            className="text-xs"
          >
            복구
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>드래프트 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 이 드래프트를 삭제하시겠습니까? 이 작업은 되돌릴 수
                  없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

/**
 * 드래프트 관리자 컴포넌트
 * Draft manager component for viewing and managing drafts
 *
 * @example
 * ```tsx
 * <DraftManager
 *   onRestoreDraft={(draftId) => {
 *     // 드래프트 복구 로직
 *   }}
 *   boardId="free-board"
 * />
 * ```
 */
export function DraftManager({
  onRestoreDraft,
  boardId,
  className,
}: DraftManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<DraftListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 드래프트 목록 불러오기
  const loadDrafts = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getAllDrafts()
      if (result.success && result.data) {
        setDrafts(result.data)
      } else {
        setError(result.error || '드래프트를 불러오지 못했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  // 드래프트 삭제
  const handleDeleteDraft = async (draftId: string) => {
    const result = await deleteDraft(draftId)
    if (result.success) {
      // 목록에서 제거
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    } else {
      setError(result.error || '삭제 실패')
    }
  }

  // 드래프트 복구
  const handleRestoreDraft = (draftId: string) => {
    onRestoreDraft(draftId)
    setOpen(false)
  }

  // 시트가 열릴 때 드래프트 목록 로드
  useEffect(() => {
    if (open) {
      loadDrafts()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <FileText className="h-4 w-4" />
          드래프트
          {drafts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {drafts.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>드래프트 관리</DialogTitle>
          <DialogDescription>
            자동 저장된 드래프트 목록입니다. 드래프트는 7일간 보관됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">드래프트가 없습니다.</p>
              <p className="text-xs text-muted-foreground mt-1">
                게시글을 작성하면 자동으로 저장됩니다.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg divide-y overflow-y-auto flex-1">
                {drafts.map((draft) => (
                  <DraftItem
                    key={draft.id}
                    draft={draft}
                    onRestore={handleRestoreDraft}
                    onDelete={handleDeleteDraft}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadDrafts}
                className="w-full mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
