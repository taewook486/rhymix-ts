/**
 * Tests for Notification Logs Actions (Sprint 4 - Phase 5)
 * UC-008: WHW-071
 * Testing notification logs viewing and filtering functionality
 */

import {
  getNotificationLogs,
  type NotificationLogFilters,
} from '@/app/actions/admin/notification-logs'

const { createClient } = require('@/lib/supabase/server')

const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  role: 'admin',
}

const mockNormalUser = {
  id: 'normal-user-id',
  email: 'user@example.com',
  role: 'user',
}

const mockLogs = [
  {
    id: 'log-1',
    user_id: 'user-1',
    recipient_address: 'user@example.com',
    notification_type: 'comment' as const,
    channel: 'email' as const,
    subject: 'New Comment',
    content: 'You have a new comment...',
    status: 'sent' as const,
    error_code: null,
    error_message: null,
    external_id: 'msg-123',
    template_id: null,
    priority: 5,
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    reference_type: 'comment' as const,
    reference_id: 'comment-123',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    read_at: null,
  },
  {
    id: 'log-2',
    user_id: 'user-2',
    recipient_address: '+1234567890',
    notification_type: 'mention' as const,
    channel: 'sms' as const,
    subject: null,
    content: 'You were mentioned...',
    status: 'failed' as const,
    error_code: 'INVALID_NUMBER',
    error_message: 'Invalid phone number',
    external_id: null,
    template_id: null,
    priority: 5,
    retry_count: 1,
    max_retries: 3,
    next_retry_at: null,
    reference_type: 'comment' as const,
    reference_id: 'comment-456',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    created_at: new Date().toISOString(),
    sent_at: null,
    delivered_at: null,
    read_at: null,
  },
  {
    id: 'log-3',
    user_id: 'user-3',
    recipient_address: 'device-token-123',
    notification_type: 'message' as const,
    channel: 'push' as const,
    subject: 'New Message',
    content: 'You have a new message...',
    status: 'sent' as const,
    error_code: null,
    error_message: null,
    external_id: 'push-456',
    template_id: null,
    priority: 5,
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    reference_type: 'message' as const,
    reference_id: 'message-789',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    read_at: null,
  },
]

describe('Notification Logs Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotificationLogs', () => {
    it('should return logs for admin user', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockLogs,
                error: null,
                count: 3,
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs({})

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.logs).toHaveLength(3)
      expect(result.data?.total).toBe(3)
    })

    it('should filter by type correctly', async () => {
      const filters: NotificationLogFilters = {
        notification_type: 'comment' as const,
      }

      const filteredLogs = mockLogs.filter((log) => log.notification_type === 'comment')

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: filteredLogs,
                  error: null,
                  count: filteredLogs.length,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(1)
      expect(result.data?.logs[0].notification_type).toBe('comment')
    })

    it('should filter by status correctly', async () => {
      const filters: NotificationLogFilters = {
        status: 'failed',
      }

      const filteredLogs = mockLogs.filter((log) => log.status === 'failed')

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: filteredLogs,
                  error: null,
                  count: filteredLogs.length,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(1)
      expect(result.data?.logs[0].status).toBe('failed')
      expect(result.data?.logs[0].error_code).toBe('INVALID_NUMBER')
    })

    it('should validate date range', async () => {
      const filters: NotificationLogFilters = {
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-01-31T23:59:59Z',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(true)
    })

    it('should validate pagination (page/limit)', async () => {
      const filters: NotificationLogFilters = {
        page: 1,
        limit: 10,
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockLogs.slice(0, 10),
                error: null,
                count: 3,
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toBeDefined()
    })

    it('should require admin role', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockNormalUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      })

      const result = await getNotificationLogs({})

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should handle invalid date range format', async () => {
      const filters: NotificationLogFilters = {
        start_date: 'invalid-date',
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Invalid date format' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle invalid pagination values', async () => {
      const filters: NotificationLogFilters = {
        limit: -1, // Invalid limit
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Invalid pagination parameters' },
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationLogs(filters)

      expect(result.success).toBe(false)
      expect(result.error).toContain('페이지')
    })
  })
})
