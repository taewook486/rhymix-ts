/**
 * Tests for Supabase Realtime hooks
 *
 * These tests verify the realtime subscription functionality.
 * Run with: npm test -- hooks/useRealtime.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((callback) => {
    callback('SUBSCRIBED')
    return mockChannel
  }),
  unsubscribe: vi.fn(),
}

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Import after mocking
import { useRealtime, useRealtimeMulti } from '../../hooks/useRealtime'

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a channel on mount', () => {
    const { result } = renderHook(() =>
      useRealtime({
        table: 'comments',
      })
    )

    expect(mockSupabase.channel).toHaveBeenCalled()
    expect(mockChannel.on).toHaveBeenCalled()
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('should create channel with correct name including filter', () => {
    renderHook(() =>
      useRealtime({
        table: 'comments',
        filter: 'post_id=eq.123',
      })
    )

    expect(mockSupabase.channel).toHaveBeenCalledWith(
      expect.stringContaining('post_id=eq.123')
    )
  })

  it('should not subscribe when disabled', () => {
    vi.clearAllMocks()

    renderHook(() =>
      useRealtime({
        table: 'comments',
        enabled: false,
      })
    )

    expect(mockSupabase.channel).not.toHaveBeenCalled()
  })

  it('should call onInsert callback when INSERT event is received', async () => {
    const onInsert = vi.fn()

    // Capture the event handler
    let eventHandler: ((payload: unknown) => void) | undefined
    mockChannel.on.mockImplementation((_type, _config, handler) => {
      eventHandler = handler
      return mockChannel
    })

    renderHook(() =>
      useRealtime({
        table: 'comments',
        onInsert,
      })
    )

    // Simulate receiving an INSERT event
    act(() => {
      eventHandler?.({
        eventType: 'INSERT',
        new: { id: '1', content: 'Test comment' },
        old: {},
      })
    })

    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'INSERT',
        new: { id: '1', content: 'Test comment' },
      })
    )
  })

  it('should call onUpdate callback when UPDATE event is received', async () => {
    const onUpdate = vi.fn()

    let eventHandler: ((payload: unknown) => void) | undefined
    mockChannel.on.mockImplementation((_type, _config, handler) => {
      eventHandler = handler
      return mockChannel
    })

    renderHook(() =>
      useRealtime({
        table: 'comments',
        onUpdate,
      })
    )

    act(() => {
      eventHandler?.({
        eventType: 'UPDATE',
        new: { id: '1', content: 'Updated comment' },
        old: { content: 'Old comment' },
      })
    })

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPDATE',
      })
    )
  })

  it('should call onDelete callback when DELETE event is received', async () => {
    const onDelete = vi.fn()

    let eventHandler: ((payload: unknown) => void) | undefined
    mockChannel.on.mockImplementation((_type, _config, handler) => {
      eventHandler = handler
      return mockChannel
    })

    renderHook(() =>
      useRealtime({
        table: 'comments',
        onDelete,
      })
    )

    act(() => {
      eventHandler?.({
        eventType: 'DELETE',
        new: {},
        old: { id: '1' },
      })
    })

    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DELETE',
      })
    )
  })

  it('should call onAll callback for all events', async () => {
    const onAll = vi.fn()

    let eventHandler: ((payload: unknown) => void) | undefined
    mockChannel.on.mockImplementation((_type, _config, handler) => {
      eventHandler = handler
      return mockChannel
    })

    renderHook(() =>
      useRealtime({
        table: 'comments',
        onAll,
      })
    )

    act(() => {
      eventHandler?.({ eventType: 'INSERT', new: {}, old: {} })
      eventHandler?.({ eventType: 'UPDATE', new: {}, old: {} })
      eventHandler?.({ eventType: 'DELETE', new: {}, old: {} })
    })

    expect(onAll).toHaveBeenCalledTimes(3)
  })

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtime({
        table: 'comments',
      })
    )

    unmount()

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  it('should provide unsubscribe function', () => {
    const { result } = renderHook(() =>
      useRealtime({
        table: 'comments',
      })
    )

    act(() => {
      result.current.unsubscribe()
    })

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  it('should provide resubscribe function', () => {
    const { result } = renderHook(() =>
      useRealtime({
        table: 'comments',
      })
    )

    vi.clearAllMocks()

    act(() => {
      result.current.resubscribe()
    })

    expect(mockSupabase.channel).toHaveBeenCalled()
  })
})

describe('useRealtimeMulti', () => {
  it('should create multiple channels', () => {
    renderHook(() =>
      useRealtimeMulti([
        { table: 'posts', onInsert: vi.fn() },
        { table: 'comments', onInsert: vi.fn() },
      ])
    )

    expect(mockSupabase.channel).toHaveBeenCalledTimes(2)
  })

  it('should skip disabled subscriptions', () => {
    vi.clearAllMocks()

    renderHook(() =>
      useRealtimeMulti([
        { table: 'posts', enabled: true, onInsert: vi.fn() },
        { table: 'comments', enabled: false, onInsert: vi.fn() },
      ])
    )

    expect(mockSupabase.channel).toHaveBeenCalledTimes(1)
  })

  it('should unsubscribe all on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeMulti([
        { table: 'posts', onInsert: vi.fn() },
        { table: 'comments', onInsert: vi.fn() },
      ])
    )

    unmount()

    expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2)
  })
})
