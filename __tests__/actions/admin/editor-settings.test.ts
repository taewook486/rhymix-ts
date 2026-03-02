/**
 * Editor Settings API Tests
 * Tests for getEditorSettings and updateEditorSettings actions (WHW-030~WHW-032)
 */

import {
  getEditorSettings,
  updateEditorSettings,
} from '@/app/actions/admin/editor-settings'

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

const mockEditorSettings = {
  id: 'editor-settings-id',
  editor_skin: 'ckeditor',
  color_scheme: 'mondo',
  editor_height: 300,
  toolbar_set: 'basic',
  hide_toolbar: false,
  font_family: 'sans-serif',
  font_size: 14,
  line_height: 1.5,
  enabled_tools: ['bold', 'italic', 'underline', 'link', 'image'],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

// Helper to create admin auth mock
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

// Helper to create normal user auth mock
function createNormalUserAuthMock() {
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

describe('Editor Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =====================================================
  // getEditorSettings Tests
  // =====================================================

  describe('getEditorSettings', () => {
    it('should return editor settings for admin users', async () => {
      // First call: admin auth check
      const adminAuthClient = createAdminAuthMock()

      // Second call: get editor settings
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
                data: mockEditorSettings,
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getEditorSettings()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        editor_skin: 'ckeditor',
        color_scheme: 'mondo',
        editor_height: 300,
        toolbar_set: 'basic',
        hide_toolbar: false,
        font_family: 'sans-serif',
        font_size: 14,
        line_height: 1.5,
        enabled_tools: ['bold', 'italic', 'underline', 'link', 'image'],
      })
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getEditorSettings()

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

      const result = await getEditorSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('로그인')
    })

    it('should return error when settings not found', async () => {
      // Admin auth client
      const adminAuthClient = createAdminAuthMock()

      // Settings fetch returns error
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
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getEditorSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('설정을 찾을 수 없습니다')
    })
  })

  // =====================================================
  // updateEditorSettings Tests
  // =====================================================

  describe('updateEditorSettings', () => {
    it('should update editor settings for admin users', async () => {
      const updateData = {
        editor_height: 400,
        font_size: 16,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      // First call: admin auth check
      const adminAuthClient = createAdminAuthMock()

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
              data: mockEditorSettings,
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      const updatedSettings = { ...mockEditorSettings, ...updateData }
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: updatedSettings,
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updateEditorSettings(updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('저장')
    })

    it('should validate editor_skin enum values (WHW-030)', async () => {
      const invalidData = {
        editor_skin: 'invalid_editor', // Must be 'ckeditor', 'simpleeditor', or 'textarea'
      }

      // Only need to mock admin auth - validation fails before second createClient call
      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should validate color_scheme enum values (WHW-030)', async () => {
      const invalidData = {
        color_scheme: 'invalid_scheme', // Must be 'mondo', 'mondo-dark', or 'mondo-lisa'
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should validate editor_height range (WHW-030)', async () => {
      const invalidData = {
        editor_height: 3000, // Max is 2000
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate font_size range (WHW-031)', async () => {
      const invalidData = {
        font_size: 100, // Max is 72
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate line_height range (WHW-031)', async () => {
      const invalidData = {
        line_height: 5.0, // Max is 3.0
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate toolbar_set enum values (WHW-030)', async () => {
      const invalidData = {
        toolbar_set: 'expert', // Must be 'basic' or 'advanced'
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateEditorSettings(invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should deny update for non-admin users', async () => {
      const updateData = {
        editor_height: 400,
      }

      const mockClient = createNormalUserAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updateEditorSettings(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should add audit log entry on successful update', async () => {
      const updateData = {
        editor_height: 400,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      // First call: admin auth check
      const adminAuthClient = createAdminAuthMock()

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
              data: mockEditorSettings,
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      const updatedSettings = { ...mockEditorSettings, ...updateData }
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: updatedSettings,
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      await updateEditorSettings(updateData)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.any(Object))
      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[1].action_text).toBe('update')
      expect(rpcCall[1].target_type_text).toBe('editor_settings')
      expect(rpcCall[1].description_text).toContain('에디터 설정')
    })
  })
})
