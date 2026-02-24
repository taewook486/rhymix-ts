'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { GripVertical, Trash2, Settings, X } from 'lucide-react'
import type { LayoutColumn, PlacedWidget } from '@/types/layout'
import { WidgetCard } from './WidgetCard'

interface LayoutColumnProps {
  column: LayoutColumn
  widgets: PlacedWidget[]
  onRemoveColumn?: () => void
  onRemoveWidget: (widgetId: string) => void
  onWidgetConfig: (widget: PlacedWidget) => void
  onUpdateWidth: (width: number) => void
}

export function LayoutColumn({
  column,
  widgets,
  onRemoveColumn,
  onRemoveWidget,
  onWidgetConfig,
  onUpdateWidth,
}: LayoutColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const handleRemoveWidget = (e: React.MouseEvent, widgetId: string) => {
    e.stopPropagation()
    onRemoveWidget(widgetId)
  }

  const handleWidgetConfig = (e: React.MouseEvent, widget: PlacedWidget) => {
    e.stopPropagation()
    onWidgetConfig(widget)
  }

  return (
    <div
      ref={setNodeRef}
      className="relative min-h-[500px] border-2 border-dashed rounded-lg p-4 space-y-4"
      style={{ width: '100%' }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm font-medium">Column {column.id}</div>
          <div className="text-xs text-muted-foreground">
            Width: {Math.round(column.width * 100)}%
          </div>
        </div>
        {onRemoveColumn && (
          <Button variant="ghost" size="sm" onClick={onRemoveColumn}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Width Slider */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Column Width</div>
        <Slider
          value={[column.width * 100]}
          onValueChange={([value]) => onUpdateWidth(value / 100)}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Widgets in Column */}
      <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {widgets.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded">
              Drop widgets here
            </div>
          ) : (
            widgets.map((widget) => (
              <SortableWidgetCard
                key={widget.id}
                widget={widget}
                onRemove={handleRemoveWidget}
                onConfig={handleWidgetConfig}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

interface SortableWidgetCardProps {
  widget: PlacedWidget
  onRemove: (e: React.MouseEvent, widgetId: string) => void
  onConfig: (e: React.MouseEvent, widget: PlacedWidget) => void
}

function SortableWidgetCard({ widget, onRemove, onConfig }: SortableWidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <WidgetCard widget={widget} onRemove={onRemove} onConfig={onConfig} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}
