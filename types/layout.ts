/**
 * Layout Builder Types
 *
 * Types for the drag-and-drop layout builder system.
 */

// =====================================================
// Layout Types
// =====================================================

export type LayoutType = 'default' | 'custom' | 'blog' | 'forum' | 'landing'

export interface Layout {
  id: string
  name: string
  title: string
  description?: string
  layout_type: LayoutType
  is_default: boolean
  is_active: boolean
  config: LayoutConfig
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface LayoutConfig {
  columns: LayoutColumn[]
  rows?: LayoutRow[]
  widgets?: Array<{
    widget_id: string
    column_index: number
    row_index: number
    order_index: number
    width_fraction: number
    config: Record<string, any>
  }>
}

export interface LayoutColumn {
  id: string
  width: number // Fraction of total width (0.1 to 1.0)
  widgets?: LayoutWidgetPlacement[]
}

export interface LayoutRow {
  id: string
  height?: string
  widgets?: string[]
}

export interface LayoutWidgetPlacement {
  widget_id: string
  order_index: number
  width_fraction?: number
  config?: Record<string, any>
}

// =====================================================
// Layout Widget Types
// =====================================================

export interface LayoutWidget {
  id: string
  layout_id: string
  widget_id: string
  column_index: number
  row_index: number
  order_index: number
  width_fraction: number
  config: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LayoutWidgetWithDetails extends LayoutWidget {
  widget_name: string
  widget_title: string
  widget_type: string
  widget_config: Record<string, any>
}

// =====================================================
// Layout Column Types
// =====================================================

export interface LayoutColumnDb {
  id: string
  layout_id: string
  column_index: number
  width_fraction: number
  css_class?: string
  inline_style?: string
  created_at: string
  updated_at: string
}

// =====================================================
// Layout Detail Types
// =====================================================

export interface LayoutDetail {
  layout: Layout
  columns: LayoutColumnDb[]
  widgets: LayoutWidgetWithDetails[]
}

// =====================================================
// Drag and Drop Types
// =====================================================

export interface DraggableWidget {
  id: string
  widget_id: string
  widget_name: string
  widget_title: string
  widget_type: string
}

export interface DropTarget {
  column_index: number
  row_index: number
  order_index: number
}

export interface DraggedWidgetData {
  widget_id: string
  from_column: number
  from_row: number
  from_order: number
}

// =====================================================
// Layout Builder State Types
// =====================================================

export interface LayoutBuilderState {
  layout: Layout | null
  availableWidgets: AvailableWidget[]
  placedWidgets: PlacedWidget[]
  selectedWidget: string | null
  isDragging: boolean
  draggedWidget: DraggedWidgetData | null
}

export interface AvailableWidget {
  id: string
  name: string
  title: string
  description?: string
  type: string
  icon?: string
}

export interface PlacedWidget {
  id: string
  widget_id: string
  widget_name: string
  widget_title: string
  widget_type: string
  column_index: number
  row_index: number
  order_index: number
  width_fraction: number
  config: Record<string, any>
}

// =====================================================
// Layout Action Types
// =====================================================

export type LayoutAction =
  | { type: 'SET_LAYOUT'; payload: Layout }
  | { type: 'ADD_WIDGET'; payload: PlacedWidget }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'MOVE_WIDGET'; payload: { widgetId: string; newPosition: DropTarget } }
  | { type: 'UPDATE_WIDGET_CONFIG'; payload: { widgetId: string; config: Record<string, any> } }
  | { type: 'SELECT_WIDGET'; payload: string | null }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_DRAGGED_WIDGET'; payload: DraggedWidgetData | null }
  | { type: 'RESET' }

// =====================================================
// Layout Preview Types
// =====================================================

export interface LayoutPreviewProps {
  layoutId?: string
  layoutName?: string
  mode?: 'edit' | 'preview'
}

// =====================================================
// Validation Types
// =====================================================

export interface LayoutValidationError {
  field: string
  message: string
}

export interface LayoutValidationResult {
  valid: boolean
  errors: LayoutValidationError[]
}
