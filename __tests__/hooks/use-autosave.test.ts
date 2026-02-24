/**
 * useAutosave Hook Tests - Phase 16: Temporary Save/Draft
 * Tests for useAutosave hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutosave } from '@/hooks/use-autosave'
import { saveAutosave } from '@/app/actions/editor'

// Mock the saveAutosave action
jest.mock('@/app/actions/editor')

const mockSaveAutosave = saveAutosave as jest.MockedFunction<typeof saveAutosave>

describe('useAutosave Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('initial state', () => {
    it('should return idle status initially', () => {
      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          enabled: true,
        })
      )

      expect(result.current.status).toBe('idle')
      expect(result.current.lastSavedAt).toBeNull()
    })

    it('should have saveNow function', () => {
      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      expect(typeof result.current.saveNow).toBe('function')
    })
  })

  describe('manual save', () => {
    it('should save manually when saveNow is called', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: true,
        data: {
          id: 'autosave-1',
          content: 'Test content',
        } as any,
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      // Update data first
      ;(result.current as any).updateData({
        content: 'Test content',
      })

      // Act
      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('saved')
      expect(mockSaveAutosave).toHaveBeenCalledWith({
        target_type: 'post',
        content: 'Test content',
      })
    })

    it('should handle save errors', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: false,
        error: 'Save failed',
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('error')
    })

    it('should not save empty content', async () => {
      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      ;(result.current as any).updateData({
        content: '   ', // whitespace only
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(mockSaveAutosave).not.toHaveBeenCalled()
    })
  })

  describe('automatic save', () => {
    it('should save automatically at specified interval', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: true,
        data: {} as any,
      })

      const onSaveSuccess = jest.fn()

      renderHook(() =>
        useAutosave({
          targetType: 'post',
          interval: 5000, // 5 seconds
          enabled: true,
          onSaveSuccess,
        })
      )

      // Update data
      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          interval: 5000,
          enabled: true,
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockSaveAutosave).toHaveBeenCalled()
      })
    })

    it('should not save when disabled', async () => {
      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          enabled: false,
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(mockSaveAutosave).not.toHaveBeenCalled()
    })
  })

  describe('status transitions', () => {
    it('should transition to saving then saved', async () => {
      mockSaveAutosave.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                data: {} as any,
              })
            }, 100)
          })
      )

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      // Start save
      act(() => {
        result.current.saveNow()
      })

      expect(result.current.status).toBe('saving')

      // Wait for save to complete
      await waitFor(
        () => {
          expect(result.current.status).toBe('saved')
        },
        { timeout: 5000 }
      )
    })

    it('should reset to idle after 3 seconds on success', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: true,
        data: {} as any,
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('saved')

      // Fast-forward 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(result.current.status).toBe('idle')
    })

    it('should reset to idle after 5 seconds on error', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: false,
        error: 'Save failed',
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('error')

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(result.current.status).toBe('idle')
    })
  })

  describe('callbacks', () => {
    it('should call onSaveSuccess callback', async () => {
      const onSuccess = jest.fn()
      const mockData = { id: 'autosave-1' }

      mockSaveAutosave.mockResolvedValue({
        success: true,
        data: mockData as any,
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          onSaveSuccess: onSuccess,
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSuccess).toHaveBeenCalledWith(mockData)
    })

    it('should call onSaveError callback', async () => {
      const onError = jest.fn()
      const errorMessage = 'Save failed'

      mockSaveAutosave.mockResolvedValue({
        success: false,
        error: errorMessage,
      })

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          onSaveError: onError,
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onError).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('cleanup', () => {
    it('should save on unmount if enabled', async () => {
      mockSaveAutosave.mockResolvedValue({
        success: true,
        data: {} as any,
      })

      const { unmount } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          enabled: true,
        })
      )

      const { result } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          enabled: true,
        })
      )

      ;(result.current as any).updateData({
        content: 'Test content',
      })

      act(() => {
        unmount()
      })

      // Should save on unmount
      await waitFor(() => {
        expect(mockSaveAutosave).toHaveBeenCalled()
      })
    })

    it('should clear timer on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { unmount } = renderHook(() =>
        useAutosave({
          targetType: 'post',
          interval: 5000,
          enabled: true,
        })
      )

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })
})
