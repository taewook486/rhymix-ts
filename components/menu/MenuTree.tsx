'use client'

import { useState, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { MenuItem } from '@/lib/supabase/database.types'
import { deleteMenuItem, reorderMenuItems } from '@/app/actions/menu'

interface MenuTreeProps {
  menuId: string
  items: MenuItem[]
  onItemsChange: () => void
  onEditItem: (item: MenuItem) => void
  onAddChild: (parentId: string) => void
}

interface TreeItem extends MenuItem {
  children: TreeItem[]
}

export function MenuTree({
  menuId,
  items,
  onItemsChange,
  onEditItem,
  onAddChild,
}: MenuTreeProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    id: string
    position: 'before' | 'after' | 'inside'
  } | null>(null)

  // Build tree structure
  const buildTree = useCallback((flatItems: MenuItem[]): TreeItem[] => {
    const itemMap = new Map<string, TreeItem>()
    const rootItems: TreeItem[] = []

    // First pass: create map with empty children arrays
    flatItems.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Second pass: build tree structure
    flatItems.forEach((item) => {
      const node = itemMap.get(item.id)
      if (!node) return

      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          parent.children.push(node)
        } else {
          rootItems.push(node)
        }
      } else {
        rootItems.push(node)
      }
    })

    // Sort children by order_index
    const sortChildren = (items: TreeItem[]) => {
      items.sort((a, b) => a.order_index - b.order_index)
      items.forEach((item) => sortChildren(item.children))
    }
    sortChildren(rootItems)

    return rootItems
  }, [])

  const treeItems = buildTree(items)

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleDelete = async () => {
    if (!deleteItemId) return
    setIsDeleting(true)
    try {
      const result = await deleteMenuItem(deleteItemId)
      if (result.success) {
        onItemsChange()
      } else {
        alert(result.error || 'Failed to delete item')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsDeleting(false)
      setDeleteItemId(null)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem(item)
  }

  const handleDragOver = (
    e: React.DragEvent,
    item: TreeItem,
    position: 'before' | 'after' | 'inside'
  ) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget({ id: item.id, position })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetItem: TreeItem,
    position: 'before' | 'after' | 'inside'
  ) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null)
      setDropTarget(null)
      return
    }

    // Calculate new order
    const siblings = items.filter(
      (i) => i.parent_id === (position === 'inside' ? targetItem.id : targetItem.parent_id)
    )
    siblings.sort((a, b) => a.order_index - b.order_index)

    const updates: Array<{
      id: string
      order_index: number
      parent_id: string | null
    }> = []

    if (position === 'inside') {
      // Moving inside target (as child)
      const targetChildren = items.filter((i) => i.parent_id === targetItem.id)
      const maxOrder =
        targetChildren.length > 0
          ? Math.max(...targetChildren.map((c) => c.order_index))
          : -1

      updates.push({
        id: draggedItem.id,
        order_index: maxOrder + 1,
        parent_id: targetItem.id,
      })

      // Expand target to show dropped item
      setExpandedItems((prev) => new Set([...prev, targetItem.id]))
    } else {
      // Moving before or after target
      const targetIndex = siblings.findIndex((s) => s.id === targetItem.id)
      const newOrder =
        position === 'before' ? targetIndex : targetIndex + 1

      // Shift other items
      siblings.forEach((sibling, index) => {
        if (sibling.id === draggedItem.id) return

        let order = index
        if (index >= newOrder) {
          order += 1
        }
        updates.push({
          id: sibling.id,
          order_index: order,
          parent_id: targetItem.parent_id,
        })
      })

      updates.push({
        id: draggedItem.id,
        order_index: newOrder,
        parent_id: targetItem.parent_id,
      })
    }

    try {
      await reorderMenuItems(menuId, updates)
      onItemsChange()
    } catch (error) {
      alert('Failed to reorder items')
    }

    setDraggedItem(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDropTarget(null)
  }

  const renderItem = (item: TreeItem, depth: number = 0) => {
    const hasChildren = item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isDropTarget =
      dropTarget?.id === item.id ||
      (dropTarget?.position === 'inside' && draggedItem?.id !== item.id)

    return (
      <div key={item.id} className="select-none">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg border transition-colors group',
            isDropTarget && dropTarget?.position === 'inside'
              ? 'border-primary bg-primary/10'
              : 'hover:bg-accent',
            draggedItem?.id === item.id && 'opacity-50'
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => handleDragOver(e, item, 'inside')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item, 'inside')}
          onDragEnd={handleDragEnd}
        >
          {/* Expand/Collapse Button */}
          <button
            className={cn(
              'p-1 rounded hover:bg-accent transition-colors',
              !hasChildren && 'invisible'
            )}
            onClick={() => toggleExpand(item.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Icon */}
          {item.icon && (
            <span className="text-muted-foreground">
              {/* Icon would be rendered here */}
            </span>
          )}

          {/* Title */}
          <span
            className={cn(
              'flex-1 truncate',
              !item.is_active && 'text-muted-foreground',
              !item.is_visible && 'italic'
            )}
          >
            {item.title}
          </span>

          {/* Status Badges */}
          <div className="flex items-center gap-1">
            {!item.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            {!item.is_visible && (
              <Badge variant="outline" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" />
                Hidden
              </Badge>
            )}
            {item.required_role === 'member' && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Member
              </Badge>
            )}
            {item.required_role === 'admin' && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            {item.url && (
              <Badge variant="outline" className="text-xs max-w-32 truncate">
                {item.url}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditItem(item)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {depth < 2 && (
                <DropdownMenuItem onClick={() => onAddChild(item.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Child
                </DropdownMenuItem>
              )}
              {item.url && (
                <DropdownMenuItem asChild>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit URL
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteItemId(item.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Drop zone before/after items */}
        {depth < 3 && hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children.map((child, index) => (
              <div key={child.id}>
                {/* Drop zone before child */}
                {index === 0 && (
                  <div
                    className={cn(
                      'h-2 rounded transition-colors',
                      dropTarget?.id === item.id &&
                        dropTarget?.position === 'before' &&
                        'bg-primary/20'
                    )}
                    style={{ marginLeft: `${(depth + 1) * 24}px` }}
                    onDragOver={(e) => handleDragOver(e, child, 'before')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, child, 'before')}
                  />
                )}
                {renderItem(child, depth + 1)}
                {/* Drop zone after child */}
                <div
                  className={cn(
                    'h-2 rounded transition-colors',
                    dropTarget?.id === child.id &&
                      dropTarget?.position === 'after' &&
                      'bg-primary/20'
                  )}
                  style={{ marginLeft: `${(depth + 1) * 24}px` }}
                  onDragOver={(e) => handleDragOver(e, child, 'after')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, child, 'after')}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {treeItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>No menu items yet</p>
          <p className="text-sm mt-1">Add your first menu item to get started</p>
        </div>
      ) : (
        <div className="space-y-1">
          {treeItems.map((item, index) => (
            <div key={item.id}>
              {renderItem(item)}
              {index < treeItems.length - 1 && <div className="h-2" />}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteItemId}
        onOpenChange={() => setDeleteItemId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this menu item? All child items
              will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItemId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
