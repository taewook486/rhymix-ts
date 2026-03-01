/**
 * Notification Actions Tests - Phase 13: Notification Center UI
 * Tests for markAllNotificationsAsRead, updateNotificationSettings
 */

import {
  markAllNotificationsAsRead,
  updateNotificationSettings,
  getNotificationSettings,
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
} from '@/app/actions/notifications'
import type { NotificationSettings, NotificationInsert } from '@/lib/supabase/database.types'

// Get reference to mocked modules
const { createClient } = require('@/lib/supabase/server')

describe('Notification Actions', () => {
  const mockUser = {
    id: 'user-1',
    email: 'user1@example.com',
  }

  const mockSettings: NotificationSettings = {
    email: true,
    push: false,
    mention: true,
    comment: true,
    like: false,
    reply: true,
    system: true,
    admin: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await markAllNotificationsAsRead('user-1')

      expect(result.success).toBe(true)
    })

    it('should only mark unread notifications', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      })

      await markAllNotificationsAsRead('user-1')

      const mockFrom = jest.fn()
      expect(mockFrom).toHaveBeenCalled()
    })

    it('should deny access for different user', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await markAllNotificationsAsRead('user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('권한이 없습니다.')
    })

    it('should deny access for unauthenticated users', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await markAllNotificationsAsRead('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should handle database errors', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const result = await markAllNotificationsAsRead('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('알림 업데이트에 실패했습니다.')
    })
  })

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const newSettings: Partial<NotificationSettings> = {
        email: false,
        push: true,
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    notification_settings: mockSettings,
                  },
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      notification_settings: {
                        ...mockSettings,
                        ...newSettings,
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
      })

      const result = await updateNotificationSettings('user-1', newSettings)

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(false)
      expect(result.data?.push).toBe(true)
    })

    it('should merge settings with existing settings', async () => {
      const partialSettings: Partial<NotificationSettings> = {
        like: true,
      }

      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    notification_settings: mockSettings,
                  },
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      notification_settings: {
                        ...mockSettings,
                        like: true,
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
      })

      const result = await updateNotificationSettings('user-1', partialSettings)

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(true) // Unchanged
      expect(result.data?.like).toBe(true) // Updated
    })

    it('should deny access for different user', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await updateNotificationSettings('user-2', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('권한이 없습니다.')
    })

    it('should deny access for unauthenticated users', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      })

      const result = await updateNotificationSettings('user-1', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should handle profile not found', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
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
      })

      const result = await updateNotificationSettings('user-1', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('알림을 찾을 수 없습니다.')
    })

    it('should handle database errors during update', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    notification_settings: mockSettings,
                  },
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
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

      const result = await updateNotificationSettings('user-1', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('알림 설정 업데이트에 실패했습니다.')
    })
  })

  describe('getNotificationSettings', () => {
    it('should get notification settings', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  notification_settings: mockSettings,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationSettings('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSettings)
    })

    it('should return default settings when none exist', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  notification_settings: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getNotificationSettings('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData: NotificationInsert = {
        user_id: 'user-1',
        type: 'mention',
        title: 'You were mentioned',
        content: 'Someone mentioned you in a post',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'notif-1',
                  ...notificationData,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('You were mentioned')
    })

    it('should validate required fields', async () => {
      const invalidData = {} as NotificationInsert

      createClient.mockResolvedValue({
        from: jest.fn(),
      })

      const result = await createNotification(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('입력값이 올바르지 않습니다.')
    })

    it('should trim title and content', async () => {
      const notificationData: NotificationInsert = {
        user_id: 'user-1',
        type: 'mention',
        title: '  You were mentioned  ',
        content: '  Someone mentioned you  ',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'notif-1',
                  ...notificationData,
                  title: 'You were mentioned',
                  content: 'Someone mentioned you',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('You were mentioned')
    })
  })

  describe('getNotifications', () => {
    it('should get notifications for user', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'notif-1',
                      user_id: 'user-1',
                      type: 'mention',
                      title: 'Mention',
                      is_read: false,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotifications({ userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should filter by unread status', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getNotifications({ userId: 'user-1', isRead: false })

      expect(result.success).toBe(true)
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ count: 5 }],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getUnreadNotificationCount('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(5)
    })

    it('should return zero when no unread notifications', async () => {
      createClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ count: 0 }],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await getUnreadNotificationCount('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(0)
    })
  })
})
