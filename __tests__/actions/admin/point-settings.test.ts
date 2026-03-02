/**
 * Point Settings API Tests
 * Tests for getPointSettings and updatePointSettings actions (WHW-040, WHW-041)
 */

import {
  getPointSettings,
  updatePointSettings,
  type PointSettings,
} from '@/app/actions/admin/point-settings'

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

const mockPointSettings: PointSettings = {
  id: 'settings-id',
  is_enabled: true,
  point_name: '포인트',
  max_level: 30,
  level_icon_type: 'default',
  level_icon_path: null,
  disable_download_on_low_point: false,
  disable_read_on_low_point: false,
  min_point_for_download: 0,
  min_point_for_read: 0,
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

describe('Point Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPointSettings', () => {
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
                data: mockPointSettings,
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getPointSettings()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPointSettings)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getPointSettings()

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

      const result = await getPointSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('로그인')
    })
  })

  describe('updatePointSettings', () => {
    it('should update settings with valid data', async () => {
      const updateData = {
        is_enabled: true,
        point_name: '업데이트된 포인트',
        max_level: 50,
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
              data: mockPointSettings,
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
                data: { ...mockPointSettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updatePointSettings(updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should deny update for non-admin users', async () => {
      const updateData = {
        is_enabled: false,
      }

      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updatePointSettings(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should add audit log entry on successful update', async () => {
      const updateData = {
        is_enabled: false,
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
              data: mockPointSettings,
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
                data: { ...mockPointSettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      await updatePointSettings(updateData)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        user_uuid: mockAdminUser.id,
        action_text: 'update',
        target_type_text: 'point_settings',
        severity_text: 'info',
        module_text: 'admin',
      }))
    })
  })
})
