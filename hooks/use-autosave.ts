'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { saveAutosave, type SaveAutosaveInput } from '@/app/actions/editor'

// =====================================================
// Types
// =====================================================

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  /** 자동저장 간격 (밀리초), 기본값 30초 */
  interval?: number
  /** 자동저장 대상 타입 */
  targetType: 'post' | 'page' | 'comment'
  /** 자동저장 대상 ID (수정 중인 경우) */
  targetId?: string
  /** 자동저장 활성화 여부 */
  enabled?: boolean
  /** 저장 성공 콜백 */
  onSaveSuccess?: (data: any) => void
  /** 저장 실패 콜백 */
  onSaveError?: (error: string) => void
}

interface UseAutosaveReturn {
  /** 자동저장 상태 */
  status: AutosaveStatus
  /** 마지막 저장 시간 */
  lastSavedAt: Date | null
  /** 수동 저장 함수 */
  saveNow: () => Promise<void>
}

// =====================================================
// Hook
// =====================================================

/**
 * 에디터 자동저장 훅
 * Editor autosave hook with 30-second timer
 *
 * @example
 * ```tsx
 * const { status, lastSavedAt, saveNow } = useAutosave({
 *   targetType: 'post',
 *   targetId: postId,
 *   interval: 30000, // 30초
 *   enabled: true,
 * })
 * ```
 */
export function useAutosave({
  interval = 30000, // 30초 기본값
  targetType,
  targetId,
  enabled = true,
  onSaveSuccess,
  onSaveError,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // 현재 데이터를 저장하기 위한 ref
  const dataRef = useRef<SaveAutosaveInput | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 자동저장 실행 함수
   * Execute autosave
   */
  const executeSave = useCallback(async () => {
    if (!enabled || !dataRef.current) {
      return
    }

    // 빈 내용은 저장하지 않음
    if (!dataRef.current.content || dataRef.current.content.trim().length === 0) {
      return
    }

    setStatus('saving')

    try {
      const result = await saveAutosave({
        ...dataRef.current,
        target_type: targetType,
        target_id: targetId,
      })

      if (result.success && result.data) {
        setStatus('saved')
        setLastSavedAt(new Date())
        onSaveSuccess?.(result.data)

        // 3초后 상태를 idle로 변경
        setTimeout(() => {
          setStatus('idle')
        }, 3000)
      } else {
        setStatus('error')
        onSaveError?.(result.error || '저장 실패')

        // 5초 후 상태를 idle로 변경
        setTimeout(() => {
          setStatus('idle')
        }, 5000)
      }
    } catch (error) {
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      onSaveError?.(errorMessage)

      setTimeout(() => {
        setStatus('idle')
      }, 5000)
    }
  }, [enabled, targetType, targetId, onSaveSuccess, onSaveError])

  /**
   * 수동 저장 함수
   * Manual save function
   */
  const saveNow = useCallback(async () => {
    await executeSave()
  }, [executeSave])

  /**
   * 데이터 업데이트 함수
   * Update data to be saved
   */
  const updateData = useCallback((data: SaveAutosaveInput) => {
    dataRef.current = data
  }, [])

  // 타이머 설정
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // interval 주기로 자동저장 실행
    timerRef.current = setInterval(() => {
      executeSave()
    }, interval)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, interval, executeSave])

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (enabled && dataRef.current) {
        executeSave()
      }
    }
  }, [enabled, executeSave])

  // 데이터 업데이트 함수를 외부에서 사용할 수 있도록 노출
  // Note: updateData is attached to the hook return value for external access
  ;(useAutosave as any).updateData = updateData

  return {
    status,
    lastSavedAt,
    saveNow,
  }
}

// =====================================================
// Utility Types for External Use
// =====================================================

/**
 * 자동저장 훅에 추가 메서드 타입
 * Extended types for useAutosave hook
 */
export interface UseAutosaveActions {
  updateData: (data: SaveAutosaveInput) => void
}
