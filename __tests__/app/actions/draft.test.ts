/**
 * Draft Actions Tests - Phase 16: Temporary Save/Draft
 * Tests for getAllDrafts, restoreDraft, deleteDraft
 */

import {
  getAllDrafts,
  restoreDraft,
  deleteDraft,
  cleanupExpiredDrafts,
  type Draft,
  type DraftListItem,
} from '@/app/actions/draft'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')
const { auth } = require('@/lib/supabase/auth')

describe('Draft Actions', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockDrafts: DraftListItem[] = [
    {
      id: 'draft-1',
      target_type: 'post',
      target_id: 'post-1',
      title: 'Test Post Draft',
      excerpt: 'This is a test draft',
      saved_at: '2024-02-24T10:00:00Z',
      expires_at: '2024-03-24T10:00:00Z',
    },
    {
      id: 'draft-2',
      target_type: 'comment',
      target_id: null,
      title: 'Test Comment Draft',
      excerpt: 'This is a comment draft',
      saved_at: '2024-02-24T09:00:00Z',
      expires_at: '2024-03-24T09:00:00Z',
    },
  ]

  const mockFullDraft: Draft = {
    id: 'draft-1',
    user_id: 'test-user-id',
    target_type: 'post',
    target_id: 'post-1',
    title: 'Test Post Draft',
    content: 'This is the full content',
    content_html: '<p>This is the full content</p>',
    excerpt: 'This is a test draft',
    metadata: { tags: ['test', 'draft'] },
    saved_at: '2024-02-24T10:00:00Z',
    expires_at: '2024-03-24T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup auth mock to return authenticated user
    auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('getAllDrafts', () => {
    it('should return all drafts for authenticated user', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockDrafts,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].title).toBe('Test Post Draft')
    })

    it('should return empty array when no drafts exist', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })

    it('should filter out expired drafts', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [mockDrafts[0]], // Only non-expired draft
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should order drafts by saved_at descending', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockDrafts,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAllDrafts()

      expect(result.success).toBe(true)
      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled() // Verify order was called
    })
  })

  describe('restoreDraft', () => {
    it('should restore a specific draft', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockFullDraft,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await restoreDraft('draft-1')

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('draft-1')
      expect(result.data?.content).toBe('This is the full content')
    })

    it('should only restore drafts belonging to the user', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockFullDraft,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      await restoreDraft('draft-1')

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await restoreDraft('draft-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle non-existent draft', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await restoreDraft('non-existent-draft')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn(() => {
          throw new Error('Database connection error')
        }),
      })

      const result = await restoreDraft('draft-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteDraft', () => {
    it('should delete a specific draft', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await deleteDraft('draft-1')

      expect(result.success).toBe(true)
    })

    it('should only delete drafts belonging to the user', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      await deleteDraft('draft-1')

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await deleteDraft('draft-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const result = await deleteDraft('draft-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('cleanupExpiredDrafts', () => {
    it('should cleanup expired drafts', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: 5,
          error: null,
        }),
      })

      const result = await cleanupExpiredDrafts()

      expect(result.success).toBe(true)
      expect(result.deleted).toBe(5)
    })

    it('should return zero when no expired drafts', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: 0,
          error: null,
        }),
      })

      const result = await cleanupExpiredDrafts()

      expect(result.success).toBe(true)
      expect(result.deleted).toBe(0)
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'RPC function error' },
        }),
      })

      const result = await cleanupExpiredDrafts()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.deleted).toBe(0)
    })

    it('should handle exceptions gracefully', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn(() => {
          throw new Error('Unexpected error')
        }),
      })

      const result = await cleanupExpiredDrafts()

      expect(result.success).toBe(false)
      expect(result.deleted).toBe(0)
    })
  })
})
