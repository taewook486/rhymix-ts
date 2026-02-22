import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddWidgetDialog } from '@/components/admin/AddWidgetDialog'
import { Switch } from '@/components/ui/switch'
import { Layout, ToggleLeft, ToggleRight, Settings, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Skeleton component
function WidgetsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Get widgets from site_widgets table or return mock data
async function getWidgets() {
  const supabase = await createClient()

  // Try to get from site_widgets table first (if it exists)
  const { data, error } = await supabase
    .from('site_widgets')
    .select('*')
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  // If site_widgets table exists, return that data
  if (!error) {
    return data || []
  }

  // Final fallback: Return mock data until site_widgets table is created
  // TODO: Create site_widgets table migration
  return [
    {
      id: '1',
      name: 'latest_posts',
      title: 'Latest Posts',
      description: 'Display the latest posts from boards',
      position: 'sidebar',
      is_active: true,
      order: 1,
      settings: { count: 5, show_date: true },
    },
    {
      id: '2',
      name: 'popular_posts',
      title: 'Popular Posts',
      description: 'Display most viewed posts',
      position: 'sidebar',
      is_active: true,
      order: 2,
      settings: { count: 5, period: 'week' },
    },
    {
      id: '3',
      name: 'login_form',
      title: 'Login Form',
      description: 'User login widget for guests',
      position: 'sidebar',
      is_active: true,
      order: 3,
      settings: { show_remember_me: true },
    },
    {
      id: '4',
      name: 'online_users',
      title: 'Online Users',
      description: 'Show currently online users count',
      position: 'sidebar',
      is_active: false,
      order: 4,
      settings: { show_guests: true },
    },
    {
      id: '5',
      name: 'calendar',
      title: 'Calendar',
      description: 'Display calendar with events',
      position: 'sidebar',
      is_active: true,
      order: 5,
      settings: { show_weekends: true },
    },
    {
      id: '6',
      name: 'banner',
      title: 'Banner',
      description: 'Advertisement or promotion banner',
      position: 'header',
      is_active: true,
      order: 1,
      settings: { image_url: '', link_url: '' },
    },
    {
      id: '7',
      name: 'footer_links',
      title: 'Footer Links',
      description: 'Navigation links in footer',
      position: 'footer',
      is_active: true,
      order: 1,
      settings: { links: [] },
    },
  ]
}

// Widget position labels (Korean)
const positionLabels: Record<string, string> = {
  sidebar: 'Sidebar',
  header: 'Header',
  footer: 'Footer',
  content: 'Content',
}

// Widgets Table Component
function WidgetsTable({ widgets }: { widgets: any[] }) {
  if (widgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No widgets found. Create your first widget to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Widget</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {widgets.map((widget) => (
          <TableRow key={widget.id}>
            <TableCell>
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{widget.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{widget.name}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {widget.description}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {positionLabels[widget.position] || widget.position}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {widget.is_active ? (
                  <ToggleRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant={widget.is_active ? 'default' : 'secondary'}>
                  {widget.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Widget positions overview
function WidgetPositions({ widgets }: { widgets: any[] }) {
  const positions = ['header', 'sidebar', 'content', 'footer']

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {positions.map((position) => {
        const positionWidgets = widgets.filter((w) => w.position === position)
        const activeCount = positionWidgets.filter((w) => w.is_active).length

        return (
          <Card key={position}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layout className="h-4 w-4" />
                {positionLabels[position] || position}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{positionWidgets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCount} active
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default async function AdminWidgetsPage() {
  const widgets = await getWidgets()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widgets</h1>
          <p className="text-muted-foreground">Manage site widgets and their positions</p>
        </div>
        <AddWidgetDialog />
      </div>

      <WidgetPositions widgets={widgets} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            All Widgets
          </CardTitle>
          <CardDescription>
            Drag to reorder widgets. Toggle to enable or disable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetsSkeleton />}>
            <WidgetsTable widgets={widgets} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Widgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{widgets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ToggleRight className="h-4 w-4 text-green-500" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{widgets.filter((w) => w.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{widgets.filter((w) => !w.is_active).length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
