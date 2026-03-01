/**
 * Admin Actions Tests - Phase 15: Logging UI
 * Tests for getActivityLogs and exportActivityLogsToCsv
 */

import {
  getActivityLogs,
  exportActivityLogsToCsv,
  type ActivityLogFilters,
  type ActivityLog,
} from '@/app/actions/admin'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')

// Mock user data defined at module scope for use in helper functions
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  role: 'admin',
}

// Helper function for admin auth
function mockAdminAuth() {
  return createClient.mockResolvedValue({
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
}

describe('Admin Actions - Activity Logs', () => {
  const mockNormalUser = {
    id: 'normal-user-id',
    email: 'user@example.com',
    role: 'user',
  }

  const mockActivityLogs: ActivityLog[] = [
    {
      id: 'log-1',
      user_id: 'user-1',
      action: 'create',
      target_type: 'post',
      target_id: 'post-1',
      description: 'Created a new post',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      metadata: { post_id: 'post-1' },
      severity: 'info',
      module: 'board',
      created_at: '2024-02-24T10:00:00Z',
      user_email: 'user1@example.com',
      user_display_name: 'User One',
    },
    {
      id: 'log-2',
      user_id: 'user-2',
      action: 'delete',
      target_type: 'comment',
      target_id: 'comment-1',
      description: 'Deleted a comment',
      ip_address: '192.168.1.2',
      user_agent: 'Chrome/120.0',
      metadata: { comment_id: 'comment-1' },
      severity: 'warning',
      module: 'board',
      created_at: '2024-02-24T09:00:00Z',
      user_email: 'user2@example.com',
      user_display_name: 'User Two',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getActivityLogs', () => {
    it('should return activity logs for admin users', async () => {
      // Mock admin auth check
      mockAdminAuth()

      // Mock getActivityLogs query
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockActivityLogs.map((log) => ({
                      ...log,
                      profiles: {
                        email: log.user_email,
                        display_name: log.user_display_name,
                      },
                    })),
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, {})

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(2)
    })

    it('should deny access for non-admin users', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await getActivityLogs(1, 50, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('관리자 권한이 필요합니다.')
    })

    it('should apply user_id filter', async () => {
      const filters: ActivityLogFilters = {
        user_id: 'user-1',
      }

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [mockActivityLogs[0]],
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAdminUser },
            error: null,
          }),
        },
        from: mockFrom,
      })

      const result = await getActivityLogs(1, 50, filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(1)
      expect(mockFrom).toHaveBeenCalledWith('activity_log')
    })

    it('should apply action filter', async () => {
      const filters: ActivityLogFilters = {
        action: 'delete',
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [mockActivityLogs[1]],
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(1)
      expect(result.data?.logs[0].action).toBe('delete')
    })

    it('should apply severity filter', async () => {
      const filters: ActivityLogFilters = {
        severity: 'warning',
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [mockActivityLogs[1]],
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs[0].severity).toBe('warning')
    })

    it('should apply date range filters', async () => {
      const filters: ActivityLogFilters = {
        date_from: '2024-02-01T00:00:00Z',
        date_to: '2024-02-29T23:59:59Z',
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
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockActivityLogs,
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, filters)

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(2)
    })

    it('should apply search filter on description and metadata', async () => {
      const filters: ActivityLogFilters = {
        search: 'post',
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
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [mockActivityLogs[0]],
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, filters)

      expect(result.success).toBe(true)
    })

    it('should handle pagination correctly', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockActivityLogs,
                    error: null,
                    count: 100,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(2, 10, {})

      expect(result.success).toBe(true)
      expect(result.data?.total_count).toBe(100)
    })

    it('should return empty logs when none exist', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, {})

      expect(result.success).toBe(true)
      expect(result.data?.logs).toHaveLength(0)
      expect(result.data?.total_count).toBe(0)
    })

    it('should handle database errors', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                    count: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActivityLogs(1, 50, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('알 수 없는 오류가 발생했습니다.')
    })
  })

  describe('exportActivityLogsToCsv', () => {
    it('should export logs to CSV format', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockActivityLogs.map((log) => ({
                      ...log,
                      profiles: {
                        email: log.user_email,
                        display_name: log.user_display_name,
                      },
                    })),
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await exportActivityLogsToCsv({})

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.logs).toBeDefined()
      expect(result.data?.export_date).toBeDefined()
    })

    it('should include logs in export', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockActivityLogs.map((log) => ({
                      ...log,
                      profiles: {
                        email: log.user_email,
                        display_name: log.user_display_name,
                      },
                    })),
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await exportActivityLogsToCsv({})

      expect(result.success).toBe(true)
      expect(result.data?.logs).toBeDefined()
      expect(result.data?.total_count).toBeGreaterThanOrEqual(0)
    })

    it('should apply filters to CSV export', async () => {
      const filters: ActivityLogFilters = {
        action: 'create',
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [mockActivityLogs[0]],
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await exportActivityLogsToCsv(filters)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should deny access for non-admin users', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await exportActivityLogsToCsv({})

      expect(result.success).toBe(false)
      expect(result.error).toBe('관리자 권한이 필요합니다.')
    })

    it('should handle empty log set', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await exportActivityLogsToCsv({})

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle database errors during export', async () => {
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
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                    count: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await exportActivityLogsToCsv({})

      expect(result.success).toBe(false)
      expect(result.error).toBe('알 수 없는 오류가 발생했습니다.')
    })
  })
})
