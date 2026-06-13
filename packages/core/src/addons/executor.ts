/**
 * Hook Executor — SPEC-ADDON-001 REQ-ADDON-030~039
 */

import type { AddonContext, AddonUser } from './types'
import { listEffectiveAddons, autoDisableAddon } from './config'

/**
 * onContentTransform 실행기 — REQ-ADDON-030, REQ-ADDON-031
 */
export async function runContentTransform(
  html: string,
  ctx: AddonContext,
  signal?: AbortSignal
): Promise<string> {
  const effective = await listEffectiveAddons(ctx.prisma)

  let current = html

  for (const addon of effective) {
    // AbortSignal 확인 — REQ-ADDON-035
    if (signal?.aborted) {
      break
    }

    const handler = addon.hooks.onContentTransform
    if (!handler) {
      continue
    }

    try {
      // @MX:NOTE: 타입 단언 — handler 타입은 HookHandler이지만 실제 시그니처 확인 필요
      const result = await (handler as (html: string, ctx: AddonContext) => Promise<string>)(
        current,
        ctx
      )
      current = result
    } catch (error) {
      // 실패한 핸들러는 identity 처리 — REQ-ADDON-033
      // 즉 current를 변경하지 않고 다음 핸들러로 진행

      // 자동 비활성화
      await autoDisableAddon(
        addon.name,
        error instanceof Error ? error.message : String(error),
        ctx.prisma
      )

      // 다음 핸들러로 계속 (REQ-ADDON-033)
    }
  }

  return current
}

/**
 * onUserRender 실행기 — REQ-ADDON-030, REQ-ADDON-034
 */
export async function runUserRender(
  user: AddonUser,
  ctx: AddonContext,
  signal?: AbortSignal
): Promise<{ icon?: string; badge?: string }> {
  const effective = await listEffectiveAddons(ctx.prisma)

  let decoration: { icon?: string; badge?: string } = {}

  for (const addon of effective) {
    // AbortSignal 확인
    if (signal?.aborted) {
      break
    }

    const handler = addon.hooks.onUserRender
    if (!handler) {
      continue
    }

    try {
      const result = await (handler as (
        user: AddonUser,
        ctx: AddonContext
      ) => Promise<{ icon?: string; badge?: string }>)(user, ctx)

      // later-handler-wins merge — REQ-ADDON-034
      decoration = { ...decoration, ...result }
    } catch (error) {
      // 자동 비활성화
      await autoDisableAddon(
        addon.name,
        error instanceof Error ? error.message : String(error),
        ctx.prisma
      )

      // 다음 핸들러로 계속
    }
  }

  return decoration
}

/**
 * onPageView 실행기 — REQ-ADDON-030, REQ-ADDON-032
 */
export async function runPageView(
  mid: string,
  ctx: AddonContext,
  signal?: AbortSignal
): Promise<void> {
  const effective = await listEffectiveAddons(ctx.prisma)

  for (const addon of effective) {
    // AbortSignal 확인
    if (signal?.aborted) {
      break
    }

    const handler = addon.hooks.onPageView
    if (!handler) {
      continue
    }

    try {
      await (handler as (mid: string, ctx: AddonContext) => Promise<void>)(mid, ctx)
    } catch (error) {
      // 자동 비활성화
      await autoDisableAddon(
        addon.name,
        error instanceof Error ? error.message : String(error),
        ctx.prisma
      )

      // 다음 핸들러로 계속
    }
  }
}

/**
 * onAdminAction 실행기 — REQ-ADDON-030
 */
export async function runAdminAction(
  action: string,
  payload: unknown,
  ctx: AddonContext,
  signal?: AbortSignal
): Promise<void> {
  const effective = await listEffectiveAddons(ctx.prisma)

  for (const addon of effective) {
    // AbortSignal 확인
    if (signal?.aborted) {
      break
    }

    const handler = addon.hooks.onAdminAction
    if (!handler) {
      continue
    }

    try {
      await (handler as (
        action: string,
        payload: unknown,
        ctx: AddonContext
      ) => Promise<void>)(action, payload, ctx)
    } catch (error) {
      // 자동 비활성화
      await autoDisableAddon(
        addon.name,
        error instanceof Error ? error.message : String(error),
        ctx.prisma
      )

      // 다음 핸들러로 계속
    }
  }
}
