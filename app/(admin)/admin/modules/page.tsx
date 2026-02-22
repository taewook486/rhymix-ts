import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstallModuleDialog } from '@/components/admin/InstallModuleDialog'
import { Switch } from '@/components/ui/switch'
import { Package, ToggleLeft, ToggleRight, Settings, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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

// Get modules from site_modules table or return mock data
async function getModules() {
  const supabase = await createClient()

  // Try to get from site_modules table first (if it exists)
  const { data, error } = await supabase
    .from('site_modules')
    .select('*')
    .order('is_core', { ascending: false })
    .order('name', { ascending: true })

  // If site_modules table exists, return that data
  if (!error) {
    return data || []
  }

  // Fallback: Try modules table (legacy name)
  const { data: legacyData, error: legacyError } = await supabase
    .from('modules')
    .select('*')
    .order('is_core', { ascending: false })
    .order('name', { ascending: true })

  if (!legacyError) {
    return legacyData || []
  }

  // Final fallback: Return mock data until site_modules table is created
  // TODO: Create site_modules table migration
  return [
    {
      id: '1',
      name: 'board',
      title: 'Board Module',
      description: 'Forum and discussion board functionality',
      version: '1.0.0',
      is_active: true,
      is_core: true,
      author: 'Rhymix',
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'member',
      title: 'Member Module',
      description: 'User registration and profile management',
      version: '1.0.0',
      is_active: true,
      is_core: true,
      author: 'Rhymix',
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'document',
      title: 'Document Module',
      description: 'Document and wiki content management',
      version: '1.0.0',
      is_active: true,
      is_core: true,
      author: 'Rhymix',
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '4',
      name: 'comment',
      title: 'Comment Module',
      description: 'Comment system for posts and documents',
      version: '1.0.0',
      is_active: true,
      is_core: true,
      author: 'Rhymix',
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '5',
      name: 'rss',
      title: 'RSS Feed Module',
      description: 'RSS feed generation for content',
      version: '1.0.0',
      is_active: false,
      is_core: false,
      author: 'Rhymix',
      installed_at: '2024-01-05T00:00:00Z',
    },
  ]
}

// Modules Table Component
function ModulesTable({ modules }: { modules: any[] }) {
  if (modules.length === 0) {
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
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{module.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{module.name}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {module.description}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono">
                {module.version}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {module.is_active ? (
                  <ToggleRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge variant={module.is_active ? 'default' : 'secondary'}>
                  {module.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={module.is_core ? 'default' : 'outline'}>
                {module.is_core ? 'Core' : 'Add-on'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                {!module.is_core && (
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

export default async function AdminModulesPage() {
  const modules = await getModules()

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
            <ModulesTable modules={modules} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
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
            <div className="text-2xl font-bold">{modules.filter((m) => m.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Core Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.filter((m) => m.is_core).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.filter((m) => !m.is_core).length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
