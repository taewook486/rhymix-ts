import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddPermissionDialog } from '@/components/admin/AddPermissionDialog'
import { EditPermissionDialog } from '@/components/admin/EditPermissionDialog'
import { Shield, Lock, Unlock } from 'lucide-react'
import { getPermissions } from '@/app/actions/permissions'
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

// Helper function to get group info for permissions
async function getPermissionsWithGroups() {
  const supabase = await createClient()

  // Get custom permissions from permissions table
  const { data: permissionsData, error: permError } = await supabase
    .from('permissions')
    .select('*')
    .order('module', { ascending: true })

  // Get all group_permissions for custom permissions
  const { data: groupPermissions, error: groupPermError } = await supabase
    .from('group_permissions')
    .select('group_id, permission_id')

  // Get all groups to build a map
  const { data: allGroups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name')

  // Build group map for quick lookup
  const groupMap = new Map(
    (!groupsError && allGroups ? allGroups : []).map((g: any) => [g.id, g.name])
  )

  // System group name mapping
  const systemGroupNames: Record<string, string> = {
    system_admin: 'Administrators',
    system_moderator: 'Moderators',
    system_user: 'Users',
    system_guest: 'Guests',
  }

  // Build permission to groups map
  const permissionGroupMap = new Map<string, string[]>()
  const permissionGroupIdMap = new Map<string, string[]>()

  if (!groupPermError && groupPermissions) {
    for (const gp of groupPermissions) {
      const groupName = groupMap.get(gp.group_id)
      if (groupName) {
        if (!permissionGroupMap.has(gp.permission_id)) {
          permissionGroupMap.set(gp.permission_id, [])
          permissionGroupIdMap.set(gp.permission_id, [])
        }
        permissionGroupMap.get(gp.permission_id)!.push(groupName)
        permissionGroupIdMap.get(gp.permission_id)!.push(gp.group_id)
      }
    }
  }

  const customPermissions = (!permError && permissionsData ? permissionsData : []).map((permission: any) => {
    const customGroupIds = permissionGroupIdMap.get(permission.id) || []
    const customGroupNames = permissionGroupMap.get(permission.id) || []
    const systemGroupIds = permission.system_groups || []

    const mappedSystemGroupNames = systemGroupIds
      .map((id: string) => systemGroupNames[id] || id)
      .filter(Boolean)

    const allGroupNames = [
      ...customGroupNames,
      ...mappedSystemGroupNames
    ]

    const allGroupIds = [
      ...customGroupIds,
      ...systemGroupIds
    ]

    return {
      ...permission,
      groups: allGroupNames,
      group_ids: allGroupIds,
      is_fallback: false,
    }
  })

  // System permissions (built-in, always available)
  const systemPermissions = [
    {
      id: 'system_board_create',
      name: 'board.create',
      slug: 'board.create',
      description: 'Create new posts',
      module: 'board',
      groups: ['Administrators', 'Moderators', 'Members'],
      is_fallback: true,
      is_system: true,
    },
    {
      id: 'system_board_delete',
      name: 'board.delete',
      slug: 'board.delete',
      description: 'Delete posts',
      module: 'board',
      groups: ['Administrators', 'Moderators'],
      is_fallback: true,
      is_system: true,
    },
    {
      id: 'system_user_manage',
      name: 'user.manage',
      slug: 'user.manage',
      description: 'Manage users',
      module: 'member',
      groups: ['Administrators'],
      is_fallback: true,
      is_system: true,
    },
    {
      id: 'system_settings_update',
      name: 'settings.update',
      slug: 'settings.update',
      description: 'Update site settings',
      module: 'admin',
      groups: ['Administrators'],
      is_fallback: true,
      is_system: true,
    },
    {
      id: 'system_comment_moderate',
      name: 'comment.moderate',
      slug: 'comment.moderate',
      description: 'Moderate comments',
      module: 'comment',
      groups: ['Administrators', 'Moderators'],
      is_fallback: true,
      is_system: true,
    },
  ]

  return [...systemPermissions, ...customPermissions]
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
              {permission.is_fallback ? (
                <span className="text-muted-foreground text-sm">System permission</span>
              ) : (
                <EditPermissionDialog permission={permission} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

async function PermissionsPageContent() {
  const permissions = await getPermissionsWithGroups()

  return (
    <>
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
          <PermissionsTable permissions={permissions} />
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
    </>
  )
}

export default async function AdminPermissionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">Manage access control permissions</p>
        </div>
        <AddPermissionDialog />
      </div>

      <Suspense fallback={<PermissionsSkeleton />}>
        <PermissionsPageContent />
      </Suspense>
    </div>
  )
}
