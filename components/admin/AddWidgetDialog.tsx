'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Loader2, LayoutGrid } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CreateWidgetResponse {
  success: boolean
  error?: string
  message?: string
}

const WIDGET_TYPES = [
  'html',
  'text',
  'menu',
  'recent_posts',
  'recent_comments',
  'tags',
  'calendar',
  'search',
  'custom',
]

const POSITIONS = [
  'sidebar_left',
  'sidebar_right',
  'header',
  'footer',
  'content_top',
  'content_bottom',
]

export function AddWidgetDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [position, setPosition] = useState('')
  const [content, setContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleCreateWidget = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Widget name is required.',
      })
      return
    }

    if (!type) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please select a widget type.',
      })
      return
    }

    if (!position) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please select a position.',
      })
      return
    }

    setIsCreating(true)

    // For now, just show a message since widget management requires more complex setup
    setTimeout(() => {
      setOpen(false)
      setName('')
      setTitle('')
      setType('')
      setPosition('')
      setContent('')
      setIsCreating(false)

      toast({
        title: 'Widget Creation',
        description: 'Widget creation requires widget renderer implementation. This feature will be available after widget system completion.',
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Widget</DialogTitle>
          <DialogDescription>
            Create a widget to display content in specific areas of your site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="widget-name">Widget Name</Label>
            <Input
              id="widget-name"
              placeholder="e.g., recent_posts_widget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this widget
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget-title">Display Title</Label>
            <Input
              id="widget-title"
              placeholder="e.g., Recent Posts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="widget-type">Type</Label>
              <Select value={type} onValueChange={setType} disabled={isCreating}>
                <SelectTrigger id="widget-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="widget-position">Position</Label>
              <Select value={position} onValueChange={setPosition} disabled={isCreating}>
                <SelectTrigger id="widget-position">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget-content">Content (Optional)</Label>
            <Textarea
              id="widget-content"
              placeholder="Widget content or configuration (JSON)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreating}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              For HTML widgets, enter HTML code. For others, enter JSON configuration.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateWidget} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Add Widget
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
