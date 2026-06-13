/**
 * Addon 시스템 barrel export — SPEC-ADDON-001
 */

// 타입 내보내기
export type {
  HookType,
  HookHandler,
  AddonContext,
  AddonUser,
  AddonDefinition,
  ContentTransformHook,
  UserRenderHook,
  PageViewHook,
  AdminActionHook,
} from './types'
export { AddonAlreadyRegisteredError } from './types'

// 레지스트리 내보내기
export {
  registerAddon,
  getAddon,
  listAddons,
  resetAddonRegistry,
} from './registry'

// Config 관리 내보내기
export {
  listEffectiveAddons,
  listAllAddonsWithConfig,
  ensureAddonConfig,
  toggleAddon,
  setAddonPriority,
  autoDisableAddon,
  clearAutoDisableCache,
} from './config'

// Executor 내보내기
export {
  runContentTransform,
  runUserRender,
  runPageView,
  runAdminAction,
} from './executor'

// 빌트인 addon barrel import (부작용: 등록 실행)
import './builtin'
