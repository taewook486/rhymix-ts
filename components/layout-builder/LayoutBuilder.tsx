'use client'

import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Eye, Plus, Trash2, Settings } from 'lucide-react'
import type { Layout, LayoutColumn, PlacedWidget, AvailableWidget } from '@/types/layout'
import { LayoutColumn as LayoutColumnComponent } from './LayoutColumn'
import { WidgetPalette } from './WidgetPalette'
import { WidgetConfigDialog } from './WidgetConfigDialog'

interface LayoutBuilderProps {
  initialLayout?: Layout
  availableWidgets: AvailableWidget[]
  onSave: (layout: Layout) => Promise<void>
  onPreview?: (layoutId: string) => void
}

export function LayoutBuilder({
  initialLayout,
  availableWidgets,
  onSave,
  onPreview,
}: LayoutBuilderProps) {
  const [layout, setLayout] = useState<Layout>(
    initialLayout || {
      id: '',
      name: '',
      title: '',
      description: '',
      layout_type: 'custom',
      is_default: false,
      is_active: true,
      config: { columns: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )

  const [placedWidgets, setPlacedWidgets] = useState<PlacedWidget[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedWidget, setSelectedWidget] = useState<PlacedWidget | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context }) => {
        const { active, over } = context
        if (active && over) {
          return {
            x: 0,
            y: 0,
          }
        }
        return undefined
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Handle widget placement from palette
    if (activeId.startsWith('palette-')) {
      const widgetId = activeId.replace('palette-', '')
      const columnId = overId.replace('column-', '')
      const columnIndex = parseInt(columnId)

      // Find the widget in available widgets
      const widget = availableWidgets.find((w) => w.id === widgetId)
      if (!widget) return

      // Create new placed widget
      const newWidget: PlacedWidget = {
        id: `widget-${Date.now()}`,
        widget_id: widgetId,
        widget_name: widget.name,
        widget_title: widget.title,
        widget_type: widget.type,
        column_index: columnIndex,
        row_index: 0,
        order_index: placedWidgets.filter((w) => w.column_index === columnIndex).length,
        width_fraction: 1.0,
        config: {},
      }

      setPlacedWidgets([...placedWidgets, newWidget])
    }
    // Handle moving existing widget
    else if (activeId.startsWith('widget-')) {
      const widget = placedWidgets.find((w) => w.id === activeId)
      if (!widget) return

      const columnId = overId.replace('column-', '')
      const columnIndex = parseInt(columnId)

      // Update widget position
      setPlacedWidgets(
        placedWidgets.map((w) =>
          w.id === activeId
            ? {
                ...w,
                column_index: columnIndex,
                order_index: placedWidgets.filter((pw) => pw.column_index === columnIndex).length,
              }
            : w
        )
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Handle reordering within same column
    if (activeId.startsWith('widget-') && overId.startsWith('widget-')) {
      const oldIndex = placedWidgets.findIndex((w) => w.id === activeId)
      const newIndex = placedWidgets.findIndex((w) => w.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const activeWidget = placedWidgets[oldIndex]
        const overWidget = placedWidgets[newIndex]

        // Update order indices
        setPlacedWidgets(
          placedWidgets.map((w) => {
            if (w.id === activeId) {
              return { ...w, order_index: overWidget.order_index }
            }
            if (w.column_index === activeWidget.column_index && w.order_index >= overWidget.order_index) {
              return { ...w, order_index: w.order_index + 1 }
            }
            return w
          })
        )
      }
    }
  }

  const handleAddColumn = () => {
    const newColumn: LayoutColumn = {
      id: `column-${layout.config.columns.length}`,
      width: 0.33,
      widgets: [],
    }

    setLayout({
      ...layout,
      config: {
        ...layout.config,
        columns: [...layout.config.columns, newColumn],
      },
    })
  }

  const handleRemoveColumn = (columnId: string) => {
    setLayout({
      ...layout,
      config: {
        ...layout.config,
        columns: layout.config.columns.filter((col) => col.id !== columnId),
      },
    })

    // Remove widgets in this column
    setPlacedWidgets(placedWidgets.filter((w) => w.column_index.toString() !== columnId.replace('column-', '')))
  }

  const handleUpdateColumnWidth = (columnId: string, width: number) => {
    setLayout({
      ...layout,
      config: {
        ...layout.config,
        columns: layout.config.columns.map((col) =>
          col.id === columnId ? { ...col, width } : col
        ),
      },
    })
  }

  const handleRemoveWidget = (widgetId: string) => {
    setPlacedWidgets(placedWidgets.filter((w) => w.id !== widgetId))
  }

  const handleWidgetConfig = (widget: PlacedWidget) => {
    setSelectedWidget(widget)
    setShowConfigDialog(true)
  }

  const handleSaveConfig = (config: Record<string, any>) => {
    if (selectedWidget) {
      setPlacedWidgets(
        placedWidgets.map((w) =>
          w.id === selectedWidget.id ? { ...w, config: { ...w.config, ...config } } : w
        )
      )
    }
    setShowConfigDialog(false)
    setSelectedWidget(null)
  }

  const handleSaveLayout = async () => {
    setIsSaving(true)
    try {
      // Update layout config with placed widgets
      const updatedLayout: Layout = {
        ...layout,
        config: {
          ...layout.config,
          widgets: placedWidgets.map((w) => ({
            widget_id: w.widget_id,
            column_index: w.column_index,
            row_index: w.row_index,
            order_index: w.order_index,
            width_fraction: w.width_fraction,
            config: w.config,
          })),
        },
      }

      await onSave(updatedLayout)
    } finally {
      setIsSaving(false)
    }
  }

  const activeWidget = activeId
    ? placedWidgets.find((w) => w.id === activeId) ||
      availableWidgets.find((w) => w.id === activeId.replace('palette-', ''))
    : null

  return (
    <div className="space-y-6">
      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Settings</CardTitle>
          <CardDescription>Configure your layout properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="layout-name">Layout Name</Label>
              <Input
                id="layout-name"
                value={layout.name}
                onChange={(e) => setLayout({ ...layout, name: e.target.value })}
                placeholder="e.g., default_sidebar_right"
              />
            </div>
            <div>
              <Label htmlFor="layout-title">Title</Label>
              <Input
                id="layout-title"
                value={layout.title}
                onChange={(e) => setLayout({ ...layout, title: e.target.value })}
                placeholder="e.g., Default with Right Sidebar"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="layout-description">Description</Label>
            <Textarea
              id="layout-description"
              value={layout.description || ''}
              onChange={(e) => setLayout({ ...layout, description: e.target.value })}
              placeholder="Describe this layout..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="layout-type">Layout Type</Label>
            <Select
              value={layout.layout_type}
              onValueChange={(value: any) => setLayout({ ...layout, layout_type: value })}
            >
              <SelectTrigger id="layout-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="forum">Forum</SelectItem>
                <SelectItem value="landing">Landing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layout Builder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-6">
          {/* Widget Palette */}
          <div className="col-span-1">
            <WidgetPalette widgets={availableWidgets} />
          </div>

          {/* Layout Canvas */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Layout Canvas</CardTitle>
                    <CardDescription>Drag widgets to columns to build your layout</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {onPreview && (
                      <Button variant="outline" size="sm" onClick={() => onPreview(layout.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    )}
                    <Button size="sm" onClick={handleAddColumn}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {layout.config.columns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="mb-2">No columns yet</p>
                    <p className="text-sm">Click "Add Column" to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${layout.config.columns.length}, 1fr)` }}>
                    {layout.config.columns.map((column) => (
                      <LayoutColumnComponent
                        key={column.id}
                        column={column}
                        widgets={placedWidgets.filter((w) => w.column_index.toString() === column.id.replace('column-', ''))}
                        onRemoveColumn={layout.config.columns.length > 1 ? () => handleRemoveColumn(column.id) : undefined}
                        onRemoveWidget={handleRemoveWidget}
                        onWidgetConfig={handleWidgetConfig}
                        onUpdateWidth={(width) => handleUpdateColumnWidth(column.id, width)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget && (
            <Card className="opacity-50 cursor-grabbing">
              <CardContent className="p-4">
                <div className="font-medium">
                  {'widget_title' in activeWidget ? activeWidget.widget_title : activeWidget.title}
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Widget Config Dialog */}
      {showConfigDialog && selectedWidget && (
        <WidgetConfigDialog
          widget={selectedWidget}
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          onSave={handleSaveConfig}
        />
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleSaveLayout} disabled={isSaving || !layout.name || !layout.title}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Layout'}
        </Button>
      </div>
    </div>
  )
}
