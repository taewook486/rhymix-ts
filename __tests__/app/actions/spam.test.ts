/**
 * Spam Filter Tests
 */

import {
  checkSpam,
  type SpamConfig,
  type SpamCheckResult,
} from '@/app/actions/spam'

// Get reference to mocked modules - need to require since we use CommonJS
const { createClient } = require('@/lib/supabase/server')
const { auth } = require('@/lib/supabase/auth')

describe('checkSpam', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup auth mock to return authenticated user
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })

    // Setup createClient mock to return spam config
    createClient.mockResolvedValue({
      auth: {
        getUser: auth.getUser,
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                config: {
                  enable_link_check: true,
                  max_links_count: 3,
                  enable_keyword_filter: true,
                  blocked_keywords: ['viagra', 'casino'],
                  enable_frequency_limit: true,
                  max_posts_per_hour: 5,
                  enable_captcha: false,
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    })
  })

  afterEach(() => {
    // Reset createClient mock to prevent test interference
    createClient.mockReset()
    // Re-setup the default mock
    createClient.mockResolvedValue({
      auth: {
        getUser: auth.getUser,
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                config: {
                  enable_link_check: true,
                  max_links_count: 3,
                  enable_keyword_filter: true,
                  blocked_keywords: ['viagra', 'casino'],
                  enable_frequency_limit: true,
                  max_posts_per_hour: 5,
                  enable_captcha: false,
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    })
  })

  describe('link checking', () => {
    it('should detect too many links', async () => {
      const content = 'Check this: http://a.com http://b.com http://c.com http://d.com'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(50)
      expect(result.details).toContainEqual(
        expect.stringContaining('Too many links')
      )
    })

    it('should allow within link limit', async () => {
      const content = 'Check this: http://a.com http://b.com http://c.com'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(false)
      expect(result.score).toBeLessThan(50)
    })
  })

  describe('keyword filtering', () => {
    it('should detect blocked keywords', async () => {
      const content = 'Buy viagra and casino games'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(true)
      expect(result.details).toContainEqual(
        expect.stringContaining('viagra')
      )
    })

    it('should be case insensitive for keywords', async () => {
      const content = 'VIAgra CASINO'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(true)
    })

    it('should allow clean content', async () => {
      const content = 'This is a legitimate post about programming'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(false)
      expect(result.score).toBe(0)
    })
  })

  describe('frequency limiting', () => {
    it('should detect excessive posting frequency', async () => {
      // First call: getSpamConfig() - returns spam config with only frequency enabled
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: auth.getUser,
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  config: {
                    enable_link_check: false,
                    max_links_count: 3,
                    enable_keyword_filter: false,
                    blocked_keywords: [],
                    enable_frequency_limit: true,
                    max_posts_per_hour: 5,
                    enable_captcha: false,
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      // Second call: getRecentPostsCount() - returns 6 recent posts (exceeds limit of 5)
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: auth.getUser,
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: Array(6).fill({ id: '1' }),
                error: null,
              }),
            }),
          }),
        }),
      })

      const content = 'Frequent post'
      const result = await checkSpam(content, 'user-id')

      // Frequency check adds 40 points, need to combine with link or keyword to reach 50
      // Let's verify the score reflects the frequency check
      expect(result.score).toBe(40)
      expect(result.details).toContainEqual(
        expect.stringContaining('Too many posts')
      )
    })

    it('should detect spam when frequency exceeds threshold combined with other factors', async () => {
      // First call: getSpamConfig() - with link and frequency enabled
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: auth.getUser,
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  config: {
                    enable_link_check: true,
                    max_links_count: 3,
                    enable_keyword_filter: false,
                    blocked_keywords: [],
                    enable_frequency_limit: true,
                    max_posts_per_hour: 5,
                    enable_captcha: false,
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      // Second call: getRecentPostsCount() - returns 5 recent posts
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: auth.getUser,
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: Array(5).fill({ id: '1' }),
                error: null,
              }),
            }),
          }),
        }),
      })

      // Content with too many links + high frequency = 50 + 40 = 90 points
      const content = 'Check this: http://a.com http://b.com http://c.com http://d.com'
      const result = await checkSpam(content, 'user-id')

      // Should be spam with combined score of 90 (50 links + 40 frequency)
      expect(result.is_spam).toBe(true)
      expect(result.score).toBe(90)
      expect(result.details).toHaveLength(2)
    })
  })

  describe('combined scoring', () => {
    it('should accumulate spam scores', async () => {
      const content = 'viagra http://a.com http://b.com http://c.com http://d.com'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(80) // 30 + 50
      expect(result.details).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('should default to not spam on error', async () => {
      createClient.mockImplementation(() => {
        throw new Error('Database error')
      })

      const content = 'Test content'
      const result = await checkSpam(content)

      expect(result.is_spam).toBe(false)
      expect(result.score).toBe(0)
    })
  })
})
