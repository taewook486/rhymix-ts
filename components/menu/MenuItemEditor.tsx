'use client'

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  MenuItem,
  MenuItemType,
  MenuItemTarget,
  MenuItemRequiredRole,
} from '@/lib/supabase/database.types'
import { createMenuItem, updateMenuItem } from '@/app/actions/menu'

interface MenuItemEditorProps {
  menuId: string
  item?: MenuItem | null
  parentId?: string | null
  items: MenuItem[]
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function MenuItemEditor({
  menuId,
  item,
  parentId,
  items,
  isOpen,
  onClose,
  onSaved,
}: MenuItemEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'link' as MenuItemType,
    icon: '',
    target: '_self' as MenuItemTarget,
    required_role: 'all' as MenuItemRequiredRole,
    parent_id: '' as string | null,
    is_active: true,
    is_visible: true,
    is_new_window: false,
    is_nofollow: false,
  })

  const isEditing = !!item

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        url: item.url || '',
        type: item.type,
        icon: item.icon || '',
        target: item.target,
        required_role: item.required_role,
        parent_id: item.parent_id || null,
        is_active: item.is_active,
        is_visible: item.is_visible,
        is_new_window: item.is_new_window,
        is_nofollow: item.is_nofollow,
      })
    } else {
      setFormData({
        title: '',
        url: '',
        type: 'link',
        icon: '',
        target: '_self',
        required_role: 'all',
        parent_id: parentId || null,
        is_active: true,
        is_visible: true,
        is_new_window: false,
        is_nofollow: false,
      })
    }
  }, [item, parentId, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = new FormData()
      submitData.append('title', formData.title)
      submitData.append('url', formData.url)
      submitData.append('type', formData.type)
      submitData.append('icon', formData.icon)
      submitData.append('target', formData.target)
      submitData.append('required_role', formData.required_role)
      submitData.append('parent_id', formData.parent_id || '')
      submitData.append('is_active', formData.is_active ? 'true' : 'false')
      submitData.append('is_visible', formData.is_visible ? 'true' : 'false')
      submitData.append('is_new_window', formData.is_new_window ? 'true' : 'false')
      submitData.append('is_nofollow', formData.is_nofollow ? 'true' : 'false')

      let result
      if (isEditing && item) {
        result = await updateMenuItem(item.id, submitData)
      } else {
        result = await createMenuItem(menuId, submitData)
      }

      if (result.success) {
        onSaved()
        onClose()
      } else {
        alert(result.error || 'Failed to save menu item')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter out current item and its descendants from parent options
  const getAvailableParents = (): MenuItem[] => {
    if (!item) return items

    const descendants = new Set<string>()
    const collectDescendants = (itemId: string) => {
      items.forEach((i) => {
        if (i.parent_id === itemId) {
          descendants.add(i.id)
          collectDescendants(i.id)
        }
      })
    }
    collectDescendants(item.id)

    return items.filter((i) => i.id !== item.id && !descendants.has(i.id))
  }

  const availableParents = getAvailableParents()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the menu item details.'
              : 'Create a new menu item.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Menu item title"
                required
              />
            </div>

            {/* URL */}
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="/page or https://example.com"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: MenuItemType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="divider">Divider</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Icon */}
            <div className="grid gap-2">
              <Label htmlFor="icon">Icon (Lucide icon name)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="home, settings, user..."
              />
              <p className="text-xs text-muted-foreground">
                Use Lucide icon names (e.g., home, settings, file-text)
              </p>
            </div>

            {/* Target */}
            <div className="grid gap-2">
              <Label htmlFor="target">Target</Label>
              <Select
                value={formData.target}
                onValueChange={(value: MenuItemTarget) =>
                  setFormData({ ...formData, target: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_blank">New Window</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Required Role */}
            <div className="grid gap-2">
              <Label htmlFor="required_role">Visibility</Label>
              <Select
                value={formData.required_role}
                onValueChange={(value: MenuItemRequiredRole) =>
                  setFormData({ ...formData, required_role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="member">Members Only</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parent */}
            <div className="grid gap-2">
              <Label htmlFor="parent_id">Parent Item</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parent_id: value === 'none' ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top level)</SelectItem>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {'  '.repeat(parent.depth)}
                      {parent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_visible">Visible</Label>
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_visible: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_new_window">New Window</Label>
                <Switch
                  id="is_new_window"
                  checked={formData.is_new_window}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_new_window: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_nofollow">No Follow</Label>
                <Switch
                  id="is_nofollow"
                  checked={formData.is_nofollow}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_nofollow: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Item'
                  : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
