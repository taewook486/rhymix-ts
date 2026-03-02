/**
 * Level-Group Mapping API Tests
 * Tests for level-group synchronization settings (WHW-043)
 */

import {
  getLevelGroupMapping,
  updateLevelGroupMapping,
  getLevelGroups,
  updateLevelGroup,
  getGroupsList,
  type LevelGroupMapping,
  type LevelGroup,
  type Group,
} from '@/app/actions/admin/level-group-mapping'

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

const mockLevelGroupMapping: LevelGroupMapping = {
  id: 'mapping-id',
  group_sync_mode: 'replace',
  point_decrease_mode: 'keep',
  created_at: '2026-03-02T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
}

const mockLevelGroups: LevelGroup[] = [
  { id: 'lg-1', level: 1, group_id: '123e4567-e89b-12d3-a456-426614174001', created_at: '2026-03-02T00:00:00Z' },
  { id: 'lg-2', level: 2, group_id: '123e4567-e89b-12d3-a456-426614174002', created_at: '2026-03-02T00:00:00Z' },
  { id: 'lg-3', level: 3, group_id: null, created_at: '2026-03-02T00:00:00Z' },
]

const mockGroups: Group[] = [
  { id: '123e4567-e89b-12d3-a456-426614174001', title: '정회원', description: '정회원 그룹', is_default: false, created_at: '2026-03-02T00:00:00Z' },
  { id: '123e4567-e89b-12d3-a456-426614174002', title: '우수회원', description: '우수회원 그룹', is_default: false, created_at: '2026-03-02T00:00:00Z' },
  { id: '123e4567-e89b-12d3-a456-426614174003', title: '준회원', description: '준회원 그룹', is_default: true, created_at: '2026-03-02T00:00:00Z' },
]

// Valid UUIDs for testing
const VALID_GROUP_UUID = '123e4567-e89b-12d3-a456-426614174001'
const INVALID_GROUP_UUID = '00000000-0000-0000-0000-000000000000'

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

describe('Level-Group Mapping API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLevelGroupMapping', () => {
    it('should return mapping settings for admin users', async () => {
      const adminAuthClient = createAdminAuthMock()

      const mappingClient = {
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
                data: mockLevelGroupMapping,
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mappingClient as any)

      const result = await getLevelGroupMapping()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockLevelGroupMapping)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getLevelGroupMapping()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })

  describe('updateLevelGroupMapping', () => {
    it('should update sync mode with valid data', async () => {
      const updateData = {
        group_sync_mode: 'add' as const,
        point_decrease_mode: 'keep' as const,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const mappingClient = {
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
      mappingClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockLevelGroupMapping,
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      mappingClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockLevelGroupMapping, group_sync_mode: 'add' },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mappingClient as any)

      const result = await updateLevelGroupMapping(updateData)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })
  })

  describe('getLevelGroups', () => {
    it('should return all level-group assignments for admin users', async () => {
      const adminAuthClient = createAdminAuthMock()

      const levelGroupsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockLevelGroups,
              error: null,
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(levelGroupsClient as any)

      const result = await getLevelGroups()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockLevelGroups)
      expect(result.data?.length).toBe(3)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getLevelGroups()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })

  describe('updateLevelGroup', () => {
    it('should upsert level-group mapping with valid data', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      // First call: isAdmin check
      const adminAuthClient = createAdminAuthMock()

      // Second call: main function - needs to handle both group check and upsert
      const mainClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // First from call: check group exists
      mainClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { id: VALID_GROUP_UUID },
              error: null,
            }),
          }),
        }),
      })

      // Second from call: upsert
      mainClient.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lg-new', level: 5, group_id: VALID_GROUP_UUID, created_at: '2026-03-02T00:00:00Z' },
              error: null,
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mainClient as any)

      const result = await updateLevelGroup(5, VALID_GROUP_UUID)

      expect(result.success).toBe(true)
      expect(result.message).toContain('레벨 5')
    })

    it('should return error for non-existent group', async () => {
      const adminAuthClient = createAdminAuthMock()

      const mainClient = {
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
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mainClient as any)

      const result = await updateLevelGroup(5, INVALID_GROUP_UUID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('그룹')
    })

    it('should allow null group_id to remove assignment', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      // When group_id is null, no group check - only upsert
      const mainClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'lg-5', level: 5, group_id: null, created_at: '2026-03-02T00:00:00Z' },
                error: null,
              }),
            }),
          }),
        }),
        rpc: mockRpc,
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mainClient as any)

      const result = await updateLevelGroup(5, null)

      expect(result.success).toBe(true)
    })

    it('should add audit log on successful update', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const mainClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // First from call: check group exists
      mainClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { id: VALID_GROUP_UUID },
              error: null,
            }),
          }),
        }),
      })

      // Second from call: upsert
      mainClient.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lg-5', level: 5, group_id: VALID_GROUP_UUID, created_at: '2026-03-02T00:00:00Z' },
              error: null,
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(mainClient as any)

      await updateLevelGroup(5, VALID_GROUP_UUID)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        user_uuid: mockAdminUser.id,
        action_text: 'update',
        target_type_text: 'level_group',
        severity_text: 'info',
        module_text: 'admin',
      }))
    })
  })

  describe('getGroupsList', () => {
    it('should return all groups for admin users', async () => {
      const adminAuthClient = createAdminAuthMock()

      const groupsClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockGroups,
              error: null,
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(groupsClient as any)

      const result = await getGroupsList()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockGroups)
      expect(result.data?.length).toBe(3)
    })
  })
})
