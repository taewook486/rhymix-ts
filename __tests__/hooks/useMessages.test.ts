/**
 * useMessages Hook Tests - Phase 12: Personal Message System
 * Tests for useMessages hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from '@/hooks/useMessages'
import * as messageActions from '@/app/actions/message'

// Mock message actions
jest.mock('@/app/actions/message')

const mockGetMessages = messageActions.getMessages as jest.MockedFunction<typeof messageActions.getMessages>
const mockGetMessage = messageActions.getMessage as jest.MockedFunction<typeof messageActions.getMessage>
const mockMarkAsRead = messageActions.markAsRead as jest.MockedFunction<typeof messageActions.markAsRead>
const mockMarkAllAsRead = messageActions.markAllAsRead as jest.MockedFunction<typeof messageActions.markAllAsRead>
const mockDeleteMessage = messageActions.deleteMessage as jest.MockedFunction<typeof messageActions.deleteMessage>
const mockGetUnreadCount = messageActions.getUnreadCount as jest.MockedFunction<typeof messageActions.getUnreadCount>

describe('useMessages Hook', () => {
  const mockUserId = 'user-1'
  const mockMessages = [
    {
      id: 'msg-1',
      sender_id: 'user-2',
      receiver_id: 'user-1',
      title: 'Test Message 1',
      content: 'Content 1',
      is_read: false,
      is_sender_deleted: false,
      is_receiver_deleted: false,
      created_at: '2024-02-24T10:00:00Z',
      updated_at: '2024-02-24T10:00:00Z',
    },
    {
      id: 'msg-2',
      sender_id: 'user-3',
      receiver_id: 'user-1',
      title: 'Test Message 2',
      content: 'Content 2',
      is_read: true,
      is_sender_deleted: false,
      is_receiver_deleted: false,
      created_at: '2024-02-24T09:00:00Z',
      updated_at: '2024-02-24T10:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockGetMessages.mockResolvedValue({
      success: true,
      data: mockMessages,
    })

    mockGetUnreadCount.mockResolvedValue({
      success: true,
      data: 1,
    })

    mockMarkAsRead.mockResolvedValue({
      success: true,
    })

    mockMarkAllAsRead.mockResolvedValue({
      success: true,
    })

    mockDeleteMessage.mockResolvedValue({
      success: true,
    })
  })

  describe('initial state and fetching', () => {
    it('should fetch messages on mount', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
          folder: 'inbox',
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMessages).toHaveBeenCalledWith({
        folder: 'inbox',
        search: undefined,
        is_read: undefined,
        limit: 20,
        offset: 0,
      })
    })

    it('should fetch unread count on mount', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetUnreadCount).toHaveBeenCalled()
    })

    it('should return empty messages when userId is null', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: null,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.messages).toHaveLength(0)
      expect(mockGetMessages).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      mockGetMessages.mockResolvedValue({
        success: false,
        error: 'Failed to fetch',
      })

      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.message).toContain('Failed to fetch')
    })
  })

  describe('message operations', () => {
    it('should mark message as read', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markAsRead('msg-1')
      })

      expect(mockMarkAsRead).toHaveBeenCalledWith('msg-1')
      expect(result.current.messages[0].is_read).toBe(true)
    })

    it('should mark all messages as read', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markAllAsRead()
      })

      expect(mockMarkAllAsRead).toHaveBeenCalled()
      expect(result.current.messages.every((m) => m.is_read)).toBe(true)
    })

    it('should delete message', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteMessage('msg-1')
      })

      expect(mockDeleteMessage).toHaveBeenCalledWith('msg-1')
      expect(result.current.messages.find((m) => m.id === 'msg-1')).toBeUndefined()
    })

    it('should get specific message', async () => {
      const mockMessage = {
        ...mockMessages[0],
        sender: {
          id: 'user-2',
          display_name: 'User 2',
          avatar_url: null,
        },
        receiver: {
          id: 'user-1',
          display_name: 'User 1',
          avatar_url: null,
        },
        parent: null,
      }

      mockGetMessage.mockResolvedValue({
        success: true,
        data: mockMessage,
      })

      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let fetchedMessage
      await act(async () => {
        fetchedMessage = await result.current.getMessage('msg-1')
      })

      expect(mockGetMessage).toHaveBeenCalledWith('msg-1')
      expect(fetchedMessage).toEqual(mockMessage)
    })
  })

  describe('refresh functionality', () => {
    it('should refresh messages', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockGetMessages.mock.calls.length

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetMessages.mock.calls.length).toBe(initialCallCount + 1)
    })
  })

  describe('filtering and pagination', () => {
    it('should apply search filter', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
          search: 'Test',
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Test',
        })
      )
    })

    it('should apply read status filter', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
          is_read: false,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: false,
        })
      )
    })

    it('should apply limit and offset', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
          limit: 10,
          offset: 20,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      )
    })

    it('should switch between folders', async () => {
      const { result, rerender } = renderHook(
        ({ folder }: { folder: 'inbox' | 'sent' }) =>
          useMessages({
            userId: mockUserId,
            folder,
          }),
        { initialProps: { folder: 'inbox' as const } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      rerender({ folder: 'sent' })

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledWith(
          expect.objectContaining({
            folder: 'sent',
          })
        )
      })
    })
  })

  describe('error handling', () => {
    it('should handle mark as read errors', async () => {
      mockMarkAsRead.mockResolvedValue({
        success: false,
        error: 'Mark failed',
      })

      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markAsRead('msg-1')
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should handle delete errors', async () => {
      mockDeleteMessage.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteMessage('msg-1')
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should handle get message errors', async () => {
      mockGetMessage.mockResolvedValue({
        success: false,
        error: 'Not found',
      })

      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let fetchedMessage
      await act(async () => {
        fetchedMessage = await result.current.getMessage('msg-1')
      })

      expect(result.current.error).toBeTruthy()
      expect(fetchedMessage).toBeNull()
    })
  })

  describe('unread count', () => {
    it('should update unread count after marking as read', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCount = result.current.unreadCount

      await act(async () => {
        await result.current.markAsRead('msg-1')
      })

      // Unread count should be updated
      expect(mockGetUnreadCount).toHaveBeenCalled()
    })

    it('should update unread count after deleting message', async () => {
      const { result } = renderHook(() =>
        useMessages({
          userId: mockUserId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteMessage('msg-1')
      })

      expect(mockGetUnreadCount).toHaveBeenCalled()
    })
  })
})
