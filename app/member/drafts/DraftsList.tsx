'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  FileText as FileIcon,
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
import { getAllDrafts, deleteDraft, restoreDraft, type DraftListItem } from '@/app/actions/draft'
import { cn } from '@/lib/utils'

// =====================================================
// Types
// =====================================================

interface DraftsListProps {
  userId: string
}

// =====================================================
// Helper Functions
// =====================================================

function getTargetTypeText(type: string): string {
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

function getTimeAgo(dateString: string): string {
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

function getExpiryTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return '만료됨'
  if (diffDays === 1) return '내일 만료'
  return `${diffDays}일 후 만료`
}

// =====================================================
// Component
// =====================================================

/**
 * 드래프트 목록 컴포넌트
 * Draft list component with restore and delete functionality
 */
export function DraftsList({ userId }: DraftsListProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

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
    setDeletingIds((prev) => new Set(prev).add(draftId))

    try {
      const result = await deleteDraft(draftId)
      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId))
      } else {
        setError(result.error || '삭제 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(draftId)
        return next
      })
    }
  }

  // 드래프트 복구
  const handleRestoreDraft = async (draftId: string) => {
    try {
      const result = await restoreDraft(draftId)
      if (result.success && result.data) {
        const draft = result.data

        // 타겟 타입에 따라 다른 페이지로 이동
        if (draft.target_type === 'post') {
          // 게시글인 경우: 보드가 있는지 확인 후 이동
          // TODO: metadata에서 board_id 추출
          const boardId = draft.metadata?.board_id || 'free'
          router.push(`/board/${boardId}/new?draft=${draftId}`)
        } else if (draft.target_type === 'page') {
          // 페이지인 경우: 페이지 편집으로 이동
          router.push(`/admin/pages/edit?draft=${draftId}`)
        }
      } else {
        setError(result.error || '복구 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    }
  }

  // 초기 로드
  useEffect(() => {
    loadDrafts()
  }, [])

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">드래프트가 없습니다</h3>
          <p className="text-muted-foreground mb-1">
            게시글을 작성하면 자동으로 저장됩니다.
          </p>
          <p className="text-xs text-muted-foreground">
            드래프트는 7일간 보관됩니다.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            뒤로 가기
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 {drafts.length}개의 드래프트
            </p>
            <Button variant="outline" size="sm" onClick={loadDrafts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>

          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {getTargetTypeText(draft.target_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(draft.saved_at)}
                      </span>
                    </div>

                    <h3 className="font-medium text-base mb-1 truncate">
                      {draft.title || '제목 없음'}
                    </h3>

                    {draft.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {draft.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getExpiryTime(draft.expires_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreDraft(draft.id)}
                    >
                      복구
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingIds.has(draft.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingIds.has(draft.id) ? (
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
                            정말로 이 드래프트를 삭제하시겠습니까? 이 작업은 되돌릴
                            수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
