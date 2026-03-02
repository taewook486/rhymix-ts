/**
 * Tests for Notification Settings Actions (Sprint 4 - Phase 5)
 * UC-007: WHW-060, WHW-061, WHW-062
 * Testing notification settings management functionality
 */

import {
  getNotificationSettings,
  updateNotificationChannelSettings,
  type NotificationChannelSettings,
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
        comment: { web: true, mail: false, sms: false, push: false },
        comment_comment: { web: true, mail: false, sms: false, push: false },
        mention: { web: true, mail: true, sms: false, push: false },
        vote: { web: true, mail: false, sms: false, push: false },
        scrap: { web: true, mail: false, sms: false, push: false },
        message: { web: true, mail: true, sms: false, push: true },
        admin_content: { web: true, mail: true, sms: true, push: true },
        custom: { web: true, mail: false, sms: false, push: false },
        display_use: 'all',
        always_display: true,
        user_config_list: true,
        user_notify_setting: true,
        push_before_sms: true,
        document_read_delete: true,
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
      expect(result.data?.comment).toEqual({ web: true, mail: false, sms: false, push: false })
      expect(result.data?.display_use).toBe('all')
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

  describe('updateNotificationChannelSettings', () => {
    const validSettings: NotificationChannelSettings = {
      comment: { web: true, mail: false, sms: false, push: false },
      mention: { web: true, mail: true, sms: false, push: false },
      display_use: 'all',
      always_display: true,
      user_config_list: true,
      user_notify_setting: true,
      push_before_sms: true,
      document_read_delete: true,
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

      const result = await updateNotificationChannelSettings(validSettings)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate notification_types enum values', async () => {
      const invalidSettings = {
        ...validSettings,
        // Invalid channel config - non-boolean values
        comment: { web: 'invalid', mail: false, sms: false, push: false } as any,
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

      const result = await updateNotificationChannelSettings(invalidSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지')
    })

    it('should validate notification_channels enum structure', async () => {
      const invalidChannelSettings = {
        ...validSettings,
        // Missing required channel keys
        comment: { web: true } as any, // Missing mail, sms, push
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

      const result = await updateNotificationChannelSettings(invalidChannelSettings)

      expect(result.success).toBe(false)
    })

    it('should validate display_use enum', async () => {
      const invalidDisplaySettings = {
        ...validSettings,
        display_use: 'invalid' as any,
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

      const result = await updateNotificationChannelSettings(invalidDisplaySettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은 표시 설정')
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

      await updateNotificationChannelSettings(validSettings)

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

      const result = await updateNotificationChannelSettings(validSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })
})
