import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddGroupDialog } from '@/components/admin/AddGroupDialog'
import { EditGroupDialog } from '@/components/admin/EditGroupDialog'
import { Users, Shield } from 'lucide-react'
import { getGroups } from '@/app/actions/groups'

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
            <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                <Users className="h-3 w-3" />
                {group.member_count || 0}
              </Badge>
            </TableCell>
            <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              {group.is_system ? (
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

async function GroupsPageContent() {
  const result = await getGroups()

  if (!result.success || !result.data) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive">Failed to load groups: {result.error}</p>
      </div>
    )
  }

  const groups = result.data

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Groups
          </CardTitle>
          <CardDescription>Create and manage user groups for role-based access control</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsTable groups={groups} />
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
            <div className="text-2xl font-bold">{groups.reduce((sum, g) => sum + (g.member_count || 0), 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admin Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.filter((g) => g.is_admin).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function AdminGroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage user groups and permissions</p>
        </div>
        <AddGroupDialog />
      </div>

      <Suspense fallback={<GroupsSkeleton />}>
        <GroupsPageContent />
      </Suspense>
    </div>
  )
}
