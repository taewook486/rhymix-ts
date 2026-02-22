import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AddPermissionDialog } from '@/components/admin/AddPermissionDialog'
import { Switch } from '@/components/ui/switch'
import { Shield, Lock, Unlock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Skeleton component
function PermissionsSkeleton() {
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

async function getPermissions() {
  const supabase = await createClient()

  // Try to get from permissions table first (if it exists)
  const { data, error } = await supabase
    .from('permissions')
    .select(`
      *,
      permission_groups(
        groups(id, name)
      )
    `)
    .order('module', { ascending: true })

  // If permissions table exists, return that data
  if (!error) {
    return data?.map((permission: any) => ({
      ...permission,
      groups: permission.permission_groups?.map((pg: any) => pg.groups?.name).filter(Boolean) || [],
    })) || []
  }

  // Fallback: Return mock data until permissions table is created
  // TODO: Create permissions table migration
  return [
    {
      id: '1',
      name: 'board.create',
      description: 'Create new posts',
      module: 'board',
      groups: ['Administrators', 'Moderators', 'Members'],
    },
    {
      id: '2',
      name: 'board.delete',
      description: 'Delete posts',
      module: 'board',
      groups: ['Administrators', 'Moderators'],
    },
    {
      id: '3',
      name: 'user.manage',
      description: 'Manage users',
      module: 'member',
      groups: ['Administrators'],
    },
    {
      id: '4',
      name: 'settings.update',
      description: 'Update site settings',
      module: 'admin',
      groups: ['Administrators'],
    },
    {
      id: '5',
      name: 'comment.moderate',
      description: 'Moderate comments',
      module: 'comment',
      groups: ['Administrators', 'Moderators'],
    },
  ]
}

// Permissions Table Component
function PermissionsTable({ permissions }: { permissions: any[] }) {
  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No permissions found. Create your first permission to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Permission</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Assigned Groups</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((permission) => (
          <TableRow key={permission.id}>
            <TableCell className="font-medium font-mono text-sm">{permission.name}</TableCell>
            <TableCell className="text-muted-foreground">{permission.description}</TableCell>
            <TableCell>
              <Badge variant="outline">{permission.module}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {permission.groups.map((group: string) => (
                  <Badge key={group} variant="secondary" className="text-xs">
                    {group}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function AdminPermissionsPage() {
  const permissions = await getPermissions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">Manage access control permissions</p>
        </div>
        <AddPermissionDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Permissions
          </CardTitle>
          <CardDescription>
            Configure fine-grained permissions for different user groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PermissionsSkeleton />}>
            <PermissionsTable permissions={permissions} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.filter((p) => p.module === 'board').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.filter((p) => p.module === 'member').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.filter((p) => p.module === 'admin').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
