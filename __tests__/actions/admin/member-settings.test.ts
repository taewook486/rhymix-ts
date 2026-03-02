/**
 * Member Settings API Tests
 * Tests for getMemberSettings and updateMemberSettings actions
 */

import {
  getMemberSettings,
  updateMemberSettings,
  type MemberSettingsUpdate,
} from '@/app/actions/admin/member-settings'

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

const mockMemberSettings = {
  id: 'settings-id',
  enable_join: true,
  enable_join_key: null,
  enable_confirm: true,
  authmail_expires: 86400,
  member_profile_view: 'member',
  allow_nickname_change: true,
  update_nickname_log: true,
  nickname_symbols: false,
  nickname_spaces: false,
  allow_duplicate_nickname: false,
  password_strength: 'normal',
  password_hashing_algorithm: 'bcrypt',
  password_hashing_work_factor: 10,
  password_hashing_auto_upgrade: true,
  password_change_invalidate_other_sessions: true,
  password_reset_method: 'email',
  created_at: '2026-03-02T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
}

describe('Member Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMemberSettings', () => {
    it('should return settings for admin users', async () => {
      // First call: admin auth check
      const adminAuthClient = {
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

      // Second call: get member settings
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
                data: mockMemberSettings,
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getMemberSettings()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberSettings)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = {
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

      createClient.mockResolvedValue(mockClient as any)

      const result = await getMemberSettings()

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

      const result = await getMemberSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('로그인')
    })
  })

  describe('updateMemberSettings', () => {
    it('should update settings for admin users', async () => {
      const updateData: MemberSettingsUpdate = {
        enable_join: false,
        password_strength: 'strong',
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      // First call: admin auth check
      const adminAuthClient = {
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

      // Second call: get current settings, update, and RPC
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
              data: mockMemberSettings,
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
                data: { ...mockMemberSettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updateMemberSettings(updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate password_strength values', async () => {
      const invalidData: any = {
        password_strength: 'invalid',
      }

      // Admin auth only needed (validation happens before DB operations)
      const mockClient = {
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

      createClient.mockResolvedValue(mockClient as any)

      const result = await updateMemberSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate password_hashing_algorithm values', async () => {
      const invalidData: any = {
        password_hashing_algorithm: 'md5',
      }

      const mockClient = {
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

      createClient.mockResolvedValue(mockClient as any)

      const result = await updateMemberSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate password_hashing_work_factor range', async () => {
      const invalidData: MemberSettingsUpdate = {
        password_hashing_work_factor: 20, // Max is 15
      }

      const mockClient = {
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

      createClient.mockResolvedValue(mockClient as any)

      const result = await updateMemberSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should deny update for non-admin users', async () => {
      const updateData: MemberSettingsUpdate = {
        enable_join: false,
      }

      const mockClient = {
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

      createClient.mockResolvedValue(mockClient as any)

      const result = await updateMemberSettings(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should add audit log entry on successful update', async () => {
      const updateData: MemberSettingsUpdate = {
        enable_join: false,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      // First call: admin auth check
      const adminAuthClient = {
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

      // Second call: get current settings, update, and RPC
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
              data: mockMemberSettings,
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
                data: { ...mockMemberSettings, ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      await updateMemberSettings(updateData)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.any(Object))
    })
  })
})
