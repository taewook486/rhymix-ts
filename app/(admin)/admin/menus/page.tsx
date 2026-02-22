'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MenuEditor } from '@/components/menu/MenuEditor'
import { MenuTree } from '@/components/menu/MenuTree'
import { MenuItemEditor } from '@/components/menu/MenuItemEditor'
import {
  getMenus,
  getMenuItems,
} from '@/app/actions/menu'
import type { Menu, MenuItem } from '@/lib/supabase/database.types'

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Editor states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null)
  const [showItemEditor, setShowItemEditor] = useState(false)

  // Load menus on mount
  useEffect(() => {
    loadMenus()
  }, [])

  // Load menu items when selected menu changes
  useEffect(() => {
    if (selectedMenuId) {
      loadMenuItems(selectedMenuId)
    } else {
      setMenuItems([])
    }
  }, [selectedMenuId])

  const loadMenus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getMenus()
      if (result.success && result.data) {
        setMenus(result.data)
        if (!selectedMenuId && result.data.length > 0) {
          setSelectedMenuId(result.data[0].id)
        }
      } else {
        setError(result.error || 'Failed to load menus')
      }
    } catch (err) {
      setError('An error occurred while loading menus')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMenuItems = async (menuId: string) => {
    setIsLoadingItems(true)
    setError(null)
    try {
      const result = await getMenuItems(menuId)
      if (result.success && result.data) {
        // Flatten tree for the components
        const flattenItems = (items: any[]): MenuItem[] => {
          return items.reduce((acc: MenuItem[], item) => {
            const { children, ...rest } = item
            acc.push(rest)
            if (children && children.length > 0) {
              acc.push(...flattenItems(children))
            }
            return acc
          }, [])
        }
        setMenuItems(flattenItems(result.data))
      } else {
        setError(result.error || 'Failed to load menu items')
      }
    } catch (err) {
      setError('An error occurred while loading menu items')
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleMenusChange = () => {
    loadMenus()
  }

  const handleItemsChange = () => {
    if (selectedMenuId) {
      loadMenuItems(selectedMenuId)
    }
  }

  const handleSelectMenu = (menuId: string) => {
    setSelectedMenuId(menuId)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setAddingChildTo(null)
    setShowItemEditor(true)
  }

  const handleAddChild = (parentId: string) => {
    setEditingItem(null)
    setAddingChildTo(parentId)
    setShowItemEditor(true)
  }

  const handleAddTopLevel = () => {
    setEditingItem(null)
    setAddingChildTo(null)
    setShowItemEditor(true)
  }

  const handleItemSaved = () => {
    handleItemsChange()
    setSuccess('Menu item saved successfully')
    setTimeout(() => setSuccess(null), 3000)
  }

  const selectedMenu = menus.find((m) => m.id === selectedMenuId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menus</h1>
            <p className="text-muted-foreground">
              Configure navigation menus for your site
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menus</h1>
          <p className="text-muted-foreground">
            Configure navigation menus for your site
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMenus}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500 text-green-700 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Menu List */}
        <Card>
          <CardContent className="pt-6">
            <MenuEditor
              menus={menus}
              onMenusChange={handleMenusChange}
              onSelectMenu={handleSelectMenu}
              selectedMenuId={selectedMenuId}
            />
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedMenu ? selectedMenu.title : 'Select a Menu'}
                </CardTitle>
                <CardDescription>
                  {selectedMenu
                    ? selectedMenu.description || `Manage items for ${selectedMenu.title}`
                    : 'Select a menu from the list to manage its items'}
                </CardDescription>
              </div>
              {selectedMenuId && (
                <Button size="sm" onClick={handleAddTopLevel}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingItems ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : selectedMenuId ? (
              <MenuTree
                menuId={selectedMenuId}
                items={menuItems}
                onItemsChange={handleItemsChange}
                onEditItem={handleEditItem}
                onAddChild={handleAddChild}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Select a menu to view and edit its items</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Setup Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Menu Tips</CardTitle>
            <CardDescription>
              Best practices for organizing your menus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="space-y-1 list-disc list-inside">
              <li>Keep navigation simple with 5-7 main items</li>
              <li>Use descriptive titles that are easy to understand</li>
              <li>Group related items under parent menus</li>
              <li>Limit nesting to 2-3 levels for better UX</li>
              <li>Use visibility settings to show items conditionally</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Icon Names</CardTitle>
            <CardDescription>
              Available Lucide icon names for menu items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-4 gap-2">
              {[
                'home',
                'file-text',
                'user',
                'settings',
                'mail',
                'phone',
                'search',
                'menu',
                'info',
                'help-circle',
                'log-in',
                'log-out',
              ].map((icon) => (
                <div
                  key={icon}
                  className="px-2 py-1 bg-muted rounded text-xs text-center"
                >
                  {icon}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Editor Dialog */}
      {selectedMenuId && (
        <MenuItemEditor
          menuId={selectedMenuId}
          item={editingItem}
          parentId={addingChildTo}
          items={menuItems}
          isOpen={showItemEditor}
          onClose={() => {
            setShowItemEditor(false)
            setEditingItem(null)
            setAddingChildTo(null)
          }}
          onSaved={handleItemSaved}
        />
      )}
    </div>
  )
}
