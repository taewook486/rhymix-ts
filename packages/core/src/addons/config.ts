/**
 * AddonConfig 관리 — SPEC-ADDON-001 REQ-ADDON-020~029
 */

import type { PrismaClient } from '@prisma/client'
import type { AddonDefinition } from './types'
import { getAddon, listAddons } from './registry'

/**
 * Effective addon 목록 조회 — REQ-ADDON-021
 * registry + AddonConfig 조인 → enabled 정렬 결과
 */
export async function listEffectiveAddons(
  prisma: PrismaClient
): Promise<Array<AddonDefinition & { enabled: boolean; priority: number }>> {
  // DB에서 모든 AddonConfig 조회
  const prismaAny = prisma as any
  const configs = await prismaAny.addonConfig.findMany()

  // registry의 모든 addon에 대해 config 머지
  const effective: Array<AddonDefinition & { enabled: boolean; priority: number }> = []

  for (const addon of listAddons()) {
    const config = configs.find((c: any) => c.name === addon.name)

    effective.push({
      ...addon,
      enabled: config?.enabled ?? true, // 없으면 enabled=true (REQ-ADDON-025)
      priority: config?.priority ?? addon.defaultPriority, // 없으면 defaultPriority
    })
  }

  // enabled=true만 필터하고 priority ASC, name ASC 정렬
  return effective
    .filter((e) => e.enabled)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority // priority ASC
      }
      return a.name.localeCompare(b.name) // name ASC
    })
}

/**
 * 모든 addon 목록 조회 (admin용) — REQ-ADDON-050
 * listEffectiveAddons와 달리 disabled 포함하여 전체 목록 반환
 */
export async function listAllAddonsWithConfig(
  prisma: PrismaClient
): Promise<Array<AddonDefinition & { enabled: boolean; priority: number }>> {
  const prismaAny = prisma as any
  const configs = await prismaAny.addonConfig.findMany()

  const all: Array<AddonDefinition & { enabled: boolean; priority: number }> = []

  for (const addon of listAddons()) {
    const config = configs.find((c: any) => c.name === addon.name)
    all.push({
      ...addon,
      enabled: config?.enabled ?? true,
      priority: config?.priority ?? addon.defaultPriority,
    })
  }

  return all.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.name.localeCompare(b.name)
  })
}

/**
 * AddonConfig upsert — REQ-ADDON-022
 * first-write idempotent (존재하면 no-op)
 */
export async function ensureAddonConfig(
  name: string,
  defaultPriority: number,
  prisma: PrismaClient
): Promise<void> {
  const prismaAny = prisma as any
  await prismaAny.addonConfig.upsert({
    where: { name },
    create: {
      name,
      enabled: true,
      priority: defaultPriority,
    },
    update: {}, // 존재하면 업데이트 없음 (idempotent)
  })
}

/**
 * Addon 활성/비활성 토글 — REQ-ADDON-023
 */
export async function toggleAddon(
  name: string,
  enabled: boolean,
  prisma: PrismaClient
): Promise<void> {
  // 현재 상태 조회 (before 기록용)
  const prismaAny = prisma as any
  const current = await prismaAny.addonConfig.findUnique?.({
    where: { name },
  })

  const before = current?.enabled ?? true // 없으면 기본값 true

  // upsert
  await prismaAny.addonConfig.upsert({
    where: { name },
    create: {
      name,
      enabled,
      priority: 0, // toggle 시 defaultPriority
    },
    update: {
      enabled,
    },
  })

  // AdminLog 기록 (REQ-ADDON-023)
  // actorId는 context에서 가져와야 하므로 여기서는 mock으로 처리
  // 실제 사용시에는 request context에서 actorId 추출 필요
  await prisma.adminLog.create({
    data: {
      actorId: 1, // TODO: request context에서 추출
      action: 'addon.toggle',
      target: `addon:${name}`,
      diff: {
        name,
        before,
        after: enabled,
      },
    },
  })
}

/**
 * Addon priority 변경 — REQ-ADDON-024
 */
export async function setAddonPriority(
  name: string,
  priority: number,
  prisma: PrismaClient
): Promise<void> {
  // 현재 priority 조회 (before 기록용)
  const prismaAny = prisma as any
  const current = await prismaAny.addonConfig.findUnique?.({
    where: { name },
  })

  const before = current?.priority ?? 0

  // upsert
  await prismaAny.addonConfig.upsert({
    where: { name },
    create: {
      name,
      enabled: true,
      priority,
    },
    update: {
      priority,
    },
  })

  // AdminLog 기록 (REQ-ADDON-024)
  await prismaAny.adminLog.create({
    data: {
      actorId: 1, // TODO: request context에서 추출
      action: 'addon.reorder',
      target: `addon:${name}`,
      diff: {
        name,
        before,
        after: priority,
      },
    },
  })
}

// 동일한 요청 라이프사이클에서 중복 auto-disable 방지 — REQ-ADDON-037
const disabledThisRequest = new Set<string>()

/**
 * Addon 자동 비활성화 — REQ-ADDON-033
 */
export async function autoDisableAddon(
  name: string,
  reason: string,
  prisma: PrismaClient,
  timestamp: Date = new Date()
): Promise<void> {
  // 요청 라이프사이클 내에서 이미 비활성화된 addon이면 AdminLog 작성 스킵 (REQ-ADDON-037)
  const alreadyDisabled = disabledThisRequest.has(name)
  disabledThisRequest.add(name)

  // reason 최대 4096자 트렁케이션 (lastDisabledReason 필드 제한)
  const truncatedReason = reason.slice(0, 4096)

  // AddonConfig upsert (enabled=false, lastDisabledAt, lastDisabledReason)
  const prismaAny = prisma as any
  await prismaAny.addonConfig.upsert({
    where: { name },
    create: {
      name,
      enabled: false,
      priority: 0,
      lastDisabledAt: timestamp,
      lastDisabledReason: truncatedReason,
    },
    update: {
      enabled: false,
      lastDisabledAt: timestamp,
      lastDisabledReason: truncatedReason,
    },
  })

  // 첫 번째 비활성화 시에만 AdminLog 작성 (REQ-ADDON-037 idempotency)
  if (!alreadyDisabled) {
    await prismaAny.adminLog.create({
      data: {
        actorId: 1, // 시스템 액션
        action: 'addon.auto_disable',
        target: `addon:${name}`,
        diff: {
          reason: truncatedReason,
          // stack: 스택 트레이스는 production에서는 제한
        },
      },
    })
  }
}

/**
 * 요청 라이프사이클 종료시 호출 — disabledThisRequest 셋 초기화
 */
export function clearAutoDisableCache(): void {
  disabledThisRequest.clear()
}
