'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Eye, Trash2, Copy } from 'lucide-react'
import { LayoutBuilder } from '@/components/layout-builder/LayoutBuilder'
import type { Layout, AvailableWidget } from '@/types/layout'
import {
  getLayouts,
  getAvailableWidgets,
  createLayout,
  updateLayout,
  deleteLayout,
} from '@/app/actions/layouts'
import { useToast } from '@/hooks/use-toast'

export default function LayoutManagerPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [layouts, setLayouts] = useState<Layout[]>([])
  const [availableWidgets, setAvailableWidgets] = useState<AvailableWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [layoutsData, widgetsData] = await Promise.all([getLayouts(), getAvailableWidgets()])
      setLayouts(layoutsData)
      setAvailableWidgets(widgetsData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load layouts',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLayout = () => {
    setEditingLayout(null)
    setShowBuilder(true)
  }

  const handleEditLayout = (layout: Layout) => {
    setEditingLayout(layout)
    setShowBuilder(true)
  }

  const handlePreviewLayout = (layoutId: string) => {
    router.push(`/admin/layout/preview/${layoutId}`)
  }

  const handleDuplicateLayout = async (layout: Layout) => {
    try {
      const result = await createLayout({
        name: `${layout.name}_copy`,
        title: `${layout.title} (Copy)`,
        description: layout.description,
        layout_type: layout.layout_type,
        config: layout.config,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Layout duplicated successfully',
        })
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate layout',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteLayout = async (layoutId: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) {
      return
    }

    try {
      const result = await deleteLayout(layoutId)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Layout deleted successfully',
        })
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete layout',
        variant: 'destructive',
      })
    }
  }

  const handleSaveLayout = async (layout: Layout) => {
    try {
      let result

      if (editingLayout) {
        result = await updateLayout(editingLayout.id, layout)
      } else {
        result = await createLayout(layout)
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: editingLayout ? 'Layout updated successfully' : 'Layout created successfully',
        })
        setShowBuilder(false)
        setEditingLayout(null)
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save layout',
        variant: 'destructive',
      })
    }
  }

  const filteredLayouts = layouts.filter((layout) => {
    const matchesSearch =
      layout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      layout.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || layout.layout_type === filterType
    return matchesSearch && matchesType
  })

  const layoutTypeLabels: Record<string, string> = {
    default: 'Default',
    custom: 'Custom',
    blog: 'Blog',
    forum: 'Forum',
    landing: 'Landing',
  }

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {editingLayout ? 'Edit Layout' : 'Create New Layout'}
            </h1>
            <p className="text-muted-foreground">
              {editingLayout ? 'Modify your layout configuration' : 'Design your custom layout'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowBuilder(false)}>
            Back to List
          </Button>
        </div>

        <LayoutBuilder
          initialLayout={editingLayout || undefined}
          availableWidgets={availableWidgets}
          onSave={handleSaveLayout}
          onPreview={editingLayout ? handlePreviewLayout : undefined}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Layouts</h1>
          <p className="text-muted-foreground">Manage page layouts with drag-and-drop builder</p>
        </div>
        <Button onClick={handleCreateLayout}>
          <Plus className="h-4 w-4 mr-2" />
          Create Layout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Layouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layouts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Default</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layouts.filter((l) => l.is_default).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Custom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layouts.filter((l) => l.layout_type === 'custom').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layouts.filter((l) => l.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="filter-type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="forum">Forum</SelectItem>
                  <SelectItem value="landing">Landing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Layouts</CardTitle>
          <CardDescription>Manage and edit your page layouts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading layouts...</div>
          ) : filteredLayouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No layouts found. Create your first layout to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Widgets</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLayouts.map((layout) => (
                  <TableRow key={layout.id}>
                    <TableCell className="font-mono text-sm">{layout.name}</TableCell>
                    <TableCell>{layout.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {layoutTypeLabels[layout.layout_type] || layout.layout_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {layout.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                        {layout.is_active && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{layout.config.columns?.length || 0}</TableCell>
                    <TableCell>{layout.config.widgets?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditLayout(layout)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePreviewLayout(layout.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicateLayout(layout)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLayout(layout.id)}
                          disabled={layout.is_default}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
