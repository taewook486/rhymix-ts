/**
 * 위젯 시스템 barrel export — SPEC-ADMIN-001 Slice G
 */
export type { WidgetDefinition } from './types'
export {
  registerWidget,
  getWidget,
  listWidgets,
  resetWidgetRegistry,
} from './registry'
