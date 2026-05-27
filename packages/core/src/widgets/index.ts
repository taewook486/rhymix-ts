/**
 * 위젯 시스템 barrel export — SPEC-WIDGET-001
 */
export type { WidgetDefinition, WidgetRenderContext, WidgetToken } from './types'
export {
  registerWidget,
  getWidget,
  listWidgets,
  resetWidgetRegistry,
} from './registry'
export { validateWidgetProps } from './validate'
export {
  listWidgetInstances,
  createWidgetInstance,
  updateWidgetInstance,
  deleteWidgetInstance,
} from './instances'
export type { WidgetInstanceWithStatus } from './instances'
