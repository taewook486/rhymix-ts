'use client'

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AvailableWidget } from '@/types/layout'

interface WidgetPaletteProps {
  widgets: AvailableWidget[]
}

export function WidgetPalette({ widgets }: WidgetPaletteProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Available Widgets</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {widgets.map((widget) => (
              <DraggableWidget key={widget.id} widget={widget} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface DraggableWidgetProps {
  widget: AvailableWidget
}

function DraggableWidget({ widget }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${widget.id}`,
    data: widget,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing
        p-3 border rounded-lg hover:bg-accent transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="font-medium text-sm">{widget.title}</div>
      {widget.description && (
        <div className="text-xs text-muted-foreground mt-1">{widget.description}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1">
        Type: {widget.type}
      </div>
    </div>
  )
}
