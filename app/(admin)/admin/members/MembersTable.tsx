'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreHorizontal, Pencil, Trash2, Loader2, UserX, UserCheck } from 'lucide-react'
import { updateMemberRole, suspendMember, unsuspendMember, deleteMember } from '@/app/actions/admin'
import { useToast } from '@/hooks/use-toast'

interface Member {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  last_login_at: string | null
  metadata: Record<string, any> | null
}

export function MembersTable({ members }: { members: Member[] }) {
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isSuspended = (member: Member) => {
    return member.metadata?.suspended === true
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No members found
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(member.display_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.display_name || 'Unnamed'}</span>
                  </div>
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      member.role === 'admin'
                        ? 'default'
                        : member.role === 'moderator'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {member.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isSuspended(member) ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <MemberActions member={member} isSuspended={isSuspended(member)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberActions({ member, isSuspended }: { member: Member; isSuspended: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)

  const handleSuspend = () => {
    startTransition(async () => {
      const result = isSuspended
        ? await unsuspendMember(member.id)
        : await suspendMember(member.id)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || `Member ${isSuspended ? 'unsuspended' : 'suspended'} successfully`,
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || `Failed to ${isSuspended ? 'unsuspend' : 'suspend'} member`,
        })
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMember(member.id)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Member deleted successfully',
        })
        router.refresh()
        setShowDeleteDialog(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete member',
        })
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSuspend}>
            {isSuspended ? (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Unsuspend Member
              </>
            ) : (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Suspend Member
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Role Dialog */}
      <EditRoleDialog
        member={member}
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{member.display_name || member.email}&quot;? This action cannot be undone. All
              posts and comments by this user will remain but will be marked as from a deleted user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EditRoleDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [selectedRole, setSelectedRole] = useState(member.role || 'user')

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateMemberRole(member.id, selectedRole)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Member role updated successfully',
        })
        router.refresh()
        onOpenChange(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update member role',
        })
      }
    })
  }

  // Reset role when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedRole(member.role || 'user')
    }
  }, [open, member.role])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Member Role</DialogTitle>
          <DialogDescription>Change the role for {member.display_name || member.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Admin:</strong> Full access to all features and settings
              </p>
              <p>
                <strong>Moderator:</strong> Can moderate content and manage users
              </p>
              <p>
                <strong>User:</strong> Standard member access
              </p>
              <p>
                <strong>Guest:</strong> Limited read-only access
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
