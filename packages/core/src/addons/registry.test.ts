/**
 * Addon 레지스트리 단위 테스트 — SPEC-ADDON-001 REQ-ADDON-010~016
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerAddon,
  getAddon,
  listAddons,
  resetAddonRegistry,
  AddonAlreadyRegisteredError,
  type AddonDefinition,
} from './registry'

describe('Addon Registry', () => {
  beforeEach(() => {
    // 각 테스트 전에 레지스트리 초기화
    resetAddonRegistry()
  })

  describe('registerAddon & getAddon', () => {
    it('should register and retrieve addon', () => {
      const addon: AddonDefinition = {
        name: 'test-addon',
        displayName: 'Test Addon',
        description: 'Test description',
        defaultPriority: 10,
        hooks: {},
      }

      registerAddon(addon)
      const retrieved = getAddon('test-addon')

      expect(retrieved).toEqual(addon)
    })

    it('should return undefined for unregistered addon', () => {
      const retrieved = getAddon('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('should throw AddonAlreadyRegisteredError when registering different addon with same name', () => {
      const addon1: AddonDefinition = {
        name: 'duplicate',
        displayName: 'First',
        description: 'First addon',
        defaultPriority: 10,
        hooks: {},
      }

      const addon2: AddonDefinition = {
        name: 'duplicate',
        displayName: 'Second',
        description: 'Different addon with same name',
        defaultPriority: 20,
        hooks: {},
      }

      registerAddon(addon1)

      expect(() => registerAddon(addon2)).toThrow(AddonAlreadyRegisteredError)
      expect(() => registerAddon(addon2)).toThrow('Addon "duplicate" is already registered')
    })

    it('should be idempotent for HMR - same reference should not throw', () => {
      const addon: AddonDefinition = {
        name: 'hmr-test',
        displayName: 'HMR Test',
        description: 'Test HMR idempotency',
        defaultPriority: 10,
        hooks: {},
      }

      registerAddon(addon)
      expect(() => registerAddon(addon)).not.toThrow()

      const retrieved = getAddon('hmr-test')
      expect(retrieved).toBe(addon) // 동일한 레퍼런스 확인
    })
  })

  describe('listAddons', () => {
    it('should return empty array when no addons registered', () => {
      const list = listAddons()
      expect(list).toEqual([])
    })

    it('should return all registered addons', () => {
      const addon1: AddonDefinition = {
        name: 'addon-1',
        displayName: 'Addon 1',
        description: 'First addon',
        defaultPriority: 10,
        hooks: {},
      }

      const addon2: AddonDefinition = {
        name: 'addon-2',
        displayName: 'Addon 2',
        description: 'Second addon',
        defaultPriority: 20,
        hooks: {},
      }

      registerAddon(addon1)
      registerAddon(addon2)

      const list = listAddons()
      expect(list).toHaveLength(2)
      expect(list).toContainEqual(addon1)
      expect(list).toContainEqual(addon2)
    })
  })

  describe('resetAddonRegistry', () => {
    it('should clear all registered addons', () => {
      const addon: AddonDefinition = {
        name: 'reset-test',
        displayName: 'Reset Test',
        description: 'Test reset functionality',
        defaultPriority: 10,
        hooks: {},
      }

      registerAddon(addon)
      expect(listAddons()).toHaveLength(1)

      resetAddonRegistry()
      expect(listAddons()).toHaveLength(0)
    })
  })
})
