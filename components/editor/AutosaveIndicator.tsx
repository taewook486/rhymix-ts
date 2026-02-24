'use client'

import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutosaveStatus } from '@/hooks/use-autosave'

// =====================================================
// Types
// =====================================================

interface AutosaveIndicatorProps {
  /** 자동저장 상태 */
  status: AutosaveStatus
  /** 마지막 저장 시간 */
  lastSavedAt: Date | null
  /** 수동 저장 함수 */
  onSaveNow?: () => Promise<void>
  /** 커스텀 클래스명 */
  className?: string
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * 상태에 따른 아이콘 반환
 * Get icon based on status
 */
function getStatusIcon(status: AutosaveStatus) {
  switch (status) {
    case 'saving':
      return <Loader2 className="h-4 w-4 animate-spin" />
    case 'saved':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

/**
 * 상태에 따른 텍스트 반환
 * Get text based on status
 */
function getStatusText(status: AutosaveStatus, lastSavedAt: Date | null): string {
  switch (status) {
    case 'saving':
      return '저장 중...'
    case 'saved':
      if (lastSavedAt) {
        const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
        if (seconds < 60) {
          return `저장됨 (${seconds}초 전)`
        }
        const minutes = Math.floor(seconds / 60)
        return `저장됨 (${minutes}분 전)`
      }
      return '저장됨'
    case 'error':
      return '저장 실패'
    default:
      return '자동저장 대기중'
  }
}

// =====================================================
// Component
// =====================================================

/**
 * 자동저장 인디케이터 컴포넌트
 * Displays autosave status with visual feedback
 *
 * @example
 * ```tsx
 * <AutosaveIndicator
 *   status={status}
 *   lastSavedAt={lastSavedAt}
 *   onSaveNow={saveNow}
 * />
 * ```
 */
export function AutosaveIndicator({
  status,
  lastSavedAt,
  onSaveNow,
  className,
}: AutosaveIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        'px-3 py-1.5 rounded-md bg-muted/50',
        'transition-colors duration-200',
        status === 'saved' && 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400',
        status === 'error' && 'bg-destructive/10 text-destructive',
        status === 'saving' && 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400',
        className
      )}
    >
      {getStatusIcon(status)}
      <span className="font-medium">{getStatusText(status, lastSavedAt)}</span>

      {status === 'idle' && onSaveNow && (
        <button
          type="button"
          onClick={onSaveNow}
          className="ml-2 text-xs underline hover:text-foreground transition-colors"
        >
          지금 저장
        </button>
      )}
    </div>
  )
}
