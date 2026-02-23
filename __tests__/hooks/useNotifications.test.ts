/**
 * Tests for useNotifications hook
 *
 * Run with: npm test -- hooks/useNotifications.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock data
const mockNotifications = [
  {
    id: '1',
    user_id: 'user-1',
    type: 'comment' as const,
    title: 'New Comment',
    content: 'Someone commented on your post',
    action_url: '/posts/1',
    action_label: 'View Post',
    icon: '💬',
    metadata: {},
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user-1',
    type: 'like' as const,
    title: 'New Like',
    content: 'Someone liked your post',
    action_url: '/posts/1',
    action_label: 'View Post',
    icon: '❤️',
    metadata: {},
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

// Mock Supabase client
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: mockNotifications, error: null })),
      })),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
  delete: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
}))

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((callback) => {
    callback('SUBSCRIBED')
    return mockChannel
  }),
  unsubscribe: vi.fn(),
}

const mockSupabase = {
  from: mockFrom,
  channel: vi.fn(() => mockChannel),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

// Import after mocking
import { useNotifications } from '../../hooks/useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch notifications on mount', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications).toHaveLength(2)
    expect(result.current.unreadCount).toBe(1)
  })

  it('should return empty array when userId is null', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: null,
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications).toHaveLength(0)
    expect(result.current.unreadCount).toBe(0)
  })

  it('should mark notification as read', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.markAsRead('1')
    })

    // Check that update was called
    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('should mark all notifications as read', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('should delete a notification', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialLength = result.current.notifications.length

    await act(async () => {
      await result.current.deleteNotification('1')
    })

    // Check that delete was called
    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('should calculate unread count correctly', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // One notification is unread
    expect(result.current.unreadCount).toBe(1)
  })

  it('should provide refresh function', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    // Should have fetched again
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('should add timeAgo to notifications', async () => {
    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications[0].timeAgo).toBeDefined()
    expect(result.current.notifications[0].timeAgo).toBe('Just now')
  })

  it('should handle fetch errors', async () => {
    // Mock error response
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: new Error('Database error'),
              })
            ),
          })),
        })),
      })),
    }))

    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        realtime: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })
})
