/**
 * Tests for Notification Delivery Settings Actions (Sprint 4 - Phase 5)
 * UC-008: WHW-070
 * Testing notification delivery management functionality
 */

import {
  getNotificationDeliverySettings,
  updateNotificationDeliverySettings,
  type NotificationDeliverySettings,
} from '@/app/actions/admin/notification-delivery'

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

describe('Notification Delivery Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotificationDeliverySettings', () => {
    it('should return settings for admin user', async () => {
      const mockSettings = {
        id: 'delivery-id',
        smtp_enabled: true,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'encrypted_password',
        smtp_encryption: 'tls' as const,
        smtp_from_email: 'admin@example.com',
        smtp_from_name: 'Example Admin',
        smtp_reply_to: 'admin@example.com',
        smtp_max_recipients: 100,
        smtp_timeout_seconds: 30,
        sms_enabled: false,
        sms_provider: 'default' as const,
        sms_api_key: null,
        sms_api_secret: null,
        sms_from_number: null,
        sms_max_length: 90,
        sms_encoding: 'utf8' as const,
        sms_timeout_seconds: 10,
        push_enabled: false,
        push_provider: 'fcm' as const,
        push_api_key: null,
        push_apns_key_id: null,
        push_apns_team_id: null,
        push_apns_bundle_id: null,
        push_fcm_server_key: null,
        push_fcm_sender_id: null,
        push_ttl_seconds: 86400,
        push_sound: 'default',
        web_enabled: true,
        web_require_permission: true,
        web_vapid_public_key: null,
        web_vapid_private_key: null,
        web_subject: 'mailto:admin@example.com',
        rate_limit_enabled: true,
        rate_limit_per_minute: 60,
        rate_limit_per_hour: 1000,
        rate_limit_per_day: 10000,
        retry_enabled: true,
        retry_max_attempts: 3,
        retry_delay_seconds: 60,
        retry_backoff_multiplier: 2.0,
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

      const result = await getNotificationDeliverySettings()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.smtp_host).toBe('smtp.example.com')
      expect(result.data?.smtp_port).toBe(587)
      expect(result.data?.smtp_encryption).toBe('tls')
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

      const result = await getNotificationDeliverySettings()

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

      const result = await getNotificationDeliverySettings()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateNotificationDeliverySettings', () => {
    const validSettings = {
      smtp_enabled: true,
      smtp_host: 'smtp.example.com',
      smtp_port: 587,
      smtp_username: 'user@example.com',
      smtp_password: 'new_password',
      smtp_encryption: 'tls' as const,
      smtp_from_name: 'Example Admin',
      smtp_from_email: 'admin@example.com',
      smtp_reply_to: 'admin@example.com',
      smtp_max_recipients: 100,
      smtp_timeout_seconds: 30,
      sms_enabled: false,
      sms_provider: 'default' as const,
      sms_api_key: null,
      sms_api_secret: null,
      sms_from_number: null,
      sms_max_length: 90,
      sms_encoding: 'utf8' as const,
      sms_timeout_seconds: 10,
      push_enabled: false,
      push_provider: 'fcm' as const,
      push_api_key: null,
      push_apns_key_id: null,
      push_apns_team_id: null,
      push_apns_bundle_id: null,
      push_fcm_server_key: null,
      push_fcm_sender_id: null,
      push_ttl_seconds: 86400,
      push_sound: 'default',
      web_enabled: true,
      web_require_permission: true,
      web_vapid_public_key: null,
      web_vapid_private_key: null,
      web_subject: 'mailto:admin@example.com',
      rate_limit_enabled: true,
      rate_limit_per_minute: 60,
      rate_limit_per_hour: 1000,
      rate_limit_per_day: 10000,
      retry_enabled: true,
      retry_max_attempts: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2.0,
    }

    it('should update SMTP settings with valid data', async () => {
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
          if (table === 'notification_delivery_settings') {
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'delivery-id', ...validSettings },
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

      const result = await updateNotificationDeliverySettings(validSettings as any)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate smtp_port range (1-65535)', async () => {
      const invalidPortSettings = {
        ...validSettings,
        smtp_port: 70000, // Invalid port
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

      const result = await updateNotificationDeliverySettings(invalidPortSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('포트')
    })

    it('should validate smtp_encryption enum', async () => {
      const invalidEncryptionSettings = {
        ...validSettings,
        smtp_encryption: 'invalid' as any,
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

      const result = await updateNotificationDeliverySettings(invalidEncryptionSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은 암호화')
    })

    it('should validate sms_provider enum', async () => {
      const invalidProviderSettings = {
        ...validSettings,
        sms_provider: 'invalid_provider' as any,
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

      const result = await updateNotificationDeliverySettings(invalidProviderSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은')
    })

    it('should add audit log entry for security-sensitive changes', async () => {
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
          if (table === 'notification_delivery_settings') {
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'delivery-id', ...validSettings },
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

      await updateNotificationDeliverySettings(validSettings as any)

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

      const result = await updateNotificationDeliverySettings(validSettings as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })
})
