/**
 * Addon 레지스트리 — SPEC-ADDON-001 REQ-ADDON-010~019
 */

import type { AddonDefinition } from './types'
import { AddonAlreadyRegisteredError } from './types'

// Module-level 레지스트리 Map (REQ-ADDON-010)
const registry = new Map<string, AddonDefinition>()

/**
 * Addon 등록 — REQ-ADDON-012 (HMR idempotent)
 * @param addon 등록할 addon 정의
 * @throws {AddonAlreadyRegisteredError} 같은 이름의 다른 addon이 이미 등록된 경우
 */
export function registerAddon(addon: AddonDefinition): void {
  const existing = registry.get(addon.name)

  // HMR idempotent guard: 동일한 레퍼런스면 no-op (REQ-ADDON-012)
  if (existing === addon) {
    return
  }

  // 다른 addon이 같은 이름을 사용 중이면 에러 (REQ-ADDON-012)
  if (existing !== undefined) {
    throw new AddonAlreadyRegisteredError(addon.name)
  }

  registry.set(addon.name, addon)
}

/**
 * Addon 조회 — REQ-ADDON-013
 * @param name 조회할 addon 이름
 * @returns addon 정의 또는 undefined (미등록시)
 */
export function getAddon(name: string): AddonDefinition | undefined {
  return registry.get(name)
}

/**
 * 등록된 모든 addon 목록 반환
 * @returns AddonDefinition 배열
 */
export function listAddons(): AddonDefinition[] {
  return Array.from(registry.values())
}

/**
 * 레지스트리 초기화 — 테스트 전용 (REQ-ADDON-010)
 * WARNING: 실제 운영 코드에서 호출하면 안됨
 */
export function resetAddonRegistry(): void {
  registry.clear()
}

// 타입 내보내기
export type { AddonDefinition, AddonContext, AddonUser } from './types'
export { AddonAlreadyRegisteredError } from './types'
