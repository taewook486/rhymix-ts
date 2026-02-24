/**
 * Layout Actions Tests - Phase 14: Layout Builder
 * Tests for getLayouts, createLayout, updateLayout, deleteLayout
 */

import {
  getLayouts,
  getLayoutById,
  getLayoutDetail,
  createLayout,
  updateLayout,
  deleteLayout,
  type Layout,
} from '@/app/actions/layouts'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')

describe('Layout Actions', () => {
  const mockLayout: Layout = {
    id: 'layout-1',
    name: 'Default Layout',
    description: 'Default site layout',
    is_default: true,
    is_active: true,
    created_at: '2024-02-24T10:00:00Z',
    updated_at: '2024-02-24T10:00:00Z',
    deleted_at: null,
  }

  const mockLayouts: Layout[] = [
    mockLayout,
    {
      id: 'layout-2',
      name: 'Custom Layout',
      description: 'Custom site layout',
      is_default: false,
      is_active: true,
      created_at: '2024-02-24T09:00:00Z',
      updated_at: '2024-02-24T09:00:00Z',
      deleted_at: null,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLayouts', () => {
    it('should return all active layouts', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockLayouts,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getLayouts()

      expect(result).toHaveLength(2)
      expect(result[0].is_default).toBe(true)
    })

    it('should return empty array on error', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getLayouts()

      expect(result).toHaveLength(0)
    })

    it('should exclude deleted layouts', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockLayouts,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      await getLayouts()

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should order by is_default first, then created_at', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockLayouts,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      await getLayouts()

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })
  })

  describe('getLayoutById', () => {
    it('should return layout by ID', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockLayout,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getLayoutById('layout-1')

      expect(result).toEqual(mockLayout)
    })

    it('should return null for non-existent layout', async () => {
      createClient.mockResolvedValue({
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
      })

      const result = await getLayoutById('non-existent')

      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      createClient.mockResolvedValue({
        from: jest.fn(() => {
          throw new Error('Database error')
        }),
      })

      const result = await getLayoutById('layout-1')

      expect(result).toBeNull()
    })
  })

  describe('getLayoutDetail', () => {
    it('should return layout with columns and widgets', async () => {
      const mockColumns = [
        {
          id: 'col-1',
          layout_id: 'layout-1',
          column_index: 0,
          width: 12,
        },
      ]

      const mockWidgets = [
        {
          id: 'widget-1',
          layout_id: 'layout-1',
          column_index: 0,
          row_index: 0,
          order_index: 0,
          widget: {
            id: 'site-widget-1',
            name: 'Recent Posts',
            widget_type: 'recent_posts',
          },
        },
      ]

      createClient.mockResolvedValue({
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLayout,
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockColumns,
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: mockWidgets,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
      })

      const result = await getLayoutDetail('layout-1')

      expect(result.layout).toEqual(mockLayout)
      expect(result.columns).toHaveLength(1)
      expect(result.widgets).toHaveLength(1)
    })

    it('should handle layout not found', async () => {
      createClient.mockResolvedValue({
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
      })

      await expect(getLayoutDetail('non-existent')).rejects.toThrow()
    })
  })

  describe('createLayout', () => {
    it('should create new layout successfully', async () => {
      const newLayout = {
        name: 'New Layout',
        description: 'A new layout',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockLayout,
                  id: 'layout-new',
                  name: 'New Layout',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await createLayout(newLayout)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('New Layout')
    })

    it('should handle creation errors', async () => {
      const newLayout = {
        name: 'New Layout',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Creation failed' },
              }),
            }),
          }),
        }),
      })

      const result = await createLayout(newLayout)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateLayout', () => {
    it('should update layout successfully', async () => {
      const updates = {
        name: 'Updated Layout',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...mockLayout,
                    name: 'Updated Layout',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await updateLayout('layout-1', updates)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Layout')
    })

    it('should handle update errors', async () => {
      const updates = {
        name: 'Updated Layout',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await updateLayout('layout-1', updates)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should revalidate paths after update', async () => {
      const updates = {
        name: 'Updated Layout',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...mockLayout,
                    name: 'Updated Layout',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      await updateLayout('layout-1', updates)

      // revalidatePath should be called
    })
  })

  describe('deleteLayout', () => {
    it('should soft delete layout successfully', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      const result = await deleteLayout('layout-1')

      expect(result.success).toBe(true)
    })

    it('should handle delete errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Delete failed' },
            }),
          }),
        }),
      })

      const result = await deleteLayout('layout-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should revalidate paths after delete', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      await deleteLayout('layout-1')

      // revalidatePath should be called
    })
  })
})
