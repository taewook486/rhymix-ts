'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, MoreVertical, Menu as MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Menu, MenuLocation } from '@/lib/supabase/database.types'
import { createMenu, updateMenu, deleteMenu } from '@/app/actions/menu'

interface MenuEditorProps {
  menus: Menu[]
  onMenusChange: () => void
  onSelectMenu: (menuId: string) => void
  selectedMenuId: string | null
}

export function MenuEditor({
  menus,
  onMenusChange,
  onSelectMenu,
  selectedMenuId,
}: MenuEditorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      const name = formData.get('name') as string
      const title = formData.get('title') as string
      const location = formData.get('location') as string

      if (!name || !title || !location) {
        alert('모든 필수 항목을 입력해주세요.')
        return
      }

      const result = await createMenu({ name, title, location })
      if (result.success) {
        setShowCreateDialog(false)
        onMenusChange()
        if (result.data) {
          onSelectMenu(result.data.id)
        }
      } else {
        alert(result.error || 'Failed to create menu')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (formData: FormData) => {
    if (!editingMenu) return
    setIsSubmitting(true)
    try {
      const updates: Record<string, string | boolean> = {}
      const name = formData.get('name') as string
      const title = formData.get('title') as string
      const location = formData.get('location') as string

      if (name) updates.name = name
      if (title) updates.title = title
      if (location) updates.location = location

      const result = await updateMenu(editingMenu.id, updates)
      if (result.success) {
        setShowEditDialog(false)
        setEditingMenu(null)
        onMenusChange()
      } else {
        alert(result.error || 'Failed to update menu')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingMenu) return
    setIsSubmitting(true)
    try {
      const result = await deleteMenu(editingMenu.id)
      if (result.success) {
        setShowDeleteDialog(false)
        setEditingMenu(null)
        onMenusChange()
        if (selectedMenuId === editingMenu.id) {
          const firstMenuId = menus[0]?.id
          onSelectMenu(firstMenuId ?? null)
        }
      } else {
        alert(result.error || 'Failed to delete menu')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLocationLabel = (location: MenuLocation) => {
    const labels: Record<MenuLocation, string> = {
      header: 'Header',
      footer: 'Footer',
      sidebar: 'Sidebar',
      top: 'Top',
      bottom: 'Bottom',
    }
    return labels[location] || location
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Menus</h3>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Menu
        </Button>
      </div>

      <div className="space-y-2">
        {menus.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <MenuIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No menus created yet</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setShowCreateDialog(true)}
            >
              Create your first menu
            </Button>
          </div>
        ) : (
          menus.map((menu) => (
            <div
              key={menu.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedMenuId === menu.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
              onClick={() => onSelectMenu(menu.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{menu.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {getLocationLabel(menu.location)}
                  </Badge>
                  {!menu.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {menu.description || menu.name}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingMenu(menu)
                      setShowEditDialog(true)
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingMenu(menu)
                      setShowDeleteDialog(true)
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Create Menu Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Menu</DialogTitle>
            <DialogDescription>
              Create a new navigation menu for your site.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name (ID)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="main-menu"
                  required
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier using lowercase letters, numbers, and hyphens
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Main Menu"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Select name="location" defaultValue="header">
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Menu description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Menu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
            <DialogDescription>
              Update the menu settings.
            </DialogDescription>
          </DialogHeader>
          {editingMenu && (
            <form action={handleEdit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name (ID)</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingMenu.name}
                    required
                    pattern="[a-z0-9-]+"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editingMenu.title}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Select
                    name="location"
                    defaultValue={editingMenu.location}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editingMenu.description || ''}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    name="is_active"
                    value="true"
                    defaultChecked={editingMenu.is_active}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="edit-is-active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Menu'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Menu Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{editingMenu?.title}&quot;?
              This will also delete all menu items. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
