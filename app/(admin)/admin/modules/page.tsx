import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstallModuleDialog } from '@/components/admin/InstallModuleDialog'
import { ToggleModuleButton } from '@/components/admin/ToggleModuleButton'
import { Package, ToggleLeft, ToggleRight, Settings, Download } from 'lucide-react'
import { getModules, getModuleStats } from '@/app/actions/modules'

// Skeleton component
function ModulesSkeleton() {
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

// Module Type Badge Colors
const moduleTypeColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  module: 'default',
  widget: 'secondary',
  addon: 'outline',
  layout: 'secondary',
  theme: 'outline'
}

// Modules Table Component
async function ModulesTable() {
  const { data: modules, error } = await getModules(true) // Include disabled modules

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading modules: {error}
      </div>
    )
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No modules found. Install your first module to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules.map((module) => (
          <TableRow key={module.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {module.icon ? (
                  <span className="text-lg">{module.icon}</span>
                ) : (
                  <Package className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">{module.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{module.slug}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {module.description || 'No description'}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono">
                {module.version}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {module.is_enabled ? (
                  <ToggleRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant={module.is_enabled ? 'default' : 'secondary'}>
                  {module.is_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant={moduleTypeColors[module.module_type] || 'outline'}>
                  {module.module_type}
                </Badge>
                {module.is_system && (
                  <Badge variant="destructive" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <ToggleModuleButton
                  moduleId={module.id}
                  isEnabled={module.is_enabled}
                  isSystem={module.is_system}
                />
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                {!module.is_system && (
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Module Stats Cards
async function ModuleStatsCards() {
  const { data: stats } = await getModuleStats()

  if (!stats) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ToggleRight className="h-4 w-4 text-green-500" />
            Enabled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.enabled}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">System Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.system}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.addons}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AdminModulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modules</h1>
          <p className="text-muted-foreground">Manage installed modules and extensions</p>
        </div>
        <InstallModuleDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Installed Modules
          </CardTitle>
          <CardDescription>
            Enable, disable, and configure modules to extend functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ModulesSkeleton />}>
            <ModulesTable />
          </Suspense>
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <ModuleStatsCards />
      </Suspense>
    </div>
  )
}
