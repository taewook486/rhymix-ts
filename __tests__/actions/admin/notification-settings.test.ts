/**
 * Tests for Notification Settings Actions (Sprint 4 - Phase 5)
 * UC-007: WHW-060, WHW-061, WHW-062
 * Testing notification settings management functionality
 */

import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '@/app/actions/admin/notification-settings'

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

describe('Notification Settings Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotificationSettings', () => {
    it('should return settings for admin user', async () => {
      const mockSettings = {
        id: 'settings-id',
        enable_notification_types: {
          signup: true,
          login: false,
          document: true,
          comment: true,
          vote: true,
          scrap: true,
          mention: true,
          message: true,
        },
        enable_notification_channels: {
          email: true,
          sms: false,
          push: true,
          web: true,
        },
        notification_center_enabled: true,
        notification_center_limit: 20,
        notification_center_order: 'latest' as const,
        realtime_notification_enabled: true,
        realtime_notification_sound: true,
        realtime_notification_desktop: false,
        notification_retention_days: 90,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      })

      const result = await getNotificationSettings()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.enable_notification_types).toBeDefined()
      expect(result.data?.enable_notification_channels).toBeDefined()
      expect(result.data?.notification_center_enabled).toBe(true)
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

      const result = await getNotificationSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should handle database errors gracefully', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      })

      const result = await getNotificationSettings()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateNotificationSettings', () => {
    const validSettings = {
      enable_notification_types: {
        signup: true,
        login: false,
        document: true,
        comment: true,
        vote: true,
        scrap: true,
        mention: true,
        message: true,
      },
      enable_notification_channels: {
        email: true,
        sms: false,
        push: true,
        web: true,
      },
      notification_center_enabled: true,
      notification_center_limit: 20,
      notification_center_order: 'latest' as const,
      realtime_notification_enabled: true,
      realtime_notification_sound: true,
      realtime_notification_desktop: false,
      notification_retention_days: 90,
    }

    it('should update settings with valid data', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { role: 'admin' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'notification_settings') {
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'settings-id', ...validSettings },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'admin_audit_logs') {
            return {
              insert: jest.fn().mockResolvedValue({
                error: null,
              }),
            }
          }
          return {}
        }),
      })

      const result = await updateNotificationSettings(validSettings)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate notification_types enum values', async () => {
      const invalidSettings = {
        ...validSettings,
        // Invalid type config - non-boolean value
        enable_notification_types: {
          signup: 'invalid' as any,
          login: false,
          document: true,
          comment: true,
          vote: true,
          scrap: true,
          mention: true,
          message: true,
        },
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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateNotificationSettings(invalidSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지')
    })

    it('should validate notification_channels enum structure', async () => {
      const invalidChannelSettings = {
        ...validSettings,
        // Invalid channel config - non-boolean value
        enable_notification_channels: {
          email: 'invalid' as any,
          sms: false,
          push: true,
          web: true,
        },
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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateNotificationSettings(invalidChannelSettings)

      expect(result.success).toBe(false)
    })

    it('should validate notification_center_order enum', async () => {
      const invalidOrderSettings = {
        ...validSettings,
        notification_center_order: 'invalid' as any,
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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateNotificationSettings(invalidOrderSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은 정렬 순서')
    })

    it('should add audit log entry', async () => {
      let auditLogInserted = false

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { role: 'admin' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'notification_settings') {
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'settings-id', ...validSettings },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'admin_audit_logs') {
            return {
              insert: jest.fn().mockImplementation(() => {
                auditLogInserted = true
                return Promise.resolve({ error: null })
              }),
            }
          }
          return {}
        }),
      })

      await updateNotificationSettings(validSettings as any)

      expect(auditLogInserted).toBe(true)
    })

    it('should require admin role for updates', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockNormalUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateNotificationSettings(validSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })
})
