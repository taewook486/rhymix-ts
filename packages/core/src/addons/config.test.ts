/**
 * AddonConfig 단위 테스트 — SPEC-ADDON-001 REQ-ADDON-020~029
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listEffectiveAddons,
  ensureAddonConfig,
  toggleAddon,
  setAddonPriority,
  autoDisableAddon,
  clearAutoDisableCache,
} from './config'
import { registerAddon, resetAddonRegistry, type AddonDefinition } from './registry'
import { prisma } from '@rhymix-ts/db'

// @rhymix-ts/db 모의 설정
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    addonConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
    },
  },
}))

describe('Addon Config', () => {
  const mockPrisma = prisma as any

  beforeEach(() => {
    resetAddonRegistry()
    vi.clearAllMocks()
    clearAutoDisableCache()
  })

  describe('listEffectiveAddons', () => {
    it('should return empty array when no addons registered', async () => {
      mockPrisma.addonConfig.findMany.mockResolvedValue([])

      const effective = await listEffectiveAddons(mockPrisma)
      expect(effective).toEqual([])
    })

    it('should use defaults when AddonConfig row does not exist', async () => {
      const addon: AddonDefinition = {
        name: 'test-addon',
        displayName: 'Test Addon',
        description: 'Test description',
        defaultPriority: 100,
        hooks: {},
      }

      registerAddon(addon)
      mockPrisma.addonConfig.findMany.mockResolvedValue([])

      const effective = await listEffectiveAddons(mockPrisma)

      expect(effective).toHaveLength(1)
      expect(effective[0]).toMatchObject({
        name: 'test-addon',
        enabled: true,
        priority: 100,
      })
    })

    it('should merge AddonConfig with registry definitions', async () => {
      const addon: AddonDefinition = {
        name: 'test-addon',
        displayName: 'Test Addon',
        description: 'Test description',
        defaultPriority: 50,
        hooks: {},
      }

      registerAddon(addon)
      mockPrisma.addonConfig.findMany.mockResolvedValue([
        {
          name: 'test-addon',
          enabled: true,
          priority: 999,
        },
      ])

      mockPrisma.addonConfig.findUnique.mockResolvedValue({
        name: 'test-addon',
        enabled: true,
        priority: 999,
      })

      const effective = await listEffectiveAddons(mockPrisma)

      expect(effective).toHaveLength(1)
      expect(effective[0]).toMatchObject({
        name: 'test-addon',
        enabled: true,
        priority: 999,
        displayName: 'Test Addon',
      })
    })

    it('should filter only enabled addons and sort by priority ASC then name ASC', async () => {
      const addon1: AddonDefinition = {
        name: 'z-addon',
        displayName: 'Z Addon',
        description: 'High priority name',
        defaultPriority: 10,
        hooks: {},
      }

      const addon2: AddonDefinition = {
        name: 'a-addon',
        displayName: 'A Addon',
        description: 'Low priority name',
        defaultPriority: 10,
        hooks: {},
      }

      const addon3: AddonDefinition = {
        name: 'b-addon',
        displayName: 'B Addon',
        description: 'Medium priority',
        defaultPriority: 20,
        hooks: {},
      }

      registerAddon(addon1)
      registerAddon(addon2)
      registerAddon(addon3)

      mockPrisma.addonConfig.findMany.mockResolvedValue([
        { name: 'z-addon', enabled: true, priority: 10 },
        { name: 'a-addon', enabled: true, priority: 10 },
        { name: 'b-addon', enabled: false, priority: 20 },
      ])

      const effective = await listEffectiveAddons(mockPrisma)

      expect(effective).toHaveLength(2)
      expect(effective[0]?.name).toBe('a-addon') // priority 10, name 'a'
      expect(effective[1]?.name).toBe('z-addon') // priority 10, name 'z'
    })
  })

  describe('ensureAddonConfig', () => {
    it('should upsert addon config with enabled=true', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({})

      await ensureAddonConfig('test-addon', 50, mockPrisma)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledWith({
        where: { name: 'test-addon' },
        create: {
          name: 'test-addon',
          enabled: true,
          priority: 50,
        },
        update: {},
      })
    })

    it('should be idempotent - multiple calls should not error', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({})

      await ensureAddonConfig('test-addon', 50, mockPrisma)
      await ensureAddonConfig('test-addon', 50, mockPrisma)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledTimes(2)
    })
  })

  describe('toggleAddon', () => {
    it('should upsert enabled state and write AdminLog', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({
        enabled: true,
      })
      mockPrisma.adminLog.create.mockResolvedValue({})

      await toggleAddon('test-addon', true, mockPrisma)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledWith({
        where: { name: 'test-addon' },
        create: {
          name: 'test-addon',
          enabled: true,
          priority: 0,
        },
        update: {
          enabled: true,
        },
      })

      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'addon.toggle',
          diff: expect.any(Object),
        }),
      })
    })
  })

  describe('setAddonPriority', () => {
    it('should upsert priority and write AdminLog', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({
        priority: 100,
      })
      mockPrisma.adminLog.create.mockResolvedValue({})

      await setAddonPriority('test-addon', 100, mockPrisma)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledWith({
        where: { name: 'test-addon' },
        create: {
          name: 'test-addon',
          enabled: true,
          priority: 100,
        },
        update: {
          priority: 100,
        },
      })

      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'addon.reorder',
          diff: expect.any(Object),
        }),
      })
    })
  })

  describe('autoDisableAddon', () => {
    it('should upsert disabled state with reason and write AdminLog', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({})
      mockPrisma.adminLog.create.mockResolvedValue({})

      const reason = 'Test error message for auto-disable'
      const now = new Date()

      await autoDisableAddon('test-addon', reason, mockPrisma, now)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledWith({
        where: { name: 'test-addon' },
        create: {
          name: 'test-addon',
          enabled: false,
          priority: 0,
          lastDisabledAt: now,
          lastDisabledReason: reason,
        },
        update: {
          enabled: false,
          lastDisabledAt: now,
          lastDisabledReason: reason,
        },
      })

      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'addon.auto_disable',
          target: 'addon:test-addon',
          diff: expect.any(Object),
        }),
      })
    })

    it('should truncate reason to 4096 characters', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({})
      mockPrisma.adminLog.create.mockResolvedValue({})

      const longReason = 'x'.repeat(5000)
      const now = new Date()

      await autoDisableAddon('test-addon', longReason, mockPrisma, now)

      expect(mockPrisma.addonConfig.upsert).toHaveBeenCalledWith({
        where: { name: 'test-addon' },
        create: expect.objectContaining({
          lastDisabledReason: 'x'.repeat(4096),
        }),
        update: expect.objectContaining({
          lastDisabledReason: 'x'.repeat(4096),
        }),
      })
    })

    it('should be idempotent within same request lifecycle', async () => {
      mockPrisma.addonConfig.upsert.mockResolvedValue({})
      mockPrisma.adminLog.create.mockResolvedValue({})

      const reason = 'Test error'
      const now = new Date()

      // 동일한 요청에서 두 번 호출
      await autoDisableAddon('test-addon', reason, mockPrisma, now)
      await autoDisableAddon('test-addon', reason, mockPrisma, now)

      // 두 번째 호출에서는 AdminLog를 작성하지 않음 (요청 라이프사이클 내 이미 처리됨)
      expect(mockPrisma.adminLog.create).toHaveBeenCalledTimes(1)
    })
  })
})
