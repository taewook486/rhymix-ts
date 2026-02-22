import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddGroupDialog } from '@/components/admin/AddGroupDialog'
import { EditGroupDialog } from '@/components/admin/EditGroupDialog'
import { Users, Shield, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Skeleton component for loading state
function GroupsSkeleton() {
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

async function getGroups() {
  const supabase = await createClient()

  // Get custom groups from groups table
  const { data: groupsData, error: groupsError } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  const customGroups = (!groupsError && groupsData ? groupsData : []).map((group: any) => ({
    ...group,
    user_count: 0, // Will be calculated when group_members table is implemented
    is_fallback: false,
  }))

  // Get system groups by role from profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('role, created_at')

  let systemGroups: any[] = []

  if (!profilesError && profiles) {
    // Group by role and count
    const roleCounts = (profiles || []).reduce((acc, profile) => {
      const role = profile.role || 'user'
      acc[role] = acc[role] || { count: 0, created_at: profile.created_at }
      acc[role].count++
      return acc
    }, {} as Record<string, { count: number; created_at: string }>)

    // Convert to array format
    const roleDescriptions: Record<string, string> = {
      admin: 'Full system access',
      moderator: 'Content moderation permissions',
      user: 'Regular user permissions',
      guest: 'Limited guest access',
    }

    systemGroups = Object.entries(roleCounts).map(([role, data]) => ({
      id: `system_${role}`,
      name: role.charAt(0).toUpperCase() + role.slice(1) + 's',
      description: roleDescriptions[role] || 'Custom role',
      user_count: data.count,
      created_at: data.created_at,
      is_fallback: true, // Mark as system group (cannot be edited)
    }))
  }

  // Combine system groups and custom groups
  return [...systemGroups, ...customGroups]
}

// Groups Table Component
function GroupsTable({ groups }: { groups: any[] }) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No groups found. Create your first group to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Group Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-center">Members</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell className="font-medium">{group.name}</TableCell>
            <TableCell className="text-muted-foreground">{group.description}</TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                <Users className="h-3 w-3" />
                {group.user_count}
              </Badge>
            </TableCell>
            <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              {group.is_fallback ? (
                <span className="text-muted-foreground text-sm">System group</span>
              ) : (
                <div className="flex justify-end gap-2">
                  <EditGroupDialog group={group} />
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function AdminGroupsPage() {
  const groups = await getGroups()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage user groups and permissions</p>
        </div>
        <AddGroupDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Groups
          </CardTitle>
          <CardDescription>Create and manage user groups for role-based access control</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<GroupsSkeleton />}>
            <GroupsTable groups={groups} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.reduce((sum, g) => sum + g.user_count, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admin Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.filter((g) => g.name.toLowerCase().includes('admin')).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
