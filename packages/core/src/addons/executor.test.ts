/**
 * Hook Executor 단위 테스트 — SPEC-ADDON-001 REQ-ADDON-030~039
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  runContentTransform,
  runUserRender,
  runPageView,
  runAdminAction,
} from './executor'
import { registerAddon, resetAddonRegistry, type AddonDefinition, type AddonContext } from './registry'
import { listEffectiveAddons } from './config'
import { prisma } from '@rhymix-ts/db'

// @rhymix-ts/db 모의 설정
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    addonConfig: {
      findMany: vi.fn(),
    },
  },
}))

// config 모의 설정
vi.mock('./config', () => ({
  listEffectiveAddons: vi.fn(),
  autoDisableAddon: vi.fn(),
}))

describe('Hook Executor', () => {
  const mockPrisma = prisma as any
  const mockContext: AddonContext = {
    prisma: mockPrisma,
    request: {
      mid: 'page123',
      userId: 1,
      ip: '127.0.0.1',
      userAgent: 'TestAgent',
    },
    domain: { id: 1, host: 'example.com' },
  }

  beforeEach(() => {
    resetAddonRegistry()
    vi.clearAllMocks()
    vi.mocked(listEffectiveAddons).mockResolvedValue([])
  })

  describe('runContentTransform', () => {
    it('should return input unchanged when no effective addons', async () => {
      const input = '<p>Hello World</p>'
      const result = await runContentTransform(input, mockContext)

      expect(result).toBe(input)
    })

    it('should chain transformations in priority order', async () => {
      const addon1: AddonDefinition = {
        name: 'transform-1',
        displayName: 'Transform 1',
        description: 'First transform',
        defaultPriority: 10,
        hooks: {
          onContentTransform: async (html: string) => {
            return html.replace('Hello', 'Hi')
          },
        },
      }

      const addon2: AddonDefinition = {
        name: 'transform-2',
        displayName: 'Transform 2',
        description: 'Second transform',
        defaultPriority: 20,
        hooks: {
          onContentTransform: async (html: string) => {
            return html.replace('World', 'Universe')
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      const input = '<p>Hello World</p>'
      const result = await runContentTransform(input, mockContext)

      // priority 10 (Hello→Hi) 먼저, then priority 20 (World→Universe)
      expect(result).toBe('<p>Hi Universe</p>')
    })

    it('should isolate exceptions and continue chain', async () => {
      const addon1: AddonDefinition = {
        name: 'good-transform',
        displayName: 'Good Transform',
        description: 'Working transform',
        defaultPriority: 10,
        hooks: {
          onContentTransform: async (html: string) => {
            return html.replace('Hello', 'Hi')
          },
        },
      }

      const addon2: AddonDefinition = {
        name: 'bad-transform',
        displayName: 'Bad Transform',
        description: 'Failing transform',
        defaultPriority: 20,
        hooks: {
          onContentTransform: async () => {
            throw new Error('Transform failed')
          },
        },
      }

      const addon3: AddonDefinition = {
        name: 'recovery-transform',
        displayName: 'Recovery',
        description: 'After failure',
        defaultPriority: 30,
        hooks: {
          onContentTransform: async (html: string) => {
            return html + ' <p>Recovered</p>'
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)
      registerAddon(addon3)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
        { ...addon3, enabled: true, priority: 30 },
      ])

      const { autoDisableAddon } = await import('./config')
      vi.mocked(autoDisableAddon).mockResolvedValue(undefined)

      const input = '<p>Hello World</p>'
      const result = await runContentTransform(input, mockContext)

      // addon1 적용 → addon2 실패(identity 처리) → addon3 적용
      expect(result).toBe('<p>Hi World</p> <p>Recovered</p>')
      expect(autoDisableAddon).toHaveBeenCalledWith('bad-transform', expect.any(String), mockPrisma)
    })

    it('should respect AbortSignal', async () => {
      const addon1: AddonDefinition = {
        name: 'slow-transform',
        displayName: 'Slow Transform',
        description: 'Slow transform',
        defaultPriority: 10,
        hooks: {
          onContentTransform: async (html: string) => {
            await new Promise((resolve) => setTimeout(resolve, 100))
            return html.replace('Hello', 'Hi')
          },
        },
      }

      registerAddon(addon1)
      vi.mocked(listEffectiveAddons).mockResolvedValue([{ ...addon1, enabled: true, priority: 10 }])

      const controller = new AbortController()
      const input = '<p>Hello World</p>'

      // 즉시 abort signal 전송
      controller.abort()
      const result = await runContentTransform(input, mockContext, controller.signal)

      // abort 시 현재까지 처리된 결과 반환 (또는 원본 input)
      expect(result).toBe(input)
    })
  })

  describe('runUserRender', () => {
    it('should return empty object when no effective addons', async () => {
      const result = await runUserRender(
        {
          id: 1,
          nickname: 'TestUser',
          email: 'test@example.com',
          groupIds: [1, 2],
        },
        mockContext
      )

      expect(result).toEqual({})
    })

    it('should merge decorations with later handler winning', async () => {
      const addon1: AddonDefinition = {
        name: 'icon-addon',
        displayName: 'Icon Addon',
        description: 'Add icon',
        defaultPriority: 10,
        hooks: {
          onUserRender: async () => ({
            icon: '/admin.png',
            badge: 'VIP',
          }),
        },
      }

      const addon2: AddonDefinition = {
        name: 'override-addon',
        displayName: 'Override Addon',
        description: 'Override decorations',
        defaultPriority: 20,
        hooks: {
          onUserRender: async () => ({
            icon: '/moderator.png', // icon override
            badge: 'VIP', // badge 유지
          }),
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      const result = await runUserRender(
        {
          id: 1,
          nickname: 'TestUser',
          email: 'test@example.com',
          groupIds: [1, 2],
        },
        mockContext
      )

      // later handler wins (priority 20)
      expect(result).toEqual({
        icon: '/moderator.png',
        badge: 'VIP',
      })
    })

    it('should isolate exceptions and continue chain', async () => {
      const addon1: AddonDefinition = {
        name: 'good-render',
        displayName: 'Good Render',
        description: 'Working render',
        defaultPriority: 10,
        hooks: {
          onUserRender: async () => ({
            icon: '/good.png',
          }),
        },
      }

      const addon2: AddonDefinition = {
        name: 'bad-render',
        displayName: 'Bad Render',
        description: 'Failing render',
        defaultPriority: 20,
        hooks: {
          onUserRender: async () => {
            throw new Error('Render failed')
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      const { autoDisableAddon } = await import('./config')
      vi.mocked(autoDisableAddon).mockResolvedValue(undefined)

      const result = await runUserRender(
        {
          id: 1,
          nickname: 'TestUser',
          email: 'test@example.com',
          groupIds: [1, 2],
        },
        mockContext
      )

      // addon1의 결과만 적용 (addon2는 실패로 auto-disable)
      expect(result).toEqual({
        icon: '/good.png',
      })
      expect(autoDisableAddon).toHaveBeenCalledWith('bad-render', expect.any(String), mockPrisma)
    })
  })

  describe('runPageView', () => {
    it('should be safe no-op when no effective addons', async () => {
      await expect(
        runPageView('page123', mockContext)
      ).resolves.toBeUndefined()
    })

    it('should call handlers sequentially', async () => {
      const callOrder: string[] = []

      const addon1: AddonDefinition = {
        name: 'counter-1',
        displayName: 'Counter 1',
        description: 'First counter',
        defaultPriority: 10,
        hooks: {
          onPageView: async (mid: string) => {
            callOrder.push('counter-1')
          },
        },
      }

      const addon2: AddonDefinition = {
        name: 'counter-2',
        displayName: 'Counter 2',
        description: 'Second counter',
        defaultPriority: 20,
        hooks: {
          onPageView: async (mid: string) => {
            callOrder.push('counter-2')
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      await runPageView('page123', mockContext)

      expect(callOrder).toEqual(['counter-1', 'counter-2'])
    })

    it('should isolate exceptions and continue', async () => {
      const addon1: AddonDefinition = {
        name: 'good-pageview',
        displayName: 'Good PageView',
        description: 'Working handler',
        defaultPriority: 10,
        hooks: {
          onPageView: async () => {
            // 정상 처리
          },
        },
      }

      const addon2: AddonDefinition = {
        name: 'bad-pageview',
        displayName: 'Bad PageView',
        description: 'Failing handler',
        defaultPriority: 20,
        hooks: {
          onPageView: async () => {
            throw new Error('PageView failed')
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      const { autoDisableAddon } = await import('./config')
      vi.mocked(autoDisableAddon).mockResolvedValue(undefined)

      await runPageView('page123', mockContext)

      expect(autoDisableAddon).toHaveBeenCalledWith('bad-pageview', expect.any(String), mockPrisma)
    })
  })

  describe('runAdminAction', () => {
    it('should be safe no-op when no effective addons', async () => {
      await expect(
        runAdminAction('module.create', { data: 'test' }, mockContext)
      ).resolves.toBeUndefined()
    })

    it('should call handlers with action and payload', async () => {
      const receivedActions: Array<{ action: string; payload: unknown }> = []

      const addon1: AddonDefinition = {
        name: 'action-logger',
        displayName: 'Action Logger',
        description: 'Log admin actions',
        defaultPriority: 10,
        hooks: {
          onAdminAction: async (action: string, payload: unknown) => {
            receivedActions.push({ action, payload })
          },
        },
      }

      registerAddon(addon1)
      vi.mocked(listEffectiveAddons).mockResolvedValue([{ ...addon1, enabled: true, priority: 10 }])

      await runAdminAction('module.create', { data: 'test' }, mockContext)

      expect(receivedActions).toHaveLength(1)
      expect(receivedActions[0]).toEqual({
        action: 'module.create',
        payload: { data: 'test' },
      })
    })

    it('should isolate exceptions and continue', async () => {
      const addon1: AddonDefinition = {
        name: 'good-action',
        displayName: 'Good Action',
        description: 'Working handler',
        defaultPriority: 10,
        hooks: {
          onAdminAction: async () => {
            // 정상 처리
          },
        },
      }

      const addon2: AddonDefinition = {
        name: 'bad-action',
        displayName: 'Bad Action',
        description: 'Failing handler',
        defaultPriority: 20,
        hooks: {
          onAdminAction: async () => {
            throw new Error('AdminAction failed')
          },
        },
      }

      registerAddon(addon1)
      registerAddon(addon2)

      vi.mocked(listEffectiveAddons).mockResolvedValue([
        { ...addon1, enabled: true, priority: 10 },
        { ...addon2, enabled: true, priority: 20 },
      ])

      const { autoDisableAddon } = await import('./config')
      vi.mocked(autoDisableAddon).mockResolvedValue(undefined)

      await runAdminAction('module.create', { data: 'test' }, mockContext)

      expect(autoDisableAddon).toHaveBeenCalledWith('bad-action', expect.any(String), mockPrisma)
    })
  })
})
