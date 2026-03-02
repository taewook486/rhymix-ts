/**
 * Point Rules API Tests
 * Tests for getPointRules, getPointRule, updatePointRule, and updatePointRulesBatch actions (WHW-042)
 */

import {
  getPointRules,
  getPointRule,
  updatePointRule,
  updatePointRulesBatch,
  type PointRule,
  type PointRuleBatchUpdate,
} from '@/app/actions/admin/point-rules'

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

const mockPointRules: PointRule[] = [
  {
    id: 'rule-1',
    action: 'document_insert',
    name: '문서 작성',
    description: '새 문서 작성 시 포인트 부여',
    point: 10,
    revert_on_delete: true,
    daily_limit: 100,
    per_content_limit: null,
    except_notice: true,
    except_admin: true,
    is_active: true,
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    id: 'rule-2',
    action: 'comment_insert',
    name: '댓글 작성',
    description: '댓글 작성 시 포인트 부여',
    point: 5,
    revert_on_delete: true,
    daily_limit: 50,
    per_content_limit: null,
    except_notice: false,
    except_admin: true,
    is_active: true,
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
]

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

describe('Point Rules API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPointRules', () => {
    it('should return all rules for admin users', async () => {
      const adminAuthClient = createAdminAuthMock()

      const rulesClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockPointRules,
              error: null,
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(rulesClient as any)

      const result = await getPointRules()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPointRules)
      expect(result.data?.length).toBe(2)
    })

    it('should deny access for non-admin users', async () => {
      const mockClient = createNormalUserMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await getPointRules()

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })
  })

  describe('getPointRule', () => {
    it('should return specific rule by action', async () => {
      const adminAuthClient = createAdminAuthMock()

      const ruleClient = {
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
                data: mockPointRules[0],
                error: null,
              }),
            }),
          }),
        }),
      }

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(ruleClient as any)

      const result = await getPointRule('document_insert')

      expect(result.success).toBe(true)
      expect(result.data?.action).toBe('document_insert')
    })

    it('should return error for non-existent rule', async () => {
      const adminAuthClient = createAdminAuthMock()

      const ruleClient = {
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
        .mockResolvedValueOnce(ruleClient as any)

      const result = await getPointRule('non_existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('찾을 수 없습니다')
    })
  })

  describe('updatePointRule', () => {
    it('should update single rule with valid data', async () => {
      const updateData = {
        point: 20,
        daily_limit: 200,
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const ruleClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // Setup from chain for getting current rule
      ruleClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockPointRules[0],
              error: null,
            }),
          }),
        }),
      })

      // Setup from chain for update
      ruleClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPointRules[0], ...updateData },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(ruleClient as any)

      const result = await updatePointRule('rule-1', updateData as any)

      expect(result.success).toBe(true)
      expect(result.message).toContain('수정')
    })

    it('should validate point value is integer', async () => {
      const invalidData = {
        point: 10.5, // Must be integer
      }

      const mockClient = createAdminAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updatePointRule('rule-1', invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should validate daily_limit positive constraint', async () => {
      const invalidData = {
        daily_limit: 0, // Must be positive (1 or greater)
      }

      const mockClient = createAdminAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updatePointRule('rule-1', invalidData as any)

      expect(result.success).toBe(false)
    })

    it('should allow null for daily_limit', async () => {
      const updateData = {
        daily_limit: null, // null is valid (no limit)
      }

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const ruleClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      ruleClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValue({
              data: mockPointRules[0],
              error: null,
            }),
          }),
        }),
      })

      ruleClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPointRules[0], daily_limit: null },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(ruleClient as any)

      const result = await updatePointRule('rule-1', updateData as any)

      expect(result.success).toBe(true)
    })
  })

  describe('updatePointRulesBatch', () => {
    it('should update multiple rules in batch', async () => {
      const batchUpdates: PointRuleBatchUpdate[] = [
        { id: 'rule-1', data: { point: 15 } as any },
        { id: 'rule-2', data: { point: 8 } as any },
      ]

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const rulesClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      // Setup for getting current rules
      rulesClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          in: jest.fn().mockResolvedValue({
            data: mockPointRules,
            error: null,
          }),
        }),
      })

      // Setup for each update
      rulesClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPointRules[0], point: 15 },
                error: null,
              }),
            }),
          }),
        }),
      })

      rulesClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPointRules[1], point: 8 },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(rulesClient as any)

      const result = await updatePointRulesBatch(batchUpdates)

      expect(result.success).toBe(true)
      expect(result.message).toContain('2개')
    })

    it('should validate all inputs before batch update', async () => {
      const batchUpdates: PointRuleBatchUpdate[] = [
        { id: 'rule-1', data: { point: 10 } as any },
        { id: 'rule-2', data: { daily_limit: -5 } as any }, // Invalid: must be positive
      ]

      const mockClient = createAdminAuthMock()
      createClient.mockResolvedValue(mockClient as any)

      const result = await updatePointRulesBatch(batchUpdates)

      expect(result.success).toBe(false)
    })

    it('should add audit log for batch update', async () => {
      const batchUpdates: PointRuleBatchUpdate[] = [
        { id: 'rule-1', data: { point: 15 } as any },
      ]

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const adminAuthClient = createAdminAuthMock()

      const rulesClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn(),
        rpc: mockRpc,
      }

      rulesClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          in: jest.fn().mockResolvedValue({
            data: [mockPointRules[0]],
            error: null,
          }),
        }),
      })

      rulesClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPointRules[0], point: 15 },
                error: null,
              }),
            }),
          }),
        }),
      })

      createClient
        .mockResolvedValueOnce(adminAuthClient as any)
        .mockResolvedValueOnce(rulesClient as any)

      await updatePointRulesBatch(batchUpdates)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        action_text: 'batch_update',
        target_type_text: 'point_rules',
        severity_text: 'info',
      }))
    })
  })
})
