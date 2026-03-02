/**
 * Tests for Notification Delivery Settings Actions (Sprint 4 - Phase 5)
 * UC-008: WHW-070
 * Testing notification delivery management functionality
 */

import {
  getDeliverySettings,
  updateDeliverySettings,
  type DeliverySettings,
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

  describe('getDeliverySettings', () => {
    it('should return settings for admin user', async () => {
      const mockSettings = {
        id: 'delivery-id',
        default_send_method: 'smtp',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_user: 'user@example.com',
        smtp_password: 'encrypted_password',
        smtp_security: 'tls',
        sender_name: 'Example Admin',
        sender_email: 'admin@example.com',
        api_provider: '',
        api_key: '',
        sms_provider: '',
        sms_account_sid: '',
        sms_auth_token: '',
        sms_sender_number: '',
        push_provider: '',
        push_api_key: '',
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

      const result = await getDeliverySettings()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.smtp_host).toBe('smtp.example.com')
      expect(result.data?.smtp_port).toBe(587)
      expect(result.data?.smtp_security).toBe('tls')
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

      const result = await getDeliverySettings()

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

      const result = await getDeliverySettings()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateDeliverySettings', () => {
    const validSettings: Partial<DeliverySettings> = {
      default_send_method: 'smtp',
      smtp_host: 'smtp.example.com',
      smtp_port: 587,
      smtp_user: 'user@example.com',
      smtp_password: 'new_password',
      smtp_security: 'tls',
      sender_name: 'Example Admin',
      sender_email: 'admin@example.com',
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

      const result = await updateDeliverySettings(validSettings)

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

      const result = await updateDeliverySettings(invalidPortSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('포트')
    })

    it('should validate smtp_security enum', async () => {
      const invalidSecuritySettings = {
        ...validSettings,
        smtp_security: 'invalid' as any,
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

      const result = await updateDeliverySettings(invalidSecuritySettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은 보안 설정')
    })

    it('should validate rate_limit_tier enum', async () => {
      const invalidTierSettings = {
        ...validSettings,
        rate_limit_tier: 'invalid_tier' as any,
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

      const result = await updateDeliverySettings(invalidTierSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효하지 않은 제한 등급')
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

      await updateDeliverySettings(validSettings)

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

      const result = await updateDeliverySettings(validSettings)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })
})
