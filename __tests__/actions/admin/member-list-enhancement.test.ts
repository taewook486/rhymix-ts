/**
 * Member List Enhancement Tests (TDD - Sprint 1)
 * Tests for advanced filters, bulk actions, and export
 */

import {
  getMembersAdvanced,
  bulkStatusChange,
  bulkGroupAssign,
  exportMembersToCsv,
  type AdvancedMemberFilters,
  type BulkActionRequest,
} from '@/app/actions/admin/members'

const { createClient } = require('@/lib/supabase/server')

const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
}

describe('Member List Enhancement - Sprint 1 (TDD)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMembersAdvanced', () => {
    it('should support status filter', async () => {
      // Mock admin auth
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
          return {}
        }),
      })

      // Mock query
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [{ id: 'user-1', status: 'approved' }],
              error: null,
            }),
          }),
        }),
      })

      const filters: AdvancedMemberFilters = { status: 'approved' }
      const result = await getMembersAdvanced(filters)

      expect(result.success).toBe(true)
    })

    it('should support group filter', async () => {
      // Mock admin auth and query
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [{ id: 'user-1', group_id: 'group-1' }],
              error: null,
            }),
          }),
        }),
      })

      const filters: AdvancedMemberFilters = { group_id: 'group-1' }
      const result = await getMembersAdvanced(filters)

      expect(result.success).toBe(true)
    })

    it('should support date range filter', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const filters: AdvancedMemberFilters = {
        date_from: '2026-01-01',
        date_to: '2026-12-31',
      }
      const result = await getMembersAdvanced(filters)

      expect(result.success).toBe(true)
    })
  })

  describe('bulkStatusChange', () => {
    it('should change status for multiple users', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

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
          update: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'user-1' }, { id: 'user-2' }],
              error: null,
            }),
          }),
        }),
        rpc: mockRpc,
      })

      const request: BulkActionRequest = {
        user_ids: ['user-1', 'user-2'],
        action: 'statusChange',
        value: 'approved',
      }

      const result = await bulkStatusChange(request)

      expect(result.success).toBe(true)
      expect(result.message).toContain('변경')
    })

    it('should require admin role', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'normal-user' } },
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

      const request: BulkActionRequest = {
        user_ids: ['user-1'],
        action: 'statusChange',
        value: 'denied',
      }

      const result = await bulkStatusChange(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('권한')
    })

    it('should add audit log for each change', async () => {
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

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
          update: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'user-1' }],
              error: null,
            }),
          }),
        }),
        rpc: mockRpc,
      })

      const request: BulkActionRequest = {
        user_ids: ['user-1'],
        action: 'statusChange',
        value: 'approved',
      }

      await bulkStatusChange(request)

      expect(mockRpc).toHaveBeenCalledWith('log_activity', expect.any(Object))
    })
  })

  describe('bulkGroupAssign', () => {
    it('should assign group to multiple users', async () => {
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
          if (table === 'user_groups') {
            return {
              insert: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }
          }
          return {}
        }),
        rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const request: BulkActionRequest = {
        user_ids: ['user-1', 'user-2'],
        action: 'groupAssign',
        value: 'group-id',
      }

      const result = await bulkGroupAssign(request)

      expect(result.success).toBe(true)
    })
  })

  describe('exportMembersToCsv', () => {
    it('should export members to CSV format', async () => {
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

      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'user-1', email: 'user1@example.com', display_name: 'User One' },
                { id: 'user-2', email: 'user2@example.com', display_name: 'User Two' },
              ],
              error: null,
            }),
          }),
        }),
      })

      const filters: AdvancedMemberFilters = {}
      const result = await exportMembersToCsv(filters)

      expect(result.success).toBe(true)
      expect(result.data).toContain('email')
      expect(result.data).toContain('display_name')
    })

    it('should include new fields in export', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'user-1',
                  email: 'user1@example.com',
                  display_name: 'User One',
                  homepage: 'https://example.com',
                  blog: 'https://blog.example.com',
                  birthday: '1990-01-01',
                  allow_mailing: true,
                  allow_message: 'member',
                },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await exportMembersToCsv({})

      expect(result.success).toBe(true)
      expect(result.data).toContain('homepage')
      expect(result.data).toContain('blog')
      expect(result.data).toContain('birthday')
    })
  })
})
