/**
 * Board Settings API Tests
 * Tests for getBoardSettings, updateBoardSettings, and getAllBoardSettings actions
 */

import {
  getBoardSettings,
  updateBoardSettings,
  getAllBoardSettings,
} from '@/app/actions/admin/board-settings'

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

const mockBoardId = 'board-123-uuid'

const mockBoardConfig = {
  post_permission: 'member',
  comment_permission: 'all',
  list_count: 20,
  search_list_count: 20,
  page_count: 10,
  anonymous: false,
  use_category: true,
  use_tags: true,
  use_editor: true,
  use_file: true,
  max_file_size: 10485760,
  allowed_file_extensions: ['jpg', 'png', 'gif', 'pdf'],
  max_file_count: 5,
  // WHW-020: Basic settings
  module_category: 'general',
  layout_srl: null,
  skin_srl: null,
  use_mobile: true,
  mobile_layout_srl: null,
  mobile_skin_srl: null,
  description: 'General discussion board',
  header_content: null,
  footer_content: null,
  // WHW-021: Content settings
  history_tracking: 'update',
  use_vote_up: true,
  use_vote_down: true,
  vote_up_level: 'member',
  vote_down_level: 'member',
  allow_vote_same_ip: false,
  cancel_vote: true,
  allow_vote_guest: false,
  use_report: true,
  report_target: 'admin',
  // WHW-022: Comment settings
  comment_count: 20,
  comment_page_count: 10,
  comment_max_depth: 5,
  comment_default_page: 'last' as const,
}

const mockBoard = {
  id: mockBoardId,
  slug: 'general',
  title: 'General Board',
  description: 'General discussion board',
  content: null,
  icon: null,
  banner_url: null,
  config: mockBoardConfig,
  skin: 'default',
  list_order: 1,
  sort_order: 'created_at',
  view_count: 1000,
  post_count: 50,
  comment_count: 200,
  is_notice: false,
  is_hidden: false,
  is_locked: false,
  is_secret: false,
  admin_id: mockAdminUser.id,
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

describe('Board Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =====================================================
  // getBoardSettings Tests
  // =====================================================

  describe('getBoardSettings', () => {
    it('should return board settings for admin users', async () => {
      // First call: admin auth check
      const adminAuthClient = createAdminAuthMock()

      // Second call: get board settings
      const settingsClient = {
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
                data: { config: mockBoardConfig },
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getBoardSettings(mockBoardId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBoardConfig)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getBoardSettings(mockBoardId)

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

      const result = await getBoardSettings(mockBoardId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('로그인')
    })

    it('should return error when board not found', async () => {
      // Admin auth client
      const adminAuthClient = createAdminAuthMock()

      // Board fetch returns error
      const settingsClient = {
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

      const result = await getBoardSettings('non-existent-board')

      expect(result.success).toBe(false)
      expect(result.error).toContain('게시판을 찾을 수 없습니다')
    })
  })

  // =====================================================
  // updateBoardSettings Tests
  // =====================================================

  describe('updateBoardSettings', () => {
    it('should update board settings for admin users', async () => {
      const updateData = {
        list_count: 30,
        use_category: false,
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
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { config: mockBoardConfig, title: 'General Board' },
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      const updatedConfig = { ...mockBoardConfig, ...updateData }
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { config: updatedConfig },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await updateBoardSettings(mockBoardId, updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate comment_count range (WHW-022)', async () => {
      const invalidData = {
        comment_count: 200, // Max is 100
      }

      // Only need to mock admin auth - validation fails before second createClient call
      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateBoardSettings(mockBoardId, invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate comment_max_depth range (WHW-022)', async () => {
      const invalidData = {
        comment_max_depth: 15, // Max is 10
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateBoardSettings(mockBoardId, invalidData)

      expect(result.success).toBe(false)
    })

    it('should validate history_tracking enum values (WHW-021)', async () => {
      const invalidData = {
        history_tracking: 'invalid_value', // Must be 'none', 'update', or 'history'
      }

      const adminAuthClient = createAdminAuthMock()
      createClient.mockResolvedValueOnce(adminAuthClient as any)

      const result = await updateBoardSettings(mockBoardId, invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should deny update for non-admin users', async () => {
      const updateData = {
        list_count: 30,
      }

      const mockClient = createNormalUserAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updateBoardSettings(mockBoardId, updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should add audit log entry on successful update', async () => {
      const updateData = {
        list_count: 30,
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
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { config: mockBoardConfig, title: 'General Board' },
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      const updatedConfig = { ...mockBoardConfig, ...updateData }
      settingsClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { config: updatedConfig },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      await updateBoardSettings(mockBoardId, updateData)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.any(Object))
      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[1].action_text).toBe('update')
      expect(rpcCall[1].target_type_text).toBe('board_settings')
    })
  })

  // =====================================================
  // getAllBoardSettings Tests
  // =====================================================

  describe('getAllBoardSettings', () => {
    it('should return all board settings for admin users', async () => {
      // First call: admin auth check
      const adminAuthClient = createAdminAuthMock()

      // Second call: get all boards
      const settingsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockBoard],
              error: null,
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(settingsClient as any)

      const result = await getAllBoardSettings()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe(mockBoardId)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getAllBoardSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })
})
