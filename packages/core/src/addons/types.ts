/**
 * Addon 시스템 타입 정의 — SPEC-ADDON-001 REQ-ADDON-001~009
 */

import type { PrismaClient } from '@rhymix-ts/db'

// 4개 Hook 타입 정의
export type HookType = 'onContentTransform' | 'onUserRender' | 'onPageView' | 'onAdminAction'

// Hook별 시그니처 (HookHandler 제네릭 타입 제거 - 직접 타이핑)
export interface ContentTransformHook {
  onContentTransform: (html: string, ctx: AddonContext) => Promise<string>
}

export interface UserRenderHook {
  onUserRender: (
    user: AddonUser,
    ctx: AddonContext
  ) => Promise<{
    icon?: string
    badge?: string
  }>
}

export interface PageViewHook {
  onPageView: (mid: string, ctx: AddonContext) => Promise<void>
}

export interface AdminActionHook {
  onAdminAction: (action: string, payload: unknown, ctx: AddonContext) => Promise<void>
}

// HookHandler 타입 - 모든 hook의 유니온
export type HookHandler =
  | ContentTransformHook['onContentTransform']
  | UserRenderHook['onUserRender']
  | PageViewHook['onPageView']
  | AdminActionHook['onAdminAction']

// AddonContext — 실행 컨텍스트 (REQ-ADDON-006)
export interface AddonContext {
  prisma: PrismaClient
  request: {
    mid?: string
    userId?: number
    ip?: string
    userAgent?: string
  }
  domain: {
    id: number
    host: string
  } | null
}

// AddonUser — 사용자 스냅샷 (REQ-ADDON-007)
export interface AddonUser {
  id: number
  nickname: string
  email: string | null
  groupIds: number[]
  point?: number
}

// AddonDefinition — addon 정의 (REQ-ADDON-011)
export interface AddonDefinition {
  name: string // unique identifier
  displayName: string // 표시 이름
  description: string // 설명
  defaultPriority: number // 초기 정렬 키 (낮을수록 먼저 실행)
  hooks: Partial<Record<HookType, ContentTransformHook['onContentTransform'] | UserRenderHook['onUserRender'] | PageViewHook['onPageView'] | AdminActionHook['onAdminAction']>> // 이 addon이 등록한 hook 핸들러들
}

// AddonAlreadyRegisteredError — 중복 등록 에러 (REQ-ADDON-012)
export class AddonAlreadyRegisteredError extends Error {
  constructor(name: string) {
    super(`Addon "${name}" is already registered`)
    this.name = 'AddonAlreadyRegisteredError'
  }
}
