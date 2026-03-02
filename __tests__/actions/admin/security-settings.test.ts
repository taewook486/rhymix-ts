/**
 * Security Settings API Tests
 * Tests for security settings actions (WHW-050, WHW-051, WHW-052)
 */

import {
  getSecuritySettings,
  updateSecuritySettings,
  type SecuritySettings,
} from '@/app/actions/admin/security-settings'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')

// Mock user data
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
}

const mockNormalUser = {
  id: 'normal-user-id',
  email: 'user@example.com',
}

const mockSecuritySettings: SecuritySettings = {
  id: 'security-settings-id',
  // WHW-050: Media Filter
  mediafilter_whitelist: 'youtube.com,vimeo.com',
  mediafilter_classes: 'embed-responsive',
  robot_user_agents: 'Googlebot,Bingbot',
  // WHW-051: Admin Access Control
  admin_allowed_ip: '',
  admin_denied_ip: '',
  // WHW-052: Session Security
  autologin_lifetime: 604800, // 7 days in seconds
  autologin_refresh: true,
  use_session_ssl: true,
  use_cookies_ssl: true,
  check_csrf_token: true,
  use_nofollow: true,
  use_httponly: true,
  use_samesite: 'Lax',
  x_frame_options: 'SAMEORIGIN',
  x_content_type_options: 'nosniff',
  // Timestamps
  created_at: '2026-03-02T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
}

// Helper to create admin auth mock client
function createAdminAuthMock() {
  return {
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
  }
}

// Helper to create normal user mock client
function createNormalUserMock() {
  return {
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
  }
}

describe('Security Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSecuritySettings', () => {
    it('should return settings for admin users', async () => {
      const adminAuthClient = createAdminAuthMock()

      const settingsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSecuritySettings,
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getSecuritySettings()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSecuritySettings)
    })

    it('should deny access for non-admin users (security sensitive)', async () => {
      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getSecuritySettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should deny access for unauthenticated users', async () => {
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockClient as any)

      const result = await getSecuritySettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('로그인')
    })
  })

  describe('updateSecuritySettings', () => {
    it('should update settings with valid data', async () => {
      const updateData = {
        autologin_lifetime: 1209600, // 14 days
        check_csrf_token: true,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const settingsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // Setup from chain for getting current settings
      settingsClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockSecuritySettings,
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockSecuritySettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updateSecuritySettings(updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should add audit log with warning severity on successful update', async () => {
      const updateData = {
        check_csrf_token: true,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const settingsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // Setup from chain for getting current settings
      settingsClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockSecuritySettings,
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockSecuritySettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      await updateSecuritySettings(updateData)

      // Security changes should be logged with 'warning' severity
      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        user_uuid: mockAdminUser.id,
        action_text: 'update',
        target_type_text: 'security_settings',
        severity_text: 'warning', // Security changes use warning severity
        module_text: 'admin',
      }))
    })

    it('should deny update for non-admin users', async () => {
      const updateData = {
        check_csrf_token: false,
      }

      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updateSecuritySettings(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should accept valid IPv4 addresses with CIDR notation', async () => {
      const updateData = {
        admin_allowed_ip: '192.168.1.0/24,10.0.0.0/8',
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const settingsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      settingsClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockSecuritySettings,
              error: null,
            }),
          }),
        }),
      })

      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockSecuritySettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updateSecuritySettings(updateData)

      expect(result.success).toBe(true)
    })
  })
})
