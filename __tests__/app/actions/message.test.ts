/**
 * Message Actions Tests - Phase 12: Personal Message System
 * Tests for sendMessage, getMessages, markAsRead
 */

import {
  sendMessage,
  getMessages,
  getMessage,
  markAsRead,
  type MessageInsert,
  type MessageListFilters,
  type Message,
} from '@/app/actions/message'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')

describe('Message Actions', () => {
  const mockUser = {
    id: 'user-1',
    email: 'user1@example.com',
  }

  const mockReceiver = {
    id: 'user-2',
    email: 'user2@example.com',
  }

  const mockMessage: Message = {
    id: 'message-1',
    sender_id: 'user-1',
    receiver_id: 'user-2',
    title: 'Test Message',
    content: 'Test content',
    is_read: false,
    is_sender_deleted: false,
    is_receiver_deleted: false,
    created_at: '2024-02-24T10:00:00Z',
    updated_at: '2024-02-24T10:00:00Z',
    parent_id: null,
    read_at: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const messageData: MessageInsert = {
        receiver_id: 'user-2',
        title: 'Test Message',
        content: 'Test content',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockReceiver,
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: false,
          error: null,
        }),
      })

      // Second call for insert
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockReceiver,
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: false,
          error: null,
        }),
      }).mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockMessage,
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: false,
          error: null,
        }),
      })

      const result = await sendMessage(messageData)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Test Message')
    })

    it('should deny access for unauthenticated users', async () => {
      const messageData: MessageInsert = {
        receiver_id: 'user-2',
        title: 'Test',
        content: 'Content',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: jest.fn(),
      })

      const result = await sendMessage(messageData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should validate required fields', async () => {
      const invalidData = {} as MessageInsert

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: jest.fn(),
      })

      const result = await sendMessage(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('입력값이 올바르지 않습니다.')
    })

    it('should check if receiver exists', async () => {
      const messageData: MessageInsert = {
        receiver_id: 'non-existent-user',
        title: 'Test',
        content: 'Content',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
        rpc: jest.fn(),
      })

      const result = await sendMessage(messageData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('사용자를 찾을 수 없습니다.')
    })

    it('should block sending to blocked users', async () => {
      const messageData: MessageInsert = {
        receiver_id: 'user-2',
        title: 'Test',
        content: 'Content',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockReceiver,
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      })

      const result = await sendMessage(messageData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('차단된 사용자에게는 메시지를 보낼 수 없습니다.')
    })

    it('should trim title and content', async () => {
      const messageData: MessageInsert = {
        receiver_id: 'user-2',
        title: '  Test Title  ',
        content: '  Test Content  ',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockReceiver,
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...mockMessage,
                    title: 'Test Title',
                    content: 'Test Content',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        rpc: jest.fn().mockResolvedValue({
          data: false,
          error: null,
        }),
      })

      const result = await sendMessage(messageData)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Test Title')
      expect(result.data?.content).toBe('Test Content')
    })
  })

  describe('getMessages', () => {
    it('should get inbox messages', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [mockMessage],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should get sent messages', async () => {
      const filters: MessageListFilters = {
        folder: 'sent',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [mockMessage],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should filter by read status', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
        is_read: false,
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [mockMessage],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(true)
    })

    it('should search in title and content', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
        search: 'Test',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  or: jest.fn().mockResolvedValue({
                    data: [mockMessage],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(true)
    })

    it('should apply limit and offset', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
        limit: 10,
        offset: 20,
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    range: jest.fn().mockResolvedValue({
                      data: [mockMessage],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(true)
    })

    it('should deny access for unauthenticated users', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(false)
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should handle database errors', async () => {
      const filters: MessageListFilters = {
        folder: 'inbox',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getMessages(filters)

      expect(result.success).toBe(false)
      expect(result.error).toBe('알 수 없는 오류가 발생했습니다.')
    })
  })

  describe('getMessage', () => {
    it('should get message with relations', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockMessage,
                  sender: { id: 'user-1', display_name: 'User 1', avatar_url: null },
                  receiver: { id: 'user-2', display_name: 'User 2', avatar_url: null },
                  parent: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getMessage('message-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should auto-mark as read for receiver', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockMessage,
                  receiver_id: 'user-1',
                  is_read: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      await getMessage('message-1')

      // Should call markAsRead internally
    })

    it('should deny access for non-participants', async () => {
      const nonParticipant = { id: 'user-3', email: 'user3@example.com' }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: nonParticipant },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockMessage,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getMessage('message-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('권한이 없습니다.')
    })

    it('should handle deleted messages', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockMessage,
                  is_sender_deleted: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getMessage('message-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('메시지를 찾을 수 없습니다.')
    })
  })

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await markAsRead('message-1')

      expect(result.success).toBe(true)
    })

    it('should only allow receiver to mark as read', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      await markAsRead('message-1')

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for unauthenticated users', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await markAsRead('message-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const result = await markAsRead('message-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('알 수 없는 오류가 발생했습니다.')
    })
  })
})
