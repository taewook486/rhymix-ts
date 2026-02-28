'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EditPermissionDialogProps {
  permission: {
    id: string
    name: string
    description: string
    module: string
    is_fallback?: boolean
    group_ids?: string[]
  }
}

interface UpdatePermissionResponse {
  success: boolean
  error?: string
  message?: string
  permission?: any
}

interface Group {
  id: string
  name: string
  description: string
}

const MODULES = [
  { value: 'board', label: 'Board' },
  { value: 'article', label: 'Article' },
  { value: 'comment', label: 'Comment' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'document', label: 'Document' },
  { value: 'page', label: 'Page' },
  { value: 'file', label: 'File' },
  { value: 'settings', label: 'Settings' },
]

export function EditPermissionDialog({ permission }: EditPermissionDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(permission.name)
  const [description, setDescription] = useState(permission.description || '')
  const [module, setModule] = useState(permission.module)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(permission.group_ids || [])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Fetch groups when dialog opens
  useEffect(() => {
    if (open) {
      fetchGroups()
    }
  }, [open])

  async function fetchGroups() {
    setIsLoadingGroups(true)
    try {
      const response = await fetch('/api/admin/groups')
      const data = await response.json()

      if (data.success) {
        setGroups(data.groups)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load groups',
        })
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load groups',
      })
    } finally {
      setIsLoadingGroups(false)
    }
  }

  function handleGroupToggle(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleUpdatePermission = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '권한 이름을 입력해주세요.',
      })
      return
    }

    if (name.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '권한 이름은 최소 3자 이상이어야 합니다.',
      })
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/admin/permissions/${permission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          module,
          group_ids: selectedGroupIds,
        }),
      })

      const data: UpdatePermissionResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update permission')
      }

      // Success - use window.location.reload() to avoid infinite loop
      toast({
        title: '권한 수정 완료',
        description: `${name} 권한이 수정되었습니다.`,
      })

      // Close dialog
      setOpen(false)

      // Use setTimeout to avoid potential race conditions
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '권한 수정 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={permission.is_fallback}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permission</DialogTitle>
          <DialogDescription>
            Update the permission name and description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Permission Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., article.create"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUpdating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-module">Module</Label>
            <Select
              value={module}
              onValueChange={(value: typeof module) => setModule(value)}
              disabled={isUpdating}
            >
              <SelectTrigger id="edit-module">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((mod) => (
                  <SelectItem key={mod.value} value={mod.value}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assigned Groups</Label>
            {isLoadingGroups ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading groups...
              </div>
            ) : (
              <>
                {/* System Roles */}
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">System Roles</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {groups
                      .filter((g) => (g as any).is_fallback)
                      .map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedGroupIds.includes(group.id)}
                            onCheckedChange={() => handleGroupToggle(group.id)}
                            disabled={isUpdating}
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {group.name}
                            <span className="text-muted-foreground text-xs ml-1">(System Role)</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Custom Groups */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Custom Groups</p>
                  {groups.filter((g) => !(g as any).is_fallback).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No custom groups available</p>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2">
                      {groups
                        .filter((g) => !(g as any).is_fallback)
                        .map((group) => (
                          <div key={group.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`group-${group.id}`}
                              checked={selectedGroupIds.includes(group.id)}
                              onCheckedChange={() => handleGroupToggle(group.id)}
                              disabled={isUpdating}
                            />
                            <label
                              htmlFor={`group-${group.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {group.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Permission description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUpdating}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setName(permission.name)
              setDescription(permission.description || '')
              setModule(permission.module)
              setSelectedGroupIds(permission.group_ids || [])
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdatePermission} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Permission'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
