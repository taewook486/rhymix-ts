'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { PlacedWidget } from '@/types/layout'

interface WidgetConfigDialogProps {
  widget: PlacedWidget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: Record<string, any>) => void
}

export function WidgetConfigDialog({
  widget,
  open,
  onOpenChange,
  onSave,
}: WidgetConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, any>>(widget.config)

  useEffect(() => {
    setConfig(widget.config)
  }, [widget])

  const handleSave = () => {
    onSave(config)
    onOpenChange(false)
  }

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // Render config fields based on widget type
  const renderConfigFields = () => {
    switch (widget.widget_type) {
      case 'latest_posts':
      case 'popular_posts':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="limit">Number of Posts</Label>
              <Input
                id="limit"
                type="number"
                value={config.limit || 5}
                onChange={(e) => updateConfig('limit', parseInt(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="showDate">Show Date</Label>
              <Switch
                id="showDate"
                checked={config.showDate ?? true}
                onCheckedChange={(checked) => updateConfig('showDate', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="showAuthor">Show Author</Label>
              <Switch
                id="showAuthor"
                checked={config.showAuthor ?? false}
                onCheckedChange={(checked) => updateConfig('showAuthor', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="showThumbnail">Show Thumbnail</Label>
              <Switch
                id="showThumbnail"
                checked={config.showThumbnail ?? false}
                onCheckedChange={(checked) => updateConfig('showThumbnail', checked)}
              />
            </div>
          </>
        )

      case 'banner':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={config.imageUrl || ''}
                onChange={(e) => updateConfig('imageUrl', e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL</Label>
              <Input
                id="linkUrl"
                value={config.linkUrl || ''}
                onChange={(e) => updateConfig('linkUrl', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </>
        )

      case 'calendar':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="showWeekends">Show Weekends</Label>
              <Switch
                id="showWeekends"
                checked={config.showWeekends ?? true}
                onCheckedChange={(checked) => updateConfig('showWeekends', checked)}
              />
            </div>
          </>
        )

      case 'login_form':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="showRememberMe">Show Remember Me</Label>
              <Switch
                id="showRememberMe"
                checked={config.showRememberMe ?? true}
                onCheckedChange={(checked) => updateConfig('showRememberMe', checked)}
              />
            </div>
          </>
        )

      case 'html':
      case 'text':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                className="w-full min-h-[200px] p-2 border rounded-md"
                value={config.content || ''}
                onChange={(e) => updateConfig('content', e.target.value)}
                placeholder="Enter HTML or text content..."
              />
            </div>
          </>
        )

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No configuration options available for this widget type.
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Widget</DialogTitle>
          <DialogDescription>
            Adjust settings for {widget.widget_title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {renderConfigFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
