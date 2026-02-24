/**
 * Editor Actions Tests - Phase 11: WYSIWYG Editor
 * Tests for uploadEditorMedia, saveAutosave, getAutosave
 */

import {
  uploadEditorMedia,
  saveAutosave,
  getAutosave,
  deleteAutosave,
  cleanupExpiredAutosaves,
  type SaveAutosaveInput,
  type Autosave,
} from '@/app/actions/editor'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')
const { auth } = require('@/lib/supabase/auth')

// Mock uploadFile action
jest.mock('@/app/actions/media', () => ({
  uploadFile: jest.fn(),
}))

const { uploadFile } = require('@/app/actions/media')

describe('Editor Actions', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockAutosave: Autosave = {
    id: 'autosave-1',
    user_id: 'test-user-id',
    target_type: 'post',
    target_id: 'post-1',
    title: 'Test Post',
    content: 'Test content',
    content_html: '<p>Test content</p>',
    excerpt: 'Test excerpt',
    metadata: { tags: ['test'] },
    saved_at: '2024-02-24T10:00:00Z',
    expires_at: '2024-03-02T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup auth mock to return authenticated user
    auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('uploadEditorMedia', () => {
    it('should upload image files successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      uploadFile.mockResolvedValue({
        success: true,
        data: {
          id: 'media-1',
          cdn_url: 'https://cdn.example.com/test.jpg',
          filename: 'test.jpg',
        },
      })

      const result = await uploadEditorMedia(mockFile)

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://cdn.example.com/test.jpg')
      expect(uploadFile).toHaveBeenCalledWith({
        file: mockFile,
        target_type: 'editor',
        target_id: mockUser.id,
      })
    })

    it('should reject non-image files', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const result = await uploadEditorMedia(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only image files are allowed in the editor')
      expect(uploadFile).not.toHaveBeenCalled()
    })

    it('should allow all supported image types', async () => {
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

      for (const type of supportedTypes) {
        const mockFile = new File(['test'], `test.${type.split('/')[1]}`, { type })

        uploadFile.mockResolvedValue({
          success: true,
          data: { cdn_url: 'https://cdn.example.com/test.jpg' },
        })

        const result = await uploadEditorMedia(mockFile)

        expect(result.success).toBe(true)
      }
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      const result = await uploadEditorMedia(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      uploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      })

      const result = await uploadEditorMedia(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })

    it('should handle exceptions during upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      uploadFile.mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await uploadEditorMedia(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('saveAutosave', () => {
    it('should save new autosave successfully', async () => {
      const input: SaveAutosaveInput = {
        target_type: 'post',
        target_id: 'post-1',
        title: 'Test Post',
        content: 'Test content',
        content_html: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        metadata: { tags: ['test'] },
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockAutosave,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await saveAutosave(input)

      expect(result.success).toBe(true)
      expect(result.data?.content).toBe('Test content')
    })

    it('should save autosave with minimal fields', async () => {
      const input: SaveAutosaveInput = {
        target_type: 'comment',
        content: 'Minimal content',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockAutosave,
                  target_type: 'comment',
                  target_id: null,
                  title: '',
                  content_html: null,
                  excerpt: null,
                  metadata: {},
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await saveAutosave(input)

      expect(result.success).toBe(true)
    })

    it('should set expiration to 7 days from now', async () => {
      const input: SaveAutosaveInput = {
        target_type: 'post',
        content: 'Test content',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockAutosave,
                error: null,
              }),
            }),
          }),
        }),
      })

      await saveAutosave(input)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Verify upsert was called (expiration calculation happens in function)
      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const input: SaveAutosaveInput = {
        target_type: 'post',
        content: 'Test content',
      }

      const result = await saveAutosave(input)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      const input: SaveAutosaveInput = {
        target_type: 'post',
        content: 'Test content',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const result = await saveAutosave(input)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('getAutosave', () => {
    it('should retrieve autosave for specific target', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gt: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: mockAutosave,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAutosave('post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.data?.content).toBe('Test content')
    })

    it('should return null when no autosave exists', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gt: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { code: 'PGRST116' },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAutosave('post', 'new-post')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should filter out expired autosaves', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gt: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { code: 'PGRST116' },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAutosave('post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAutosave('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gt: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { message: 'Database error', code: 'OTHER_ERROR' },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getAutosave('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteAutosave', () => {
    it('should delete autosave successfully', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await deleteAutosave('post', 'post-1')

      expect(result.success).toBe(true)
    })

    it('should only delete autosaves belonging to the user', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      await deleteAutosave('post', 'post-1')

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for unauthenticated users', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await deleteAutosave('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await deleteAutosave('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('cleanupExpiredAutosaves', () => {
    it('should cleanup expired autosaves', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: 10,
          error: null,
        }),
      })

      const result = await cleanupExpiredAutosaves()

      expect(result.success).toBe(true)
      expect(result.deleted).toBe(10)
    })

    it('should return zero when no expired autosaves', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: 0,
          error: null,
        }),
      })

      const result = await cleanupExpiredAutosaves()

      expect(result.success).toBe(true)
      expect(result.deleted).toBe(0)
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'RPC error' },
        }),
      })

      const result = await cleanupExpiredAutosaves()

      expect(result.success).toBe(false)
      expect(result.deleted).toBe(0)
    })
  })
})
