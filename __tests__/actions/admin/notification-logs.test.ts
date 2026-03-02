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
    notification_id: 'notif-1',
    user_id: 'user-1',
    channel: 'mail',
    notification_type: 'comment',
    status: 'sent',
    recipient_address: 'user@example.com',
    recipient_name: 'Test User',
    subject: 'New Comment',
    content_preview: 'You have a new comment...',
    error_code: null,
    error_message: null,
    retry_count: 0,
    provider: 'smtp',
    provider_message_id: 'msg-123',
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    failed_at: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-2',
    notification_id: 'notif-2',
    user_id: 'user-2',
    channel: 'sms',
    notification_type: 'mention',
    status: 'failed',
    recipient_address: '+1234567890',
    recipient_name: 'Test User 2',
    subject: null,
    content_preview: 'You were mentioned...',
    error_code: 'INVALID_NUMBER',
    error_message: 'Invalid phone number',
    retry_count: 1,
    provider: 'twilio',
    provider_message_id: null,
    sent_at: null,
    delivered_at: null,
    failed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-3',
    notification_id: 'notif-3',
    user_id: 'user-3',
    channel: 'push',
    notification_type: 'message',
    status: 'delivered',
    recipient_address: 'device-token-123',
    recipient_name: 'Test User 3',
    subject: 'New Message',
    content_preview: 'You have a new message...',
    error_code: null,
    error_message: null,
    retry_count: 0,
    provider: 'fcm',
    provider_message_id: 'push-456',
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    failed_at: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
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
        type: 'comment',
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
        date_from: '2026-01-01',
        date_to: '2026-01-31',
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

    it('should validate pagination (limit/offset)', async () => {
      const filters: NotificationLogFilters = {
        limit: 10,
        offset: 0,
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
        date_from: 'invalid-date',
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
                error: { message: 'Invalid date format' },
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
