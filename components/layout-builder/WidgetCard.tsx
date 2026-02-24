'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, Settings } from 'lucide-react'
import type { PlacedWidget } from '@/types/layout'

interface WidgetCardProps {
  widget: PlacedWidget
  onRemove: (e: React.MouseEvent, widgetId: string) => void
  onConfig: (e: React.MouseEvent, widget: PlacedWidget) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function WidgetCard({ widget, onRemove, onConfig, dragHandleProps }: WidgetCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-sm">{widget.widget_title}</CardTitle>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => onConfig(e, widget)}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => onRemove(e, widget.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          Type: {widget.widget_type}
        </div>
        {widget.width_fraction < 1 && (
          <div className="text-xs text-muted-foreground mt-1">
            Width: {Math.round(widget.width_fraction * 100)}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}
